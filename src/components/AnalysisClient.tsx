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
} from "lucide-react";
import { useRouter } from "next/navigation";
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
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Brain className="text-[var(--color-muted)]" size={36} />
          <p className="font-semibold">Henüz analiz verisi yok</p>
          <p className="text-sm text-[var(--color-muted)] max-w-sm">
            Yukarıdaki &quot;Analizi Güncelle&quot; butonuna basarak tüm enstrümanlarınızın teknik analizini başlatın.
          </p>
        </div>
      )}

      {/* Günün Özeti */}
      {dailySummary && <DailySummaryCard summary={dailySummary} analyses={analyses} />}

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

function DailySummaryCard({ summary, analyses }: { summary: DailySummaryDTO; analyses: AnalysisDTO[] }) {
  const total = summary.upCount + summary.downCount + summary.unchangedCount;
  const upPct = total > 0 ? (summary.upCount / total) * 100 : 0;
  const downPct = total > 0 ? (summary.downCount / total) * 100 : 0;

  // Ortalama teknik skor
  const avgScore = analyses.length > 0
    ? Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length)
    : 0;

  // Piyasa hissi (sentiment) hesaplama
  const sentimentScore = total > 0
    ? Math.round(((summary.upCount - summary.downCount) / total) * 100)
    : 0;
  const sentimentLabel = sentimentScore >= 40
    ? "Güçlü Boğa"
    : sentimentScore >= 10
    ? "Boğa Eğilimli"
    : sentimentScore <= -40
    ? "Güçlü Ayı"
    : sentimentScore <= -10
    ? "Ayı Eğilimli"
    : "Nötr";
  const sentimentColor = sentimentScore >= 10
    ? "var(--color-profit)"
    : sentimentScore <= -10
    ? "var(--color-loss)"
    : "var(--color-muted)";

  // Skor dağılımı
  const highScoreCount = analyses.filter(a => a.score >= 70).length;
  const midScoreCount = analyses.filter(a => a.score >= 40 && a.score < 70).length;
  const lowScoreCount = analyses.filter(a => a.score < 40).length;

  // Sinyal özeti
  const buyCrossCount = analyses.filter(a => a.macdSignal === "BUY_CROSS").length;
  const sellCrossCount = analyses.filter(a => a.macdSignal === "SELL_CROSS").length;
  const oversoldCount = analyses.filter(a => a.rsiZone === "OVERSOLD").length;
  const overboughtCount = analyses.filter(a => a.rsiZone === "OVERBOUGHT").length;
  const strongUpCount = analyses.filter(a => a.trendSignal === "STRONG_UP").length;
  const strongDownCount = analyses.filter(a => a.trendSignal === "STRONG_DOWN").length;

  // En çok hareket edenlerden en yüksek mutlak değişim (ölçek çubuğu için)
  const allMovers = [...summary.topGainers, ...summary.topLosers];
  const maxAbsChange = allMovers.length > 0
    ? Math.max(...allMovers.map(m => Math.abs(m.dailyChangePct)), 1)
    : 1;

  // Skor ring SVG parametreleri
  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (avgScore / 100) * ringCircumference;
  const ringColor = avgScore >= 70 ? "#10b981" : avgScore >= 40 ? "#f59e0b" : "#ef4444";


  return (
    <div className="space-y-4">
      {/* ───── Üst Metrik Şeridi ───── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Piyasa Hissi */}
        <div className="card p-4 flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${sentimentColor} 12%, transparent)` }}
          >
            {sentimentScore >= 10
              ? <TrendingUp size={20} style={{ color: sentimentColor }} />
              : sentimentScore <= -10
              ? <TrendingDown size={20} style={{ color: sentimentColor }} />
              : <Activity size={20} style={{ color: sentimentColor }} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Piyasa Hissi</p>
            <p className="font-black text-lg leading-tight" style={{ color: sentimentColor }}>{sentimentLabel}</p>
            <p className="text-[10px] text-[var(--color-muted)] tabular-nums mt-0.5">
              {summary.upCount}↑ {summary.unchangedCount > 0 && `${summary.unchangedCount}→ `}{summary.downCount}↓
            </p>
          </div>
        </div>

        {/* 2. Ortalama Teknik Skor (Ring) */}
        <div className="card p-4 flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: 48, height: 48 }}>
            <svg width="48" height="48" viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r={ringRadius} fill="none" stroke="var(--color-border)" strokeWidth="6" opacity="0.3" />
              <circle
                cx="40" cy="40" r={ringRadius}
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-700"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-sm font-black"
              style={{ color: ringColor }}
            >
              {avgScore}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">Ort. Skor</p>
            <p className="text-xs font-semibold text-[var(--color-foreground)] mt-1">
              {avgScore >= 70 ? "Güçlü" : avgScore >= 40 ? "Karışık" : "Zayıf"}
            </p>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-emerald-500 tabular-nums">{highScoreCount}●</span>
              <span className="text-[10px] font-bold text-amber-500 tabular-nums">{midScoreCount}●</span>
              <span className="text-[10px] font-bold text-rose-500 tabular-nums">{lowScoreCount}●</span>
            </div>
          </div>
        </div>

        {/* 3. Boğa / Ayı Oranı Çubuğu */}
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-2">Boğa / Ayı Oranı</p>
          <div className="h-2.5 w-full rounded-full bg-slate-200/50 dark:bg-slate-800/50 overflow-hidden flex">
            <div
              className="h-full bg-[var(--color-profit)] transition-all rounded-l-full"
              style={{ width: `${upPct}%` }}
            />
            <div
              className="h-full bg-[var(--color-loss)] transition-all rounded-r-full"
              style={{ width: `${downPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] mt-2 font-bold tabular-nums">
            <span className="text-[var(--color-profit)]">%{upPct.toFixed(0)} Boğa</span>
            <span className="text-[var(--color-loss)]">%{downPct.toFixed(0)} Ayı</span>
          </div>
        </div>

        {/* 4. Toplam Varlık ve Aktif Sinyaller */}
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] mb-1">Portföy & Sinyaller</p>
          <p className="text-2xl font-black text-[var(--color-foreground)] leading-none">{summary.totalCount}</p>
          <p className="text-[10px] text-[var(--color-muted)] mb-2">varlık analiz edildi</p>
          <div className="flex flex-wrap gap-1">
            {buyCrossCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                {buyCrossCount} Alış Sinyali
              </span>
            )}
            {sellCrossCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                {sellCrossCount} Satış Sinyali
              </span>
            )}
            {oversoldCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                {oversoldCount} Aşırı Satım
              </span>
            )}
            {overboughtCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                {overboughtCount} Aşırı Alım
              </span>
            )}
            {strongUpCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                {strongUpCount} Güçlü Trend↑
              </span>
            )}
            {strongDownCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                {strongDownCount} Güçlü Trend↓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ───── Alt Bölüm: En Çok Hareket Edenler + Sinyal Akışı ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sol: En Çok Hareket Edenler (Görsel Çubuklu) */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500" />
              Günün Öne Çıkanları
            </h3>
            <span className="text-[10px] font-bold text-[var(--color-muted)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded-md">
              Top {Math.min(4, summary.topGainers.length)} ↑↓
            </span>
          </div>

          {/* Yükselenler */}
          {summary.topGainers.length > 0 && (
            <div className="space-y-1.5">
              {summary.topGainers.map((g) => {
                const barW = Math.min(100, (Math.abs(g.dailyChangePct) / maxAbsChange) * 100);
                return (
                  <div key={g.symbol} className="flex items-center gap-2 group">
                    <span className="w-16 text-xs font-bold text-[var(--color-foreground)] shrink-0 truncate">{g.symbol}</span>
                    <div className="flex-1 h-5 rounded-md bg-[var(--color-surface-muted)]/30 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/60 rounded-md transition-all duration-500"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-[var(--color-profit)] tabular-nums w-16 text-right">
                      +%{g.dailyChangePct.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ayırıcı */}
          {summary.topGainers.length > 0 && summary.topLosers.length > 0 && (
            <div className="border-t border-[var(--color-border)]/30" />
          )}

          {/* Düşenler */}
          {summary.topLosers.length > 0 && (
            <div className="space-y-1.5">
              {summary.topLosers.map((l) => {
                const barW = Math.min(100, (Math.abs(l.dailyChangePct) / maxAbsChange) * 100);
                return (
                  <div key={l.symbol} className="flex items-center gap-2 group">
                    <span className="w-16 text-xs font-bold text-[var(--color-foreground)] shrink-0 truncate">{l.symbol}</span>
                    <div className="flex-1 h-5 rounded-md bg-[var(--color-surface-muted)]/30 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500/80 to-rose-400/60 rounded-md transition-all duration-500"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-[var(--color-loss)] tabular-nums w-16 text-right">
                      -%{Math.abs(l.dailyChangePct).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ: Sinyal Radar — Kategori bazlı sinyaller */}
        <SignalRadar analyses={analyses} dailySummary={summary} />
      </div>
    </div>
  );
}

// ────────── Sinyal Radar Bileşeni ──────────

type SignalTabKey = "ALL" | "FOREIGN" | "TEFAS" | "OTHER";

const SIGNAL_TABS: { key: SignalTabKey; label: string; emoji: string; types: string[] }[] = [
  { key: "ALL", label: "Tümü", emoji: "🌐", types: [] },
  { key: "FOREIGN", label: "Yabancı", emoji: "🇺🇸", types: ["FOREIGN"] },
  { key: "TEFAS", label: "TEFAS", emoji: "🏦", types: ["TEFAS"] },
  { key: "OTHER", label: "Diğer", emoji: "📊", types: ["METAL", "CRYPTO", "FX", "BIST", "BES"] },
];

interface SignalItem {
  symbol: string;
  assetType: string;
  type: "buy" | "sell" | "oversold" | "overbought" | "strong_up" | "strong_down" | "streak_up" | "streak_down" | "big_move_up" | "big_move_down";
  label: string;
  detail: string;
  score: number;
  dailyChange: number | null;
}

function SignalRadar({ analyses, dailySummary }: { analyses: AnalysisDTO[]; dailySummary: DailySummaryDTO }) {
  const [signalTab, setSignalTab] = useState<SignalTabKey>("ALL");

  // Tüm analizlerden sinyal öğeleri üret
  const allSignals = useMemo(() => {
    const signals: SignalItem[] = [];

    for (const a of analyses) {
      const daily = a.indicators?.dailyChangePct ?? null;

      // MACD sinyalleri
      if (a.macdSignal === "BUY_CROSS") {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "buy",
          label: "Alış Sinyali", detail: "MACD çizgisi sinyal çizgisini yukarı kesti",
          score: a.score, dailyChange: daily,
        });
      }
      if (a.macdSignal === "SELL_CROSS") {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "sell",
          label: "Satış Sinyali", detail: "MACD çizgisi sinyal çizgisini aşağı kesti",
          score: a.score, dailyChange: daily,
        });
      }

      // RSI aşırı bölgeler
      if (a.rsiZone === "OVERSOLD") {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "oversold",
          label: "Aşırı Satım", detail: `RSI ${Math.round(a.indicators?.rsi14 ?? 0)} — fırsat alanı`,
          score: a.score, dailyChange: daily,
        });
      }
      if (a.rsiZone === "OVERBOUGHT") {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "overbought",
          label: "Aşırı Alım", detail: `RSI ${Math.round(a.indicators?.rsi14 ?? 0)} — dikkatli ol`,
          score: a.score, dailyChange: daily,
        });
      }

      // Güçlü trend sinyalleri
      if (a.trendSignal === "STRONG_UP") {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "strong_up",
          label: "Güçlü Yükseliş", detail: "Tüm hareketli ortalamalar üzerinde",
          score: a.score, dailyChange: daily,
        });
      }
      if (a.trendSignal === "STRONG_DOWN") {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "strong_down",
          label: "Güçlü Düşüş", detail: "Tüm hareketli ortalamalar altında",
          score: a.score, dailyChange: daily,
        });
      }

      // Büyük günlük hareket
      if (daily !== null && daily > 5) {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "big_move_up",
          label: "Olağandışı Yükseliş", detail: `Günlük +%${daily.toFixed(1)} hareket`,
          score: a.score, dailyChange: daily,
        });
      }
      if (daily !== null && daily < -5) {
        signals.push({
          symbol: a.symbol, assetType: a.assetType, type: "big_move_down",
          label: "Sert Satış", detail: `Günlük -%${Math.abs(daily).toFixed(1)} hareket`,
          score: a.score, dailyChange: daily,
        });
      }
    }

    return signals;
  }, [analyses]);

  // Sekmeye göre filtrele
  const filteredSignals = useMemo(() => {
    if (signalTab === "ALL") return allSignals;
    const tab = SIGNAL_TABS.find((t) => t.key === signalTab)!;
    return allSignals.filter((s) => tab.types.includes(s.assetType));
  }, [allSignals, signalTab]);

  // Sekme sayaçları
  const tabCounts = useMemo(() => {
    const counts: Record<SignalTabKey, number> = { ALL: allSignals.length, FOREIGN: 0, TEFAS: 0, OTHER: 0 };
    for (const s of allSignals) {
      if (s.assetType === "FOREIGN") counts.FOREIGN++;
      else if (s.assetType === "TEFAS") counts.TEFAS++;
      else counts.OTHER++;
    }
    return counts;
  }, [allSignals]);

  const signalConfig: Record<string, { emoji: string; gradient: string; border: string; text: string }> = {
    buy:           { emoji: "⚡", gradient: "from-emerald-500/10 to-emerald-500/0",  border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400" },
    sell:          { emoji: "⚠️",  gradient: "from-rose-500/10 to-rose-500/0",      border: "border-rose-500/40",    text: "text-rose-600 dark:text-rose-400" },
    oversold:      { emoji: "🎯", gradient: "from-orange-500/10 to-orange-500/0",   border: "border-orange-500/40",  text: "text-orange-600 dark:text-orange-400" },
    overbought:    { emoji: "🔴", gradient: "from-red-500/10 to-red-500/0",         border: "border-red-500/40",     text: "text-red-600 dark:text-red-400" },
    strong_up:     { emoji: "🚀", gradient: "from-emerald-500/10 to-emerald-500/0", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400" },
    strong_down:   { emoji: "📉", gradient: "from-rose-500/10 to-rose-500/0",       border: "border-rose-500/40",    text: "text-rose-600 dark:text-rose-400" },
    streak_up:     { emoji: "📈", gradient: "from-green-500/10 to-green-500/0",     border: "border-green-500/40",   text: "text-green-600 dark:text-green-400" },
    streak_down:   { emoji: "💧", gradient: "from-blue-500/10 to-blue-500/0",       border: "border-blue-500/40",    text: "text-blue-600 dark:text-blue-400" },
    big_move_up:   { emoji: "🔥", gradient: "from-amber-500/10 to-amber-500/0",    border: "border-amber-500/40",   text: "text-amber-600 dark:text-amber-400" },
    big_move_down: { emoji: "💥", gradient: "from-rose-500/10 to-rose-500/0",       border: "border-rose-500/40",    text: "text-rose-600 dark:text-rose-400" },
  };

  return (
    <div className="card p-5 space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
          <Target size={13} className="text-violet-500" />
          Sinyal Radar
        </h3>
        <span className="text-[10px] font-bold text-[var(--color-muted)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded-md tabular-nums">
          {filteredSignals.length} sinyal aktif
        </span>
      </div>

      {/* Kategori Sekmeleri */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-surface-muted)]/50">
        {SIGNAL_TABS.map((tab) => {
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setSignalTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                signalTab === tab.key
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <span className="text-xs">{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={cn(
                  "text-[9px] rounded-full px-1.5 py-0 font-black tabular-nums",
                  signalTab === tab.key
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sinyal Listesi */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {filteredSignals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mb-3">
              <Activity size={20} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-xs text-[var(--color-muted)] font-medium">
              Bu kategoride aktif sinyal bulunmuyor.
            </p>
          </div>
        ) : (
          filteredSignals.map((signal, i) => {
            const cfg = signalConfig[signal.type] ?? signalConfig.buy;
            const meta = ASSET_META[signal.assetType as AssetType] ?? { label: signal.assetType, color: "#94a3b8" };
            return (
              <div
                key={`${signal.symbol}-${signal.type}-${i}`}
                className={cn(
                  "group relative flex items-center gap-3 p-3 rounded-xl border transition-all",
                  "bg-gradient-to-r",
                  cfg.gradient,
                  cfg.border,
                  "hover:shadow-sm"
                )}
              >
                {/* Emoji İkonu */}
                <span className="text-base shrink-0 leading-none">{cfg.emoji}</span>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-black text-[var(--color-foreground)]">{signal.symbol}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0 rounded"
                      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className={cn("text-[11px] font-bold", cfg.text)}>{signal.label}</p>
                  <p className="text-[10px] text-[var(--color-muted)] mt-0.5 leading-snug">{signal.detail}</p>
                </div>

                {/* Skor ve Günlük Değişim */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <ScoreBadge score={signal.score} />
                  {signal.dailyChange !== null && (
                    <span className={cn(
                      "text-[10px] font-bold tabular-nums",
                      signal.dailyChange >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
                    )}>
                      {signal.dailyChange >= 0 ? "+" : ""}{signal.dailyChange.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
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
