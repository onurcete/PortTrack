"use client";

import { useMemo, useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Coins,
  PiggyBank,
} from "lucide-react";
import { useCurrency } from "@/context/currency";
import { Card, Badge } from "@/components/ui";
import { ASSET_META, type AssetType } from "@/lib/assets";
import { Modal } from "@/components/Modal";
import { formatMoney, formatPercent, formatNumber, formatDate, monthLabel, cn } from "@/lib/utils";
import { getCellStyle } from "@/components/PerformanceClient";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";

/** Açık pozisyon bölüm sırası */
const POSITION_SECTION_ORDER: AssetType[] = [
  "TEFAS",
  "FOREIGN",
  "BIST",
  "FX",
  "METAL",
  "CRYPTO",
  "BES",
];

export interface PositionDTO {
  symbol: string;
  assetType: AssetType;
  nativeCurrency: string;
  quantity: number;
  avgCostNative: number;
  avgCostTRY: number;
  currentPriceNative: number | null;
  currentPriceTRY: number | null;
  valueTRY: number;
  valueUSD: number;
  costTRY: number;
  costUSD: number;
  unrealizedTRY: number;
  unrealizedUSD: number;
  unrealizedPctTRY: number;
  unrealizedPctUSD: number;
  realizedTRY: number;
  realizedUSD: number;
  hasPrice: boolean;
  firstBuyDate: string | null;
  totalBuyTRY: number;
  totalBuyUSD: number;
  totalSellTRY: number;
  totalSellUSD: number;
  dailyChangePct: number | null;
  xirrTRY: number | null;
  xirrUSD: number | null;
}

export interface BenchmarkComparisonDTO {
  portfolio: number;
  bist: number | null;
  sp500: number | null;
  gold: number | null;
  usd: number | null;
}

export interface BenchmarkComparisonData {
  try: Record<"1W" | "1M" | "3M" | "YTD" | "1Y", BenchmarkComparisonDTO>;
  usd: Record<"1W" | "1M" | "3M" | "YTD" | "1Y", BenchmarkComparisonDTO>;
}

export interface PeriodReturnsDTO {
  dailyTRY: number | null;
  dailyUSD: number | null;
  dailyAmtTRY: number | null;
  dailyAmtUSD: number | null;
  weeklyTRY: number | null;
  weeklyUSD: number | null;
  weeklyAmtTRY: number | null;
  weeklyAmtUSD: number | null;
  mtdTRY: number | null;
  mtdUSD: number | null;
  mtdAmtTRY: number | null;
  mtdAmtUSD: number | null;
  monthlyTRY: number | null;
  monthlyUSD: number | null;
  monthlyAmtTRY: number | null;
  monthlyAmtUSD: number | null;
  ytdTRY: number | null;
  ytdUSD: number | null;
  ytdAmtTRY: number | null;
  ytdAmtUSD: number | null;
  allTimeTRY: number | null;
  allTimeUSD: number | null;
  allTimeAmtTRY: number | null;
  allTimeAmtUSD: number | null;
}

export interface DashboardDTO {
  positions: PositionDTO[];
  totals: {
    valueTRY: number;
    valueUSD: number;
    costTRY: number;
    costUSD: number;
    unrealizedTRY: number;
    unrealizedUSD: number;
    unrealizedPctTRY: number;
    unrealizedPctUSD: number;
    realizedTRY: number;
    realizedUSD: number;
  };
  allocation: {
    assetType: AssetType;
    valueTRY: number;
    valueUSD: number;
    pct: number;
  }[];
  currentUsdTry: number;
  lastUpdated: string | null;
  transactionCount: number;
  benchmarkData?: BenchmarkComparisonData;
  periodReturns?: PeriodReturnsDTO;
}

function ProfitValue({
  value,
  currency,
  pct,
}: {
  value: number;
  currency: "TRY" | "USD";
  pct?: number;
}) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        positive ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]",
      )}
    >
      {positive ? "+" : ""}
      {formatMoney(value, currency)}
      {pct !== undefined && (
        <span className="ml-1 text-xs opacity-80">({formatPercent(pct)})</span>
      )}
    </span>
  );
}

function getBenchmarkText(
  period: "1W" | "1M" | "YTD",
  isTRY: boolean,
  benchmarkData?: BenchmarkComparisonData
) {
  if (!benchmarkData) return "";
  const data = isTRY ? benchmarkData.try[period] : benchmarkData.usd[period];
  if (!data) return "";

  const parts: string[] = [];
  if (isTRY) {
    if (data.bist !== null) parts.push(`BIST: ${formatPercent(data.bist)}`);
    if (data.usd !== null) parts.push(`USD: ${formatPercent(data.usd)}`);
  } else {
    if (data.sp500 !== null) parts.push(`SPX: ${formatPercent(data.sp500)}`);
    if (data.gold !== null) parts.push(`Altın: ${formatPercent(data.gold)}`);
  }
  return parts.join(" • ");
}

