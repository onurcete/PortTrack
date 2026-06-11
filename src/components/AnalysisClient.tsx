"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  Target,
  Activity,
  Trophy,
  Flame,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/context/currency";
import { Card } from "@/components/ui";
import { ASSET_META, type AssetType } from "@/lib/assets";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

// ────────── Tipler ──────────

interface AnalysisDTO {
  symbol: string;
  assetType: string;
  date: string;
  indicators: any;
  score: number;
  commentary: string;
  trendSignal: string;
  macdSignal: string;
  rsiZone: string;
  alerts: string[];
}

interface DailySummaryDTO {
  totalCount: number;
  upCount: number;
  downCount: number;
  unchangedCount: number;
  topGainers: { symbol: string; assetType: string; dailyChangePct: number }[];
  topLosers: { symbol: string; assetType: string; dailyChangePct: number }[];
  streakAlerts: string[];
  bigMoveAlerts: string[];
}

type TabKey = "FOREIGN" | "TEFAS" | "OTHER";

const TABS: { key: TabKey; label: string; types: string[] }[] = [
  { key: "FOREIGN", label: "Yabancı Hisseler", types: ["FOREIGN"] },
  { key: "TEFAS", label: "TEFAS Fonlar", types: ["TEFAS"] },
  { key: "OTHER", label: "Metal / Kripto / Döviz", types: ["METAL", "CRYPTO", "FX", "BIST"] },
];

// ────────── Ana Bileşen ──────────

