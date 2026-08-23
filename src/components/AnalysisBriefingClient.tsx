"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ASSET_META } from "@/lib/assets";
import type { AnalysisPulse } from "@/lib/analysisPulse";
import type { BriefingPayload, BriefingFocusMode } from "@/lib/analysisAi";
import type { HoldingDTO } from "@/lib/analysisData";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import {
  cn,
  formatDate,
  formatMoney,
  formatPercent,
} from "@/lib/utils";
import { AnalysisAiSection } from "./AnalysisAiSection";
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
        return null;
      }
      const newBriefing = {
        payload: data.payload,
        model: data.model,
        createdAt: data.createdAt,
        contextHash: data.contextHash,
      };
      setBriefing(newBriefing);
      router.refresh();
      return newBriefing;
    } catch {
      setAiError("Bağlantı hatası");
      return null;
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

          <div className="flex flex-wrap items-center gap-2">
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

      {/* 4. TEFAS Investor Intelligence Section */}
      {tefasInvestors && (
        <TefasInvestorSection
          tefasInvestors={tefasInvestors}
          symbolNotes={symbolNotes}
        />
      )}

      {/* YTD Yasal Uyarı Kutusu */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--color-muted)] flex items-start gap-3 mt-6">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-amber-600 dark:text-amber-400 uppercase text-[11px] tracking-wider">
            Yasal Uyarı (YTD)
          </p>
          <p className="leading-relaxed">
            Bu sayfada sunulan AI briefing yanıtları, teknik gösterge skorları (RSI, MACD) ve TEFAS yatırımcı hareketleri yalnızca bilgilendirme ve kişisel analiz amaçlıdır. SPK mevzuatı kapsamında yatırım tavsiyesi veya portföy yönetim emri teşkil etmez.
          </p>
        </div>
      </div>
    </div>
  );
}
