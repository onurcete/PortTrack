/**
 * TEFAS fon yatırımcı adedi (kisiSayisi) metrikleri.
 * PriceSnapshot.investors üzerinden haftalık / 4 haftalık trend üretir.
 */

export interface InvestorPoint {
  date: string; // ISO
  investors: number;
}

export type InvestorTrend = "up" | "down" | "flat" | "unknown";
export type InvestorMagnitude = "none" | "notable" | "strong";

export interface TefasFundInvestorStats {
  symbol: string;
  latest: number | null;
  priorWeek: number | null;
  weekDelta: number | null;
  weekDeltaPct: number | null;
  magnitude: InvestorMagnitude;
  trend4w: InvestorTrend;
  series: InvestorPoint[]; // son ~28 gün investor noktaları
}

export interface TefasInvestorSummary {
  fundsWithData: number;
  risingCount: number;
  fallingCount: number;
  flatCount: number;
  topInflow: { symbol: string; weekDeltaPct: number; weekDelta: number } | null;
  topOutflow: { symbol: string; weekDeltaPct: number; weekDelta: number } | null;
  funds: TefasFundInvestorStats[];
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function magnitudeFromPct(pct: number | null): InvestorMagnitude {
  if (pct == null || !Number.isFinite(pct)) return "none";
  const abs = Math.abs(pct);
  if (abs >= 2) return "strong";
  if (abs >= 0.5) return "notable";
  return "none";
}

function trendFromSeries(series: InvestorPoint[]): InvestorTrend {
  if (series.length < 2) return "unknown";
  const first = series[0].investors;
  const last = series[series.length - 1].investors;
  if (first <= 0) return "unknown";
  const pct = ((last - first) / first) * 100;
  if (pct >= 0.5) return "up";
  if (pct <= -0.5) return "down";
  return "flat";
}

/** Tek fon için investor snapshot listesinden metrik üretir. */
export function computeFundInvestorStats(
  symbol: string,
  snapshots: { date: Date; investors: number | null }[],
): TefasFundInvestorStats {
  const withInv = snapshots
    .filter((s) => s.investors != null && s.investors > 0)
    .map((s) => ({
      date: s.date,
      investors: s.investors as number,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (withInv.length === 0) {
    return {
      symbol,
      latest: null,
      priorWeek: null,
      weekDelta: null,
      weekDeltaPct: null,
      magnitude: "none",
      trend4w: "unknown",
      series: [],
    };
  }

  const latest = withInv[withInv.length - 1];
  const cutoff28 = new Date(latest.date);
  cutoff28.setDate(cutoff28.getDate() - 28);

  const series = withInv
    .filter((p) => p.date >= cutoff28)
    .map((p) => ({
      date: p.date.toISOString(),
      investors: p.investors,
    }));

  // ~7 gün önceki (5–10 gün aralığı), yoksa bir önceki nokta
  const prior =
    withInv.find((s) => {
      const d = daysBetween(s.date, latest.date);
      return d >= 5 && d <= 10;
    }) ?? (withInv.length >= 2 ? withInv[withInv.length - 2] : null);

  let weekDelta: number | null = null;
  let weekDeltaPct: number | null = null;
  let priorWeek: number | null = null;

  if (prior && prior.investors > 0) {
    priorWeek = prior.investors;
    weekDelta = latest.investors - prior.investors;
    weekDeltaPct = (weekDelta / prior.investors) * 100;
  }

  return {
    symbol,
    latest: latest.investors,
    priorWeek,
    weekDelta,
    weekDeltaPct,
    magnitude: magnitudeFromPct(weekDeltaPct),
    trend4w: trendFromSeries(series),
    series,
  };
}

/** Portföydeki TEFAS fonları için özet + fon listesi. */
export function buildTefasInvestorSummary(
  funds: TefasFundInvestorStats[],
): TefasInvestorSummary {
  const withWeek = funds.filter(
    (f) => f.weekDeltaPct != null && Number.isFinite(f.weekDeltaPct),
  );

  let risingCount = 0;
  let fallingCount = 0;
  let flatCount = 0;

  for (const f of withWeek) {
    const pct = f.weekDeltaPct!;
    if (pct >= 0.5) risingCount++;
    else if (pct <= -0.5) fallingCount++;
    else flatCount++;
  }

  const sortedByPct = [...withWeek].sort(
    (a, b) => (b.weekDeltaPct ?? 0) - (a.weekDeltaPct ?? 0),
  );

  const topIn =
    sortedByPct.find((f) => (f.weekDeltaPct ?? 0) > 0) ?? null;
  const topOut =
    [...sortedByPct].reverse().find((f) => (f.weekDeltaPct ?? 0) < 0) ?? null;

  return {
    fundsWithData: funds.filter((f) => f.latest != null).length,
    risingCount,
    fallingCount,
    flatCount,
    topInflow: topIn
      ? {
          symbol: topIn.symbol,
          weekDeltaPct: topIn.weekDeltaPct!,
          weekDelta: topIn.weekDelta ?? 0,
        }
      : null,
    topOutflow: topOut
      ? {
          symbol: topOut.symbol,
          weekDeltaPct: topOut.weekDeltaPct!,
          weekDelta: topOut.weekDelta ?? 0,
        }
      : null,
    funds: [...funds].sort(
      (a, b) => Math.abs(b.weekDeltaPct ?? 0) - Math.abs(a.weekDeltaPct ?? 0),
    ),
  };
}
