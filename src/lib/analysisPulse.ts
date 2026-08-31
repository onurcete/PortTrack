/**
 * Analiz sayfası — portföy nabzı (yoğunlaşma, movers, dikkat chip'leri).
 */

import { ASSET_META, type AssetType } from "./assets";
import type { Position } from "./portfolio";
import type { TefasInvestorSummary } from "./tefasInvestors";

export type AnalysisTabKey = "TEFAS" | "STOCKS" | "ALT" | "BES";

export const ANALYSIS_TABS: {
  key: AnalysisTabKey;
  label: string;
  types: AssetType[];
}[] = [
  { key: "TEFAS", label: "TEFAS Fonlar", types: ["TEFAS"] },
  { key: "STOCKS", label: "Hisse", types: ["FOREIGN", "BIST"] },
  { key: "ALT", label: "Alternatif", types: ["METAL", "CRYPTO", "FX"] },
  { key: "BES", label: "BES", types: ["BES", "BES_FUND"] },
];

export function tabKeyForAssetType(assetType: AssetType): AnalysisTabKey {
  if (assetType === "TEFAS") return "TEFAS";
  if (assetType === "FOREIGN" || assetType === "BIST") return "STOCKS";
  if (assetType === "BES" || assetType === "BES_FUND") return "BES";
  return "ALT";
}

export interface PulseWeight {
  symbol: string;
  assetType: AssetType;
  weightPct: number;
  valueTRY: number;
}

export interface PulseMover {
  symbol: string;
  assetType: AssetType;
  dailyChangePct: number;
  weightPct: number;
}

export interface PulseTypeSlice {
  assetType: AssetType;
  label: string;
  weightPct: number;
  valueTRY: number;
  count: number;
}

export type AttentionKind =
  | "concentration"
  | "big_move"
  | "tefas_outflow"
  | "tefas_inflow";

export interface AttentionChip {
  kind: AttentionKind;
  label: string;
  symbol?: string;
  severity: "info" | "warn";
}

export interface AnalysisPulse {
  totalValueTRY: number;
  openCount: number;
  topWeights: PulseWeight[];
  typeSlices: PulseTypeSlice[];
  topGainers: PulseMover[];
  topLosers: PulseMover[];
  attention: AttentionChip[];
  defaultTab: AnalysisTabKey;
  availableTabs: AnalysisTabKey[];
}

const CONCENTRATION_PCT = 20;
const BIG_MOVE_PCT = 3;

/** Açık pozisyonlardan portföy nabzı üretir. */
export function buildAnalysisPulse(
  openPositions: Position[],
  tefasInvestors?: TefasInvestorSummary | null,
): AnalysisPulse {
  const totalValueTRY = openPositions.reduce((s, p) => s + p.valueTRY, 0);
  const openCount = openPositions.length;

  const withWeight = openPositions.map((p) => ({
    position: p,
    weightPct: totalValueTRY > 0 ? (p.valueTRY / totalValueTRY) * 100 : 0,
  }));

  const topWeights: PulseWeight[] = [...withWeight]
    .sort((a, b) => b.weightPct - a.weightPct)
    .slice(0, 3)
    .map(({ position: p, weightPct }) => ({
      symbol: p.symbol,
      assetType: p.assetType,
      weightPct,
      valueTRY: p.valueTRY,
    }));

  const byType = new Map<AssetType, { valueTRY: number; count: number }>();
  for (const p of openPositions) {
    const cur = byType.get(p.assetType) ?? { valueTRY: 0, count: 0 };
    cur.valueTRY += p.valueTRY;
    cur.count += 1;
    byType.set(p.assetType, cur);
  }

  const typeSlices: PulseTypeSlice[] = Array.from(byType.entries())
    .map(([assetType, v]) => ({
      assetType,
      label: ASSET_META[assetType].label,
      weightPct: totalValueTRY > 0 ? (v.valueTRY / totalValueTRY) * 100 : 0,
      valueTRY: v.valueTRY,
      count: v.count,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const movers = withWeight
    .filter((w) => w.position.dailyChangePct != null)
    .map(({ position: p, weightPct }) => ({
      symbol: p.symbol,
      assetType: p.assetType,
      dailyChangePct: p.dailyChangePct as number,
      weightPct,
    }));

  const topGainers = [...movers]
    .filter((m) => m.dailyChangePct > 0)
    .sort((a, b) => b.dailyChangePct - a.dailyChangePct)
    .slice(0, 3);

  const topLosers = [...movers]
    .filter((m) => m.dailyChangePct < 0)
    .sort((a, b) => a.dailyChangePct - b.dailyChangePct)
    .slice(0, 3);

  const attention: AttentionChip[] = [];

  for (const w of topWeights) {
    if (w.weightPct >= CONCENTRATION_PCT) {
      attention.push({
        kind: "concentration",
        label: `${w.symbol} portföyün %${w.weightPct.toFixed(1)}'i`,
        symbol: w.symbol,
        severity: "warn",
      });
    }
  }

  for (const m of movers) {
    if (Math.abs(m.dailyChangePct) >= BIG_MOVE_PCT) {
      attention.push({
        kind: "big_move",
        label: `${m.symbol} bugün ${m.dailyChangePct > 0 ? "+" : ""}${m.dailyChangePct.toFixed(1)}%`,
        symbol: m.symbol,
        severity: Math.abs(m.dailyChangePct) >= 5 ? "warn" : "info",
      });
    }
  }

  if (tefasInvestors) {
    if (tefasInvestors.topOutflow && tefasInvestors.topOutflow.weekDeltaPct <= -0.5) {
      attention.push({
        kind: "tefas_outflow",
        label: `${tefasInvestors.topOutflow.symbol} yatırımcı çıkışı %${Math.abs(tefasInvestors.topOutflow.weekDeltaPct).toFixed(1)}`,
        symbol: tefasInvestors.topOutflow.symbol,
        severity:
          Math.abs(tefasInvestors.topOutflow.weekDeltaPct) >= 2 ? "warn" : "info",
      });
    }
    if (tefasInvestors.topInflow && tefasInvestors.topInflow.weekDeltaPct >= 0.5) {
      attention.push({
        kind: "tefas_inflow",
        label: `${tefasInvestors.topInflow.symbol} yatırımcı girişi %${tefasInvestors.topInflow.weekDeltaPct.toFixed(1)}`,
        symbol: tefasInvestors.topInflow.symbol,
        severity: "info",
      });
    }
  }

  // Dikkat listesini sınırla
  const cappedAttention = attention.slice(0, 6);

  const tabValue = new Map<AnalysisTabKey, number>();
  for (const slice of typeSlices) {
    const key = tabKeyForAssetType(slice.assetType);
    tabValue.set(key, (tabValue.get(key) ?? 0) + slice.valueTRY);
  }

  const availableTabs = ANALYSIS_TABS.map((t) => t.key).filter(
    (k) => (tabValue.get(k) ?? 0) > 0 || openPositions.some((p) => tabKeyForAssetType(p.assetType) === k),
  );

  let defaultTab: AnalysisTabKey = availableTabs[0] ?? "STOCKS";
  let best = -1;
  for (const k of availableTabs) {
    const v = tabValue.get(k) ?? 0;
    if (v > best) {
      best = v;
      defaultTab = k;
    }
  }

  return {
    totalValueTRY,
    openCount,
    topWeights,
    typeSlices,
    topGainers,
    topLosers,
    attention: cappedAttention,
    defaultTab,
    availableTabs,
  };
}
