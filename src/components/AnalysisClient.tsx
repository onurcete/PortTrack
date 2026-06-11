"use client";

import { useState, useMemo } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Zap,
  Target,
  Activity,
  Trophy,
  Flame,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  const [sortBy, setSortBy] = useState<"score" | "daily" | "symbol">("score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Filtreleme ve Sıralama
  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab)!;
    return analyses
      .filter((a) => tab.types.includes(a.assetType))
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "score") {
          cmp = a.score - b.score;
        } else if (sortBy === "daily") {
          cmp =
            (a.indicators?.dailyChangePct ?? 0) -
            (b.indicators?.dailyChangePct ?? 0);
        } else {
          cmp = a.symbol.localeCompare(b.symbol);
        }
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
          className="btn btn-outline py-1.5 px-4 text-xs h-9 flex items-center gap-2 cursor-pointer"
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

      {/* Sekmeler ve Listeleme */}
      {!noData && (
        <>
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-0">
            {TABS.map((tab) => {
              const count = analyses.filter((a) => tab.types.includes(a.assetType)).length;
              if (count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "pb-2 px-3 border-b-2 font-bold text-sm transition-all outline-none cursor-pointer",
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

          <div className="space-y-4">
            {/* Sıralama ve Kontroller */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] font-bold">
                <span>SIRALA:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSort("score")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1 cursor-pointer",
                      sortBy === "score"
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]"
                        : "hover:bg-[var(--color-surface-muted)] text-[var(--color-foreground)]"
                    )}
                  >
                    Teknik Skor {sortBy === "score" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                  <button
                    onClick={() => handleSort("daily")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1 cursor-pointer",
                      sortBy === "daily"
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]"
                        : "hover:bg-[var(--color-surface-muted)] text-[var(--color-foreground)]"
                    )}
                  >
                    Günlük Değişim {sortBy === "daily" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                  <button
                    onClick={() => handleSort("symbol")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1 cursor-pointer",
                      sortBy === "symbol"
                        ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]"
                        : "hover:bg-[var(--color-surface-muted)] text-[var(--color-foreground)]"
                    )}
                  >
                    Sembol {sortBy === "symbol" && (sortDir === "asc" ? "▲" : "▼")}
                  </button>
                </div>
              </div>
              <div className="text-xs text-[var(--color-muted)] font-semibold">
                Toplam <strong className="text-[var(--color-foreground)]">{filtered.length}</strong> varlık listeleniyor
              </div>
            </div>

            {/* Varlık Grid */}
            {filtered.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl">
                Bu kategoride analiz verisi yok.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((a) => (
                  <AnalysisCard key={a.symbol} analysis={a} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ────────── Günün Özeti Kartı ──────────

function DailySummaryCard({ summary }: { summary: DailySummaryDTO }) {
  const total = summary.upCount + summary.downCount + summary.unchangedCount;
  const upPct = total > 0 ? (summary.upCount / total) * 100 : 0;
  const downPct = total > 0 ? (summary.downCount / total) * 100 : 0;
  const unchangedPct = total > 0 ? (summary.unchangedCount / total) * 100 : 0;

  return (
    <div className="card p-6 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-[var(--color-border)] shadow-xs space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shadow-inner">
            <Zap size={20} className="fill-[var(--color-brand-strong)]/10" />
          </div>
          <div>
            <h2 className="font-bold text-base text-[var(--color-foreground)]">Günün Özeti</h2>
            <p className="text-xs text-[var(--color-muted)]">Portföyünüzün teknik nabzı ve hareketleri</p>
          </div>
        </div>
        <div className="text-xs font-bold px-2.5 py-1 bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/10 shadow-xs text-[var(--color-brand-strong)] rounded-lg">
          Genel Durum
        </div>
      </div>

      {/* 3 Sütunlu Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Sütun: Portföy Oranı */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Enstrüman Dağılımı
          </p>
          <div className="space-y-3 bg-[var(--color-surface-muted)]/40 p-4 rounded-2xl border border-[var(--color-border)]/50 shadow-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-[var(--color-foreground)]">{summary.totalCount}</span>
              <span className="text-xs text-[var(--color-muted)] font-medium">Toplam Varlık</span>
            </div>
            
            {/* Yükselen / Düşen Çubuğu */}
            <div className="h-3 w-full rounded-full bg-slate-200/50 dark:bg-slate-800/50 overflow-hidden flex">
              <div 
                className="h-full bg-[var(--color-profit)] transition-all" 
                style={{ width: `${upPct}%` }}
                title={`Yükselen: ${summary.upCount}`}
              />
              <div 
                className="h-full bg-slate-400 dark:bg-slate-600 transition-all" 
                style={{ width: `${unchangedPct}%` }}
                title={`Değişmeyen: ${summary.unchangedCount}`}
              />
              <div 
                className="h-full bg-[var(--color-loss)] transition-all" 
                style={{ width: `${downPct}%` }}
                title={`Düşen: ${summary.downCount}`}
              />
            </div>

            <div className="flex justify-between items-center text-xs mt-2 font-semibold">
              <div className="flex items-center gap-1.5 text-[var(--color-profit)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-profit)]" />
                <span>{summary.upCount} Yükselen</span>
              </div>
              {summary.unchangedCount > 0 && (
                <div className="flex items-center gap-1.5 text-[var(--color-muted)]">
                  <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                  <span>{summary.unchangedCount} Stabil</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[var(--color-loss)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-loss)]" />
                <span>{summary.downCount} Düşen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orta Sütun: En Çok Yükselen / Düşen */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            En Çok Hareket Edenler
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {summary.topGainers.length > 0 && (
              <div className="rounded-xl bg-[var(--color-profit-soft)] border border-[var(--color-profit)]/10 p-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-profit)] flex items-center gap-1">
                  <Trophy size={12} className="fill-[var(--color-profit)]/10" />
                  En Çok Yükselenler
                </p>
                {summary.topGainers.map((g) => (
                  <div key={g.symbol} className="flex items-center justify-between text-xs font-medium">
                    <span className="font-semibold text-[var(--color-foreground)]">{g.symbol}</span>
                    <span className="font-bold text-[var(--color-profit)] tabular-nums">
                      +%{g.dailyChangePct.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {summary.topLosers.length > 0 && (
              <div className="rounded-xl bg-[var(--color-loss-soft)] border border-[var(--color-loss)]/10 p-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-loss)] flex items-center gap-1">
                  <Flame size={12} className="fill-[var(--color-loss)]/10" />
                  En Çok Düşenler
                </p>
                {summary.topLosers.map((l) => (
                  <div key={l.symbol} className="flex items-center justify-between text-xs font-medium">
                    <span className="font-semibold text-[var(--color-foreground)]">{l.symbol}</span>
                    <span className="font-bold text-[var(--color-loss)] tabular-nums">
                      -%{Math.abs(l.dailyChangePct).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ Sütun: Önemli Gelişmeler & Trendler */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Önemli Sinyaller ve Trendler
          </p>
          <div className="bg-[var(--color-surface-muted)]/40 p-4 rounded-2xl border border-[var(--color-border)]/50 shadow-xs space-y-2 max-h-[160px] overflow-y-auto">
            {summary.streakAlerts.length === 0 && summary.bigMoveAlerts.length === 0 ? (
              <p className="text-xs text-[var(--color-muted)] italic py-4 text-center">
                Bugün olağan dışı hareket veya seriye bağlayan varlık bulunmuyor.
              </p>
            ) : (
              [...summary.bigMoveAlerts, ...summary.streakAlerts].map((alert, i) => {
                let icon = "📢";
                let cls = "border-l-2 border-slate-400 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900/50";
                
                if (alert.includes("yükseldi") || alert.includes("yükseliyor")) {
                  icon = "📈";
                  cls = "border-l-2 border-[var(--color-profit)] bg-[var(--color-profit-soft)] text-[var(--color-profit)]";
                } else if (alert.includes("düştü") || alert.includes("düşüyor")) {
                  icon = "📉";
                  cls = "border-l-2 border-[var(--color-loss)] bg-[var(--color-loss-soft)] text-[var(--color-loss)]";
                } else if (alert.includes("olağandışı")) {
                  icon = "🚀";
                  cls = "border-l-2 border-[var(--color-brand)] bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]";
                } else if (alert.includes("sert satış")) {
                  icon = "💥";
                  cls = "border-l-2 border-[var(--color-loss)] bg-[var(--color-loss-soft)] text-[var(--color-loss)]";
                }

                return (
                  <div key={i} className={cn("text-xs font-semibold p-2 rounded-lg flex items-start gap-2", cls)}>
                    <span className="shrink-0 text-sm leading-none">{icon}</span>
                    <span className="leading-tight">{alert.replace(/^[📈📉🚀💥📢]\s*/, "")}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────── Varlık Kartı Bileşeni ──────────

function AnalysisCard({ analysis }: { analysis: AnalysisDTO }) {
  const a = analysis;
  const meta = ASSET_META[a.assetType as AssetType] ?? { label: a.assetType, color: "#94a3b8" };
  const dailyChange = a.indicators?.dailyChangePct ?? null;
  const rsiVal = a.indicators?.rsi14 !== null ? Math.round(a.indicators.rsi14) : null;

  return (
    <div className="card p-5 space-y-4 hover:shadow-md hover:border-[var(--color-brand)]/30 transition-all">
      {/* Üst Kısım: Başlık, Skor ve Fiyat */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)]/40 pb-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold shrink-0"
            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
          >
            {a.symbol.slice(0, 4)}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-[var(--color-foreground)]">{a.symbol}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)] font-bold">
                {meta.label}
              </span>
            </div>
            <p className="text-xs font-medium text-[var(--color-muted)] mt-0.5">
              {a.indicators?.currentPrice !== undefined
                ? `$${formatNumber(a.indicators.currentPrice, 2)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Günlük Değişim */}
          {dailyChange !== null && (
            <span
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums text-center",
                dailyChange >= 0
                  ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
                  : "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
              )}
            >
              {formatPercent(dailyChange)}
            </span>
          )}

          {/* Skor */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-[var(--color-muted)] font-bold uppercase tracking-wider mb-0.5">Skor</span>
            <ScoreBadge score={a.score} />
          </div>
        </div>
      </div>

      {/* Badgeler: Trend, MACD, RSI */}
      <div className="flex flex-wrap gap-2 text-xs">
        <TrendTextBadge signal={a.trendSignal} />
        <MacdTextBadge signal={a.macdSignal} />
        {rsiVal !== null && <RsiTextBadge value={rsiVal} zone={a.rsiZone} />}
      </div>

      {/* Yorum (Commentary) */}
      <div className="text-xs text-[var(--color-foreground)] leading-relaxed bg-gradient-to-r from-[var(--color-brand-soft)]/20 to-transparent p-3 rounded-xl border border-[var(--color-brand-soft)]/50">
        <div className="flex items-center gap-1.5 mb-1.5 text-[var(--color-brand-strong)] font-bold">
          <Brain size={14} />
          <span>Yapay Zekâ Analiz Yorumu</span>
        </div>
        <p className="opacity-90">{a.commentary}</p>
      </div>

      {/* Sinyaller & Uyarılar */}
      {a.alerts.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            <AlertTriangle size={12} className="text-amber-500" />
            <span>Sinyaller & Uyarılar</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {a.alerts.map((alert, i) => (
              <div
                key={i}
                className="text-xs font-semibold text-[var(--color-foreground)] bg-[var(--color-surface-muted)]/40 rounded-lg px-3 py-1.5 border-l-2 border-amber-500"
              >
                {alert}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────── Yardımcı Badge Bileşenleri ──────────

function TrendTextBadge({ signal }: { signal: string }) {
  const config: Record<string, { label: string; cls: string; icon: any }> = {
    STRONG_UP: {
      label: "Güçlü Yükseliş",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      icon: TrendingUp
    },
    UP: {
      label: "Yükseliş",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      icon: TrendingUp
    },
    DOWN: {
      label: "Düşüş",
      cls: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
      icon: TrendingDown
    },
    STRONG_DOWN: {
      label: "Güçlü Düşüş",
      cls: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
      icon: TrendingDown
    },
  };
  const c = config[signal] ?? {
    label: "Nötr",
    cls: "bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30",
    icon: Activity
  };
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border", c.cls)}>
      <Icon size={12} />
      <span>{c.label}</span>
    </span>
  );
}

function MacdTextBadge({ signal }: { signal: string }) {
  const config: Record<string, { label: string; cls: string; icon: any }> = {
    BUY_CROSS: {
      label: "Yeni Alış Sinyali",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      icon: Zap
    },
    SELL_CROSS: {
      label: "Yeni Satış Sinyali",
      cls: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
      icon: AlertTriangle
    },
    POSITIVE: {
      label: "Pozitif Momentum",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
      icon: TrendingUp
    },
    NEGATIVE: {
      label: "Negatif Momentum",
      cls: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30",
      icon: TrendingDown
    },
  };
  const c = config[signal] ?? {
    label: "Nötr",
    cls: "bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30",
    icon: Activity
  };
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border", c.cls)}>
      <Icon size={12} />
      <span>{c.label}</span>
    </span>
  );
}

function RsiTextBadge({ value, zone }: { value: number | null; zone: string }) {
  if (value === null) return <span className="text-xs text-[var(--color-muted)]">—</span>;
  let label = `Nötr (${value})`;
  let cls = "bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800/30";
  let Icon = Activity;

  if (zone === "OVERSOLD") {
    label = `Aşırı Satım / Ucuz (${value})`;
    cls = "bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30";
    Icon = Target;
  } else if (zone === "OVERBOUGHT") {
    label = `Aşırı Alım / Pahalı (${value})`;
    cls = "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30";
    Icon = AlertTriangle;
  } else if (value >= 60) {
    label = `Güçlü Alıcılar (${value})`;
    cls = "bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30";
    Icon = TrendingUp;
  } else if (value <= 40) {
    label = `Zayıf Seyir (${value})`;
    cls = "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30";
    Icon = TrendingDown;
  }

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold border", cls)}>
      <Icon size={12} />
      <span>{label}</span>
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "bg-emerald-500 text-white"
      : score >= 40
        ? "bg-amber-500 text-white"
        : "bg-rose-500 text-white";
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full text-xs font-black h-8 w-8 shadow-sm tracking-tighter shrink-0", cls)}>
      {score}
    </span>
  );
}
