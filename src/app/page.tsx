import { getPortfolio } from "@/lib/data";
import { getBenchmarkComparisonData, getPeriodReturns } from "@/lib/history";
import { DashboardClient, type DashboardDTO } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [p, benchmarkData, periodReturns] = await Promise.all([
    getPortfolio(),
    getBenchmarkComparisonData(),
    getPeriodReturns(),
  ]);

  const data: DashboardDTO = {
    positions: p.positions.map((x) => ({
      symbol: x.symbol,
      assetType: x.assetType,
      nativeCurrency: x.nativeCurrency,
      quantity: x.quantity,
      avgCostNative: x.avgCostNative,
      avgCostTRY: x.avgCostTRY,
      currentPriceNative: x.currentPriceNative,
      currentPriceTRY: x.currentPriceTRY,
      valueTRY: x.valueTRY,
      valueUSD: x.valueUSD,
      costTRY: x.costTRY,
      costUSD: x.costUSD,
      unrealizedTRY: x.unrealizedTRY,
      unrealizedUSD: x.unrealizedUSD,
      unrealizedPctTRY: x.unrealizedPctTRY,
      unrealizedPctUSD: x.unrealizedPctUSD,
      realizedTRY: x.realizedTRY,
      realizedUSD: x.realizedUSD,
      hasPrice: x.hasPrice,
      firstBuyDate: x.firstBuyDate ? x.firstBuyDate.toISOString() : null,
      totalBuyTRY: x.totalBuyTRY,
      totalBuyUSD: x.totalBuyUSD,
      totalSellTRY: x.totalSellTRY,
      totalSellUSD: x.totalSellUSD,
      dailyChangePct: x.dailyChangePct,
    })),
    totals: p.totals,
    allocation: p.allocation,
    currentUsdTry: p.currentUsdTry,
    lastUpdated: p.lastUpdated ? p.lastUpdated.toISOString() : null,
    transactionCount: p.transactionCount,
    benchmarkData,
    periodReturns,
  };

  return <DashboardClient data={data} />;
}
