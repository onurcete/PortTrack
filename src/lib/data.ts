import "server-only";
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

  const priceMap = new Map<string, CurrentPriceInfo>();
  const seenCount = new Map<string, number>();
  for (const s of snaps) {
    const count = seenCount.get(s.symbol) ?? 0;
    if (count === 0) {
      priceMap.set(s.symbol, {
        priceTRY: s.close,
        native: s.native,
        nativeCurrency: s.nativeCurrency,
      });
      seenCount.set(s.symbol, 1);
    } else if (count === 1) {
      const current = priceMap.get(s.symbol)!;
      current.prevPriceTRY = s.close;
      current.prevPriceNative = s.native;
      seenCount.set(s.symbol, 2);
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