function CombinedReturnCell({
  label,
  pct,
  amt,
  currency,
  benchmarkText,
  borderClasses,
}: {
  label: string;
  pct: number | null;
  amt: number | null;
  currency: "TRY" | "USD";
  benchmarkText?: string;
  borderClasses: string;
}) {
  if (pct === null || amt === null) return null;
  const positive = pct > 0;
  const negative = pct < 0;

  return (
    <div className={cn("p-5 flex flex-col justify-between bg-[var(--color-surface-muted)]/20", borderClasses)}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </span>
      <div className="mt-2.5">
        <span
          className={cn(
            "text-2xl sm:text-3xl font-black tracking-tight tabular-nums block",
            positive ? "text-[var(--color-profit)]" : negative ? "text-[var(--color-loss)]" : "text-[var(--color-muted)]",
          )}
        >
          {formatPercent(pct)}
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-muted)] font-semibold">
          <span className={cn(positive ? "text-[var(--color-profit)]/90" : negative ? "text-[var(--color-loss)]/90" : "text-[var(--color-muted)]")}>
            {positive ? "+" : ""}
            {formatMoney(amt, currency)}
          </span>
          {benchmarkText && (
            <>
              <span className="text-[var(--color-border)]">•</span>
              <span className="text-[var(--color-muted)]/70 font-medium">{benchmarkText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({ data }: { data: DashboardDTO }) {
  const { currency } = useCurrency();
  const isTRY = currency === "TRY";
  const [selectedPosition, setSelectedPosition] = useState<PositionDTO | null>(null);

  const openPositions = useMemo(
    () => data.positions.filter((p) => p.quantity > 1e-9 && p.valueTRY > 0),
    [data.positions],
  );

  const closedPositions = useMemo(
    () => data.positions.filter((p) => p.quantity <= 1e-9 && (p.realizedTRY !== 0 || p.totalBuyTRY > 0)),
    [data.positions],
  );

  const totalValue = isTRY ? data.totals.valueTRY : data.totals.valueUSD;
  const totalCost = isTRY ? data.totals.costTRY : data.totals.costUSD;
  const unrealized = isTRY
    ? data.totals.unrealizedTRY
    : data.totals.unrealizedUSD;
  const unrealizedPct = isTRY
    ? data.totals.unrealizedPctTRY
    : data.totals.unrealizedPctUSD;
  const realized = isTRY ? data.totals.realizedTRY : data.totals.realizedUSD;

  const allocationData = useMemo(
    () =>
      data.allocation
        .filter((a) => a.pct > 0)
        .map((a) => ({
          assetType: a.assetType,
          label: ASSET_META[a.assetType]?.label ?? a.assetType,
          value: isTRY ? a.valueTRY : a.valueUSD,
          pct: a.pct,
          color: ASSET_META[a.assetType]?.color ?? "#94a3b8",
        })),
    [data.allocation, isTRY],
  );

  const dailyChangePct = isTRY ? data.periodReturns?.dailyTRY : data.periodReturns?.dailyUSD;
  const dailyChangeAmt = isTRY ? data.periodReturns?.dailyAmtTRY : data.periodReturns?.dailyAmtUSD;

  const weeklyPct = isTRY ? data.periodReturns?.weeklyTRY : data.periodReturns?.weeklyUSD;
  const weeklyAmt = isTRY ? data.periodReturns?.weeklyAmtTRY : data.periodReturns?.weeklyAmtUSD;

  const monthlyPct = isTRY ? data.periodReturns?.mtdTRY : data.periodReturns?.mtdUSD;
  const monthlyAmt = isTRY ? data.periodReturns?.mtdAmtTRY : data.periodReturns?.mtdAmtUSD;

  const ytdPct = isTRY ? data.periodReturns?.ytdTRY : data.periodReturns?.ytdUSD;
  const ytdAmt = isTRY ? data.periodReturns?.ytdAmtTRY : data.periodReturns?.ytdAmtUSD;

  const allTimePct = isTRY ? data.periodReturns?.allTimeTRY : data.periodReturns?.allTimeUSD;
  const allTimeAmt = isTRY ? data.periodReturns?.allTimeAmtTRY : data.periodReturns?.allTimeAmtUSD;

  const prevCloseVal = totalValue - (dailyChangeAmt ?? 0);
  const ytdCloseVal = totalValue - (ytdAmt ?? 0);

  const assetDailyChanges = useMemo(() => {
    const types: Record<string, { label: string; color: string; value: number; changeAmt: number }> = {
      TEFAS: { label: "TEFAS Fon", color: "#7c3aed", value: 0, changeAmt: 0 },
      FOREIGN: { label: "Yabancı Borsa", color: "#0891b2", value: 0, changeAmt: 0 },
      METAL: { label: "Kıymetli Maden", color: "#d97706", value: 0, changeAmt: 0 },
      CRYPTO: { label: "Kripto", color: "#db2777", value: 0, changeAmt: 0 },
    };

    for (const p of openPositions) {
      const type = p.assetType;
      if (types[type]) {
        const val = isTRY ? p.valueTRY : p.valueUSD;
        types[type].value += val;

        if (p.dailyChangePct !== null && p.dailyChangePct !== undefined) {
          const d = p.dailyChangePct;
          const prevVal = Math.abs(d + 100) > 1e-5 ? val / (1 + d / 100) : val;
          const change = val - prevVal;
          types[type].changeAmt += change;
        }
      }
    }

    return Object.entries(types)
      .map(([key, item]) => {
        const pct = (item.value - item.changeAmt) > 0 
          ? (item.changeAmt / (item.value - item.changeAmt)) * 100 
          : 0;
        return {
          key,
          label: item.label,
          color: item.color,
          value: item.value,
          changeAmt: item.changeAmt,
          pct,
        };
      })
      .filter((item) => item.value > 0);
  }, [openPositions, isTRY]);

  if (data.transactionCount === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Genel Bakış</h1>
        <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Wallet className="text-[var(--color-muted)]" size={32} />
          <p className="font-semibold">Henüz işlem yok</p>
          <p className="text-sm text-[var(--color-muted)] max-w-sm">
            &quot;İşlemler&quot; sayfasından CSV&apos;nizi içe aktararak başlayın.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sayfa başlığı */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {data.lastUpdated
              ? `Son güncelleme: ${new Date(data.lastUpdated).toLocaleString("tr-TR")}`
              : "Fiyatlar henüz güncellenmedi - sağ üstten \u201cFiyatları Güncelle\u201d"}
          </p>
        </div>
        <Badge className="bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
          1 USD = {formatNumber(data.currentUsdTry, 2)} ₺
        </Badge>
      </div>

      {/* Kombine Portföy Değeri & Getiriler Kartı */}
      <div className="grid grid-cols-1 lg:grid-cols-5 card overflow-hidden">
        {/* Sol Kısım: Toplam Portföy Değeri ve Günlük Getiri */}
        <div className="lg:col-span-2 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--color-border)]/70 bg-[var(--color-surface)]">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
              TOPLAM PORTFÖY
            </span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-[var(--color-foreground)] mt-2 tabular-nums">
              {formatMoney(totalValue, currency)}
            </h2>
            <div className="mt-1">
              <span className="text-xs font-bold text-[var(--color-muted)] tabular-nums">
                {isTRY ? formatMoney(data.totals.valueUSD, "USD") : formatMoney(data.totals.valueTRY, "TRY")}
              </span>
            </div>

            {dailyChangePct !== undefined && dailyChangePct !== null && dailyChangeAmt !== undefined && dailyChangeAmt !== null && (
              <div className="mt-4">
                <span
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 border tabular-nums",
                    dailyChangePct >= 0
                      ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)] border-[var(--color-profit)]/15"
                      : "bg-[var(--color-loss-soft)] text-[var(--color-loss)] border-[var(--color-loss)]/15"
                  )}
                >
                  BUGÜN
                  <span>{dailyChangeAmt >= 0 ? "+" : ""}{formatMoney(dailyChangeAmt, currency)}</span>
                  <span>({formatPercent(dailyChangePct)})</span>
                </span>
              </div>
            )}

            {/* Varlık Sınıfı Günlük Değişimleri */}
            {assetDailyChanges.length > 0 && (
              <div className="mt-5 pt-4 border-t border-[var(--color-border)]/40 space-y-2.5 max-w-sm">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  GÜNLÜK VARLIK DEĞİŞİMLERİ
                </p>
                <div className="flex flex-col gap-2">
                  {assetDailyChanges.map((item) => {
                    const positive = item.changeAmt >= 0;
                    return (
                      <div key={item.key} className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2 text-[var(--color-muted)] font-medium">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <div className={cn("tabular-nums font-bold", positive ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
                          {positive ? "+" : ""}
                          {formatMoney(item.changeAmt, currency)}
                          <span className="ml-1 text-[10px] opacity-80">({formatPercent(item.pct)})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Kısım: 2x2 Dönemsel Getiri Gridi */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 bg-[var(--color-surface-muted)]/10">
          <CombinedReturnCell
            label="HAFTA (SON 5 İŞLEM GÜNÜ)"
            pct={weeklyPct ?? null}
            amt={weeklyAmt ?? null}
            currency={currency}
            borderClasses="sm:border-r sm:border-b border-[var(--color-border)]/70"
          />
          <CombinedReturnCell
            label="MTD - CARİ AY"
            pct={monthlyPct ?? null}
            amt={monthlyAmt ?? null}
            currency={currency}
            borderClasses="sm:border-b border-[var(--color-border)]/70"
          />
          <CombinedReturnCell
            label="YTD - YIL BAŞINDAN BERİ"
            pct={ytdPct ?? null}
            amt={ytdAmt ?? null}
            currency={currency}
            borderClasses="sm:border-r border-[var(--color-border)]/70 sm:border-b-0 border-b"
          />
          <CombinedReturnCell
            label="ALL TIME - TÜM ZAMANLAR"
            pct={allTimePct ?? null}
            amt={allTimeAmt ?? null}
            currency={currency}
            borderClasses=""
          />
        </div>
      </div>

      {/* Varlık Dağılımı — kompakt yatay bar */}
      <AllocationStrip
        data={allocationData}
        totalValue={totalValue}
        currency={currency}
      />

      {/* Açık ve Kapalı Pozisyonlar — zenginleştirilmiş tablo */}
      <PositionsTable
        openPositions={openPositions}
        closedPositions={closedPositions}
        currency={currency}
        isTRY={isTRY}
        currentUsdTry={data.currentUsdTry}
        onSelectPosition={setSelectedPosition}
      />

      {/* Performans Kıyaslama & Gelecek Analizi Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.benchmarkData && (
          <BenchmarkComparison benchmarkData={data.benchmarkData} isTRY={isTRY} />
        )}
        <PortfolioProjection initialValue={totalValue} currency={currency} isTRY={isTRY} />
      </div>

      {selectedPosition && (
        <PositionDetailModal
          position={selectedPosition}
          isTRY={isTRY}
          currency={currency}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Varlık Dağılımı — Kompakt yatay segment bar + detay satırları
   ═══════════════════════════════════════════════════════════════════════ */

function AllocationStrip({
  data,
  totalValue,
  currency,
}: {
  data: {
    assetType: AssetType;
    label: string;
    value: number;
    pct: number;
    color: string;
  }[];
  totalValue: number;
  currency: "TRY" | "USD";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Varlık Dağılımı</h2>
        <span className="text-sm font-bold tabular-nums text-[var(--color-muted)]">
          {formatMoney(totalValue, currency)}
        </span>
      </div>

      {/* Yatay segment barı */}
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px] mb-4">
        {data.map((d) => (
          <div
            key={d.assetType}
            className="h-full rounded-full transition-all duration-500 hover:opacity-80"
            style={{
              width: `${Math.max(d.pct, 1.5)}%`,
              backgroundColor: d.color,
            }}
            title={`${d.label}: %${formatNumber(d.pct, 1)}`}
          />
        ))}
      </div>

      {/* Detay satırları — grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-x-4 gap-y-2">
        {data.map((d) => (
          <div key={d.assetType} className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{d.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-bold tabular-nums">
                  {formatMoney(d.value, currency)}
                </span>
                <span className="text-[10px] text-[var(--color-muted)] tabular-nums">
                  %{formatNumber(d.pct, 1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Açık Pozisyonlar — Zenginleştirilmiş Tablo (Opsiyon 3, başlıklı)
   ═══════════════════════════════════════════════════════════════════════ */

type SortField = "symbol" | "days" | "avgCost" | "currentPrice" | "value" | "pnl" | "pct" | "dailyChange";
type SortOrder = "asc" | "desc";

function SortHeader({
  field,
  label,
  activeField,
  order,
  onSort,
  align = "right",
}: {
  field: SortField;
  label: React.ReactNode;
  activeField: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
}) {
  const isActive = field === activeField;
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1 transition-colors outline-none",
        align === "right" ? "justify-end ml-auto text-right" : "justify-start text-left",
      )}
    >
      <span>{label}</span>
      <span className={cn(
        "text-[10px] transition-opacity font-normal shrink-0",
        isActive ? "opacity-100 text-[var(--color-brand-strong)]" : "opacity-35 hover:opacity-100"
      )}>
        {isActive ? (order === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

function PositionsTable({
  openPositions,
  closedPositions,
  currency,
  isTRY,
  currentUsdTry,
  onSelectPosition,
}: {
  openPositions: PositionDTO[];
  closedPositions: PositionDTO[];
  currency: "TRY" | "USD";
  isTRY: boolean;
  currentUsdTry: number;
  onSelectPosition?: (position: PositionDTO) => void;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const [getiriMode, setGetiriMode] = useState<"getiri" | "roi" | "xirr">("getiri");
  const showRoi = getiriMode === "roi";
  const showXirr = getiriMode === "xirr";
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "symbol" ? "asc" : "desc");
    }
  };

  const handleTabChange = (closed: boolean) => {
    setShowClosed(closed);
    setSortField(closed ? "pnl" : "value");
    setSortOrder("desc");
  };

  const activePositions = showClosed ? closedPositions : openPositions;

  const positionsByType = useMemo(() => {
    const map = new Map<AssetType, PositionDTO[]>();
    for (const p of activePositions) {
      const arr = map.get(p.assetType) ?? [];
      arr.push(p);
      map.set(p.assetType, arr);
    }
    return POSITION_SECTION_ORDER.filter((t) => map.has(t)).map((t) => ({
      assetType: t,
      positions: map.get(t)!,
    }));
  }, [activePositions]);

  const sortedPositionsByType = useMemo(() => {
    return positionsByType.map(({ assetType, positions }) => {
      const sorted = [...positions].sort((a, b) => {
        const getVal = (pos: PositionDTO) => {
          switch (sortField) {
            case "symbol":
              return pos.symbol;
            case "days":
              return pos.firstBuyDate ? new Date(pos.firstBuyDate).getTime() : 0;
            case "avgCost":
              if (showClosed) {
                return isTRY ? pos.totalBuyTRY : pos.totalBuyUSD;
              }
              return isTRY ? pos.avgCostTRY : (pos.costUSD / pos.quantity);
            case "currentPrice":
              if (showClosed) {
                return isTRY ? pos.totalSellTRY : pos.totalSellUSD;
              }
              return isTRY
                ? (pos.currentPriceTRY ?? 0)
                : (pos.currentPriceTRY !== null ? pos.currentPriceTRY / currentUsdTry : 0);
            case "value":
              return isTRY ? pos.valueTRY : pos.valueUSD;
            case "pnl":
              if (showClosed) {
                return isTRY ? pos.realizedTRY : pos.realizedUSD;
              }
              if (showRoi || showXirr) {
                return isTRY 
                  ? pos.unrealizedTRY + pos.realizedTRY 
                  : pos.unrealizedUSD + pos.realizedUSD;
              }
              return isTRY ? pos.unrealizedTRY : pos.unrealizedUSD;
            case "pct":
              if (showClosed) {
                const buyVal = isTRY ? pos.totalBuyTRY : pos.totalBuyUSD;
                const realizedVal = isTRY ? pos.realizedTRY : pos.realizedUSD;
                return buyVal > 0 ? (realizedVal / buyVal) * 100 : 0;
              }
              if (showXirr) {
                const val = isTRY ? pos.xirrTRY : pos.xirrUSD;
                return val ?? -999999;
              }
              if (showRoi) {
                const buyVal = isTRY ? pos.totalBuyTRY : pos.totalBuyUSD;
                const totalPnl = isTRY 
                  ? pos.unrealizedTRY + pos.realizedTRY 
                  : pos.unrealizedUSD + pos.realizedUSD;
                return buyVal > 0 ? (totalPnl / buyVal) * 100 : 0;
              }
              return isTRY ? pos.unrealizedPctTRY : pos.unrealizedPctUSD;
            case "dailyChange":
              return pos.dailyChangePct;
            default:
              return 0;
          }
        };

        const valA = getVal(a);
        const valB = getVal(b);

        let comp = 0;
        if (valA === null || valA === undefined) {
          comp = (valB === null || valB === undefined) ? 0 : -1;
        } else if (valB === null || valB === undefined) {
          comp = 1;
        } else if (typeof valA === "string" && typeof valB === "string") {
          comp = valA.localeCompare(valB);
        } else {
          comp = (valA as number) - (valB as number);
        }

        return sortOrder === "asc" ? comp : -comp;
      });

      return { assetType, positions: sorted };
    });
  }, [positionsByType, sortField, sortOrder, isTRY, currentUsdTry, showClosed]);

  const gridColsClass = showClosed
    ? "grid-cols-[minmax(120px,_1.5fr)_minmax(100px,_1.2fr)_minmax(100px,_1.2fr)_minmax(100px,_1.2fr)_minmax(80px,_90px)]"
    : "grid-cols-[minmax(110px,_1.3fr)_minmax(60px,_70px)_minmax(90px,_0.9fr)_minmax(90px,_0.9fr)_minmax(95px,_1.1fr)_minmax(90px,_1fr)_minmax(95px,_1.1fr)_minmax(80px,_90px)]";

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => handleTabChange(false)}
            className={cn(
              "pb-1 border-b-2 font-bold text-sm transition-all outline-none",
              !showClosed
                ? "border-[var(--color-brand-strong)] text-[var(--color-brand-strong)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            )}
          >
            Açık Pozisyonlar ({openPositions.length})
          </button>
          <button
            onClick={() => handleTabChange(true)}
            className={cn(
              "pb-1 border-b-2 font-bold text-sm transition-all outline-none",
              showClosed
                ? "border-[var(--color-brand-strong)] text-[var(--color-brand-strong)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            )}
          >
            Kapalı Pozisyonlar ({closedPositions.length})
          </button>
        </div>
      </div>
      {activePositions.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
          {showClosed ? "Kapalı pozisyon yok." : "Açık pozisyon yok."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          {sortedPositionsByType.map(({ assetType, positions }) => {
            const meta = ASSET_META[assetType];
            const sectionValue = positions.reduce(
              (s, p) => s + (showClosed
                ? (isTRY ? p.totalSellTRY : p.totalSellUSD)
                : (isTRY ? p.valueTRY : p.valueUSD)),
              0,
            );
            const sectionPnl = positions.reduce(
              (s, p) => s + (showClosed
                ? (isTRY ? p.realizedTRY : p.realizedUSD)
                : (isTRY ? p.unrealizedTRY : p.unrealizedUSD)),
              0,
            );
            const sectionPnlPositive = sectionPnl >= 0;

            return (
              <div
                key={assetType}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                {/* Grup başlığı */}
                <div
                  className="flex items-center justify-between px-6 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${meta.color}08, transparent)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-white text-[11px] font-bold"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label.charAt(0)}
                    </span>
                    <span className="font-bold text-sm">{meta.label}</span>
                    <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted)]">
                      {positions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                        {showClosed ? "Toplam Gelir" : "Grup değeri"}
                      </p>
                      <p className="text-sm font-bold tabular-nums">
                        {formatMoney(sectionValue, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                        {showClosed ? "Realize K/Z" : "Grup K/Z"}
                      </p>
                      <p
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          sectionPnlPositive
                            ? "text-[var(--color-profit)]"
                            : "text-[var(--color-loss)]",
                        )}
                      >
                        {sectionPnlPositive ? "+" : ""}
                        {formatMoney(sectionPnl, currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tablo başlıkları */}
                <div className={cn("grid gap-2 px-6 py-2.5 border-t border-[var(--color-border)]/40 bg-[var(--color-surface-muted)]/30", gridColsClass)}>
                  {showClosed ? (
                    <>
                      <SortHeader
                        field="symbol"
                        label="Sembol"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="left"
                      />
                      <SortHeader
                        field="avgCost"
                        label="Toplam Alış"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="currentPrice"
                        label="Toplam Satış"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="pnl"
                        label="Realize K/Z"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="pct"
                        label="Getiri"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                    </>
                  ) : (
                    <>
                      <SortHeader
                        field="symbol"
                        label="Sembol"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="left"
                      />
                      <SortHeader
                        field="days"
                        label="Gün"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="avgCost"
                        label="Ort. Maliyet"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="currentPrice"
                        label="Güncel Fiyat"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="value"
                        label="Değer"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="dailyChange"
                        label="Günlük Değişim"
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="pnl"
                        label={getiriMode === "getiri" ? "Kar / Zarar" : "Net K/Z"}
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortHeader
                        field="pct"
                        label={
                          <span
                            className="inline-flex items-center gap-1 cursor-pointer select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGetiriMode((prev) => {
                                if (prev === "getiri") return "roi";
                                if (prev === "roi") return "xirr";
                                return "getiri";
                              });
                            }}
                            title="Tıklayarak Getiri, ROI (Yatırım Getirisi) ve XIRR (Yıllıklandırılmış Getiri) arasında geçiş yapın"
                          >
                            {getiriMode === "getiri" ? "Getiri" : getiriMode === "roi" ? "ROI" : "XIRR"}
                            <span className="text-[11px] opacity-75 font-normal">⇄</span>
                          </span>
                        }
                        activeField={sortField}
                        order={sortOrder}
                        onSort={handleSort}
                        align="right"
                      />
                    </>
                  )}
                </div>

                {/* Pozisyon satırları */}
                {positions.map((p) => {
                  if (showClosed) {
                    const buyVal = isTRY ? p.totalBuyTRY : p.totalBuyUSD;
                    const sellVal = isTRY ? p.totalSellTRY : p.totalSellUSD;
                    const pnlVal = isTRY ? p.realizedTRY : p.realizedUSD;
                    const pctVal = buyVal > 0 ? (pnlVal / buyVal) * 100 : 0;
                    const positiveVal = pnlVal >= 0;

                    return (
                      <div
                        key={`${p.assetType}-${p.symbol}`}
                        onClick={() => onSelectPosition?.(p)}
                        className={cn("grid gap-2 items-center px-6 py-2 border-t border-[var(--color-border)]/30 transition-colors hover:bg-[var(--color-surface-muted)]/40 cursor-pointer", gridColsClass)}
                      >
                        {/* Sembol */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-bold shrink-0"
                            style={{
                              backgroundColor: `${meta.color}12`,
                              color: meta.color,
                            }}
                          >
                            {p.symbol.slice(0, 3)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate leading-tight">
                              {p.symbol}
                            </p>
                            <p className="text-[10px] text-[var(--color-muted)] leading-tight">
                              Kapalı Pozisyon
                            </p>
                          </div>
                        </div>

                        {/* Toplam Alış */}
                        <p className="text-xs font-semibold tabular-nums text-right">
                          {formatMoney(buyVal, currency)}
                        </p>

                        {/* Toplam Satış */}
                        <p className="text-xs font-semibold tabular-nums text-right">
                          {formatMoney(sellVal, currency)}
                        </p>

                        {/* Realize K/Z */}
                        <p
                          className={cn(
                            "text-xs font-semibold tabular-nums text-right",
                            positiveVal
                              ? "text-[var(--color-profit)]"
                              : "text-[var(--color-loss)]",
                          )}
                        >
                          {positiveVal ? "+" : ""}
                          {formatMoney(pnlVal, currency)}
                        </p>

                        {/* Yüzde badge */}
                        <div className="flex justify-end">
                          <span
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums text-center min-w-[56px]",
                              positiveVal
                                ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                                : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
                            )}
                          >
                            {formatPercent(pctVal)}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Open positions rendering
                  const value = isTRY ? p.valueTRY : p.valueUSD;
                  const pnl = (showRoi || showXirr)
                    ? (isTRY 
                        ? p.unrealizedTRY + p.realizedTRY 
                        : p.unrealizedUSD + p.realizedUSD)
                    : (isTRY ? p.unrealizedTRY : p.unrealizedUSD);
                  const pct = showXirr
                    ? (isTRY ? p.xirrTRY : p.xirrUSD)
                    : showRoi
                      ? (isTRY
                          ? (p.totalBuyTRY > 0 ? (pnl / p.totalBuyTRY) * 100 : 0)
                          : (p.totalBuyUSD > 0 ? (pnl / p.totalBuyUSD) * 100 : 0))
                      : (isTRY ? p.unrealizedPctTRY : p.unrealizedPctUSD);
                  const positive = showXirr
                    ? (pct !== null ? pct >= 0 : pnl >= 0)
                    : pnl >= 0;

                  const holdingDays = (() => {
                    if (!p.firstBuyDate) return "-";
                    const firstBuy = new Date(p.firstBuyDate);
                    const today = new Date();
                    firstBuy.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const diffTime = today.getTime() - firstBuy.getTime();
                    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                    return `${diffDays} g`;
                  })();

                  const formattedFirstBuy = p.firstBuyDate ? formatDate(p.firstBuyDate) : "";

                  const avgCost = isTRY ? p.avgCostTRY : (p.costUSD / p.quantity);
                  const avgCostFormatted = formatMoney(avgCost, currency, {
                    decimals: avgCost < 1 ? 4 : 2,
                  });

                  const currentPrice = isTRY
                    ? p.currentPriceTRY
                    : (p.currentPriceTRY !== null ? p.currentPriceTRY / currentUsdTry : null);
                  const currentPriceFormatted = currentPrice !== null
                    ? formatMoney(currentPrice, currency, { decimals: currentPrice < 1 ? 4 : 2 })
                        : "-";

                  return (
                    <div
                      key={`${p.assetType}-${p.symbol}`}
                      onClick={() => onSelectPosition?.(p)}
                      className={cn("grid gap-2 items-center px-6 py-2 border-t border-[var(--color-border)]/30 transition-colors hover:bg-[var(--color-surface-muted)]/40 cursor-pointer", gridColsClass)}
                    >
                      {/* Sembol */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-bold shrink-0"
                          style={{
                            backgroundColor: `${meta.color}12`,
                            color: meta.color,
                          }}
                        >
                          {p.symbol.slice(0, 3)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs truncate leading-tight">
                            {p.symbol}
                          </p>
                          <p className="text-[10px] text-[var(--color-muted)] leading-tight">
                            {formatNumber(p.quantity, 4)} adet
                          </p>
                        </div>
                      </div>

                      {/* Gün */}
                      <p
                        className="text-xs font-medium text-[var(--color-muted)] tabular-nums text-right cursor-help"
                        title={p.firstBuyDate ? `İlk Alım: ${formattedFirstBuy}` : undefined}
                      >
                        {holdingDays}
                      </p>

                      {/* Ortalama Fiyat */}
                      <p className="text-xs font-semibold tabular-nums text-right">
                        {avgCostFormatted}
                      </p>

                      {/* Güncel Fiyat */}
                      <p className="text-xs font-semibold tabular-nums text-right">
                        {currentPriceFormatted}
                      </p>

                      {/* Değer */}
                      <p className="text-xs font-semibold tabular-nums text-right">
                        {formatMoney(value, currency)}
                      </p>

                      {/* Günlük K/Z % */}
                      <div className="flex justify-end">
                        {p.dailyChangePct !== null ? (
                          <span
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums text-center min-w-[56px]",
                              p.dailyChangePct >= 0
                                ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                                : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
                            )}
                          >
                            {formatPercent(p.dailyChangePct)}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-[var(--color-muted)] pr-4">-</span>
                        )}
                      </div>

                      {/* K/Z */}
                      <p
                        className={cn(
                          "text-xs font-semibold tabular-nums text-right",
                          positive
                            ? "text-[var(--color-profit)]"
                            : "text-[var(--color-loss)]",
                        )}
                      >
                        {positive ? "+" : ""}
                        {formatMoney(pnl, currency)}
                      </p>

                      {/* Yüzde badge */}
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums text-center min-w-[56px]",
                            positive
                              ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                              : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
                          )}
                        >
                          {pct !== null ? formatPercent(pct) : "-"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Stat Card
   ═══════════════════════════════════════════════════════════════════════ */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: "brand";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-[var(--color-muted)] mb-3">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent === "brand"
              ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]"
              : "bg-[var(--color-surface-muted)]",
          )}
        >
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Performans Kıyaslama Grafiği (Bar Chart)
   ═══════════════════════════════════════════════════════════════════════ */

function BenchmarkComparison({
  benchmarkData,
  isTRY,
}: {
  benchmarkData: BenchmarkComparisonData;
  isTRY: boolean;
}) {
  const [activePeriod, setActivePeriod] = useState<"1W" | "1M" | "3M" | "YTD" | "1Y">("1M");

  const chartData = useMemo(() => {
    const periodData = isTRY
      ? benchmarkData.try[activePeriod]
      : benchmarkData.usd[activePeriod];

    if (!periodData) return [];

    const items = [
      { name: "Portföyüm", value: periodData.portfolio, color: "var(--color-brand)" },
      { name: "BIST 100", value: periodData.bist, color: "#f97316" }, // Orange
      { name: "Altın", value: periodData.gold, color: "#eab308" }, // Yellow
      { name: "S&P 500", value: periodData.sp500, color: "#3b82f6" }, // Blue
    ];

    if (isTRY) {
      items.push({ name: "Dolar", value: periodData.usd, color: "#10b981" }); // Green
    }

    return items.filter((item) => item.value !== null) as {
      name: string;
      value: number;
      color: string;
    }[];
  }, [benchmarkData, activePeriod, isTRY]);

  const periods: { key: "1W" | "1M" | "3M" | "YTD" | "1Y"; label: string }[] = [
    { key: "1W", label: "1 Hafta" },
    { key: "1M", label: "1 Ay" },
    { key: "3M", label: "3 Ay" },
    { key: "YTD", label: "Yılbaşı" },
    { key: "1Y", label: "1 Yıl" },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    const val = item.value;
    const positive = val >= 0;
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl text-xs space-y-1">
        <div className="font-bold text-[var(--color-foreground)]">{item.name}</div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--color-muted)] font-medium">Getiri:</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              positive ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]",
            )}
          >
            {positive ? "+" : ""}
            {formatPercent(val)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-semibold text-sm">Performans Kıyaslama</h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Portföyünüzün diğer finansal enstrümanlara göre getirisi ({isTRY ? "₺ TL" : "$ USD"} bazında)
          </p>
        </div>

        {/* Dönem Seçimi */}
        <div className="inline-flex rounded-xl bg-[var(--color-surface-muted)] p-1 border border-[var(--color-border)]/40">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setActivePeriod(p.key)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 cursor-pointer",
                activePeriod === p.key
                  ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/40"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              opacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--color-muted)", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--color-surface-muted)", opacity: 0.3 }}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1.5} />
            <Bar dataKey="value" radius={6} maxBarSize={32}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Portföy Gelecek Analizi (Projection Tool)
   ═══════════════════════════════════════════════════════════════════════ */

function PortfolioProjection({
  initialValue,
  currency,
  isTRY,
}: {
  initialValue: number;
  currency: "TRY" | "USD";
  isTRY: boolean;
}) {
  const [monthlyContribution, setMonthlyContribution] = useState(() =>
    isTRY ? 10000 : 300
  );
  const [expectedReturn, setExpectedReturn] = useState(() =>
    isTRY ? 35 : 12
  );
  const [years, setYears] = useState(5);

  const projectionData = useMemo(() => {
    const dataPoints = [];
    const monthlyRate = Math.pow(1 + expectedReturn / 100, 1 / 12) - 1;
    let value = initialValue;
    let totalInvested = initialValue;

    dataPoints.push({
      name: "Bugün",
      "Toplam Değer": Math.round(value),
      "Yatırılan Anapara": Math.round(totalInvested),
    });

    for (let y = 1; y <= years; y++) {
      for (let m = 1; m <= 12; m++) {
        value = value * (1 + monthlyRate) + monthlyContribution;
        totalInvested += monthlyContribution;
      }
      dataPoints.push({
        name: `${y} Yıl`,
        "Toplam Değer": Math.round(value),
        "Yatırılan Anapara": Math.round(totalInvested),
      });
    }

    return {
      dataPoints,
      finalValue: value,
      finalInvested: totalInvested,
      finalProfit: value - totalInvested,
    };
  }, [initialValue, monthlyContribution, expectedReturn, years]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl text-xs space-y-2 min-w-[180px]">
        <div className="font-bold text-[var(--color-foreground)] border-b border-[var(--color-border)]/40 pb-1">
          {data.name}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[var(--color-muted)]">Toplam Değer:</span>
            <span className="font-bold text-[var(--color-brand-strong)] tabular-nums">
              {formatMoney(data["Toplam Değer"], currency)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--color-muted)]">Anapara:</span>
            <span className="font-semibold text-slate-500 tabular-nums">
              {formatMoney(data["Yatırılan Anapara"], currency)}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--color-border)]/30 pt-1 mt-1">
            <span className="text-[var(--color-muted)]">Tahmini Kâr:</span>
            <span className="font-bold text-[var(--color-profit)] tabular-nums">
              {formatMoney(data["Toplam Değer"] - data["Yatırılan Anapara"], currency)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-sm">Portföy Gelecek Analizi</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Düzenli birikim ve getiri beklentinize göre gelecek projeksiyonu
            </p>
          </div>
        </div>

        {/* Kontroller & Özet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Sürgüler */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[var(--color-muted)]">Aylık Tasarruf</span>
                <span className="font-bold">{formatMoney(monthlyContribution, currency)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={isTRY ? 100000 : 5000}
                step={isTRY ? 1000 : 50}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full accent-[var(--color-brand)] cursor-pointer h-1.5 bg-[var(--color-surface-muted)] rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[var(--color-muted)]">Yıllık Getiri Beklentisi</span>
                <span className="font-bold text-[var(--color-profit)]">%{expectedReturn}</span>
              </div>
              <input
                type="range"
                min={5}
                max={150}
                step={5}
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
                className="w-full accent-[var(--color-brand)] cursor-pointer h-1.5 bg-[var(--color-surface-muted)] rounded-lg appearance-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-[var(--color-muted)]">Süre (Yıl)</span>
                <span className="font-bold">{years} Yıl</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-[var(--color-brand)] cursor-pointer h-1.5 bg-[var(--color-surface-muted)] rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* Sonuç Kartları */}
          <div className="flex flex-col justify-center gap-3 bg-[var(--color-surface-muted)]/40 p-4 rounded-xl border border-[var(--color-border)]/50">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                Tahmini Gelecek Değer
              </p>
              <p className="text-lg font-extrabold text-[var(--color-brand-strong)] tabular-nums mt-0.5">
                {formatMoney(projectionData.finalValue, currency)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-border)]/40 pt-2">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Yatırılan Anapara
                </p>
                <p className="text-xs font-bold text-slate-600 tabular-nums mt-0.5">
                  {formatMoney(projectionData.finalInvested, currency)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Tahmini Toplam Kâr
                </p>
                <p className="text-xs font-bold text-[var(--color-profit)] tabular-nums mt-0.5">
                  +{formatMoney(projectionData.finalProfit, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alan Grafiği */}
      <div className="h-40 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={projectionData.dataPoints}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--color-muted)", fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              tickFormatter={(v) => formatMoney(v, currency, { compact: true })}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Toplam Değer"
              stroke="var(--color-brand)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
            <Area
              type="monotone"
              dataKey="Yatırılan Anapara"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorInvested)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// =========================================================================
// PositionDetailModal & CustomTooltipDetail
// =========================================================================

function PositionDetailModal({
  position,
  isTRY,
  currency,
  onClose,
}: {
  position: PositionDTO;
  isTRY: boolean;
  currency: "TRY" | "USD";
  onClose: () => void;
}) {
  const [timeframe, setTimeframe] = useState<"3M" | "6M" | "1Y" | "ALL">("1Y");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const monthlyPerformances = useMemo(() => {
    // 1. Generate keys for the last 12 calendar months (ending in the current month)
    const months = [];
    const now = new Date();
    // Turkey timezone shift to be consistent
    const trNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    let y = trNow.getUTCFullYear();
    let m = trNow.getUTCMonth(); // 0-11
    
    for (let i = 0; i < 12; i++) {
      const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
      months.unshift(monthKey); // order ascending: oldest first
      m--;
      if (m < 0) {
        m = 11;
        y--;
      }
    }

    if (!data?.history || data.history.length === 0) {
      return months.map(monthKey => ({ monthKey, pct: null }));
    }
    
    // 2. Group snapshots by YYYY-MM
    const byMonth = new Map<string, any>();
    for (const p of data.history) {
      const dateStr = p.date;
      const mKey = dateStr.slice(0, 7);
      const existing = byMonth.get(mKey);
      if (!existing || dateStr > existing.date) {
        byMonth.set(mKey, p);
      }
    }
    
    // 3. For each target month, calculate return from the previous month
    return months.map((mCurr) => {
      // Find previous month key
      const [yearNum, monthNum] = mCurr.split("-").map(Number);
      let prevMonthNum = monthNum - 1;
      let prevYearNum = yearNum;
      if (prevMonthNum < 1) {
        prevMonthNum = 12;
        prevYearNum--;
      }
      const mPrev = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}`;
      
      const pPrev = byMonth.get(mPrev);
      const pCurr = byMonth.get(mCurr);
      
      const valPrev = pPrev ? (isTRY ? pPrev.closeTRY : pPrev.closeUSD) : null;
      const valCurr = pCurr ? (isTRY ? pCurr.closeTRY : pCurr.closeUSD) : null;
      
      let pct: number | null = null;
      if (valPrev && valCurr && valPrev > 0) {
        pct = ((valCurr / valPrev) - 1) * 100;
      }
      
      return {
        monthKey: mCurr,
        pct,
      };
    });
  }, [data, isTRY]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(
      `/api/history/series?symbol=${encodeURIComponent(
        position.symbol,
      )}&assetType=${position.assetType}`,
    )
      .then((res) => res.json())
      .then((resData) => {
        if (!active) return;
        if (resData.ok) {
          setData(resData);
        } else {
          setError(resData.error || "Veri alınamadı");
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Bir sunucu hatası oluştu.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [position.symbol, position.assetType]);

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    const now = new Date();
    let cutoff = new Date();
    if (timeframe === "3M") cutoff.setMonth(now.getMonth() - 3);
    else if (timeframe === "6M") cutoff.setMonth(now.getMonth() - 6);
    else if (timeframe === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
    else return data.history;

    return data.history.filter((h: any) => new Date(h.date) >= cutoff);
  }, [data, timeframe]);

  const historyWithTx = useMemo(() => {
    if (!filteredHistory.length) return [];
    const txs = data?.transactions || [];
    const txMap = new Map<string, any[]>();
    for (const t of txs) {
      const dStr = new Date(t.date).toISOString().split("T")[0];
      const arr = txMap.get(dStr) ?? [];
      arr.push(t);
      txMap.set(dStr, arr);
    }

    return filteredHistory.map((h: any) => {
      const dStr = new Date(h.date).toISOString().split("T")[0];
      const dayTxs = txMap.get(dStr) ?? [];
      return {
        ...h,
        hasBuy: dayTxs.some((t) => t.side === "BUY"),
        hasSell: dayTxs.some((t) => t.side === "SELL"),
        transactions: dayTxs,
      };
    });
  }, [filteredHistory, data]);

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.hasBuy) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="var(--color-profit)"
          stroke="#fff"
          strokeWidth={1.5}
        />
      );
    }
    if (payload.hasSell) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill="var(--color-loss)"
          stroke="#fff"
          strokeWidth={1.5}
        />
      );
    }
    return null;
  };

  const costVal = isTRY ? position.avgCostTRY : (position.costUSD / position.quantity);
  const priceKey = isTRY ? "closeTRY" : "closeUSD";

  return (
    <Modal open={true} onClose={onClose} title={`${position.symbol} Detayları`} size="xl">
      <div className="space-y-6">
        {/* Pozisyon Özet Kartları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--color-surface-muted)]/30 p-3 rounded-xl border border-[var(--color-border)]/40">
            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Adet</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">{formatNumber(position.quantity, 4)}</p>
          </div>
          <div className="bg-[var(--color-surface-muted)]/30 p-3 rounded-xl border border-[var(--color-border)]/40">
            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Ort. Maliyet</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">
              {formatMoney(isTRY ? position.avgCostTRY : (position.costUSD / position.quantity), currency)}
            </p>
          </div>
          <div className="bg-[var(--color-surface-muted)]/30 p-3 rounded-xl border border-[var(--color-border)]/40">
            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Güncel Değer</p>
            <p className="text-sm font-bold mt-0.5 tabular-nums">
              {formatMoney(isTRY ? position.valueTRY : position.valueUSD, currency)}
            </p>
          </div>
          <div className="bg-[var(--color-surface-muted)]/30 p-3 rounded-xl border border-[var(--color-border)]/40">
            <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Kâr / Zarar</p>
            <div className="text-sm font-bold mt-0.5">
              <ProfitValue
                value={isTRY ? position.unrealizedTRY : position.unrealizedUSD}
                currency={currency}
                pct={isTRY ? position.unrealizedPctTRY : position.unrealizedPctUSD}
              />
            </div>
          </div>
        </div>

        {/* Grafik Bölümü */}
        <div className="border border-[var(--color-border)]/40 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-sm">Fiyat Geçmişi & İşlem Noktaları</h3>
            {/* Zaman dilimi seçimi */}
            <div className="inline-flex rounded-lg bg-[var(--color-surface-muted)] p-0.5 border border-[var(--color-border)]/40">
              {(["3M", "6M", "1Y", "ALL"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-bold transition-all duration-150 cursor-pointer",
                    timeframe === t
                      ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  {t === "ALL" ? "Hepsi" : t}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-strong)]" />
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center text-xs text-red-500 font-semibold">
              {error}
            </div>
          ) : historyWithTx.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-[var(--color-muted)]">
              Geçmiş fiyat verisi bulunamadı.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={historyWithTx}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorDetails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => {
                      const d = new Date(tick);
                      return d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
                    }}
                    tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                    tickFormatter={(v) => formatMoney(v, currency, { compact: true })}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltipDetail isTRY={isTRY} />} />
                  
                  {/* Ortalama maliyet referans çizgisi */}
                  {position.quantity > 1e-9 && costVal > 0 && (
                    <ReferenceLine
                      y={costVal}
                      stroke="var(--color-muted)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{
                        value: `Ort. Maliyet: ${formatMoney(costVal, currency)}`,
                        fill: "var(--color-muted)",
                        fontSize: 9,
                        position: "insideTopLeft",
                      }}
                    />
                  )}

                  <Area
                    type="monotone"
                    dataKey={priceKey}
                    stroke="var(--color-brand)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDetails)"
                    dot={<CustomDot />}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Aylık Performans */}
        {!loading && !error && monthlyPerformances.length > 0 && (
          <div className="border border-[var(--color-border)]/40 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Son 1 Yıllık Aylık Performans</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {monthlyPerformances.map((mp) => (
                <div
                  key={mp.monthKey}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-[var(--color-border)]/35 text-center select-none"
                  style={getCellStyle(mp.pct, isDark)}
                >
                  <span className="text-[10px] opacity-75 font-semibold uppercase tracking-wider">
                    {monthLabel(mp.monthKey)}
                  </span>
                  <span className="text-xs font-bold mt-1 tabular-nums">
                    {mp.pct == null ? "–" : formatPercent(mp.pct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* İşlem Geçmişi */}
        {data?.transactions && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">İşlem Geçmişi ({data.transactions.length})</h3>
            <div className="overflow-x-auto border border-[var(--color-border)]/55 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-muted)]/40 text-[var(--color-muted)] font-bold border-b border-[var(--color-border)]/50">
                    <th className="px-4 py-2.5">Tarih</th>
                    <th className="px-4 py-2.5">İşlem</th>
                    <th className="px-4 py-2.5 text-right">Adet</th>
                    <th className="px-4 py-2.5 text-right">Birim Fiyat</th>
                    <th className="px-4 py-2.5 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 font-medium">
                  {data.transactions.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[var(--color-surface-muted)]/20 transition-colors">
                      <td className="px-4 py-2">{new Date(t.date).toLocaleDateString("tr-TR")}</td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "font-bold",
                            t.side === "BUY" ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]",
                          )}
                        >
                          {t.side === "BUY" ? "Alış" : "Satış"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatNumber(t.quantity, 4)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(t.unitPrice, t.currency)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(t.total, t.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const CustomTooltipDetail = ({ active, payload, isTRY }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const val = isTRY ? data.closeTRY : data.closeUSD;
  const d = new Date(data.date);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl text-xs space-y-2 min-w-[200px]">
      <div className="font-bold text-[var(--color-foreground)] border-b border-[var(--color-border)]/40 pb-1">
        {d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-[var(--color-muted)] font-medium">Fiyat:</span>
        <span className="font-bold tabular-nums">
          {formatMoney(val, isTRY ? "TRY" : "USD")}
        </span>
      </div>
      {data.transactions && data.transactions.map((t: any, i: number) => (
        <div key={i} className="border-t border-[var(--color-border)]/35 pt-1.5 mt-1.5 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className={t.side === "BUY" ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}>
              {t.side === "BUY" ? "ALIM" : "SATIM"}
            </span>
            <span className="text-[var(--color-muted)] font-normal">
              {formatNumber(t.quantity, 4)} adet
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Birim Fiyat:</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(t.unitPrice, t.currency)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
