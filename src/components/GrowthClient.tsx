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
import { FileSpreadsheet, History, TrendingUp } from "lucide-react";
import {
  importBacklogXlsx,
  updateBesBalance,
} from "@/app/growth/actions";
import {
  BACKLOG_FULL_UNTIL_YEAR,
  BES_MANUAL_FROM_YEAR,
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

type TableDisplayMode = "value" | "percent";

function MetricToggle({
  value,
  onChange,
  id,
}: {
  value: TableDisplayMode;
  onChange: (v: TableDisplayMode) => void;
  id: string;
}) {
  return (
    <div
      className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/40"
      role="group"
      aria-label={id}
    >
      <button
        type="button"
        onClick={() => onChange("value")}
        className={cn(
          "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
          value === "value"
            ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
        )}
      >
        Değer
      </button>
      <button
        type="button"
        onClick={() => onChange("percent")}
        className={cn(
          "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
          value === "percent"
            ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
            : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
        )}
      >
        Getiri %
      </button>
    </div>
  );
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

function TableAmountCell({
  current,
  previous,
  mode,
  currency,
  bold,
  className,
}: {
  current: number;
  previous: number | null | undefined;
  mode: TableDisplayMode;
  currency: "TRY" | "USD";
  bold?: boolean;
  className?: string;
}) {
  if (mode === "percent") {
    const pct = changeVsPrevious(current, previous);
    return (
      <td
        className={cn(
          tdClsStatic,
          "text-right",
          bold && "font-semibold",
          pct == null && "text-[var(--color-muted)]",
          className,
        )}
      >
        {pct != null ? <ReturnCell pct={pct} /> : "—"}
      </td>
    );
  }
  return (
    <td
      className={cn(
        tdClsStatic,
        "text-right",
        bold && "font-semibold",
        current <= 0 && "text-[var(--color-muted)]",
        className,
      )}
    >
      {current > 0 ? formatMoney(current, currency) : "—"}
    </td>
  );
}

const tdClsStatic = "px-4 py-2 text-xs tabular-nums whitespace-nowrap";

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
  const [importing, setImporting] = useState(false);
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
  const [tableMetric, setTableMetric] = useState<TableDisplayMode>("value");

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
            <span className="font-semibold tabular-nums text-slate-500">
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
              const val = row[t];
              if (!val || val <= 0) return null;
              const share = row.value > 0 ? (val / row.value) * 100 : 0;
              return (
                <div key={t} className="flex justify-between items-center text-[var(--color-foreground)]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_META[t].color }} />
                    <span className="text-[var(--color-muted)]">{ASSET_META[t].label}</span>
                  </div>
                  <div className="space-x-1.5 tabular-nums">
                    <span className="font-semibold">{formatMoney(val, currency)}</span>
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

  const cumulativeYearlyRows = useMemo((): CumulativeYearRow[] => {
    if (displaySeries.length === 0) return [];

    const byYear = new Map<string, GrowthPointDTO[]>();
    for (const p of displaySeries) {
      const y = p.month.slice(0, 4);
      const arr = byYear.get(y) ?? [];
      arr.push(p);
      byYear.set(y, arr);
    }

    // Build a lookup from the full series (including baseline years) for prev-Dec
    const fullByMonth = new Map<string, GrowthPointDTO>();
    for (const p of series) fullByMonth.set(p.month, p);

    const rows: CumulativeYearRow[] = [];
    for (const year of [...byYear.keys()].sort()) {
      const months = byYear
        .get(year)!
        .slice()
        .sort((a, b) => a.month.localeCompare(b.month));
      const last = months[months.length - 1];

      // Use previous year's December end as the start of this year (= year-start value)
      const prevDec = fullByMonth.get(`${Number(year) - 1}-12`);
      const startPoint = prevDec ?? months[0]; // fallback to first month if no prev Dec

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

    const sorted = [...displaySeries].sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    // For TOPLAM, also use the Dec before the first display year if available
    const firstYear = sorted[0].month.slice(0, 4);
    const totalStartPoint = fullByMonth.get(`${Number(firstYear) - 1}-12`) ?? sorted[0];
    const totalLast = sorted[sorted.length - 1];
    rows.push({
      label: "TOPLAM",
      startTRY: totalStartPoint.valueTRY,
      endTRY: totalLast.valueTRY,
      startUSD: totalStartPoint.valueUSD,
      endUSD: totalLast.valueUSD,
      returnTRY: periodReturnPct(totalStartPoint.valueTRY, totalLast.valueTRY),
      returnUSD: periodReturnPct(totalStartPoint.valueUSD, totalLast.valueUSD),
      isTotal: true,
    });

    return rows;
  }, [displaySeries, series]);

  function handleImportBacklog() {
    setImporting(true);
    startTransition(async () => {
      const res = await importBacklogXlsx();
      setImporting(false);
      setToast(res.message ?? (res.ok ? "Tamamlandı." : "Hata."));
      if (res.ok) router.refresh();
      setTimeout(() => setToast(null), 5000);
    });
  }

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
      const prevVal = prev
        ? isTRY
          ? prev.valueTRY
          : prev.valueUSD
        : null;
      const returnPct =
        prevVal != null && prevVal > 0 ? ((value / prevVal) - 1) * 100 : null;

      // Her bir varlık türünün güncel değerini ekle (Dağılım modu ve detaylı tooltip için)
      const allocationValues: Record<string, number> = {};
      for (const t of TABLE_TYPES) {
        allocationValues[t] = typeValue(p, t, currency);
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
  }, [displaySeries, chartYearValue, isTRY, currency, seriesByMonth]);

  const chartTitle =
    chartMetric === "value"
      ? "Aylık Değer ve Maliyet"
      : chartMetric === "allocation"
        ? "Varlık Dağılımı ve Portföy Yapısı"
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
  const returnYDomain = showReturnMetric ? returnChartMeta.domain : undefined;
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
    const baseline =
      chartYearValue === YEAR_FILTER_ALL
        ? null
        : yearEndFromSeries(series, Number(chartYearValue) - 1);
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
    "px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700";
  const tdCls = "px-4 py-2 text-xs tabular-nums whitespace-nowrap";
  const tdMuted = cn(tdCls, "text-[var(--color-muted)]");

  const renderYearSummary = (year: string) => {
    const monthsOfYear = displaySeries.filter((p) => p.month.startsWith(year));
    if (monthsOfYear.length === 0) return null;

    const sortedMonths = monthsOfYear.slice().sort((a, b) => a.month.localeCompare(b.month));
    const lastMonth = sortedMonths[sortedMonths.length - 1];

    const prevDecKey = `${Number(year) - 1}-12`;
    const startMonth = seriesByMonth.get(prevDecKey) ?? sortedMonths[0];

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
            {year} Getiri %
          </span>
        </td>
        {activeTypes.map((t) => {
          const startVal = typeValue(startMonth, t, currency);
          const endVal = typeValue(lastMonth, t, currency);
          const pct = (startVal > 0 && endVal > 0) ? periodReturnPct(startVal, endVal) : null;
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
        <td className={cn(
          tdClsStatic,
          "text-right font-bold border-l border-[var(--color-border)]/20 bg-[var(--color-surface-muted)]/10",
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
        <td className="px-4 py-2.5 text-right font-bold border-l-2 border-[var(--color-border)]/60 bg-[var(--color-brand-soft)]/30">
          {totalReturn != null ? <ReturnCell pct={totalReturn} /> : "—"}
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
            onClick={handleImportBacklog}
            disabled={importing || pending}
            className="btn btn-outline"
            title="Proje kökündeki transactions.csv ve backlog.xlsx dosyalarını içe aktararak geçmiş portföy verilerini yükler."
          >
            <FileSpreadsheet size={15} />
            {importing ? "Aktarılıyor..." : "Backlog İçe Aktar"}
          </button>
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

      {!hasData ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <TrendingUp className="text-[var(--color-muted)]" size={32} />
          <p className="font-semibold">Geçmiş veri henüz yok</p>
          <p className="text-sm text-[var(--color-muted)] max-w-md">
            Önce <strong>Backlog İçe Aktar</strong> ile 2023–2024 verisini
            yükleyin; ardından gerekirse geçmiş fiyatları oluşturun.
          </p>
          <button
            onClick={handleImportBacklog}
            disabled={importing || pending}
            className="btn btn-outline mt-2"
            title="Proje kökündeki transactions.csv ve backlog.xlsx dosyalarını içe aktararak geçmiş portföy verilerini yükler."
          >
            <FileSpreadsheet size={16} />
            {importing ? "Aktarılıyor..." : "Backlog İçe Aktar"}
          </button>
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-sm">{chartTitle}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/40"
                  role="group"
                  aria-label="Grafik metriği"
                >
                  <button
                    type="button"
                    onClick={() => setChartMetric("value")}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                      chartMetric === "value"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
                    )}
                  >
                    Değer
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("allocation")}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                      chartMetric === "allocation"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
                    )}
                  >
                    Dağılım
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric("return")}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                      chartMetric === "return"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
                    )}
                  >
                    % Getiri
                  </button>
                </div>
                <div
                  className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/40"
                  role="group"
                  aria-label="Grafik türü"
                >
                  <button
                    type="button"
                    onClick={() => setChartType("area")}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                      chartType === "area"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
                    )}
                  >
                    Alan
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType("bar")}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                      chartType === "bar"
                        ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
                        : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
                    )}
                  >
                    Çubuk
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="chart-year"
                    className="text-xs font-semibold text-[var(--color-muted)]"
                  >
                    Yıl
                  </label>
                  <select
                    id="chart-year"
                    value={chartYearValue}
                    onChange={(e) => setChartYearFilter(e.target.value)}
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

            {periodSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 shadow-none bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/40">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Toplam Portföy
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatMoney(periodSummary.last.valueTRY, "TRY")}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                    {formatPeriodDate(periodSummary.last.month)}
                  </p>
                </Card>
                <Card className="p-4 shadow-none bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/40">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Dönem Getirisi
                  </p>
                  <p
                    className={cn(
                      "text-xl font-bold tabular-nums",
                      periodSummary.pnlTRY >= 0
                        ? "text-[var(--color-profit)]"
                        : "text-[var(--color-loss)]",
                    )}
                  >
                    {periodSummary.pnlTRY >= 0 ? "+" : ""}
                    {formatMoney(periodSummary.pnlTRY, "TRY")}
                  </p>
                  {periodSummary.returnTRY != null && (
                    <p
                      className={cn(
                        "text-xs font-semibold tabular-nums mt-0.5",
                        periodSummary.returnTRY >= 0
                          ? "text-[var(--color-profit)]"
                          : "text-[var(--color-loss)]",
                      )}
                    >
                      {formatPercent(periodSummary.returnTRY)}
                    </p>
                  )}
                </Card>
                <Card className="p-4 shadow-none bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/40">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Dönem Başlangıç
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatMoney(periodSummary.first.valueTRY, "TRY")}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                    {formatPeriodDate(periodSummary.first.month)}
                  </p>
                </Card>
                <Card className="p-4 shadow-none bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/40">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                    Toplam Portföy ($)
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatMoney(periodSummary.last.valueUSD, "USD")}
                  </p>
                  {periodSummary.returnUSD != null && (
                    <p
                      className={cn(
                        "text-xs font-semibold tabular-nums mt-0.5",
                        periodSummary.returnUSD >= 0
                          ? "text-[var(--color-profit)]"
                          : "text-[var(--color-loss)]",
                      )}
                    >
                      {formatPercent(periodSummary.returnUSD)}
                    </p>
                  )}
                </Card>
              </div>
            )}

            <div className="h-[380px]">
              {plotData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
                  {showReturnMetric
                    ? "Karşılaştırma için en az iki ay gerekir."
                    : "Seçilen dönem için veri yok."}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart
                      data={plotData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.01} />
                        </linearGradient>
                        <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="var(--color-brand)"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--color-brand)"
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                        {/* Aktif varlık türleri için gradyanlar */}
                        {activeTypes.map((t) => (
                          <linearGradient key={t} id={`g-${t}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={ASSET_META[t].color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={ASSET_META[t].color} stopOpacity={0.05} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        strokeOpacity={0.4}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 500 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.5 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                        width={showReturnMetric ? 56 : 70}
                        domain={returnYDomain}
                        tickFormatter={(v) =>
                          showReturnMetric
                            ? formatPercent(Number(v), 1)
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
                        cursor={{ fill: "rgba(128, 128, 128, 0.1)" }}
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
                          strokeWidth={2.5}
                          fill="url(#gr)"
                          name="returnPctPlot"
                          activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-brand)" }}
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
                          strokeWidth={2.5}
                          fill="url(#gv)"
                          activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-brand)" }}
                        />
                      )}
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={plotData}
                      margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                      barGap={showReturnMetric ? 0 : 2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        strokeOpacity={0.4}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 500 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.5 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "var(--color-muted)", fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                        width={showReturnMetric ? 56 : 70}
                        domain={returnYDomain}
                        tickFormatter={(v) =>
                          showReturnMetric
                            ? formatPercent(Number(v), 1)
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
                        cursor={{ fill: "rgba(128, 128, 128, 0.1)" }}
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
                                  ? "var(--color-profit)"
                                  : "var(--color-loss)"
                              }
                            />
                          ))}
                          <LabelList
                            dataKey="returnPct"
                            position="top"
                            formatter={(v: any) => v != null ? `${Number(v).toFixed(1)}%` : ""}
                            style={{ fill: "var(--color-foreground)", fontSize: 8, fontWeight: 600 }}
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
                          radius={[5, 5, 0, 0]}
                        >
                          <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: any) => formatMoney(Number(v), currency, { compact: true })}
                            style={{ fill: "var(--color-foreground)", fontSize: 8, fontWeight: 600 }}
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
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-sm">Kümülatif Yıllık Özet</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-muted)]/30">
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
                        "border-b border-[var(--color-border)]/40 last:border-0 hover:bg-[var(--color-surface-muted)]/40 transition-colors duration-150",
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

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-semibold text-sm">Aylık Dağılım</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MetricToggle
                  id="monthly-table-metric"
                  value={tableMetric}
                  onChange={setTableMetric}
                />
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-muted)]/30">
                  <tr className="border-b border-[var(--color-border)] text-left">
                    <th className={cn(thCls, "sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/40")}>
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
                    <th className={cn(thCls, "text-right border-l border-[var(--color-border)]/40 bg-[var(--color-surface-muted)]/20")}>Değişim</th>
                    <th className={cn(thCls, "text-right border-l-2 border-[var(--color-border)]/60 bg-[var(--color-brand-soft)]/40")}>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={activeTypes.length + 3}
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
                    const prevPoint = prevKey
                      ? seriesByMonth.get(prevKey)
                      : null;
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
                              colSpan={activeTypes.length + 3}
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
                          className="border-b border-[var(--color-border)]/40 last:border-0 hover:bg-[var(--color-surface-muted)]/40 transition-colors duration-150"
                        >
                          <td className="px-4 py-2 font-semibold whitespace-nowrap sticky left-0 bg-[var(--color-surface)] z-10 border-r border-[var(--color-border)]/20">
                            {monthTableLabel(p.month)}
                          </td>
                          {activeTypes.map((t) => (
                            <TableAmountCell
                              key={t}
                              current={typeValue(p, t, currency)}
                              previous={
                                prevPoint
                                  ? typeValue(prevPoint, t, currency)
                                  : null
                              }
                              mode={tableMetric}
                              currency={currency}
                            />
                          ))}
                          {(() => {
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
                          <TableAmountCell
                            current={total}
                            previous={prevTotal}
                            mode={tableMetric}
                            currency={currency}
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

          <Card className="p-6">
            <h2 className="font-semibold mb-1">BES aylık bakiye</h2>
            <p className="text-xs text-[var(--color-muted)] mb-4">
              Excel&apos;de olmayan {BES_MANUAL_FROM_YEAR} ve sonraki aylar için
              BES tutarını girin. Diğer kolonlar otomatik hesaplanır.
            </p>
            <BesUpdateForm onSaved={() => router.refresh()} />
          </Card>
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

function BesUpdateForm({ onSaved }: { onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const minMonth = `${BES_MANUAL_FROM_YEAR}-01`;

  function submit(formData: FormData) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await updateBesBalance(formData);
      if (res.ok) {
        setOk(res.message ?? "Kaydedildi.");
        onSaved();
      } else setError(res.message ?? "Hata.");
    });
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]";
  const labelCls = "block text-xs font-semibold text-[var(--color-muted)] mb-1.5";

  return (
    <form action={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[140px]">
        <label className={labelCls}>Ay</label>
        <input
          type="month"
          name="month"
          required
          min={minMonth}
          defaultValue={defaultMonth}
          className={inputCls}
        />
      </div>
      <div className="min-w-[180px] flex-1">
        <label className={labelCls}>BES tutarı (₺)</label>
        <input
          type="number"
          name="besTRY"
          step="any"
          required
          min={0}
          placeholder="ör. 826000"
          className={inputCls}
        />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      {error && (
        <p className="w-full text-sm text-[var(--color-loss)]">{error}</p>
      )}
      {ok && (
        <p className="w-full text-sm text-[var(--color-profit)]">{ok}</p>
      )}
    </form>
  );
}
