"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { History, TrendingUp, BarChart2, Activity, Calendar, PieChart, DollarSign } from "lucide-react";
import { BackfillStatusBanner } from "@/components/BackfillStatusBanner";
import {
  BACKLOG_FULL_UNTIL_YEAR,
  GROWTH_DISPLAY_FROM_YEAR,
} from "@/lib/backlog.constants";
import { useCurrency } from "@/context/currency";
import { Card } from "@/components/ui";
import { ASSET_META, type AssetType, type GrowthByType } from "@/lib/assets";
import {
  formatMoney,
  formatPercent,
  cn,
} from "@/lib/utils";
import { GrowthAiCommentary } from "./GrowthAiCommentary";

/** Tablo kolon sirasi (kullanici oncelikli gruplama) */
const TABLE_TYPES: AssetType[] = [
  "BES",
  "BIST",
  "TEFAS",
  "FOREIGN",
  "FX",
  "METAL",
  "CRYPTO",
];

export interface GrowthPointDTO {
  month: string;
  valueTRY: number;
  valueUSD: number;
  costTRY: number;
  costUSD: number;
  byType: GrowthByType;
  /** Backlog kapsami oncesi, yalnizca islemlerden hesaplanan (eksik olabilecek) ay */
  partialData?: boolean;
  /** Yuzde hesabi icin eklenen sentetik baz ayi */
  isSyntheticBaseline?: boolean;
}

function typeValue(
  p: GrowthPointDTO,
  type: AssetType,
  currency: "TRY" | "USD",
): number {
  const v = p.byType[type];
  return currency === "TRY" ? v.valueTRY : v.valueUSD;
}

function totalValue(p: GrowthPointDTO, currency: "TRY" | "USD"): number {
  return currency === "TRY" ? p.valueTRY : p.valueUSD;
}

