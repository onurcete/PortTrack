import { prisma } from "@/lib/prisma";
import { AnalysisClient } from "@/components/AnalysisClient";
import { requireUser } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import { buildAnalysisPulse } from "@/lib/analysisPulse";
import {
  buildTefasInvestorSummary,
  computeFundInvestorStats,
} from "@/lib/tefasInvestors";
import type { TechnicalIndicators } from "@/lib/technical";
import type { AssetType } from "@/lib/assets";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const userId = await requireUser();
  const portfolio = await getPortfolio(userId);
  const openPositions = portfolio.positions.filter((p) => p.quantity > 1e-6);

  const openSymbols = openPositions.map((p) => p.symbol);
  const tefasSymbols = openPositions
    .filter((p) => p.assetType === "TEFAS")
    .map((p) => p.symbol);

  const [analyses, tefasSnaps] = await Promise.all([
    openSymbols.length > 0
      ? prisma.technicalAnalysis.findMany({
          where: {
            symbol: {
              in: openSymbols,
              not: "__DAILY_SUMMARY__",
            },
          },
          orderBy: { date: "desc" },
          distinct: ["symbol"],
        })
      : Promise.resolve([]),
    tefasSymbols.length > 0
      ? prisma.priceSnapshot.findMany({
          where: { symbol: { in: tefasSymbols } },
          orderBy: { date: "asc" },
          select: { symbol: true, date: true, investors: true },
        })
      : Promise.resolve([]),
  ]);

  const snapsBySymbol = new Map<
    string,
    { date: Date; investors: number | null }[]
  >();
  for (const s of tefasSnaps) {
    const list = snapsBySymbol.get(s.symbol) ?? [];
    list.push({ date: s.date, investors: s.investors });
    snapsBySymbol.set(s.symbol, list);
  }

  const fundStats = tefasSymbols.map((symbol) =>
    computeFundInvestorStats(symbol, snapsBySymbol.get(symbol) ?? []),
  );
  const tefasInvestors =
    fundStats.length > 0 ? buildTefasInvestorSummary(fundStats) : null;

  const pulse = buildAnalysisPulse(openPositions, tefasInvestors);

  const analysisBySymbol = new Map(
    analyses.map((a) => [
      a.symbol,
      {
        symbol: a.symbol,
        assetType: a.assetType as AssetType,
        date: a.date.toISOString(),
        indicators: a.indicators as unknown as TechnicalIndicators,
        score: a.score,
        commentary: a.commentary,
        trendSignal: a.trendSignal,
        macdSignal: a.macdSignal,
        rsiZone: a.rsiZone,
        alerts: a.alerts as string[],
      },
    ]),
  );

  const holdings = openPositions.map((p) => ({
    symbol: p.symbol,
    assetType: p.assetType,
    name: p.name ?? null,
    valueTRY: p.valueTRY,
    valueUSD: p.valueUSD,
    weightPct:
      pulse.totalValueTRY > 0
        ? (p.valueTRY / pulse.totalValueTRY) * 100
        : 0,
    dailyChangePct: p.dailyChangePct,
    quantity: p.quantity,
    currentPriceNative: p.currentPriceNative,
    nativeCurrency: p.nativeCurrency,
    analysis: analysisBySymbol.get(p.symbol) ?? null,
  }));

  const lastAnalysisDate =
    analyses.length > 0 ? analyses[0].date.toISOString() : null;

  return (
    <AnalysisClient
      pulse={pulse}
      holdings={holdings}
      tefasInvestors={tefasInvestors}
      lastAnalysisDate={lastAnalysisDate}
    />
  );
}
