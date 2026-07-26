/**
 * Analiz sayfası için ortak veri yükleme.
 */

import { prisma } from "./prisma";
import { getPortfolio } from "./data";
import { buildAnalysisPulse } from "./analysisPulse";
import {
  buildTefasInvestorSummary,
  computeFundInvestorStats,
  type TefasInvestorSummary,
} from "./tefasInvestors";
import {
  buildAnalysisContext,
  hashAnalysisContext,
  type AnalysisContext,
} from "./analysisContext";
import type { AssetType } from "./assets";
import type { TechnicalIndicators } from "./technical";
import type { AnalysisPulse } from "./analysisPulse";

export interface HoldingDTO {
  symbol: string;
  assetType: AssetType;
  name: string | null;
  valueTRY: number;
  valueUSD: number;
  weightPct: number;
  dailyChangePct: number | null;
  quantity: number;
  currentPriceNative: number | null;
  nativeCurrency: "TRY" | "USD";
  analysis: {
    symbol: string;
    assetType: AssetType;
    date: string;
    indicators: TechnicalIndicators;
    score: number;
    commentary: string;
    trendSignal: string;
    macdSignal: string;
    rsiZone: string;
    alerts: string[];
  } | null;
}

export interface AnalysisPageBundle {
  pulse: AnalysisPulse;
  holdings: HoldingDTO[];
  tefasInvestors: TefasInvestorSummary | null;
  context: AnalysisContext;
  contextHash: string;
  lastTechnicalDate: string | null;
}

export async function loadAnalysisBundle(
  userId: string,
): Promise<AnalysisPageBundle> {
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

  const holdings: HoldingDTO[] = openPositions.map((p) => ({
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

  const context = buildAnalysisContext(
    pulse,
    holdings.map((h) => ({
      symbol: h.symbol,
      assetType: h.assetType,
      name: h.name,
      weightPct: h.weightPct,
      dailyChangePct: h.dailyChangePct,
      valueTRY: h.valueTRY,
      analysis: h.analysis
        ? {
            score: h.analysis.score,
            trendSignal: h.analysis.trendSignal,
            macdSignal: h.analysis.macdSignal,
            rsiZone: h.analysis.rsiZone,
          }
        : null,
    })),
    tefasInvestors,
  );

  return {
    pulse,
    holdings,
    tefasInvestors,
    context,
    contextHash: hashAnalysisContext(context),
    lastTechnicalDate:
      analyses.length > 0 ? analyses[0].date.toISOString() : null,
  };
}
