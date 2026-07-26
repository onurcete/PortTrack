"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Grid,
  List,
  Minus,
  RefreshCw,
  Search,
  Sliders,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ASSET_META, type AssetType } from "@/lib/assets";
import type { AnalysisPulse } from "@/lib/analysisPulse";
import { tabKeyForAssetType } from "@/lib/analysisPulse";
import type { BriefingPayload, BriefingFocusMode } from "@/lib/analysisAi";
import type { HoldingDTO } from "@/lib/analysisData";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import {
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/utils";
import { AnalysisAiSection } from "./AnalysisAiSection";
import { TechnicalDetailModal } from "./TechnicalDetailModal";
import { TefasInvestorSection } from "./TefasInvestorSection";

interface AnalysisBriefingClientProps {
  pulse: AnalysisPulse;
  holdings: HoldingDTO[];
  tefasInvestors: TefasInvestorSummary | null;
  lastTechnicalDate: string | null;
  initialBriefing: {
    payload: BriefingPayload;
    model: string;
    createdAt: string;
    contextHash: string;
  } | null;
  aiConfigured: boolean;
  contextHash: string;
}

type TabType = "ALL" | "STOCKS" | "TEFAS" | "ALT" | "BES";
type TechFilterType = "ALL" | "HIGH_SCORE" | "RSI_OVERSOLD" | "MACD_BUY";
type ViewMode = "GRID" | "TABLE";

export function AnalysisBriefingClient({
  pulse,
  holdings,
  tefasInvestors,
  lastTechnicalDate,
  initialBriefing,
  aiConfigured,
  contextHash,
}: AnalysisBriefingClientProps) {
  const router = useRouter();

  // AI State
  const [briefing, setBriefing] = useState(initialBriefing);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Technical Refresh State
  const [techLoading, setTechLoading] = useState(false);
  const [techMsg, setTechMsg] = useState<string | null>(null);

  // Modal State
  const [selectedHolding, setSelectedHolding] = useState<HoldingDTO | null>(null);

  // Explorer State
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [techFilter, setTechFilter] = useState<TechFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");

  const symbolNotes = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of briefing?.payload.perSymbol ?? []) {
      map.set(row.symbol, row.note);
    }
    return map;
  }, [briefing]);

  // Portfolio Health Metrics Calculation
  const healthStats = useMemo(() => {
    let scoreSum = 0;
    let scoreCount = 0;
    let strongUp = 0;
    let up = 0;
    let down = 0;
    let rsiOversold = 0;
    let macdBuy = 0;

    for (const h of holdings) {
      if (h.analysis) {
        scoreSum += h.analysis.score;
        scoreCount++;

        const ts = h.analysis.trendSignal;
        if (ts === "STRONG_UP") strongUp++;
        else if (ts === "UP") up++;
        else down++;

        if (h.analysis.rsiZone === "OVERSOLD") rsiOversold++;
        if (h.analysis.macdSignal.includes("BUY") || h.analysis.macdSignal === "POSITIVE") macdBuy++;
      }
    }

    const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;

    return {
      avgScore,
      scoreCount,
      strongUp,
      up,
      down,
      rsiOversold,
      macdBuy,
    };
  }, [holdings]);

  // Filtered Holdings
  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      // Tab filter
      if (activeTab !== "ALL") {
        const cat = tabKeyForAssetType(h.assetType);
        if (activeTab === "STOCKS" && cat !== "STOCKS") return false;
        if (activeTab === "TEFAS" && cat !== "TEFAS") return false;
        if (activeTab === "ALT" && cat !== "ALT") return false;
        if (activeTab === "BES" && cat !== "BES") return false;
      }

      // Tech Filter
      if (techFilter === "HIGH_SCORE" && (!h.analysis || h.analysis.score < 65)) return false;
      if (techFilter === "RSI_OVERSOLD" && (!h.analysis || h.analysis.rsiZone !== "OVERSOLD")) return false;
      if (techFilter === "MACD_BUY" && (!h.analysis || !(h.analysis.macdSignal.includes("BUY") || h.analysis.macdSignal === "POSITIVE"))) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSym = h.symbol.toLowerCase().includes(q);
        const matchName = h.name ? h.name.toLowerCase().includes(q) : false;
        if (!matchSym && !matchName) return false;
      }

      return true;
    });
  }, [holdings, activeTab, techFilter, searchQuery]);

  // AI Briefing Refresh
  async function handleRefreshBriefing(mode: BriefingFocusMode = "general", force = true) {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(
        `/api/analysis/briefing?mode=${mode}${force ? "&force=1" : ""}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!data.ok) {
        setAiError(data.error ?? "Briefing üretilemedi");
        return;
      }
      setBriefing({
        payload: data.payload,
        model: data.model,
        createdAt: data.createdAt,
        contextHash: data.contextHash,
      });
      router.refresh();
    } catch {
      setAiError("Bağlantı hatası");
    } finally {
      setAiLoading(false);
    }
  }

  // Run Technical Analysis
  async function runTechnical() {
    setTechLoading(true);
    setTechMsg(null);
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTechMsg(
          `${data.analyzed ?? 0} varlık analiz edildi` +
            (data.skipped ? `, ${data.skipped} atlandı` : ""),
        );
        router.refresh();
      } else {
        setTechMsg(data.error ?? "Teknik analiz başarısız");
      }
    } catch {
      setTechMsg("Bağlantı hatası");
    } finally {
      setTechLoading(false);
      setTimeout(() => setTechMsg(null), 6000);
    }
  }

  if (holdings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 py-8">
        <header>
          <h1 className="text-3xl font-black tracking-tight">Analiz Paneli</h1>
          <p className="text-[var(--color-muted)] mt-2">
            Açık pozisyonunuz bulunmuyor. İşlemler sayfasından varlık ekleyerek analizleri görebilirsiniz.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* 1. Header Section */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand-strong)] flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              Teknik Metrikler & Yapay Zekâ Sentezi
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-foreground)] mt-1">
              Akıllı Portföy Analiz Paneli
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runTechnical}
              disabled={techLoading}
              className="btn btn-outline text-xs shadow-xs"
            >
              <RefreshCw
                size={14}
                className={cn(techLoading && "animate-spin")}
              />
              Teknik Analizi Çalıştır
            </button>
          </div>
        </div>

        {techMsg && (
          <p className="text-xs font-semibold text-[var(--color-profit)] bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 inline-block">
            {techMsg}
          </p>
        )}
      </header>

      {/* 2. Portfolio Health & Quick Overview Strip */}
      <section className="card p-6 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)]/40 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
              Genel Portföy Büyüklüğü
            </span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-[var(--color-foreground)]">
              {formatMoney(pulse.totalValueTRY, "TRY")}
            </div>
            <span className="text-xs text-[var(--color-muted)] font-medium">
              {pulse.openCount} Açık Pozisyon · Son Teknik: {lastTechnicalDate ? formatDate(lastTechnicalDate) : "Tarih N/A"}
            </span>
          </div>

          {/* Technical Health Gauge Box */}
          <div className="flex items-center gap-4 bg-[var(--color-surface-muted)]/40 p-3.5 rounded-xl border border-[var(--color-border)]/50">
            <div className="text-center">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                Ort. Teknik Skor
              </span>
              <span
                className={cn(
                  "text-2xl font-black tabular-nums",
                  healthStats.avgScore !== null && healthStats.avgScore >= 65
                    ? "text-[var(--color-profit)]"
                    : healthStats.avgScore !== null && healthStats.avgScore <= 35
                    ? "text-[var(--color-loss)]"
                    : "text-[var(--color-brand-strong)]"
                )}
              >
                {healthStats.avgScore ?? "—"}
                <span className="text-xs text-[var(--color-muted)] font-normal">/100</span>
              </span>
            </div>

            <div className="h-10 w-px bg-[var(--color-border)]/60" />

            <div className="space-y-1 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-profit)]" />
                <span>Yükseliş Trendi: <strong className="text-[var(--color-foreground)]">{healthStats.strongUp + healthStats.up} Varlık</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-loss)]" />
                <span>Düşüş Baskısı: <strong className="text-[var(--color-foreground)]">{healthStats.down} Varlık</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Slices & Top Gainers/Losers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* Varlık Dağılım Çipleri */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
              Varlık Türü Ağırlıkları
            </span>
            <div className="flex flex-wrap gap-1.5">
              {pulse.typeSlices.map((s) => (
                <span
                  key={s.assetType}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-3 py-1.5 text-xs font-bold shadow-2xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ASSET_META[s.assetType].color }}
                  />
                  {s.label}
                  <span className="tabular-nums text-[var(--color-muted)] font-medium">
                    %{s.weightPct.toFixed(1)}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Top Gainers */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)] block">
              Günün En Çok Yükselenleri
            </span>
            <div className="space-y-1.5">
              {pulse.topGainers.slice(0, 3).map((g) => (
                <div key={g.symbol} className="flex justify-between items-center text-xs font-bold bg-[var(--color-surface)] p-2 rounded-lg border border-[var(--color-border)]/40 tabular-nums">
                  <span className="text-[var(--color-foreground)]">{g.symbol}</span>
                  <span className="text-[var(--color-profit)] flex items-center gap-0.5">
                    <ArrowUpRight size={12} />
                    {formatPercent(g.dailyChangePct)}
                  </span>
                </div>
              ))}
              {pulse.topGainers.length === 0 && <span className="text-xs text-[var(--color-muted)]">—</span>}
            </div>
          </div>

          {/* Top Losers */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-loss)] block">
              Günün En Çok Gerileyenleri
            </span>
            <div className="space-y-1.5">
              {pulse.topLosers.slice(0, 3).map((l) => (
                <div key={l.symbol} className="flex justify-between items-center text-xs font-bold bg-[var(--color-surface)] p-2 rounded-lg border border-[var(--color-border)]/40 tabular-nums">
                  <span className="text-[var(--color-foreground)]">{l.symbol}</span>
                  <span className="text-[var(--color-loss)] flex items-center gap-0.5">
                    <ArrowDownRight size={12} />
                    {formatPercent(l.dailyChangePct)}
                  </span>
                </div>
              ))}
              {pulse.topLosers.length === 0 && <span className="text-xs text-[var(--color-muted)]">—</span>}
            </div>
          </div>
        </div>

        {/* Attention Warnings */}
        {pulse.attention.length > 0 && (
          <div className="pt-3 border-t border-[var(--color-border)]/40 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
              Dikkat Çeken Uarılar & Sinyaller
            </span>
            <div className="flex flex-wrap gap-2">
              {pulse.attention.map((chip, i) => (
                <span
                  key={`${chip.kind}-${chip.symbol ?? i}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border",
                    chip.severity === "warn"
                      ? "bg-rose-500/10 border-rose-500/20 text-[var(--color-loss)]"
                      : "bg-indigo-500/10 border-indigo-500/20 text-[var(--color-brand-strong)]"
                  )}
                >
                  {chip.severity === "warn" ? <AlertTriangle size={13} /> : <Activity size={13} />}
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Modern AI Command Center */}
      <AnalysisAiSection
        briefing={briefing}
        aiConfigured={aiConfigured}
        contextHash={contextHash}
        onRefresh={handleRefreshBriefing}
        aiLoading={aiLoading}
        aiError={aiError}
      />

      {/* 4. Interactive Holdings Explorer & Technical Spec Cards */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center gap-1">
              <Sliders size={13} />
              Varlık Bazlı Analiz
            </span>
            <h2 className="text-xl font-black tracking-tight text-[var(--color-foreground)] mt-0.5">
              Portföy Varlıkları & Teknik Göstergeler
            </h2>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[var(--color-surface-muted)]/50 p-1 rounded-xl border border-[var(--color-border)]/50">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1",
                viewMode === "GRID"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Grid size={14} /> Kartlar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1",
                viewMode === "TABLE"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <List size={14} /> Tablo
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3">
          {/* Asset Category Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]/40 pb-3">
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL", label: "Tüm Varlıklar" },
                { id: "STOCKS", label: "BIST Hisseleri" },
                { id: "TEFAS", label: "TEFAS Fonları" },
                { id: "ALT", label: "Alternatif / Döviz" },
                { id: "BES", label: "BES Emeklilik" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as TabType)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                    activeTab === t.id
                      ? "bg-[var(--color-brand)] text-white shadow-xs"
                      : "bg-[var(--color-surface-muted)]/30 text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sembol veya isim ara..."
                className="input text-xs pl-8 py-1.5"
              />
            </div>
          </div>

          {/* Technical Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-extrabold text-[var(--color-muted)] flex items-center gap-1 mr-1">
              <Filter size={12} /> Teknik Süzgeç:
            </span>
            {[
              { id: "ALL", label: "Tümü" },
              { id: "HIGH_SCORE", label: "🟢 Yüksek Teknik Skor (>=65)" },
              { id: "RSI_OVERSOLD", label: "🔵 RSI Aşırı Satım (<30)" },
              { id: "MACD_BUY", label: "⚡ MACD Al / Pozitif Momentum" },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTechFilter(tf.id as TechFilterType)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer text-[11px]",
                  techFilter === tf.id
                    ? "bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-brand-strong)] font-black"
                    : "bg-[var(--color-surface-muted)]/20 border-[var(--color-border)]/40 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Holdings Display */}
        {filteredHoldings.length === 0 ? (
          <div className="card p-8 text-center text-xs text-[var(--color-muted)] rounded-2xl">
            Seçili kriterlere uygun varlık bulunamadı.
          </div>
        ) : viewMode === "GRID" ? (
          /* Grid View Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredHoldings.map((h) => {
              const score = h.analysis?.score ?? null;
              return (
                <div
                  key={h.symbol}
                  onClick={() => setSelectedHolding(h)}
                  className="card p-4 border border-[var(--color-border)]/60 hover:border-[var(--color-brand)]/50 shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl space-y-3 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-white font-extrabold text-xs shadow-2xs"
                        style={{ backgroundColor: ASSET_META[h.assetType]?.color ?? "#6366f1" }}
                      >
                        {h.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-brand-strong)] transition-colors">
                          {h.symbol}
                        </h4>
                        <span className="text-[10px] text-[var(--color-muted)] font-medium">
                          %{h.weightPct.toFixed(1)} portföy ağırlığı
                        </span>
                      </div>
                    </div>

                    {/* Score ring badge */}
                    {score !== null ? (
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)]/60 text-xs font-black tabular-nums",
                          score >= 65
                            ? "text-[var(--color-profit)] bg-emerald-500/10"
                            : score <= 35
                            ? "text-[var(--color-loss)] bg-rose-500/10"
                            : "text-[var(--color-muted)] bg-[var(--color-surface-muted)]"
                        )}
                        title="Teknik Skor"
                      >
                        {score}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </div>

                  {/* Price & Daily Change */}
                  <div className="flex justify-between items-baseline pt-2 border-t border-[var(--color-border)]/40 tabular-nums">
                    <span className="text-sm font-black text-[var(--color-foreground)]">
                      {formatMoney(h.valueTRY, "TRY")}
                    </span>
                    {h.dailyChangePct != null && (
                      <span
                        className={cn(
                          "text-xs font-bold",
                          h.dailyChangePct > 0 ? "text-[var(--color-profit)]" : h.dailyChangePct < 0 ? "text-[var(--color-loss)]" : "text-[var(--color-muted)]"
                        )}
                      >
                        {formatPercent(h.dailyChangePct)}
                      </span>
                    )}
                  </div>

                  {/* Signals Row */}
                  {h.analysis ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-2 py-0.5 rounded-md border",
                          h.analysis.trendSignal.includes("UP")
                            ? "bg-emerald-500/10 border-emerald-500/20 text-[var(--color-profit)]"
                            : "bg-rose-500/10 border-rose-500/20 text-[var(--color-loss)]"
                        )}
                      >
                        {h.analysis.trendSignal.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-[var(--color-muted)] border border-[var(--color-border)]/40">
                        {h.analysis.macdSignal}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                          h.analysis.rsiZone === "OVERSOLD"
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-600 font-extrabold"
                            : "bg-[var(--color-surface-muted)] text-[var(--color-muted)] border-[var(--color-border)]/40"
                        )}
                      >
                        {h.analysis.rsiZone}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[var(--color-muted)]">Teknik gösterge hesaplanmadı</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="card border border-[var(--color-border)]/60 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] font-extrabold uppercase tracking-wider border-b border-[var(--color-border)]/50">
                  <tr>
                    <th className="p-3.5">Sembol / Varlık</th>
                    <th className="p-3.5 text-right">Ağırlık</th>
                    <th className="p-3.5 text-right">Günlük Değişim</th>
                    <th className="p-3.5 text-center">Teknik Skor</th>
                    <th className="p-3.5">Trend</th>
                    <th className="p-3.5">MACD</th>
                    <th className="p-3.5">RSI Zone</th>
                    <th className="p-3.5 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/40 font-medium">
                  {filteredHoldings.map((h) => {
                    const score = h.analysis?.score ?? null;
                    return (
                      <tr
                        key={h.symbol}
                        onClick={() => setSelectedHolding(h)}
                        className="hover:bg-[var(--color-surface-muted)]/30 transition-colors cursor-pointer"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[var(--color-foreground)]">{h.symbol}</span>
                            <span className="text-[10px] text-[var(--color-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)]">
                              {ASSET_META[h.assetType]?.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold tabular-nums">
                          %{h.weightPct.toFixed(1)}
                        </td>
                        <td className="p-3.5 text-right font-bold tabular-nums">
                          {h.dailyChangePct != null ? (
                            <span className={h.dailyChangePct > 0 ? "text-[var(--color-profit)]" : h.dailyChangePct < 0 ? "text-[var(--color-loss)]" : ""}>
                              {formatPercent(h.dailyChangePct)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3.5 text-center font-black tabular-nums">
                          {score !== null ? (
                            <span
                              className={cn(
                                score >= 65 ? "text-[var(--color-profit)]" : score <= 35 ? "text-[var(--color-loss)]" : "text-[var(--color-muted)]"
                              )}
                            >
                              {score}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3.5 font-bold">
                          {h.analysis?.trendSignal?.replace("_", " ") ?? "—"}
                        </td>
                        <td className="p-3.5 text-[var(--color-muted)]">
                          {h.analysis?.macdSignal ?? "—"}
                        </td>
                        <td className="p-3.5 text-[var(--color-muted)]">
                          {h.analysis?.rsiZone ?? "—"}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedHolding(h);
                            }}
                            className="btn btn-outline py-1 px-2.5 text-[10px]"
                          >
                            İncele
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 5. TEFAS Investor Intelligence Section */}
      {tefasInvestors && (
        <TefasInvestorSection
          tefasInvestors={tefasInvestors}
          symbolNotes={symbolNotes}
        />
      )}

      {/* Technical Detail Modal */}
      {selectedHolding && (
        <TechnicalDetailModal
          holding={selectedHolding}
          onClose={() => setSelectedHolding(null)}
        />
      )}
    </div>
  );
}