/** Tablo ay etiketi: 2025.01 */
function monthTableLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}.${m}`;
}

/** Özet kart tarihi: 1 Haziran 2026 */
function formatPeriodDate(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}

const YEAR_FILTER_ALL = "all";

type ChartMetric = "value" | "allocation" | "return";

interface ChartRow {
  month: string;
  value: number;
  cost: number;
  /** Önceki aya göre portföy değişimi (%) */
  returnPct: number | null;
  /** Grafikte gösterilen (aykırı değerler kırpılabilir) */
  returnPctPlot?: number;
  returnClamped?: boolean;
  [key: string]: any;
}

/** Aykırı ayları ölçekten çıkarıp çoğu çubuğun okunaklı kalması için Y sınırı */
function computeReturnAxisCap(values: number[]): number {
  const abs = values
    .filter((v) => Number.isFinite(v))
    .map(Math.abs)
    .sort((a, b) => a - b);
  if (abs.length === 0) return 20;
  if (abs.length === 1) return Math.min(Math.max(abs[0] * 1.2, 10), 50);

  const median = abs[Math.floor(abs.length / 2)];
  const core = abs.filter((v) => v <= Math.max(median * 2.5, 20));
  const ref = (core.length > 0 ? core[core.length - 1] : median) ?? median;
  return Math.min(Math.max(ref * 1.35, 10), 45);
}

function clampReturnPct(value: number, cap: number): number {
  return Math.max(-cap, Math.min(cap, value));
}

interface CumulativeYearRow {
  label: string;
  startTRY: number;
  endTRY: number;
  startUSD: number;
  endUSD: number;
  returnTRY: number | null;
  returnUSD: number | null;
  isTotal?: boolean;
}

function periodReturnPct(start: number, end: number): number | null {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0) return null;
  return ((end / start) - 1) * 100;
}

function ReturnCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-[var(--color-muted)]">—</span>;
  const positive = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums text-center min-w-[56px] shadow-sm shrink-0",
        positive
          ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
          : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
      )}
    >
      {formatPercent(pct)}
    </span>
  );
}

/**
 * Onceki nokta yalnizca ayni veri kapsamindan geliyorsa (backlog oncesi /
 * sonrasi) karsilastirmada kullanilir; kaynak sinirini asan kiyaslar
 * yaniltici sicramalar uretir.
 */
function comparablePoint(
  current: GrowthPointDTO,
  previous: GrowthPointDTO | null | undefined,
): GrowthPointDTO | null {
  if (!previous) return null;
  if (Boolean(previous.partialData) !== Boolean(current.partialData)) return null;
  return previous;
}

function prevMonthKey(monthKey: string): string | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return null;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isDisplayMonth(monthKey: string): boolean {
  const y = Number(monthKey.slice(0, 4));
  return y >= GROWTH_DISPLAY_FROM_YEAR;
}

function latestDisplayYear(series: GrowthPointDTO[]): string {
  const ys = [
    ...new Set(
      series
        .filter((p) => isDisplayMonth(p.month))
        .map((p) => p.month.slice(0, 4)),
    ),
  ].sort((a, b) => Number(a) - Number(b));
  return ys.length > 0 ? ys[ys.length - 1]! : YEAR_FILTER_ALL;
}

/** Tam seride yilin son ayi (yuzde karsilastirmasi icin). */
function yearEndFromSeries(
  all: GrowthPointDTO[],
  year: number,
): GrowthPointDTO | null {
  const prefix = `${year}-`;
  const months = all
    .filter((p) => p.month.startsWith(prefix))
    .sort((a, b) => a.month.localeCompare(b.month));
  return months[months.length - 1] ?? null;
}

function changeVsPrevious(
  current: number,
  previous: number | null | undefined,
): number | null {
  if (previous == null || previous <= 0) return null;
  return periodReturnPct(previous, current);
}

const tdClsStatic = "px-4 py-2 text-xs tabular-nums whitespace-nowrap";

/** Aylik Dagilim Tablosu Hucre Bileseni (Tutar, Degisim % ve Pay % Modlari). */
function MonthlyBreakdownCell({
  current,
  previous,
  total,
  currency,
  mode,
  bold,
  className,
}: {
  current: number;
  previous: number | null | undefined;
  total: number;
  currency: "TRY" | "USD";
  mode: "amount" | "return" | "share";
  bold?: boolean;
  className?: string;
}) {
  const hasValue = current > 0;

  if (mode === "amount") {
    return (
      <td className={cn(tdClsStatic, "py-2.5 text-right align-middle", className)}>
        <span
          className={cn(
            "tabular-nums text-xs",
            bold ? "font-black text-[var(--color-foreground)]" : "font-semibold text-[var(--color-foreground)]/90",
            !hasValue && "text-[var(--color-muted)] font-normal"
          )}
        >
          {hasValue ? formatMoney(current, currency) : "—"}
        </span>
      </td>
    );
  }

  if (mode === "return") {
    const pct = hasValue ? changeVsPrevious(current, previous) : null;
    const neutral = pct != null && Math.abs(pct) < 0.05;

    if (!hasValue || pct == null) {
      return (
        <td className={cn(tdClsStatic, "py-2.5 text-right align-middle", className)}>
          <span className="text-xs text-[var(--color-muted)] font-normal">—</span>
        </td>
      );
    }

    if (bold) {
      // Sadece Toplam sütununda kutu/rozet efekti
      return (
        <td className={cn(tdClsStatic, "py-2.5 text-right align-middle", className)}>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums border shadow-2xs whitespace-nowrap",
              neutral
                ? "text-[var(--color-muted)] bg-[var(--color-surface-muted)]/50 border-transparent"
                : pct > 0
                  ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)] border-emerald-500/20"
                  : "bg-[var(--color-loss-soft)] text-[var(--color-loss)] border-rose-500/20"
            )}
          >
            <span className="text-[9px] select-none">{neutral ? "" : pct > 0 ? "▲" : "▼"}</span>
            <span>{neutral ? "%0,0" : formatPercent(pct, 1)}</span>
          </span>
        </td>
      );
    }

    // BES, BIST, TEFAS, Fon, Döviz gibi varlık kolonlarında kutusuz, sade renkli metin
    return (
      <td className={cn(tdClsStatic, "py-2.5 text-right align-middle", className)}>
        <span
          className={cn(
            "tabular-nums text-xs font-bold whitespace-nowrap inline-flex items-center justify-end gap-1",
            neutral
              ? "text-[var(--color-muted)]"
              : pct > 0
                ? "text-[var(--color-profit)]"
                : "text-[var(--color-loss)]"
          )}
        >
          <span className="text-[8px] select-none">{neutral ? "" : pct > 0 ? "▲" : "▼"}</span>
          <span>{neutral ? "%0,0" : formatPercent(pct, 1)}</span>
        </span>
      </td>
    );
  }

  // mode === "share" (Portföy Payı)
  const sharePct = hasValue && total > 0 ? (current / total) * 100 : 0;
  return (
    <td className={cn(tdClsStatic, "py-2.5 text-right align-middle", className)}>
      {hasValue && sharePct > 0 ? (
        <span className={cn("tabular-nums text-xs", bold ? "font-black text-[var(--color-foreground)]" : "font-semibold text-[var(--color-foreground)]/90")}>
          %{sharePct.toFixed(1)}
        </span>
      ) : (
        <span className="text-xs text-[var(--color-muted)] font-normal">—</span>
      )}
    </td>
  );
}

export interface PeriodReturnsDTO {
  dailyTRY: number | null;
  dailyUSD: number | null;
  weeklyTRY: number | null;
  weeklyUSD: number | null;
  mtdTRY: number | null;
  mtdUSD: number | null;
  monthlyTRY: number | null;
  monthlyUSD: number | null;
  ytdTRY: number | null;
  ytdUSD: number | null;
  oneYearTRY?: number | null;
  oneYearUSD?: number | null;
}

export function GrowthClient({
  series,
  periodReturns,
}: {
  series: GrowthPointDTO[];
  periodReturns?: PeriodReturnsDTO;
}) {
  const { currency } = useCurrency();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const isTRY = currency === "TRY";

  /** Grafik ve tablolar; 2022 yalnizca yuzde bazinda kullanilir. */
  const displaySeries = useMemo(
    () => series.filter((p) => isDisplayMonth(p.month)),
    [series],
  );

  const seriesByMonth = useMemo(() => {
    const m = new Map<string, GrowthPointDTO>();
    for (const p of series) m.set(p.month, p);
    return m;
  }, [series]);

  const years = useMemo(() => {
    const set = new Set(displaySeries.map((p) => p.month.slice(0, 4)));
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [displaySeries]);

  const [yearFilter, setYearFilter] = useState<string>(() =>
    latestDisplayYear(series),
  );
  const [chartYearFilter, setChartYearFilter] = useState<string>(YEAR_FILTER_ALL);
  const [chartType, setChartType] = useState<"area" | "bar">("bar");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("return");
  const [monthlyViewMode, setMonthlyViewMode] = useState<"amount" | "return" | "share">("amount");

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const row = payload[0].payload as ChartRow;
    if (!row || !row.originalPoint) return null;

    const [y, m] = row.originalPoint.month.split("-").map(Number);
    const dateLabel = new Intl.DateTimeFormat("tr-TR", {
      month: "long",
      year: "numeric",
    }).format(new Date(y, m - 1, 1));

    if (chartMetric === "return") {
      const actual = row.returnPct;
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl text-xs space-y-2 min-w-[180px]">
          <div className="font-bold border-b border-[var(--color-border)]/40 pb-1 text-[var(--color-foreground)]">
            {dateLabel}
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-[var(--color-muted)] font-medium">Aylık Getiri</span>
            <span className={cn("font-bold tabular-nums", (actual ?? 0) >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
              {formatPercent(actual ?? 0)}
            </span>
          </div>
        </div>
      );
    }

    const diff = row.value - row.cost;
    const ret = row.cost > 0 ? (diff / row.cost) * 100 : null;

    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-xl text-xs space-y-3 min-w-[240px]">
        <div className="font-bold border-b border-[var(--color-border)]/40 pb-1.5 flex justify-between items-center text-[var(--color-foreground)]">
          <span>{dateLabel}</span>
          {ret != null && (
            <span className={cn("font-semibold tabular-nums px-1.5 py-0.5 rounded text-[10px]", diff >= 0 ? "bg-[var(--color-profit)]/10 text-[var(--color-profit)]" : "bg-[var(--color-loss)]/10 text-[var(--color-loss)]")}>
              {formatPercent(ret)}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-muted)] font-medium">Toplam Değer</span>
            <span className="font-bold tabular-nums text-[var(--color-brand-strong)]">
              {formatMoney(row.value, currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-muted)]">Toplam Maliyet</span>
            <span className="font-semibold tabular-nums text-[var(--color-muted)]">
              {formatMoney(row.cost, currency)}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-[var(--color-border)]/40 pt-1.5 mt-1">
            <span className="text-[var(--color-muted)]">Net Kar / Zarar</span>
            <span className={cn("font-bold tabular-nums", diff >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
              {diff >= 0 ? "+" : ""}
              {formatMoney(diff, currency)}
            </span>
          </div>
        </div>

        {/* Kırılım (Breakdown) */}
        <div className="border-t border-[var(--color-border)]/40 pt-2 space-y-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
            Varlık Dağılımı
          </div>
          <div className="grid grid-cols-1 gap-1">
            {activeTypes.map((t) => {
              const rawVal = row[`${t}_raw`] ?? (chartMetric === "allocation" ? (row.value > 0 ? (row[t] * row.value) / 100 : 0) : row[t]);
              if (!rawVal || rawVal <= 0) return null;
              const share = row.value > 0 ? (rawVal / row.value) * 100 : 0;
              return (
                <div key={t} className="flex justify-between items-center text-[var(--color-foreground)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_META[t].color }} />
                    <span className="text-[var(--color-muted)]">{ASSET_META[t].label}</span>
                  </div>
                  <div className="space-x-1.5 tabular-nums">
                    <span className="font-semibold">{formatMoney(rawVal, currency)}</span>
                    <span className="text-[10px] text-[var(--color-muted)]">({share.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const selectYearValue =
    yearFilter === YEAR_FILTER_ALL || years.includes(yearFilter)
      ? yearFilter
      : YEAR_FILTER_ALL;

  const monthlyRows = useMemo(() => {
    const filtered =
      selectYearValue === YEAR_FILTER_ALL
        ? displaySeries
        : displaySeries.filter((p) => p.month.startsWith(selectYearValue));
    return filtered.slice().sort((a, b) => a.month.localeCompare(b.month));
  }, [displaySeries, selectYearValue]);


  const activeTypes = useMemo(() => {
    const has = new Set<AssetType>();
    for (const p of displaySeries) {
      for (const t of TABLE_TYPES) {
        if (typeValue(p, t, currency) > 0) has.add(t);
      }
    }
    return TABLE_TYPES.filter((t) => has.has(t));
  }, [displaySeries, currency]);

  /** Kumulatif tabloda secilebilir yillar (sentetik baz ayi haric, tum gecmis). */
  const cumulativeYears = useMemo(() => {
    const set = new Set(
      series
        .filter((p) => !p.isSyntheticBaseline)
        .map((p) => p.month.slice(0, 4)),
    );
    return [...set].sort((a, b) => Number(a) - Number(b));
  }, [series]);

  const [cumulativeFromYear, setCumulativeFromYear] =
    useState<string>(YEAR_FILTER_ALL);
  const cumulativeFromValue =
    cumulativeFromYear === YEAR_FILTER_ALL ||
    cumulativeYears.includes(cumulativeFromYear)
      ? cumulativeFromYear
      : YEAR_FILTER_ALL;

  const cumulativeYearlyRows = useMemo((): CumulativeYearRow[] => {
    const pts = series
      .filter(
        (p) =>
          !p.isSyntheticBaseline &&
          (cumulativeFromValue === YEAR_FILTER_ALL ||
            p.month.slice(0, 4) >= cumulativeFromValue),
      )
      .sort((a, b) => a.month.localeCompare(b.month));
    if (pts.length === 0) return [];

    const byYear = new Map<string, GrowthPointDTO[]>();
    for (const p of pts) {
      const y = p.month.slice(0, 4);
      const arr = byYear.get(y) ?? [];
      arr.push(p);
      byYear.set(y, arr);
    }

    // Onceki Aralik icin tum seriden (filtre disi yillar dahil) lookup
    const fullByMonth = new Map<string, GrowthPointDTO>();
    for (const p of series) {
      if (!p.isSyntheticBaseline) fullByMonth.set(p.month, p);
    }

    const rows: CumulativeYearRow[] = [];
    let totalStartPoint: GrowthPointDTO | null = null;
    for (const year of [...byYear.keys()].sort()) {
      const months = byYear.get(year)!;
      const last = months[months.length - 1];

      // Onceki yilin Aralik degeri yalnizca ayni veri kaynagindan geliyorsa
      // yil baslangici olarak kullanilir; aksi halde yilin ilk ayi baz alinir.
      const prevDec = fullByMonth.get(`${Number(year) - 1}-12`);
      const startPoint = comparablePoint(months[0], prevDec) ?? months[0];
      if (!totalStartPoint) totalStartPoint = startPoint;

      rows.push({
        label: year,
        startTRY: startPoint.valueTRY,
        endTRY: last.valueTRY,
        startUSD: startPoint.valueUSD,
        endUSD: last.valueUSD,
        returnTRY: periodReturnPct(startPoint.valueTRY, last.valueTRY),
        returnUSD: periodReturnPct(startPoint.valueUSD, last.valueUSD),
      });
    }

    const totalLast = pts[pts.length - 1];
    const totalStart = totalStartPoint ?? pts[0];
    rows.push({
      label: "TOPLAM",
      startTRY: totalStart.valueTRY,
      endTRY: totalLast.valueTRY,
      startUSD: totalStart.valueUSD,
      endUSD: totalLast.valueUSD,
      returnTRY: periodReturnPct(totalStart.valueTRY, totalLast.valueTRY),
      returnUSD: periodReturnPct(totalStart.valueUSD, totalLast.valueUSD),
      isTotal: true,
    });

    return rows;
  }, [series, cumulativeFromValue]);

  async function buildHistory() {
    setBuilding(true);
    setProgress("Kur ve borsa verileri çekiliyor...");
    try {
      await fetch("/api/history/backfill?phase=yahoo", { method: "POST" });
      for (let i = 0; i < 60; i++) {
        const res = await fetch("/api/history/backfill?phase=tefas", {
          method: "POST",
        });
        const data = await res.json();
        if (data.total > 0) {
          const done = data.total - data.remaining;
          setProgress(`TEFAS geçmişi: ${done}/${data.total} ay`);
        }
        if (data.done) break;
      }
    } finally {
      setProgress("");
      setBuilding(false);
      startTransition(() => router.refresh());
    }
  }

  const chartYearValue =
    chartYearFilter === YEAR_FILTER_ALL || years.includes(chartYearFilter)
      ? chartYearFilter
      : YEAR_FILTER_ALL;

  const chartData = useMemo((): ChartRow[] => {
    const filtered =
      chartYearValue === YEAR_FILTER_ALL
        ? displaySeries
        : displaySeries.filter((p) => p.month.startsWith(chartYearValue));
    const sorted = filtered
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month));
    return sorted.map((p, i) => {
      const value = isTRY ? p.valueTRY : p.valueUSD;
      const cost = isTRY ? p.costTRY : p.costUSD;
      let prev = i > 0 ? sorted[i - 1] : null;
      if (!prev) {
        const pk = prevMonthKey(p.month);
        prev = pk ? (seriesByMonth.get(pk) ?? null) : null;
      }
      prev = comparablePoint(p, prev);
      const prevVal = prev
        ? isTRY
          ? prev.valueTRY
          : prev.valueUSD
        : null;
      const returnPct =
        prevVal != null && prevVal > 0 ? ((value / prevVal) - 1) * 100 : null;

      // Her bir varlık türünün güncel değerini ekle (Dağılım modu için %0-100 oransal değer)
      const allocationValues: Record<string, number> = {};
      for (const t of TABLE_TYPES) {
        const rawVal = typeValue(p, t, currency);
        allocationValues[t] = chartMetric === "allocation"
          ? (value > 0 ? Number(((rawVal / value) * 100).toFixed(2)) : 0)
          : rawVal;
        allocationValues[`${t}_raw`] = rawVal;
      }

      return {
        month: monthTableLabel(p.month),
        value,
        cost,
        returnPct,
        ...allocationValues,
        originalPoint: p,
      };
    });
  }, [displaySeries, chartYearValue, isTRY, currency, seriesByMonth, chartMetric]);

  const chartTitle =
    chartMetric === "value"
      ? "Aylık Değer ve Maliyet"
      : chartMetric === "allocation"
        ? "Varlık Dağılımı ve Portföy Yapısı (% Pay)"
        : "Aylık Portföy Getirisi (%)";

  const showReturnMetric = chartMetric === "return";

  const returnChartMeta = useMemo(() => {
    const base = chartData.filter((d) => d.returnPct != null);
    const values = base.map((d) => d.returnPct!);
    const cap = computeReturnAxisCap(values);
    const plot = base.map((d) => {
      const actual = d.returnPct!;
      return {
        ...d,
        returnPctPlot: clampReturnPct(actual, cap),
        returnClamped: Math.abs(actual) > cap + 0.01,
      };
    });
    return {
      cap,
      plot,
      domain: [-cap, cap] as [number, number],
      hasClamped: plot.some((d) => d.returnClamped),
    };
  }, [chartData]);

  const plotData = showReturnMetric ? returnChartMeta.plot : chartData;
  const chartYDomain = useMemo(() => {
    if (showReturnMetric) {
      return returnChartMeta.domain;
    }
    if (chartMetric === "allocation") {
      return [0, 100] as [number, number];
    }
    return [
      (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.94)),
      (dataMax: number) => Math.ceil(dataMax * 1.04),
    ] as any;
  }, [showReturnMetric, chartMetric, returnChartMeta.domain]);
  const returnAxisCap = showReturnMetric ? returnChartMeta.cap : 0;
  const hasClampedReturns = showReturnMetric && returnChartMeta.hasClamped;

  const periodSummary = useMemo(() => {
    const filtered =
      chartYearValue === YEAR_FILTER_ALL
        ? [...displaySeries].sort((a, b) => a.month.localeCompare(b.month))
        : displaySeries
            .filter((p) => p.month.startsWith(chartYearValue))
            .sort((a, b) => a.month.localeCompare(b.month));
    if (filtered.length === 0) return null;
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const baselineRaw =
      chartYearValue === YEAR_FILTER_ALL
        ? null
        : yearEndFromSeries(series, Number(chartYearValue) - 1);
    const baseline = comparablePoint(first, baselineRaw);
    const startTRY = baseline?.valueTRY ?? first.valueTRY;
    const startUSD = baseline?.valueUSD ?? first.valueUSD;
    const pnlTRY = last.valueTRY - startTRY;
    const pnlUSD = last.valueUSD - startUSD;
    return {
      first,
      last,
      pnlTRY,
      pnlUSD,
      returnTRY: periodReturnPct(startTRY, last.valueTRY),
      returnUSD: periodReturnPct(startUSD, last.valueUSD),
    };
  }, [displaySeries, chartYearValue, series]);

  const hasData = displaySeries.some((p) => p.valueTRY > 0);
  const accent = "var(--color-brand)";

  const thCls =
    "px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]";
  const tdCls = "px-4 py-2 text-xs tabular-nums whitespace-nowrap";
  const tdMuted = cn(tdCls, "text-[var(--color-muted)]");

  const renderYearSummary = (year: string) => {
    const monthsOfYear = displaySeries.filter((p) => p.month.startsWith(year));
    if (monthsOfYear.length === 0) return null;

    const sortedMonths = monthsOfYear.slice().sort((a, b) => a.month.localeCompare(b.month));
    const lastMonth = sortedMonths[sortedMonths.length - 1];

    const prevDecKey = `${Number(year) - 1}-12`;
    const startMonth =
      comparablePoint(sortedMonths[0], seriesByMonth.get(prevDecKey)) ??
      sortedMonths[0];

    const totalStart = totalValue(startMonth, currency);
    const totalEnd = totalValue(lastMonth, currency);
    const totalReturn = periodReturnPct(totalStart, totalEnd);
    const totalChange = totalEnd - totalStart;

    return (
      <tr
        key={`summary-${year}`}
        className="bg-[var(--color-brand-soft)]/20 font-bold border-y border-[var(--color-border)]/60 text-[var(--color-brand-strong)]"
      >
        <td className="px-4 py-2.5 font-bold whitespace-nowrap sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/20">
          <span className="inline-flex items-center gap-1.5">
            {year} {monthlyViewMode === "return" ? "Getiri %" : monthlyViewMode === "share" ? "Yıl Sonu Payı %" : "Yıllık Değişim"}
          </span>
        </td>
        {activeTypes.map((t) => {
          const startVal = typeValue(startMonth, t, currency);
          const endVal = typeValue(lastMonth, t, currency);
          const valChange = endVal - startVal;
          const pct = (startVal > 0 && endVal > 0) ? periodReturnPct(startVal, endVal) : null;
          const share = totalEnd > 0 && endVal > 0 ? (endVal / totalEnd) * 100 : 0;

          if (monthlyViewMode === "amount") {
            return (
              <td key={t} className={cn(tdClsStatic, "text-right font-bold")}>
                {valChange !== 0 ? (
                  <span className={valChange > 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}>
                    {valChange > 0 ? "+" : ""}
                    {formatMoney(valChange, currency)}
                  </span>
                ) : endVal > 0 ? formatMoney(endVal, currency) : "—"}
              </td>
            );
          }

          if (monthlyViewMode === "share") {
            return (
              <td key={t} className={cn(tdClsStatic, "text-right font-bold")}>
                {share > 0 ? `%{share.toFixed(1)}` : "—"}
              </td>
            );
          }

          return (
            <td
              key={t}
              className={cn(
                tdClsStatic,
                "text-right font-bold",
                pct == null && "text-[var(--color-muted)]",
              )}
            >
              {pct != null ? <ReturnCell pct={pct} /> : "—"}
            </td>
          );
        })}
        {monthlyViewMode === "amount" && (
          <td className={cn(
            tdClsStatic,
            "theme-inset text-right font-bold border-l border-[var(--color-border)]/20",
            totalChange === 0 && "text-[var(--color-muted)]",
            totalChange > 0 && "text-[var(--color-profit)]",
            totalChange < 0 && "text-[var(--color-loss)]"
          )}>
            {totalChange !== 0 ? (
              <span>
                {totalChange > 0 ? "+" : ""}
                {formatMoney(totalChange, currency)}
              </span>
            ) : "—"}
          </td>
        )}
        <td className="px-4 py-2.5 text-right font-bold border-l-2 border-[var(--color-border)]/60 bg-[var(--color-brand-soft)]/30">
          {monthlyViewMode === "amount" ? (
            formatMoney(totalEnd, currency)
          ) : monthlyViewMode === "share" ? (
            "%100,0"
          ) : (
            totalReturn != null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums border shadow-2xs whitespace-nowrap",
                  totalReturn >= 0
                    ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)] border-emerald-500/20"
                    : "bg-[var(--color-loss-soft)] text-[var(--color-loss)] border-rose-500/20"
                )}
              >
                <span>{totalReturn >= 0 ? "▲ +" : "▼ "}{formatPercent(totalReturn, 1)}</span>
              </span>
            ) : "—"
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portföy Gelişimi</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {building && progress && (
            <span className="text-xs text-[var(--color-muted)]">{progress}</span>
          )}
          <button
            onClick={buildHistory}
            disabled={building || pending}
            className="btn btn-outline"
            title="Yahoo Finance ve TEFAS üzerinden geçmiş kurları ve varlık fiyatlarını çekerek portföy değerlerini günceller."
          >
            <History size={15} className={cn(building && "animate-spin")} />
            {building ? "Oluşturuluyor..." : "Geçmişi Güncelle"}
          </button>
        </div>
      </div>

      <BackfillStatusBanner />

      {!hasData ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <TrendingUp className="text-[var(--color-muted)]" size={32} />
          <p className="font-semibold">Geçmiş veri henüz yok</p>
          <p className="text-sm text-[var(--color-muted)] max-w-md">
            İşlemleriniz üzerinden geçmiş fiyatları çekerek portföy gelişimini
            oluşturabilirsiniz.
          </p>
          <button
            onClick={buildHistory}
            disabled={building || pending}
            className="btn btn-primary mt-2"
            title="Yahoo Finance ve TEFAS üzerinden geçmiş kurları ve varlık fiyatlarını çekerek portföy değerlerini oluşturur."
          >
            <History size={16} className={cn(building && "animate-spin")} />
            {building ? "Oluşturuluyor..." : "Geçmişi Oluştur"}
          </button>
          {building && progress && (
            <p className="text-xs text-[var(--color-muted)]">{progress}</p>
          )}
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--color-border)]/40">
              {/* Header Title & Subtitle */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-black shadow-xs">
                  {chartMetric === "return" ? (
                    <BarChart2 size={20} />
                  ) : chartMetric === "value" ? (
                    <TrendingUp size={20} />
                  ) : (
                    <PieChart size={20} />
                  )}
                </div>
                <div>
                  <h2 className="font-black text-base text-[var(--color-foreground)] leading-tight">
                    {chartTitle}
                  </h2>
                  <p className="text-[11px] text-[var(--color-muted)] font-medium">
                    {chartMetric === "return" && "Her ayın yüzde kâr/zarar getiri oranları"}
                    {chartMetric === "value" && "Zaman içindeki toplam portföy tutarı ve maliyet gelişimi"}
                    {chartMetric === "allocation" && "Varlık türlerinin (TEFAS, BES, BIST vb.) portföy içerisindeki oransal ağırlıkları (%0 - %100)"}
                  </p>
                </div>
              </div>

              {/* Toolbar Controls (Mobilde Taşmayı Önleyen Şerit) */}
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                {/* Descriptive View Mode Selector */}
                <div className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/50 shadow-2xs overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setChartMetric("return");
                      setChartType("bar");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 whitespace-nowrap",
                      chartMetric === "return"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/50"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <BarChart2 size={13} />
                    <span>Aylık Getiri %</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChartMetric("value");
                      setChartType("area");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 whitespace-nowrap",
                      chartMetric === "value"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/50"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <DollarSign size={13} />
                    <span>Portföy Değeri</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChartMetric("allocation");
                      setChartType("area");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-extrabold transition-all duration-200 whitespace-nowrap",
                      chartMetric === "allocation"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/50"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <PieChart size={13} />
                    <span>Varlık Dağılımı</span>
                  </button>
                </div>

                {/* Compact Year Selector Dropdown with Calendar Icon */}
                <div className="flex items-center gap-2 bg-[var(--color-surface-muted)] px-3 py-1.5 rounded-xl border border-[var(--color-border)]/50 shadow-2xs">
                  <Calendar size={13} className="text-[var(--color-brand-strong)]" />
                  <select
                    id="chart-year"
                    value={chartYearValue}
                    onChange={(e) => setChartYearFilter(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-[var(--color-foreground)] outline-none cursor-pointer"
                  >
                    <option value={YEAR_FILTER_ALL}>Tüm Zamanlar</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y} Yılı
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subtle Chart Format Toggle (Alan / Çubuk) */}
                <div className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/50">
                  <button
                    type="button"
                    onClick={() => setChartType("bar")}
                    title="Çubuk Grafik Görünümü"
                    className={cn(
                      "p-1.5 rounded-lg text-xs font-bold transition-all",
                      chartType === "bar"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-2xs"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <BarChart2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType("area")}
                    title="Alan (Çizgi) Grafik Görünümü"
                    className={cn(
                      "p-1.5 rounded-lg text-xs font-bold transition-all",
                      chartType === "area"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-2xs"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                    )}
                  >
                    <Activity size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Elevated Glassmorphic KPI Summary Cards */}
            {periodSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Card className="p-4 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-1 hover:border-[var(--color-brand)]/30 transition-all">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    <span>TOPLAM PORTFÖY</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-foreground)] font-black text-[9px]">₺ TRY</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-[var(--color-foreground)] tracking-tight">
                    {formatMoney(periodSummary.last.valueTRY, "TRY")}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] font-medium">
                    {formatPeriodDate(periodSummary.last.month)}
                  </p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-1 hover:border-[var(--color-brand)]/30 transition-all">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    <span>DÖNEM GETİRİSİ</span>
                    {periodSummary.returnTRY != null && (
                      <span className={cn("px-2 py-0.5 rounded-full font-black text-[10px]", periodSummary.returnTRY >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                        {formatPercent(periodSummary.returnTRY)}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-black tabular-nums tracking-tight",
                      periodSummary.pnlTRY >= 0
                        ? "text-[var(--color-profit)]"
                        : "text-[var(--color-loss)]",
                    )}
                  >
                    {periodSummary.pnlTRY >= 0 ? "+" : ""}
                    {formatMoney(periodSummary.pnlTRY, "TRY")}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] font-medium">Net ₺ kazanç/kayıp</p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-1 hover:border-[var(--color-brand)]/30 transition-all">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    <span>DÖNEM BAŞLANGIÇ</span>
                    <span className="px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)] font-bold text-[9px]">BAZ DEĞER</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-[var(--color-foreground)] tracking-tight">
                    {formatMoney(periodSummary.first.valueTRY, "TRY")}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] font-medium">
                    {formatPeriodDate(periodSummary.first.month)}
                  </p>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-1 hover:border-[var(--color-brand)]/30 transition-all">
                  <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    <span>TOPLAM PORTFÖY ($)</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-black text-[9px]">$ USD</span>
                  </div>
                  <p className="text-2xl font-black tabular-nums text-[var(--color-foreground)] tracking-tight">
                    {formatMoney(periodSummary.last.valueUSD, "USD")}
                  </p>
                  {periodSummary.returnUSD != null && (
                    <p
                      className={cn(
                        "text-xs font-extrabold tabular-nums",
                        periodSummary.returnUSD >= 0
                          ? "text-[var(--color-profit)]"
                          : "text-[var(--color-loss)]",
                      )}
                    >
                      USD Getiri: {formatPercent(periodSummary.returnUSD)}
                    </p>
                  )}
                </Card>
              </div>
            )}

            <div className="h-[400px] pt-2">
              {plotData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)] font-medium">
                  {showReturnMetric
                    ? "Karşılaştırma için en az iki ay gerekir."
                    : "Seçilen dönem için veri yok."}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart
                      data={plotData}
                      margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.01} />
                        </linearGradient>
                        {/* Active asset types gradients */}
                        {activeTypes.map((t) => (
                          <linearGradient key={t} id={`g-${t}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={ASSET_META[t].color} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={ASSET_META[t].color} stopOpacity={0.05} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        strokeOpacity={0.3}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.5 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        width={showReturnMetric ? 56 : chartMetric === "allocation" ? 48 : 70}
                        domain={chartYDomain}
                        tickFormatter={(v) =>
                          showReturnMetric
                            ? formatPercent(Number(v), 1)
                            : chartMetric === "allocation"
                              ? `%${Number(v).toFixed(0)}`
                              : formatMoney(Number(v), currency, { compact: true, decimals: 1 })
                        }
                      />
                      {showReturnMetric && (
                        <ReferenceLine
                          y={0}
                          stroke="var(--color-border)"
                          strokeOpacity={0.6}
                          strokeDasharray="4 4"
                        />
                      )}
                      <Tooltip
                        content={<CustomTooltip />}
                        contentStyle={{ backgroundColor: "transparent", border: "none", padding: 0 }}
                        cursor={{ fill: "color-mix(in srgb, var(--color-muted) 12%, transparent)" }}
                      />
                      <Legend
                        formatter={(v) => {
                          if (showReturnMetric) return "Aylık getiri";
                          if (chartMetric === "allocation") {
                            const assetType = v as AssetType;
                            return ASSET_META[assetType]?.label ?? v;
                          }
                          return v === "value" ? "Değer" : "Maliyet";
                        }}
                        iconType="circle"
                      />
                      {showReturnMetric ? (
                        <Area
                          type="monotone"
                          dataKey="returnPctPlot"
                          stroke="var(--color-brand)"
                          strokeWidth={3}
                          fill="url(#gr)"
                          name="returnPctPlot"
                          activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: "var(--color-brand)" }}
                        />
                      ) : chartMetric === "allocation" ? (
                        activeTypes.map((t) => (
                          <Area
                            key={t}
                            type="monotone"
                            dataKey={t}
                            stackId="1"
                            stroke={ASSET_META[t].color}
                            strokeWidth={2}
                            fill={`url(#g-${t})`}
                            name={t}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                          />
                        ))
                      ) : (
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="var(--color-brand)"
                          strokeWidth={3}
                          fill="url(#gv)"
                          activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: "var(--color-brand)" }}
                        />
                      )}
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={plotData}
                      margin={{ top: 25, right: 10, left: 0, bottom: 0 }}
                      barGap={showReturnMetric ? 0 : 2}
                    >
                      <defs>
                        <linearGradient id="bar-profit-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="bar-loss-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        strokeOpacity={0.3}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.5 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        width={showReturnMetric ? 56 : chartMetric === "allocation" ? 48 : 70}
                        domain={chartYDomain}
                        tickFormatter={(v) =>
                          showReturnMetric
                            ? formatPercent(Number(v), 1)
                            : chartMetric === "allocation"
                              ? `%${Number(v).toFixed(0)}`
                              : formatMoney(Number(v), currency, { compact: true, decimals: 1 })
                        }
                      />
                      {showReturnMetric && (
                        <ReferenceLine
                          y={0}
                          stroke="var(--color-border)"
                          strokeOpacity={0.6}
                          strokeDasharray="4 4"
                        />
                      )}
                      <Tooltip
                        content={<CustomTooltip />}
                        contentStyle={{ backgroundColor: "transparent", border: "none", padding: 0 }}
                        cursor={{ fill: "color-mix(in srgb, var(--color-muted) 12%, transparent)" }}
                      />
                      <Legend
                        formatter={(v) => {
                          if (showReturnMetric) return "Aylık getiri";
                          if (chartMetric === "allocation") {
                            const assetType = v as AssetType;
                            return ASSET_META[assetType]?.label ?? v;
                          }
                          return v === "value" ? "Değer" : "Maliyet";
                        }}
                        iconType="circle"
                      />
                      {showReturnMetric ? (
                        <Bar
                          dataKey="returnPctPlot"
                          name="returnPctPlot"
                          radius={[5, 5, 0, 0]}
                        >
                          {plotData.map((row, i) => (
                            <Cell
                              key={i}
                              fill={
                                (row.returnPct ?? 0) >= 0
                                  ? "url(#bar-profit-grad)"
                                  : "url(#bar-loss-grad)"
                              }
                            />
                          ))}
                          <LabelList
                            dataKey="returnPct"
                            content={(props: any) => {
                              const { x, y, width, height, value } = props;
                              if (value == null) return null;
                              const val = Number(value);
                              const isPositive = val >= 0;
                              const labelY = isPositive ? y - 6 : y + height + 12;
                              return (
                                <text
                                  x={x + width / 2}
                                  y={labelY}
                                  fill={isPositive ? "#10b981" : "#f43f5e"}
                                  textAnchor="middle"
                                  fontSize={9}
                                  fontWeight={700}
                                >
                                  {val > 0 ? `+${val.toFixed(1)}%` : `${val.toFixed(1)}%`}
                                </text>
                              );
                            }}
                          />
                        </Bar>
                      ) : chartMetric === "allocation" ? (
                        activeTypes.map((t, index) => (
                          <Bar
                            key={t}
                            dataKey={t}
                            stackId="1"
                            fill={ASSET_META[t].color}
                            name={t}
                            radius={index === activeTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))
                      ) : (
                        <Bar
                          dataKey="value"
                          fill="var(--color-brand)"
                          name="value"
                          radius={[6, 6, 0, 0]}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: any) => formatMoney(Number(v), currency, { compact: true })}
                            style={{ fill: "var(--color-foreground)", fontSize: 8, fontWeight: 700 }}
                          />
                        </Bar>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
            {hasClampedReturns && (
              <p className="mt-3 text-xs text-[var(--color-muted)]">
                Aykırı getiri ayları grafikte ±{returnAxisCap.toFixed(0)}% ile
                sınırlandı; çubuğun üzerine gelerek gerçek yüzdeyi görebilirsiniz.
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-sm">Kümülatif Yıllık Özet</h2>
              {cumulativeYears.length > 1 && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="cumulative-from-year"
                    className="text-xs font-semibold text-[var(--color-muted)]"
                  >
                    Gösterim başlangıcı
                  </label>
                  <select
                    id="cumulative-from-year"
                    value={cumulativeFromValue}
                    onChange={(e) => setCumulativeFromYear(e.target.value)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] transition-colors duration-200"
                  >
                    <option value={YEAR_FILTER_ALL}>Tüm yıllar</option>
                    {cumulativeYears.map((y) => (
                      <option key={y} value={y}>
                        {y} ve sonrası
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* Kümülatif Yıllık Performans — Mobilde Kart, Masaüstünde Tablo */}
            {/* Mobilde Kart Görünümü */}
            <div className="md:hidden divide-y divide-[var(--color-border)]/40">
              {cumulativeYearlyRows.map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    "p-4 space-y-2.5",
                    row.isTotal && "bg-[var(--color-brand-soft)]/20 border-t border-b-2 border-t-[var(--color-border)]/80 border-b-[var(--color-border)]/80"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-[var(--color-foreground)]">
                      {row.label} {row.isTotal ? "PERFORMANSI" : "YILI"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <ReturnCell pct={row.returnTRY} />
                      {row.returnUSD != null && (
                        <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
                          USD: {formatPercent(row.returnUSD)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--color-surface-muted)]/50 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] font-extrabold block">
                        TRY Değer (Başlangıç → Bitiş)
                      </span>
                      <span className="text-xs font-black tabular-nums text-[var(--color-foreground)]">
                        {formatMoney(row.startTRY, "TRY")} → {formatMoney(row.endTRY, "TRY")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--color-muted)] font-extrabold block">
                        USD Değer (Başlangıç → Bitiş)
                      </span>
                      <span className="text-xs font-black tabular-nums text-indigo-400">
                        {formatMoney(row.startUSD, "USD")} → {formatMoney(row.endUSD, "USD")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Masaüstünde Tablo Görünümü */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="theme-table-head">
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className={thCls}>Yıl</th>
                    <th className={cn(thCls, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                        Başlangıç (₺)
                      </span>
                    </th>
                    <th className={cn(thCls, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                        Bitiş (₺)
                      </span>
                    </th>
                    <th className={cn(thCls, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                        Başlangıç ($)
                      </span>
                    </th>
                    <th className={cn(thCls, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                        Bitiş ($)
                      </span>
                    </th>
                    <th className={cn(thCls, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                        Kümülatif Getiri (₺)
                      </span>
                    </th>
                    <th className={cn(thCls, "text-right")}>
                      <span className="inline-flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-blue-500" />
                        Kümülatif Getiri ($)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeYearlyRows.map((row) => (
                    <tr
                      key={row.label}
                      className={cn(
                        "theme-surface-hover border-b border-[var(--color-border)]/40 last:border-0 transition-colors duration-150",
                        row.isTotal && "bg-[var(--color-brand-soft)]/20 font-bold border-t border-b-2 border-t-[var(--color-border)]/80 border-b-[var(--color-border)]/80 text-[var(--color-brand-strong)]",
                      )}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">{row.label}</td>
                      <td className={cn(tdCls, "text-right")}>
                        {formatMoney(row.startTRY, "TRY")}
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        {formatMoney(row.endTRY, "TRY")}
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        {formatMoney(row.startUSD, "USD")}
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        {formatMoney(row.endUSD, "USD")}
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        <ReturnCell pct={row.returnTRY} />
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        <ReturnCell pct={row.returnUSD} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Aylık Dağılım Tablosu — Mobilde Kart, Masaüstünde Tablo */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-bold text-sm text-[var(--color-foreground)]">Aylık Dağılım</h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5 font-medium">
                  {monthlyViewMode === "amount" && `Ay sonu net varlık bakiyeleri (${currency === "TRY" ? "₺" : "$"})`}
                  {monthlyViewMode === "return" && "Varlıkların bir önceki aya göre getiri yüzdesi (%)"}
                  {monthlyViewMode === "share" && "Varlıkların toplam portföy içerisindeki yüzde ağırlığı (% Pay)"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Görünüm Modu Seçici (Toggle Switch) */}
                <div className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/50 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setMonthlyViewMode("amount")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-extrabold transition-all duration-200 cursor-pointer select-none",
                      monthlyViewMode === "amount"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/50"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    <span>💰 Tutar ({currency === "TRY" ? "₺" : "$"})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMonthlyViewMode("return")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-extrabold transition-all duration-200 cursor-pointer select-none",
                      monthlyViewMode === "return"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/50"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    <span>📈 Değişim (%)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMonthlyViewMode("share")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-extrabold transition-all duration-200 cursor-pointer select-none",
                      monthlyViewMode === "share"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/50"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    )}
                  >
                    <span>📊 Portföy Payı (%)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="growth-year"
                    className="text-xs font-semibold text-[var(--color-muted)]"
                  >
                    Yıl
                  </label>
                  <select
                    id="growth-year"
                    value={selectYearValue}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] transition-colors duration-200"
                  >
                    <option value={YEAR_FILTER_ALL}>Tümü</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mobilde Görünüm (Aylık Dağılım Kartları) */}
            <div className="md:hidden divide-y divide-[var(--color-border)]/40">
              {monthlyRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-muted)] font-medium">
                  {selectYearValue === YEAR_FILTER_ALL
                    ? "Kayıt yok."
                    : "Bu yıl için kayıt yok."}
                </div>
              ) : (
                monthlyRows.map((p) => {
                  const prevKey = prevMonthKey(p.month);
                  const prevPoint = comparablePoint(
                    p,
                    prevKey ? seriesByMonth.get(prevKey) : null
                  );
                  const total = totalValue(p, currency);
                  const prevTotal = prevPoint ? totalValue(prevPoint, currency) : null;
                  const momChange = prevTotal !== null ? total - prevTotal : null;
                  const momPct = (prevTotal !== null && prevTotal > 0) ? periodReturnPct(prevTotal, total) : null;

                  return (
                    <div key={p.month} className="p-4 space-y-3 hover:bg-[var(--color-surface-muted)]/20 transition-colors">
                      {/* Header Row: Month Label + Total Value + MoM Change */}
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)]/30 pb-2.5">
                        <div>
                          <span className="font-extrabold text-sm text-[var(--color-foreground)] block">
                            {monthTableLabel(p.month)}
                          </span>
                          <span className="text-[10px] text-[var(--color-muted)] font-semibold">
                            {monthlyViewMode === "amount" ? "Aylık Portföy Değeri" : monthlyViewMode === "return" ? "Aylık Portföy Getirisi" : "Aylık Varlık Payları"}
                          </span>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-sm tabular-nums text-[var(--color-foreground)]">
                            {monthlyViewMode === "share" ? "%100,0" : formatMoney(total, currency)}
                          </div>
                          {monthlyViewMode === "return" && momPct !== null && (
                            <span
                              className={cn(
                                "text-[10px] font-extrabold tabular-nums block",
                                momPct > 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
                              )}
                            >
                              {momPct > 0 ? "▲ +" : momPct < 0 ? "▼ " : ""}{formatPercent(momPct, 1)}
                            </span>
                          )}
                          {monthlyViewMode === "amount" && momChange !== null && (
                            <span
                              className={cn(
                                "text-[10px] font-extrabold tabular-nums block",
                                momChange > 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
                              )}
                            >
                              {momChange > 0 ? "▲ +" : momChange < 0 ? "▼ " : ""}
                              {formatMoney(momChange, currency)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Asset Breakdown Badges Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {activeTypes.map((t) => {
                          const val = typeValue(p, t, currency);
                          if (val <= 0) return null;
                          const prevVal = prevPoint ? typeValue(prevPoint, t, currency) : null;
                          const pctChange = (val > 0 && prevVal != null && prevVal > 0) ? periodReturnPct(prevVal, val) : null;
                          const sharePct = total > 0 ? (val / total) * 100 : 0;

                          return (
                            <div
                              key={t}
                              className="p-2.5 rounded-xl bg-[var(--color-surface-muted)]/40 border border-[var(--color-border)]/40 flex flex-col justify-between"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_META[t].color }} />
                                <span className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider truncate">
                                  {ASSET_META[t].label}
                                </span>
                              </div>
                              <div className="mt-1 flex items-baseline justify-between gap-1">
                                {monthlyViewMode === "amount" && (
                                  <span className="text-xs font-black tabular-nums text-[var(--color-foreground)]">
                                    {formatMoney(val, currency)}
                                  </span>
                                )}
                                {monthlyViewMode === "return" && (
                                  <span className={cn("text-xs font-black tabular-nums", pctChange == null ? "text-[var(--color-muted)]" : pctChange >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
                                    {pctChange != null ? `${pctChange >= 0 ? "▲ +" : "▼ "}${formatPercent(pctChange, 1)}` : "—"}
                                  </span>
                                )}
                                {monthlyViewMode === "share" && (
                                  <span className="text-xs font-black tabular-nums text-[var(--color-foreground)]">
                                    %{sharePct.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Masaüstünde Görünüm (Tablo) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="theme-table-head">
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className={cn(thCls, "sticky left-0 bg-[var(--color-table-header)] z-10 border-r border-[var(--color-border)]/40")}>
                      Ay
                    </th>
                    {activeTypes.map((t) => (
                      <th key={t} className={cn(thCls, "text-right")}>
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_META[t].color }} />
                          {ASSET_META[t].label}
                        </span>
                      </th>
                    ))}
                    {monthlyViewMode === "amount" && (
                      <th className={cn(thCls, "text-right border-l border-[var(--color-border)]/40 bg-[var(--color-table-header)]")}>
                        Değişim
                      </th>
                    )}
                    <th className={cn(thCls, "text-right border-l-2 border-[var(--color-border)]/60 bg-[var(--color-brand-soft)]/40")}>
                      {monthlyViewMode === "share" ? "Toplam Pay" : "Toplam"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={activeTypes.length + (monthlyViewMode === "amount" ? 3 : 2)}
                        className="px-4 py-10 text-center text-[var(--color-muted)]"
                      >
                        {selectYearValue === YEAR_FILTER_ALL
                          ? "Kayıt yok."
                          : "Bu yıl için kayıt yok."}
                      </td>
                    </tr>
                  )}
                  {monthlyRows.map((p, idx) => {
                    const prevKey = prevMonthKey(p.month);
                    const prevPoint = comparablePoint(
                      p,
                      prevKey ? seriesByMonth.get(prevKey) : null,
                    );
                    const total = totalValue(p, currency);
                    const prevTotal = prevPoint
                      ? totalValue(prevPoint, currency)
                      : null;

                    const currentYear = p.month.slice(0, 4);
                    const prevRowYear = idx > 0 ? monthlyRows[idx - 1].month.slice(0, 4) : null;
                    const showYearSummary = prevRowYear !== null && currentYear !== prevRowYear;
                    const showYearSeparator = selectYearValue === YEAR_FILTER_ALL && prevRowYear !== null && currentYear !== prevRowYear;

                    return (
                      <Fragment key={p.month}>
                        {showYearSummary && prevRowYear && renderYearSummary(prevRowYear)}
                        {showYearSeparator && (
                          <tr>
                            <td
                              colSpan={activeTypes.length + (monthlyViewMode === "amount" ? 3 : 2)}
                              className="px-4 py-1.5 bg-[var(--color-surface-muted)]/50 border-y border-[var(--color-border)]/50"
                            >
                              <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-muted)]">
                                <span className="flex-1 h-px bg-[var(--color-border)]/60" />
                                <span>{currentYear}</span>
                                <span className="flex-1 h-px bg-[var(--color-border)]/60" />
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
                          className="theme-surface-hover border-b border-[var(--color-border)]/40 last:border-0 transition-colors duration-150"
                        >
                          <td className="px-4 py-2.5 font-bold text-xs whitespace-nowrap sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/20 text-[var(--color-foreground)]">
                            {monthTableLabel(p.month)}
                          </td>
                          {activeTypes.map((t) => (
                            <MonthlyBreakdownCell
                              key={t}
                              current={typeValue(p, t, currency)}
                              previous={
                                prevPoint
                                  ? typeValue(prevPoint, t, currency)
                                  : null
                              }
                              total={total}
                              currency={currency}
                              mode={monthlyViewMode}
                            />
                          ))}
                          {monthlyViewMode === "amount" && (() => {
                            const momChange = prevTotal !== null ? total - prevTotal : null;
                            return (
                              <td className={cn(
                                tdClsStatic,
                                "text-right font-semibold border-l border-[var(--color-border)]/20 bg-[var(--color-surface-muted)]/5",
                                momChange === null && "text-[var(--color-muted)]",
                                momChange !== null && momChange > 0 && "text-[var(--color-profit)]",
                                momChange !== null && momChange < 0 && "text-[var(--color-loss)]",
                              )}>
                                {momChange !== null ? (
                                  <span>
                                    {momChange > 0.01 ? "+" : ""}
                                    {formatMoney(momChange, currency)}
                                  </span>
                                ) : "—"}
                              </td>
                            );
                          })()}
                          <MonthlyBreakdownCell
                            current={total}
                            previous={prevTotal}
                            total={total}
                            currency={currency}
                            mode={monthlyViewMode}
                            bold
                            className="border-l-2 border-[var(--color-border)]/60 bg-[var(--color-brand-soft)]/20"
                          />
                        </tr>
                      </Fragment>
                    );
                  })}
                  {monthlyRows.length > 0 && renderYearSummary(monthlyRows[monthlyRows.length - 1].month.slice(0, 4))}
                </tbody>
              </table>
            </div>
          </Card>

          <GrowthAiCommentary series={series} currency={currency} />
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[var(--color-foreground)] px-4 py-2.5 text-sm text-white shadow-lg max-w-md text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