export function AnalysisClient({
  analyses,
  dailySummary,
  lastAnalysisDate,
}: {
  analyses: AnalysisDTO[];
  dailySummary: DailySummaryDTO | null;
  lastAnalysisDate: string | null;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("FOREIGN");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "daily" | "symbol">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filtreleme
  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab)!;
    return analyses
      .filter((a) => tab.types.includes(a.assetType))
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "score") cmp = a.score - b.score;
        else if (sortBy === "daily")
          cmp =
            (a.indicators?.dailyChangePct ?? 0) -
            (b.indicators?.dailyChangePct ?? 0);
        else cmp = a.symbol.localeCompare(b.symbol);
        return sortDir === "desc" ? -cmp : cmp;
      });
  }, [analyses, activeTab, sortBy, sortDir]);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch("/api/analysis/run", { method: "POST" });
      router.refresh();
    } catch {
      // sessiz
    } finally {
      setRefreshing(false);
    }
  }

  const handleSort = (field: "score" | "daily" | "symbol") => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir(field === "symbol" ? "asc" : "desc");
    }
  };

  const noData = analyses.length === 0;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain size={24} className="text-[var(--color-brand-strong)]" />
            Analiz
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {lastAnalysisDate
              ? `Son analiz: ${new Date(lastAnalysisDate).toLocaleString("tr-TR")}`
              : "Henüz analiz çalıştırılmadı"}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-outline py-1.5 px-4 text-xs h-9 flex items-center gap-2"
          title="Tüm enstrümanlar için teknik analizi yeniden hesapla"
        >
          <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
          {refreshing ? "Hesaplanıyor..." : "Analizi Güncelle"}
        </button>
      </div>

      {/* Boş durum */}
      {noData && !refreshing && (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Brain className="text-[var(--color-muted)]" size={36} />
          <p className="font-semibold">Henüz analiz verisi yok</p>
          <p className="text-sm text-[var(--color-muted)] max-w-sm">
            Yukarıdaki &quot;Analizi Güncelle&quot; butonuna basarak tüm enstrümanlarınızın teknik analizini başlatın.
          </p>
        </Card>
      )}

      {/* Günün Özeti */}
      {dailySummary && <DailySummaryCard summary={dailySummary} />}

      {/* Sekmeler */}
      {!noData && (
        <>
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-0">
            {TABS.map((tab) => {
              const count = analyses.filter((a) => tab.types.includes(a.assetType)).length;
              if (count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setExpandedSymbol(null);
                  }}
                  className={cn(
                    "pb-2 px-3 border-b-2 font-bold text-sm transition-all outline-none",
                    activeTab === tab.key
                      ? "border-[var(--color-brand-strong)] text-[var(--color-brand-strong)]"
                      : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]",
                  )}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Analiz Tablosu */}
          <Card className="overflow-hidden">
            {/* Tablo başlıkları */}
            <div className="grid grid-cols-[minmax(100px,1.5fr)_80px_80px_80px_80px_80px_60px] gap-2 px-6 py-3 bg-[var(--color-surface-muted)]/40 border-b border-[var(--color-border)]/50">
              <SortButton
                label="Sembol"
                field="symbol"
                active={sortBy}
                dir={sortDir}
                onSort={handleSort}
                align="left"
              />
              <SortButton
                label="Günlük"
                field="daily"
                active={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] text-center">
                Trend
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] text-center">
                MACD
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] text-center">
                RSI
              </span>
              <SortButton
                label="Skor"
                field="score"
                active={sortBy}
                dir={sortDir}
                onSort={handleSort}
              />
              <span />
            </div>

            {/* Satırlar */}
            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--color-muted)]">
                Bu kategoride analiz verisi yok.
              </p>
            ) : (
              filtered.map((a) => (
                <AnalysisRow
                  key={a.symbol}
                  analysis={a}
                  expanded={expandedSymbol === a.symbol}
                  onToggle={() =>
                    setExpandedSymbol(expandedSymbol === a.symbol ? null : a.symbol)
                  }
                />
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ────────── Günün Özeti Kartı ──────────

function DailySummaryCard({ summary }: { summary: DailySummaryDTO }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
          <Zap size={18} />
        </div>
        <h2 className="font-bold text-sm">Günün Özeti</h2>
      </div>

      {/* Genel durum */}
      <p className="text-sm text-[var(--color-foreground)]">
        Portföyündeki <strong>{summary.totalCount}</strong> enstrümandan{" "}
        <span className="text-[var(--color-profit)] font-bold">{summary.upCount}</span> tanesi yükseldi,{" "}
        <span className="text-[var(--color-loss)] font-bold">{summary.downCount}</span> tanesi düştü
        {summary.unchangedCount > 0 && (
          <>, <span className="text-[var(--color-muted)] font-bold">{summary.unchangedCount}</span> tanesi değişmedi</>
        )}
        .
      </p>

      {/* Top kazanan/kaybeden */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {summary.topGainers.length > 0 && (
          <div className="rounded-xl bg-[var(--color-profit-soft)] p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-profit)] flex items-center gap-1">
              <Trophy size={12} /> En Çok Yükselen
            </p>
            {summary.topGainers.map((g) => (
              <div key={g.symbol} className="flex items-center justify-between text-xs">
                <span className="font-semibold">{g.symbol}</span>
                <span className="font-bold text-[var(--color-profit)] tabular-nums">
                  +%{g.dailyChangePct.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
        {summary.topLosers.length > 0 && (
          <div className="rounded-xl bg-[var(--color-loss-soft)] p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-loss)] flex items-center gap-1">
              <Flame size={12} /> En Çok Düşen
            </p>
            {summary.topLosers.map((l) => (
              <div key={l.symbol} className="flex items-center justify-between text-xs">
                <span className="font-semibold">{l.symbol}</span>
                <span className="font-bold text-[var(--color-loss)] tabular-nums">
                  %{l.dailyChangePct.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uyarılar */}
      {(summary.streakAlerts.length > 0 || summary.bigMoveAlerts.length > 0) && (
        <div className="space-y-1">
          {[...summary.bigMoveAlerts, ...summary.streakAlerts].map((alert, i) => (
            <p key={i} className="text-xs font-medium text-[var(--color-foreground)]">
              {alert}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

// ────────── Analiz Satırı ──────────

function AnalysisRow({
  analysis,
  expanded,
  onToggle,
}: {
  analysis: AnalysisDTO;
  expanded: boolean;
  onToggle: () => void;
}) {
  const a = analysis;
  const meta = ASSET_META[a.assetType as AssetType] ?? { label: a.assetType, color: "#94a3b8" };
  const dailyChange = a.indicators?.dailyChangePct ?? null;
  const rsiVal = a.indicators?.rsi14 !== null ? Math.round(a.indicators.rsi14) : null;

  return (
    <div className="border-b border-[var(--color-border)]/30 last:border-0">
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[minmax(100px,1.5fr)_80px_80px_80px_80px_80px_60px] gap-2 items-center px-6 py-3 text-left hover:bg-[var(--color-surface-muted)]/30 transition-colors"
      >
        {/* Sembol */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[9px] font-bold shrink-0"
            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
          >
            {a.symbol.slice(0, 3)}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-xs truncate">{a.symbol}</p>
            <p className="text-[10px] text-[var(--color-muted)]">
              {a.indicators?.currentPrice !== undefined
                ? `$${formatNumber(a.indicators.currentPrice, 2)}`
                : ""}
            </p>
          </div>
        </div>

        {/* Günlük */}
        <div className="flex justify-center">
          {dailyChange !== null ? (
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums text-center min-w-[52px]",
                dailyChange >= 0
                  ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                  : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
              )}
            >
              {formatPercent(dailyChange)}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-muted)]">—</span>
          )}
        </div>

        {/* Trend */}
        <div className="flex justify-center">
          <TrendBadge signal={a.trendSignal} />
        </div>

        {/* MACD */}
        <div className="flex justify-center">
          <MacdBadge signal={a.macdSignal} />
        </div>

        {/* RSI */}
        <div className="flex justify-center">
          <RsiBadge value={rsiVal} zone={a.rsiZone} />
        </div>

        {/* Skor */}
        <div className="flex justify-center">
          <ScoreBadge score={a.score} />
        </div>

        {/* Expand */}
        <div className="flex justify-center text-[var(--color-muted)]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Detay Alanı */}
      {expanded && (
        <div className="px-6 pb-5 space-y-4 bg-[var(--color-surface-muted)]/15">
          {/* Yorum */}
          <div className="rounded-xl border border-[var(--color-border)]/40 p-4 bg-[var(--color-surface)]">
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
              {a.commentary}
            </p>
          </div>

          {/* Gösterge Detayları */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <IndicatorCard
              label="SMA20"
              value={a.indicators?.sma20}
              status={
                a.indicators?.currentPrice > a.indicators?.sma20
                  ? "above"
                  : "below"
              }
            />
            <IndicatorCard
              label="SMA50"
              value={a.indicators?.sma50}
              status={
                a.indicators?.currentPrice > a.indicators?.sma50
                  ? "above"
                  : "below"
              }
            />
            <IndicatorCard
              label="SMA200"
              value={a.indicators?.sma200}
              status={
                a.indicators?.currentPrice > a.indicators?.sma200
                  ? "above"
                  : "below"
              }
            />
            <IndicatorCard
              label="RSI (14)"
              value={rsiVal}
              suffix=""
              status={
                a.rsiZone === "OVERSOLD"
                  ? "below"
                  : a.rsiZone === "OVERBOUGHT"
                    ? "above"
                    : "neutral"
              }
            />
            <IndicatorCard
              label="MACD"
              value={a.indicators?.macd}
              decimals={3}
              status={
                a.indicators?.macd > a.indicators?.macdSignal
                  ? "above"
                  : "below"
              }
            />
            <IndicatorCard
              label="Signal"
              value={a.indicators?.macdSignal}
              decimals={3}
              status="neutral"
            />
            <IndicatorCard
              label="Bollinger Üst"
              value={a.indicators?.bollingerUpper}
              status="neutral"
            />
            <IndicatorCard
              label="Bollinger Alt"
              value={a.indicators?.bollingerLower}
              status="neutral"
            />
          </div>

          {/* Uyarılar */}
          {a.alerts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
                <AlertTriangle size={12} /> Sinyaller & Uyarılar
              </p>
              {a.alerts.map((alert, i) => (
                <p
                  key={i}
                  className="text-xs font-medium text-[var(--color-foreground)] bg-[var(--color-surface-muted)]/40 rounded-lg px-3 py-2"
                >
                  {alert}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────── Yardımcı Badge Bileşenleri ──────────

function TrendBadge({ signal }: { signal: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    STRONG_UP: { label: "↑↑", cls: "bg-[var(--color-profit-soft)] text-[var(--color-profit)]" },
    UP: { label: "↑", cls: "bg-[var(--color-profit-soft)] text-[var(--color-profit)]" },
    DOWN: { label: "↓", cls: "bg-[var(--color-loss-soft)] text-[var(--color-loss)]" },
    STRONG_DOWN: { label: "↓↓", cls: "bg-[var(--color-loss-soft)] text-[var(--color-loss)]" },
  };
  const c = config[signal] ?? config.UP;
  return (
    <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-bold min-w-[36px] text-center", c.cls)}>
      {c.label}
    </span>
  );
}

function MacdBadge({ signal }: { signal: string }) {
  const isPositive = signal === "POSITIVE" || signal === "BUY_CROSS";
  const label = signal === "BUY_CROSS" ? "✦ +" : signal === "SELL_CROSS" ? "✦ −" : isPositive ? "+" : "−";
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-[11px] font-bold min-w-[36px] text-center",
        isPositive
          ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
          : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
      )}
    >
      {label}
    </span>
  );
}

function RsiBadge({ value, zone }: { value: number | null; zone: string }) {
  if (value === null) return <span className="text-xs text-[var(--color-muted)]">—</span>;
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums min-w-[36px] text-center",
        zone === "OVERSOLD"
          ? "bg-orange-500/15 text-orange-500"
          : zone === "OVERBOUGHT"
            ? "bg-red-500/15 text-red-500"
            : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]",
      )}
    >
      {value}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
      : score >= 40
        ? "bg-amber-500/15 text-amber-600"
        : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums min-w-[36px] text-center", cls)}>
      {score}
    </span>
  );
}

function IndicatorCard({
  label,
  value,
  status,
  suffix = "",
  decimals = 2,
}: {
  label: string;
  value: number | null | undefined;
  status: "above" | "below" | "neutral";
  suffix?: string;
  decimals?: number;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div className="rounded-xl bg-[var(--color-surface-muted)]/30 p-3 border border-[var(--color-border)]/30">
      <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">{label}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <p className="text-sm font-bold tabular-nums">{formatNumber(value, decimals)}{suffix}</p>
        {status !== "neutral" && (
          <span
            className={cn(
              "text-[10px] font-bold",
              status === "above" ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]",
            )}
          >
            {status === "above" ? "🟢" : "🔴"}
          </span>
        )}
      </div>
    </div>
  );
}

function SortButton({
  label,
  field,
  active,
  dir,
  onSort,
  align = "center",
}: {
  label: string;
  field: "score" | "daily" | "symbol";
  active: string;
  dir: string;
  onSort: (f: "score" | "daily" | "symbol") => void;
  align?: "left" | "center";
}) {
  const isActive = active === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1 transition-colors outline-none",
        align === "left" ? "justify-start" : "justify-center",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "text-[10px] transition-opacity font-normal shrink-0",
          isActive ? "opacity-100 text-[var(--color-brand-strong)]" : "opacity-35",
        )}
      >
        {isActive ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}
