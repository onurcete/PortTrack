"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Flame,
  Layers,
  Minus,
  PieChart,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
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
  formatNumber,
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

  // Movers Tab State: "gainers" | "losers" | "all"
  const [moverTab, setMoverTab] = useState<"gainers" | "losers" | "all">("all");

  const symbolNotes = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of briefing?.payload.perSymbol ?? []) {
      map.set(row.symbol, row.note);
    }
    return map;
  }, [briefing]);

  // Top Concentration Calculation
  const topConcentrationPct = useMemo(() => {
    return pulse.topWeights.reduce((sum, w) => sum + w.weightPct, 0);
  }, [pulse.topWeights]);

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
      <div className="max-w-6xl mx-auto space-y-8 py-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] mb-3">
          <PieChart size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-foreground)]">Analiz Paneli</h1>
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto">
          Henüz açık bir pozisyonunuz bulunmuyor. İşlemler sayfasından varlık eklediğinizde otomatik istatistikler ve TEFAS analizleri burada listelenecektir.
        </p>
      </div>
    );
  }

  const topGainer = pulse.topGainers[0] ?? null;
  const topLoser = pulse.topLosers[0] ?? null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* 1. Header Section */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--color-brand-strong)] flex items-center gap-1.5">
              <Zap size={14} className="text-amber-500" />
              Portföy İstihbaratı & Dinamikler
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-foreground)] mt-1">
              Portföy & Piyasa Analiz Paneli
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              TEFAS yatırımcı hareketleri, varlık dağılım dengesi ve en çok hareket eden varlıkların anlık özeti.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runTechnical}
              disabled={techLoading}
              className="btn btn-outline text-xs shadow-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw
                size={14}
                className={cn(techLoading && "animate-spin")}
              />
              {techLoading ? "Hesaplanıyor..." : "Teknik Analizi Yenile"}
            </button>
          </div>
        </div>

        {techMsg && (
          <p className="text-xs font-semibold text-[var(--color-profit)] bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 inline-block animate-in fade-in">
            {techMsg}
          </p>
        )}
      </header>

      {/* 2. Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Portföy Büyüklüğü */}
        <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
              Toplam Büyüklük
            </span>
            <span className="p-1.5 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
              <BarChart3 size={15} />
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight tabular-nums text-[var(--color-foreground)]">
            {formatMoney(pulse.totalValueTRY, "TRY")}
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-muted)] font-medium pt-1 border-t border-[var(--color-border)]/30">
            <span>{pulse.openCount} Açık Pozisyon</span>
            <span className="text-[10px]">Ort: {formatMoney(pulse.totalValueTRY / (pulse.openCount || 1), "TRY")}</span>
          </div>
        </div>

        {/* Card 2: Varlık Dağılım Dengesi */}
        <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
              Varlık Çeşitliliği
            </span>
            <span className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PieChart size={15} />
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight tabular-nums text-[var(--color-foreground)]">
            {pulse.typeSlices.length} <span className="text-sm font-bold text-[var(--color-muted)]">Farklı Tür</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-muted)] font-medium pt-1 border-t border-[var(--color-border)]/30">
            <span>En Büyük 3 Varlık</span>
            <span className={cn("font-bold tabular-nums", topConcentrationPct > 60 ? "text-amber-500" : "text-[var(--color-foreground)]")}>
              %{topConcentrationPct.toFixed(1)} pay
            </span>
          </div>
        </div>

        {/* Card 3: Günün En Çok Kazandıranı */}
        <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)]">
              Günün Lideri
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-[var(--color-profit)]">
              <ArrowUpRight size={15} />
            </span>
          </div>
          {topGainer ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black tracking-tight text-[var(--color-foreground)]">
                  {topGainer.symbol}
                </span>
                <span className="text-base font-black text-[var(--color-profit)] tabular-nums">
                  +{formatPercent(topGainer.dailyChangePct)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)] font-medium pt-1 border-t border-[var(--color-border)]/30">
                <span>Portföy Payı</span>
                <span className="font-bold tabular-nums">%{topGainer.weightPct.toFixed(1)}</span>
              </div>
            </>
          ) : (
            <div className="text-sm font-bold text-[var(--color-muted)] pt-2">Veri bulunmuyor</div>
          )}
        </div>

        {/* Card 4: TEFAS Yatırımcı Trendi */}
        <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)]">
              TEFAS Fon Talebi
            </span>
            <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users size={15} />
            </span>
          </div>
          {tefasInvestors ? (
            <>
              <div className="text-2xl font-black tracking-tight tabular-nums text-[var(--color-foreground)] flex items-center gap-1.5">
                <span className="text-[var(--color-profit)] font-black">+{tefasInvestors.risingCount}</span>
                <span className="text-xs text-[var(--color-muted)] font-bold">/</span>
                <span className="text-[var(--color-loss)] font-black">-{tefasInvestors.fallingCount}</span>
                <span className="text-xs text-[var(--color-muted)] font-medium ml-1">Fon</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)] font-medium pt-1 border-t border-[var(--color-border)]/30">
                <span>Yatırımcı Çeken</span>
                <span className="font-bold text-[var(--color-profit)]">
                  {tefasInvestors.funds.length > 0 ? `%${((tefasInvestors.risingCount / tefasInvestors.funds.length) * 100).toFixed(0)}` : "—"}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm font-bold text-[var(--color-muted)] pt-2">TEFAS fonu yok</div>
          )}
        </div>
      </div>

      {/* 3. Main 2-Column Section: Varlık Dağılımı (Sol) & Kazananlar/Kaybedenler (Sağ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SOL: Varlık & Sektörel Dağılım Çizelgesi (7 Sütun) */}
        <div className="lg:col-span-7 card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
                <PieChart size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--color-foreground)]">
                  Varlık & Sınıf Dağılımı
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Portföyünüzün tür bazında sermaye dağılımı ve ağırlıkları
                </p>
              </div>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]/60 tabular-nums">
              {pulse.typeSlices.length} Tür
            </span>
          </div>

          {/* Segmented Visual Allocation Bar */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-xl overflow-hidden flex bg-[var(--color-surface-muted)] shadow-inner">
              {pulse.typeSlices.map((s) => (
                <div
                  key={s.assetType}
                  style={{
                    width: `${s.weightPct}%`,
                    backgroundColor: ASSET_META[s.assetType]?.color ?? "#6366f1",
                  }}
                  className="h-full transition-all hover:opacity-90 cursor-pointer"
                  title={`${s.label}: %${s.weightPct.toFixed(1)} (${formatMoney(s.valueTRY, "TRY")})`}
                />
              ))}
            </div>
          </div>

          {/* Type Breakdown Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {pulse.typeSlices.map((slice) => {
              const meta = ASSET_META[slice.assetType];
              return (
                <div
                  key={slice.assetType}
                  className="p-3.5 rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/20 hover:bg-[var(--color-surface-muted)]/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: meta?.color ?? "#6366f1" }}
                      />
                      <span className="text-xs font-black text-[var(--color-foreground)] truncate">
                        {slice.label}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[var(--color-brand-strong)] tabular-nums">
                      %{slice.weightPct.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs tabular-nums text-[var(--color-muted)] font-medium">
                    <span className="text-[11px] font-bold text-[var(--color-foreground)]">
                      {formatMoney(slice.valueTRY, "TRY")}
                    </span>
                    <span className="text-[10px]">
                      {slice.count} varlık
                    </span>
                  </div>

                  {/* Micro progress line */}
                  <div className="h-1.5 w-full bg-[var(--color-border)]/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, slice.weightPct)}%`,
                        backgroundColor: meta?.color ?? "#6366f1",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top 3 Concentration Footnote */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-border)]/40 flex items-center justify-between text-xs">
            <span className="text-[var(--color-muted)] font-medium flex items-center gap-1.5">
              <Flame size={14} className="text-amber-500" />
              En büyük varlıklar: <strong className="text-[var(--color-foreground)]">{pulse.topWeights.map((w) => w.symbol).join(", ")}</strong>
            </span>
            <span className="font-bold text-[var(--color-foreground)] tabular-nums">
              %{topConcentrationPct.toFixed(1)} Toplam Pay
            </span>
          </div>
        </div>

        {/* SAĞ: Kazananlar & Kaybedenler (5 Sütun) */}
        <div className="lg:col-span-5 card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--color-border)]/40 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-[var(--color-profit)]">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-[var(--color-foreground)]">
                  Günün Hareketleri
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  Portföyün en çok kazandıran ve gerileyenleri
                </p>
              </div>
            </div>

            {/* Filter Pill */}
            <div className="flex items-center p-1 bg-[var(--color-surface-muted)]/60 rounded-xl border border-[var(--color-border)]/50 text-[11px]">
              <button
                type="button"
                onClick={() => setMoverTab("all")}
                className={cn(
                  "px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer",
                  moverTab === "all" ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs font-extrabold" : "text-[var(--color-muted)]"
                )}
              >
                Tümü
              </button>
              <button
                type="button"
                onClick={() => setMoverTab("gainers")}
                className={cn(
                  "px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-[var(--color-profit)]",
                  moverTab === "gainers" ? "bg-[var(--color-surface)] shadow-2xs font-black" : "opacity-70"
                )}
              >
                Yükselen
              </button>
              <button
                type="button"
                onClick={() => setMoverTab("losers")}
                className={cn(
                  "px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer text-[var(--color-loss)]",
                  moverTab === "losers" ? "bg-[var(--color-surface)] shadow-2xs font-black" : "opacity-70"
                )}
              >
                Düşen
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Yükselenler Listesi */}
            {(moverTab === "all" || moverTab === "gainers") && (
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)] flex items-center gap-1">
                  <ArrowUpRight size={13} />
                  En Çok Yükselenler
                </span>

                <div className="space-y-2">
                  {pulse.topGainers.slice(0, moverTab === "gainers" ? 6 : 3).map((g) => (
                    <div
                      key={g.symbol}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/15 hover:bg-[var(--color-surface-muted)]/35 transition-colors tabular-nums"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-black text-[10px] shrink-0 shadow-2xs"
                          style={{ backgroundColor: ASSET_META[g.assetType]?.color ?? "#6366f1" }}
                        >
                          {g.symbol.slice(0, 3)}
                        </span>
                        <div>
                          <div className="font-extrabold text-xs text-[var(--color-foreground)] flex items-center gap-1.5">
                            {g.symbol}
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                              {ASSET_META[g.assetType]?.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--color-muted)] font-medium">
                            %{g.weightPct.toFixed(1)} portföy ağırlığı
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-[var(--color-profit)] flex items-center justify-end gap-0.5">
                          <ArrowUpRight size={13} />
                          +{formatPercent(g.dailyChangePct)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {pulse.topGainers.length === 0 && (
                    <div className="text-xs text-[var(--color-muted)] p-3 rounded-xl bg-[var(--color-surface-muted)]/20 text-center">
                      Bugün yükselişte olan varlık bulunamadı.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Düşenler Listesi */}
            {(moverTab === "all" || moverTab === "losers") && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-loss)] flex items-center gap-1">
                  <ArrowDownRight size={13} />
                  En Çok Gerileyenler
                </span>

                <div className="space-y-2">
                  {pulse.topLosers.slice(0, moverTab === "losers" ? 6 : 3).map((l) => (
                    <div
                      key={l.symbol}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/15 hover:bg-[var(--color-surface-muted)]/35 transition-colors tabular-nums"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-black text-[10px] shrink-0 shadow-2xs"
                          style={{ backgroundColor: ASSET_META[l.assetType]?.color ?? "#6366f1" }}
                        >
                          {l.symbol.slice(0, 3)}
                        </span>
                        <div>
                          <div className="font-extrabold text-xs text-[var(--color-foreground)] flex items-center gap-1.5">
                            {l.symbol}
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                              {ASSET_META[l.assetType]?.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-[var(--color-muted)] font-medium">
                            %{l.weightPct.toFixed(1)} portföy ağırlığı
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-[var(--color-loss)] flex items-center justify-end gap-0.5">
                          <ArrowDownRight size={13} />
                          {formatPercent(l.dailyChangePct)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {pulse.topLosers.length === 0 && (
                    <div className="text-xs text-[var(--color-muted)] p-3 rounded-xl bg-[var(--color-surface-muted)]/20 text-center">
                      Bugün düşüşte olan varlık bulunamadı.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Attention & Alerts Signals */}
      {pulse.attention.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-xs space-y-2.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
            <Activity size={13} className="text-[var(--color-brand)]" />
            Dikkat Çeken Sinyaller & Uarılar
          </span>
          <div className="flex flex-wrap gap-2">
            {pulse.attention.map((chip, i) => (
              <span
                key={`${chip.kind}-${chip.symbol ?? i}`}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all",
                  chip.severity === "warn"
                    ? "bg-rose-500/10 border-rose-500/25 text-[var(--color-loss)]"
                    : "bg-indigo-500/10 border-indigo-500/25 text-[var(--color-brand-strong)]"
                )}
              >
                {chip.severity === "warn" ? <AlertTriangle size={13} /> : <Zap size={13} />}
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5. TEFAS Fon Akış & Yatırımcı Analizi Section */}
      {tefasInvestors && (
        <TefasInvestorSection
          tefasInvestors={tefasInvestors}
          symbolNotes={symbolNotes}
        />
      )}

      {/* 6. AI Günlük Portföy Bülteni & Yorumları */}
      <AnalysisAiSection
        briefing={briefing}
        aiConfigured={aiConfigured}
        contextHash={contextHash}
        onRefresh={handleRefreshBriefing}
        aiLoading={aiLoading}
        aiError={aiError}
      />

      {/* 7. YTD Yasal Uyarı Kutusu */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--color-muted)] flex items-start gap-3 mt-6">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-amber-600 dark:text-amber-400 uppercase text-[11px] tracking-wider">
            Yasal Uyarı (YTD)
          </p>
          <p className="leading-relaxed">
            Bu sayfada sunulan AI briefing yanıtları, TEFAS yatırımcı hareketleri ve istatistiksel göstergeler yalnızca bilgilendirme ve kişisel analiz amaçlıdır. SPK mevzuatı kapsamında yatırım tavsiyesi veya portföy yönetim emri teşkil etmez.
          </p>
        </div>
      </div>
    </div>
  );
}
