/**
 * Analiz sayfası — LLM ve UI için deterministik structured context.
 */

import { createHash } from "crypto";
import type { AnalysisPulse } from "./analysisPulse";
import { tabKeyForAssetType } from "./analysisPulse";
import type { AssetType } from "./assets";
import type { TefasInvestorSummary } from "./tefasInvestors";

export interface HoldingContextInput {
  symbol: string;
  assetType: AssetType;
  name: string | null;
  weightPct: number;
  dailyChangePct: number | null;
  valueTRY: number;
  firstBuyDate: string | null;
  daysHeld: number | null;
  unrealizedPctTRY: number | null;
  costTRY: number;
  analysis: {
    score: number;
    trendSignal: string;
    macdSignal: string;
    rsiZone: string;
  } | null;
}

export interface AnalysisContext {
  meta: {
    asOf: string;
    currency: "TRY";
    openCount: number;
    totalValueTRY: number;
  };
  pulse: {
    topWeights: AnalysisPulse["topWeights"];
    typeSlices: AnalysisPulse["typeSlices"];
    topGainers: AnalysisPulse["topGainers"];
    topLosers: AnalysisPulse["topLosers"];
    attention: AnalysisPulse["attention"];
  };
  tefas: {
    risingCount: number;
    fallingCount: number;
    flatCount: number;
    topInflow: TefasInvestorSummary["topInflow"];
    topOutflow: TefasInvestorSummary["topOutflow"];
    funds: Array<{
      symbol: string;
      latest: number | null;
      weekDelta: number | null;
      weekDeltaPct: number | null;
      magnitude: string;
      trend4w: string;
    }>;
  } | null;
  holdingsSummary: Array<{
    symbol: string;
    assetType: AssetType;
    name: string | null;
    firstBuyDate: string | null;
    daysHeld: number | null;
    weightPct: number;
    valueTRY: number;
    costTRY: number;
    unrealizedPctTRY: number | null;
  }>;
  stocks: Array<{
    symbol: string;
    assetType: AssetType;
    weightPct: number;
    dailyChangePct: number | null;
    firstBuyDate: string | null;
    daysHeld: number | null;
    unrealizedPctTRY: number | null;
    score: number | null;
    trendSignal: string | null;
    macdSignal: string | null;
    rsiZone: string | null;
  }>;
  alternatives: Array<{
    symbol: string;
    assetType: AssetType;
    weightPct: number;
    dailyChangePct: number | null;
    firstBuyDate: string | null;
    daysHeld: number | null;
    unrealizedPctTRY: number | null;
    score: number | null;
  }>;
  bes: Array<{
    symbol: string;
    weightPct: number;
    valueTRY: number;
    firstBuyDate: string | null;
    daysHeld: number | null;
    unrealizedPctTRY: number | null;
  }>;
}

export function buildAnalysisContext(
  pulse: AnalysisPulse,
  holdings: HoldingContextInput[],
  tefasInvestors: TefasInvestorSummary | null,
): AnalysisContext {
  const holdingsSummary = holdings
    .map((h) => ({
      symbol: h.symbol,
      assetType: h.assetType,
      name: h.name,
      firstBuyDate: h.firstBuyDate,
      daysHeld: h.daysHeld,
      weightPct: round1(h.weightPct),
      valueTRY: Math.round(h.valueTRY),
      costTRY: Math.round(h.costTRY),
      unrealizedPctTRY: h.unrealizedPctTRY != null ? round1(h.unrealizedPctTRY) : null,
    }))
    .sort((a, b) => (b.daysHeld ?? 0) - (a.daysHeld ?? 0));

  const stocks = holdings
    .filter((h) => tabKeyForAssetType(h.assetType) === "STOCKS")
    .map((h) => ({
      symbol: h.symbol,
      assetType: h.assetType,
      weightPct: round1(h.weightPct),
      dailyChangePct: h.dailyChangePct,
      firstBuyDate: h.firstBuyDate,
      daysHeld: h.daysHeld,
      unrealizedPctTRY: h.unrealizedPctTRY != null ? round1(h.unrealizedPctTRY) : null,
      score: h.analysis?.score ?? null,
      trendSignal: h.analysis?.trendSignal ?? null,
      macdSignal: h.analysis?.macdSignal ?? null,
      rsiZone: h.analysis?.rsiZone ?? null,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const alternatives = holdings
    .filter((h) => tabKeyForAssetType(h.assetType) === "ALT")
    .map((h) => ({
      symbol: h.symbol,
      assetType: h.assetType,
      weightPct: round1(h.weightPct),
      dailyChangePct: h.dailyChangePct,
      firstBuyDate: h.firstBuyDate,
      daysHeld: h.daysHeld,
      unrealizedPctTRY: h.unrealizedPctTRY != null ? round1(h.unrealizedPctTRY) : null,
      score: h.analysis?.score ?? null,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const bes = holdings
    .filter((h) => tabKeyForAssetType(h.assetType) === "BES")
    .map((h) => ({
      symbol: h.symbol,
      weightPct: round1(h.weightPct),
      valueTRY: Math.round(h.valueTRY),
      firstBuyDate: h.firstBuyDate,
      daysHeld: h.daysHeld,
      unrealizedPctTRY: h.unrealizedPctTRY != null ? round1(h.unrealizedPctTRY) : null,
    }));

  return {
    meta: {
      asOf: new Date().toISOString().slice(0, 10),
      currency: "TRY",
      openCount: pulse.openCount,
      totalValueTRY: Math.round(pulse.totalValueTRY),
    },
    pulse: {
      topWeights: pulse.topWeights.map((w) => ({
        ...w,
        weightPct: round1(w.weightPct),
        valueTRY: Math.round(w.valueTRY),
      })),
      typeSlices: pulse.typeSlices.map((s) => ({
        ...s,
        weightPct: round1(s.weightPct),
        valueTRY: Math.round(s.valueTRY),
      })),
      topGainers: pulse.topGainers,
      topLosers: pulse.topLosers,
      attention: pulse.attention,
    },
    tefas: tefasInvestors
      ? {
          risingCount: tefasInvestors.risingCount,
          fallingCount: tefasInvestors.fallingCount,
          flatCount: tefasInvestors.flatCount,
          topInflow: tefasInvestors.topInflow,
          topOutflow: tefasInvestors.topOutflow,
          funds: tefasInvestors.funds.map((f) => ({
            symbol: f.symbol,
            latest: f.latest,
            weekDelta: f.weekDelta,
            weekDeltaPct:
              f.weekDeltaPct != null
                ? Math.round(f.weekDeltaPct * 100) / 100
                : null,
            magnitude: f.magnitude,
            trend4w: f.trend4w,
          })),
        }
      : null,
    holdingsSummary,
    stocks,
    alternatives,
    bes,
  };
}

/** Context içeriğinden kararlı hash (cache anahtarı). */
export function hashAnalysisContext(context: AnalysisContext): string {
  const json = JSON.stringify(context);
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Günün TR gece yarısı (UTC+3 yaklaşık: UTC 21:00 önceki gün) — basitçe UTC midnight kullan. */
export function briefingDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
