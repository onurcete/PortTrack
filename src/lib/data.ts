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
          isPriceSame = currentSnap.native === nextSnap.native;
        } else {
          // Otherwise check TRY close price
          isPriceSame = currentSnap.close === nextSnap.close;
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

  return {
    positions,
    totals,
    allocation,
    currentUsdTry,
    lastUpdated: snaps.length > 0 ? snaps[0].date : null,
    transactionCount: txRows.length,
  };
}
