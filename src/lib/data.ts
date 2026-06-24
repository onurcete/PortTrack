// import "server-only";
import { prisma } from "./prisma";
import {
  computePositions,
  buildFxLookup,
  type TxInput,
  type CurrentPriceInfo,
  type Position,
  type PortfolioTotals,
  type AllocationSlice,
} from "./portfolio";
import type { AssetType } from "./assets";

const FALLBACK_USDTRY = 40;

export interface PortfolioData {
  positions: Position[];
  totals: PortfolioTotals;
  allocation: AllocationSlice[];
  currentUsdTry: number;
  lastUpdated: Date | null;
  transactionCount: number;
}

export async function getPortfolio(): Promise<PortfolioData> {
  const [txRows, snaps, fxRows] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { date: "asc" } }),
    prisma.priceSnapshot.findMany({ orderBy: { date: "desc" } }),
    prisma.fxRate.findMany({
      where: { pair: "USDTRY" },
      orderBy: { date: "asc" },
    }),
  ]);

  const tx: TxInput[] = txRows.map((t) => ({
    date: t.date,
    assetType: t.assetType as AssetType,
    symbol: t.symbol,
    side: t.side as "BUY" | "SELL",
    unitPrice: t.unitPrice,
    quantity: t.quantity,
    total: t.total,
    currency: t.currency as "TRY" | "USD",
  }));

  const symbolAssetType = new Map<string, AssetType>();
  for (const t of txRows) {
    symbolAssetType.set(t.symbol, t.assetType as AssetType);
  }

  const snapsBySymbol = new Map<string, typeof snaps>();
  for (const s of snaps) {
    let list = snapsBySymbol.get(s.symbol);
    if (!list) {
      list = [];
      snapsBySymbol.set(s.symbol, list);
    }
    list.push(s);
  }

  const priceMap = new Map<string, CurrentPriceInfo>();
  for (const [symbol, symbolSnaps] of snapsBySymbol) {
    const assetType = symbolAssetType.get(symbol);
    const isCrypto = assetType === "CRYPTO";

    const filteredSnaps = [];
    for (let i = 0; i < symbolSnaps.length; i++) {
      const currentSnap = symbolSnaps[i];
      const nextSnap = symbolSnaps[i + 1];

      if (!isCrypto && nextSnap) {
        const day = currentSnap.date.getUTCDay();
        const isWeekend = day === 0 || day === 6;
        
        let isPriceSame = false;
        if (currentSnap.native !== null && nextSnap.native !== null) {
          // If native price exists (e.g. Foreign stocks), check native price to ignore USDTRY weekend fluctuations
          isPriceSame = Math.abs(currentSnap.native - nextSnap.native) < 1e-5;
        } else {
          // Otherwise check TRY close price
          isPriceSame = Math.abs(currentSnap.close - nextSnap.close) < 1e-5;
        }

        if (isWeekend && isPriceSame) {
          continue;
        }
      }
      filteredSnaps.push(currentSnap);
    }

    if (filteredSnaps.length > 0) {
      const latest = filteredSnaps[0];
      const info: CurrentPriceInfo = {
        priceTRY: latest.close,
        native: latest.native,
        nativeCurrency: latest.nativeCurrency,
      };
      if (filteredSnaps.length > 1) {
        const prev = filteredSnaps[1];
        info.prevPriceTRY = prev.close;
        info.prevPriceNative = prev.native;
      }
      priceMap.set(symbol, info);
    }
  }

  const fxHist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
  const currentUsdTry =
    fxHist.length > 0 ? fxHist[fxHist.length - 1].rate : FALLBACK_USDTRY;
  const fx = buildFxLookup(fxHist, currentUsdTry);

  const { positions, totals, allocation } = computePositions(
    tx,
    priceMap,
    fx,
    currentUsdTry,
  );

  // Turkey-time date helpers
  function trYear(d: Date): number {
    const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    return trDate.getUTCFullYear();
  }
  function trMonth(d: Date): number {
    const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    return trDate.getUTCMonth();
  }

  const today = new Date();
  const dMtd = new Date(Date.UTC(trYear(today), trMonth(today), 0, 12, 0, 0));
  const d1M = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d6M = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
  const dYtd = new Date(Date.UTC(trYear(today) - 1, 11, 31, 12, 0, 0));
  const d1Y = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  function findPriceOnOrBefore(symbolSnaps: typeof snaps, date: Date): { close: number } | null {
    const t = date.getTime();
    for (const s of symbolSnaps) {
      if (s.date.getTime() <= t) {
        return { close: s.close };
      }
    }
    return null;
  }

  function calculatePeriodReturn(
    symbolSnaps: typeof snaps,
    dStart: Date,
    priceTodayTRY: number,
    isUSD: boolean,
    fxStart: number,
    fxEnd: number
  ): number | null {
    const startSnap = findPriceOnOrBefore(symbolSnaps, dStart);
    if (!startSnap || startSnap.close <= 0) return null;

    if (!isUSD) {
      return ((priceTodayTRY / startSnap.close) - 1) * 100;
    } else {
      const startUSD = startSnap.close / fxStart;
      const endUSD = priceTodayTRY / fxEnd;
      if (startUSD <= 0) return null;
      return ((endUSD / startUSD) - 1) * 100;
    }
  }

  const positionsWithPeriodReturns = positions.map((p) => {
    const symbolSnaps = snapsBySymbol.get(p.symbol) || [];
    const priceTodayTRY = p.currentPriceTRY ?? (p.quantity > 0 ? p.avgCostTRY : null);
    if (priceTodayTRY == null) {
      return {
        ...p,
        mtdPctTRY: null, mtdPctUSD: null,
        oneMonthPctTRY: null, oneMonthPctUSD: null,
        sixMonthPctTRY: null, sixMonthPctUSD: null,
        ytdPctTRY: null, ytdPctUSD: null,
        oneYearPctTRY: null, oneYearPctUSD: null,
      };
    }

    const fxEnd = currentUsdTry;
    const fxStartMtd = fx(dMtd);
    const fxStart1M = fx(d1M);
    const fxStart6M = fx(d6M);
    const fxStartYtd = fx(dYtd);
    const fxStart1Y = fx(d1Y);

    return {
      ...p,
      mtdPctTRY: calculatePeriodReturn(symbolSnaps, dMtd, priceTodayTRY, false, fxStartMtd, fxEnd),
      mtdPctUSD: calculatePeriodReturn(symbolSnaps, dMtd, priceTodayTRY, true, fxStartMtd, fxEnd),
      oneMonthPctTRY: calculatePeriodReturn(symbolSnaps, d1M, priceTodayTRY, false, fxStart1M, fxEnd),
      oneMonthPctUSD: calculatePeriodReturn(symbolSnaps, d1M, priceTodayTRY, true, fxStart1M, fxEnd),
      sixMonthPctTRY: calculatePeriodReturn(symbolSnaps, d6M, priceTodayTRY, false, fxStart6M, fxEnd),
      sixMonthPctUSD: calculatePeriodReturn(symbolSnaps, d6M, priceTodayTRY, true, fxStart6M, fxEnd),
      ytdPctTRY: calculatePeriodReturn(symbolSnaps, dYtd, priceTodayTRY, false, fxStartYtd, fxEnd),
      ytdPctUSD: calculatePeriodReturn(symbolSnaps, dYtd, priceTodayTRY, true, fxStartYtd, fxEnd),
      oneYearPctTRY: calculatePeriodReturn(symbolSnaps, d1Y, priceTodayTRY, false, fxStart1Y, fxEnd),
      oneYearPctUSD: calculatePeriodReturn(symbolSnaps, d1Y, priceTodayTRY, true, fxStart1Y, fxEnd),
    };
  });

  return {
    positions: positionsWithPeriodReturns,
    totals,
    allocation,
    currentUsdTry,
    lastUpdated: snaps.length > 0 ? snaps[0].date : null,
    transactionCount: txRows.length,
  };
}
