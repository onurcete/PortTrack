// import "server-only";
import fs from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import {
  computePositions,
  buildFxLookup,
  calculateXIRR,
  type TxInput,
  type CurrentPriceInfo,
  type Position,
  type PortfolioTotals,
  type AllocationSlice,
} from "./portfolio";
import { resolvePriceMapping, type AssetType } from "./assets";

const FALLBACK_USDTRY = 40;

export interface PortfolioData {
  positions: Position[];
  totals: PortfolioTotals;
  allocation: AllocationSlice[];
  currentUsdTry: number;
  lastUpdated: Date | null;
  transactionCount: number;
  portfolioXirrTRY: number | null;
  portfolioXirrUSD: number | null;
}

export async function getPortfolio(userId: string): Promise<PortfolioData> {
  const [txRows, snaps, fxRows, instruments] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.priceSnapshot.findMany({ orderBy: { date: "desc" } }),
    prisma.fxRate.findMany({
      where: { pair: "USDTRY" },
      orderBy: { date: "asc" },
    }),
    prisma.instrument.findMany({
      where: { userId },
    }),
  ]);

  // Load cache files to resolve missing instrument names
  let tefasCache: { symbol: string; name: string }[] = [];
  let bistCache: { symbol: string; name: string }[] = [];
  try {
    const tefasPath = path.join(process.cwd(), "src/lib/tefas_cache.json");
    const bistPath = path.join(process.cwd(), "src/lib/bist_cache.json");
    
    const [tefasRaw, bistRaw] = await Promise.all([
      fs.readFile(tefasPath, "utf-8").catch(() => "[]"),
      fs.readFile(bistPath, "utf-8").catch(() => "[]"),
    ]);
    tefasCache = JSON.parse(tefasRaw);
    bistCache = JSON.parse(bistRaw);
  } catch (e) {
    console.error("Error reading cache files for instrument names", e);
  }

  const cacheMap = new Map<string, string>();
  for (const item of tefasCache) {
    cacheMap.set(item.symbol.toUpperCase(), item.name);
  }
  for (const item of bistCache) {
    cacheMap.set(item.symbol.toUpperCase(), item.name);
  }

  // Update instruments in DB if their name is missing but found in cache
  const updatePromises = [];
  for (const inst of instruments) {
    if (!inst.name) {
      const cachedName = cacheMap.get(inst.symbol.toUpperCase());
      if (cachedName) {
        inst.name = cachedName;
        updatePromises.push(
          prisma.instrument.update({
            where: { symbol_userId: { symbol: inst.symbol, userId } },
            data: { name: cachedName },
          }).catch(err => console.error(`Error updating name for ${inst.symbol}:`, err))
        );
      }
    }
  }
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

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

  // Override or inject user-specific manual prices
  for (const inst of instruments) {
    if (inst.manualPrice !== null && inst.manualPrice !== undefined) {
      const map = resolvePriceMapping(inst.assetType as AssetType, inst.symbol);
      const price = inst.manualPrice;
      const priceTRY = map.currency === "USD" ? price * currentUsdTry : price;
      priceMap.set(inst.symbol, {
        priceTRY,
        native: price,
        nativeCurrency: map.currency,
      });
    }
  }

  const { positions, totals, allocation } = computePositions(
    tx,
    priceMap,
    fx,
    currentUsdTry,
  );

  // Map instrument names from database to positions
  const nameMap = new Map<string, string>();
  for (const inst of instruments) {
    if (inst.name) {
      nameMap.set(inst.symbol.toUpperCase(), inst.name);
    }
  }
  for (const pos of positions) {
    pos.name = nameMap.get(pos.symbol.toUpperCase()) || null;
  }

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
    symbolTxs: TxInput[],
    symbolSnaps: typeof snaps,
    dStart: Date,
    valueTodayTRY: number,
    valueTodayUSD: number,
    isUSD: boolean,
    fxStart: number,
    fxEnd: number
  ): number | null {
    const startSnap = findPriceOnOrBefore(symbolSnaps, dStart);
    const priceAtStartTRY = startSnap ? startSnap.close : null;

    let qtyAtStart = 0;
    for (const t of symbolTxs) {
      if (t.date.getTime() < dStart.getTime()) {
        if (t.side === "BUY") {
          qtyAtStart += t.quantity;
        } else {
          qtyAtStart -= t.quantity;
        }
      }
    }
    if (qtyAtStart < 0) qtyAtStart = 0;

    let buysPeriodTRY = 0;
    let buysPeriodUSD = 0;
    let sellsPeriodTRY = 0;
    let sellsPeriodUSD = 0;

    for (const t of symbolTxs) {
      if (t.date.getTime() >= dStart.getTime()) {
        const rate = fx(t.date) || currentUsdTry;
        const tTRY = t.currency === "USD" ? t.total * rate : t.total;
        const tUSD = t.currency === "USD" ? t.total : t.total / rate;

        if (t.side === "BUY") {
          buysPeriodTRY += tTRY;
          buysPeriodUSD += tUSD;
        } else {
          sellsPeriodTRY += tTRY;
          sellsPeriodUSD += tUSD;
        }
      }
    }

    if (!isUSD) {
      const valueStartTRY = qtyAtStart * (priceAtStartTRY ?? 0);
      const netCashFlowTRY = buysPeriodTRY - sellsPeriodTRY;
      const pnlTRY = valueTodayTRY - valueStartTRY - netCashFlowTRY;
      const denominatorTRY = valueStartTRY + buysPeriodTRY;
      return denominatorTRY > 0.01 ? (pnlTRY / denominatorTRY) * 100 : null;
    } else {
      const priceAtStartUSD = priceAtStartTRY !== null ? priceAtStartTRY / fxStart : null;
      const valueStartUSD = qtyAtStart * (priceAtStartUSD ?? 0);
      const netCashFlowUSD = buysPeriodUSD - sellsPeriodUSD;
      const pnlUSD = valueTodayUSD - valueStartUSD - netCashFlowUSD;
      const denominatorUSD = valueStartUSD + buysPeriodUSD;
      return denominatorUSD > 0.01 ? (pnlUSD / denominatorUSD) * 100 : null;
    }
  }

  const positionsWithPeriodReturns = positions.map((p) => {
    const symbolSnaps = snapsBySymbol.get(p.symbol) || [];
    const symbolTxs = tx.filter((t) => t.symbol === p.symbol);
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
      mtdPctTRY: calculatePeriodReturn(symbolTxs, symbolSnaps, dMtd, p.valueTRY, p.valueUSD, false, fxStartMtd, fxEnd),
      mtdPctUSD: calculatePeriodReturn(symbolTxs, symbolSnaps, dMtd, p.valueTRY, p.valueUSD, true, fxStartMtd, fxEnd),
      oneMonthPctTRY: calculatePeriodReturn(symbolTxs, symbolSnaps, d1M, p.valueTRY, p.valueUSD, false, fxStart1M, fxEnd),
      oneMonthPctUSD: calculatePeriodReturn(symbolTxs, symbolSnaps, d1M, p.valueTRY, p.valueUSD, true, fxStart1M, fxEnd),
      sixMonthPctTRY: calculatePeriodReturn(symbolTxs, symbolSnaps, d6M, p.valueTRY, p.valueUSD, false, fxStart6M, fxEnd),
      sixMonthPctUSD: calculatePeriodReturn(symbolTxs, symbolSnaps, d6M, p.valueTRY, p.valueUSD, true, fxStart6M, fxEnd),
      ytdPctTRY: calculatePeriodReturn(symbolTxs, symbolSnaps, dYtd, p.valueTRY, p.valueUSD, false, fxStartYtd, fxEnd),
      ytdPctUSD: calculatePeriodReturn(symbolTxs, symbolSnaps, dYtd, p.valueTRY, p.valueUSD, true, fxStartYtd, fxEnd),
      oneYearPctTRY: calculatePeriodReturn(symbolTxs, symbolSnaps, d1Y, p.valueTRY, p.valueUSD, false, fxStart1Y, fxEnd),
      oneYearPctUSD: calculatePeriodReturn(symbolTxs, symbolSnaps, d1Y, p.valueTRY, p.valueUSD, true, fxStart1Y, fxEnd),
    };
  });

  // Portfolio-level XIRR: aggregate all cash flows across all symbols
  const allCashFlowsTRY: { date: Date; amount: number }[] = [];
  const allCashFlowsUSD: { date: Date; amount: number }[] = [];

  for (const t of tx) {
    const rate = fx(t.date) || currentUsdTry;
    const sign = t.side === "BUY" ? -1 : 1;
    const tTRY = t.currency === "USD" ? t.total * rate : t.total;
    const tUSD = t.currency === "USD" ? t.total : t.total / rate;

    allCashFlowsTRY.push({ date: new Date(t.date), amount: sign * tTRY });
    allCashFlowsUSD.push({ date: new Date(t.date), amount: sign * tUSD });
  }

  // Add current portfolio value as the final (positive) cash flow
  const todayForXirr = new Date();
  allCashFlowsTRY.push({ date: todayForXirr, amount: totals.valueTRY });
  allCashFlowsUSD.push({ date: todayForXirr, amount: totals.valueUSD });

  const portfolioXirrTRY = calculateXIRR(allCashFlowsTRY);
  const portfolioXirrUSD = calculateXIRR(allCashFlowsUSD);

  return {
    positions: positionsWithPeriodReturns,
    totals,
    allocation,
    currentUsdTry,
    lastUpdated: snaps.length > 0 ? snaps[0].date : null,
    transactionCount: txRows.length,
    portfolioXirrTRY,
    portfolioXirrUSD,
  };
}
