"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ASSET_META, type AssetType } from "@/lib/assets";
import type { AnalysisPulse } from "@/lib/analysisPulse";
import { tabKeyForAssetType } from "@/lib/analysisPulse";
import type { BriefingPayload } from "@/lib/analysisAi";
import type { HoldingDTO } from "@/lib/analysisData";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import {
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

const NAV = [
  { id: "pulse", label: "Nabız" },
  { id: "attention", label: "Dikkat" },
  { id: "tefas", label: "TEFAS" },
  { id: "stocks", label: "Hisse" },
  { id: "alt", label: "Alternatif" },
  { id: "bes", label: "BES" },
] as const;

export function AnalysisBriefingClient({
  pulse,
  holdings,
  tefasInvestors,
  lastTechnicalDate,
  initialBriefing,
  aiConfigured,
  contextHash,
}: {
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
}) {
  const router = useRouter();
  const [briefing, setBriefing] = useState(initialBriefing);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [techLoading, setTechLoading] = useState(false);
  const [techMsg, setTechMsg] = useState<string | null>(null);

  const sections = useMemo(() => {
    const stocks = holdings.filter(
      (h) => tabKeyForAssetType(h.assetType) === "STOCKS",
    );
    const alt = holdings.filter(
      (h) => tabKeyForAssetType(h.assetType) === "ALT",
    );
    const bes = holdings.filter(
      (h) => tabKeyForAssetType(h.assetType) === "BES",
    );
    return { stocks, alt, bes };
  }, [holdings]);

  const visibleNav = NAV.filter((item) => {
    if (item.id === "tefas") return Boolean(tefasInvestors);
    if (item.id === "stocks") return sections.stocks.length > 0;
    if (item.id === "alt") return sections.alt.length > 0;
    if (item.id === "bes") return sections.bes.length > 0;
    if (item.id === "attention") return pulse.attention.length > 0;
    return true;
  });

  const symbolNotes = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of briefing?.payload.perSymbol ?? []) {
      map.set(row.symbol, row.note);
    }
    return map;
  }, [briefing]);

  async function runBriefing(force: boolean) {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(
        `/api/analysis/briefing${force ? "?force=1" : ""}`,
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
      <div className="analysis-page space-y-8">
        <header>
          <h1 className="analysis-title">Analiz</h1>
          <p className="text-[var(--color-muted)] mt-2">
            Açık pozisyon yok. İşlemler sayfasından başlayın.
          </p>
        </header>
      </div>
    );
  }

  const staleCache =
    briefing && briefing.contextHash !== contextHash;

  return (
    <div className="analysis-page space-y-10 pb-16">
      {/* Hero AI */}
      <header className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-brand-strong)]">
              Günlük briefing
            </p>
            <h1 className="analysis-title mt-1">Analiz</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runTechnical()}
              disabled={techLoading}
              className="btn btn-outline text-xs"
            >
              <RefreshCw
                size={14}
                className={cn(techLoading && "animate-spin")}
              />
              Tekniği Güncelle
            </button>
            <button
              type="button"
              onClick={() => runBriefing(true)}
              disabled={aiLoading || !aiConfigured}
              className="btn btn-primary text-xs"
              title={
                aiConfigured
                  ? "OpenAI ile yeni yorum üret"
                  : "OPENAI_API_KEY tanımlı değil"
              }
            >
              <Sparkles
                size={14}
                className={cn(aiLoading && "animate-pulse")}
              />
              {aiLoading ? "Üretiliyor..." : "AI yorumunu yenile"}
            </button>
          </div>
        </div>

        {techMsg && (
          <p className="text-xs font-medium text-[var(--color-brand-strong)]">
            {techMsg}
          </p>
        )}

        <div className="analysis-hero">
          {!aiConfigured ? (
            <div className="space-y-2">
              <p className="text-lg font-bold">AI briefing hazır değil</p>
              <p className="text-sm text-[var(--color-muted)] max-w-xl">
                Gerçek yapay zekâ yorumu için ortam değişkenine{" "}
                <code className="font-mono text-[var(--color-foreground)]">
                  OPENAI_API_KEY
                </code>{" "}
                ekleyin. Sahte şablon metin gösterilmez.
              </p>
            </div>
          ) : !briefing ? (
            <div className="space-y-3">
              <p className="text-lg font-bold">Henüz AI yorumu yok</p>
              <p className="text-sm text-[var(--color-muted)] max-w-xl">
                Portföy nabzı, TEFAS yatırımcı hareketleri ve kural tabanlı
                teknik skorlar üzerinden Türkçe bir briefing üretin.
              </p>
              <button
                type="button"
                onClick={() => runBriefing(false)}
                disabled={aiLoading}
                className="btn btn-primary text-xs"
              >
                <Sparkles size={14} />
                İlk briefing’i oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight max-w-3xl">
                {briefing.payload.headline}
              </h2>
              <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-[var(--color-foreground)]/90 max-w-3xl whitespace-pre-line">
                {briefing.payload.summary}
              </div>
              {(briefing.payload.highlights.length > 0 ||
                briefing.payload.risks.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {briefing.payload.highlights.length > 0 && (
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)] mb-2">
                        Öne çıkanlar
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {briefing.payload.highlights.map((h) => (
                          <li key={h} className="flex gap-2">
                            <TrendingUp
                              size={14}
                              className="mt-0.5 shrink-0 text-[var(--color-profit)]"
                            />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {briefing.payload.risks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-loss)] mb-2">
                        Riskler
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {briefing.payload.risks.map((r) => (
                          <li key={r} className="flex gap-2">
                            <AlertTriangle
                              size={14}
                              className="mt-0.5 shrink-0 text-[var(--color-loss)]"
                            />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[11px] text-[var(--color-muted)] pt-2 border-t border-[var(--color-border)]/50">
                Model: {briefing.model} ·{" "}
                {formatDate(briefing.createdAt)}
                {staleCache ? " · Veri güncellendi — yenilemeniz önerilir" : ""}
                {" · "}Yatırım tavsiyesi değildir.
              </p>
            </div>
          )}
          {aiError && (
            <p className="mt-3 text-sm text-[var(--color-loss)]">{aiError}</p>
          )}
        </div>
      </header>

      {/* Sticky mini-nav */}
      <nav className="analysis-nav sticky top-[4.5rem] z-10 -mx-1 px-1 py-2 backdrop-blur-md bg-[var(--color-bg)]/85 border-y border-[var(--color-border)]/60">
        <div className="flex flex-wrap gap-1.5">
          {visibleNav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Nabız strip */}
      <section id="pulse" className="scroll-mt-28 space-y-3">
        <SectionHead
          kicker="Portföy"
          title="Nabız"
          note={
            lastTechnicalDate
              ? `Son teknik: ${formatDate(lastTechnicalDate)}`
              : "Teknik henüz çalışmadı"
          }
        />
        <div className="analysis-strip">
          <div className="min-w-[10rem]">
            <p className="analysis-kicker">Toplam</p>
            <p className="text-2xl font-black tabular-nums tracking-tight">
              {formatMoney(pulse.totalValueTRY, "TRY")}
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              {pulse.openCount} açık pozisyon
            </p>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {pulse.typeSlices.map((s) => (
              <span
                key={s.assetType}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: ASSET_META[s.assetType].color }}
                />
                {s.label}
                <span className="tabular-nums text-[var(--color-muted)]">
                  {s.weightPct.toFixed(1)}%
                </span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {pulse.topWeights.map((w) => (
              <span key={w.symbol} className="font-semibold tabular-nums">
                {w.symbol}{" "}
                <span className="text-[var(--color-muted)] font-medium">
                  {w.weightPct.toFixed(1)}%
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <MoverList
            title="Kazananlar"
            items={pulse.topGainers}
            tone="good"
          />
          <MoverList title="Kaybedenler" items={pulse.topLosers} tone="bad" />
        </div>
      </section>

      {/* Dikkat */}
      {pulse.attention.length > 0 && (
        <section id="attention" className="scroll-mt-28 space-y-3">
          <SectionHead kicker="Uyarı" title="Dikkat" />
          <ul className="space-y-2">
            {pulse.attention.map((chip, i) => (
              <li
                key={`${chip.kind}-${chip.symbol ?? i}`}
                className={cn(
                  "flex items-start gap-2 border-l-2 pl-3 py-1 text-sm",
                  chip.severity === "warn"
                    ? "border-[var(--color-loss)]"
                    : "border-[var(--color-brand)]",
                )}
              >
                {chip.severity === "warn" ? (
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 text-[var(--color-loss)] shrink-0"
                  />
                ) : (
                  <Activity
                    size={14}
                    className="mt-0.5 text-[var(--color-brand-strong)] shrink-0"
                  />
                )}
                {chip.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* TEFAS */}
      {tefasInvestors && (
        <section id="tefas" className="scroll-mt-28 space-y-4">
          <SectionHead
            kicker="Fonlar"
            title="TEFAS yatırımcı"
            note="Haftalık kişi sayısı değişimi · kural tabanlı metrik"
          />
          {briefing?.payload.tefasNote && (
            <p className="text-sm leading-relaxed max-w-3xl border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl px-4 py-3">
              {briefing.payload.tefasNote}
            </p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <Stat label="Artan" value={tefasInvestors.risingCount} tone="good" />
            <Stat label="Azalan" value={tefasInvestors.fallingCount} tone="bad" />
            <Stat label="Nötr" value={tefasInvestors.flatCount} />
            {tefasInvestors.topInflow && (
              <Stat
                label="Giriş"
                value={`${tefasInvestors.topInflow.symbol} ${formatPercent(tefasInvestors.topInflow.weekDeltaPct)}`}
                tone="good"
              />
            )}
            {tefasInvestors.topOutflow && (
              <Stat
                label="Çıkış"
                value={`${tefasInvestors.topOutflow.symbol} ${formatPercent(tefasInvestors.topOutflow.weekDeltaPct)}`}
                tone="bad"
              />
            )}
          </div>
          <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {tefasInvestors.funds.map((f) => (
              <div
                key={f.symbol}
                className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[7rem_1fr_auto_auto_6rem] items-center gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-bold">{f.symbol}</p>
                  {symbolNotes.get(f.symbol) && (
                    <p className="text-[11px] text-[var(--color-muted)] line-clamp-2 mt-0.5">
                      {symbolNotes.get(f.symbol)}
                    </p>
                  )}
                </div>
                <p className="hidden sm:block text-xs text-[var(--color-muted)] tabular-nums">
                  {f.latest != null
                    ? `${formatNumber(f.latest, 0)} kişi`
                    : "—"}
                </p>
                <p
                  className={cn(
                    "text-xs font-bold tabular-nums text-right",
                    (f.weekDeltaPct ?? 0) > 0 && "text-[var(--color-profit)]",
                    (f.weekDeltaPct ?? 0) < 0 && "text-[var(--color-loss)]",
                  )}
                >
                  {f.weekDeltaPct != null
                    ? formatPercent(f.weekDeltaPct)
                    : "—"}
                </p>
                <TrendIcon trend={f.trend4w} />
                <MiniSpark series={f.series} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hisse */}
      {sections.stocks.length > 0 && (
        <section id="stocks" className="scroll-mt-28 space-y-4">
          <SectionHead
            kicker="Hisse"
            title="Yabancı / BIST"
            note="Skorlar kural tabanlı teknik göstergelerden"
          />
          <SymbolRows
            rows={sections.stocks}
            notes={symbolNotes}
            showTechnical
          />
        </section>
      )}

      {/* Alternatif */}
      {sections.alt.length > 0 && (
        <section id="alt" className="scroll-mt-28 space-y-4">
          <SectionHead kicker="Diğer" title="Alternatif" />
          <SymbolRows rows={sections.alt} notes={symbolNotes} showTechnical />
        </section>
      )}

      {/* BES */}
      {sections.bes.length > 0 && (
        <section id="bes" className="scroll-mt-28 space-y-4">
          <SectionHead
            kicker="Emeklilik"
            title="BES"
            note="Teknik skor üretilmez"
          />
          <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {sections.bes.map((h) => (
              <div
                key={h.symbol}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-bold">{h.symbol}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Ağırlık {h.weightPct.toFixed(1)}%
                  </p>
                </div>
                <p className="text-lg font-black tabular-nums">
                  {formatMoney(h.valueTRY, "TRY")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  note,
}: {
  kicker: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="analysis-kicker">{kicker}</p>
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
      </div>
      {note && (
        <p className="text-[11px] text-[var(--color-muted)]">{note}</p>
      )}
    </div>
  );
}

function MoverList({
  title,
  items,
  tone,
}: {
  title: string;
  items: { symbol: string; dailyChangePct: number; assetType: AssetType }[];
  tone: "good" | "bad";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-wider mb-2",
          tone === "good"
            ? "text-[var(--color-profit)]"
            : "text-[var(--color-loss)]",
        )}
      >
        {title}
      </p>
      {items.length === 0 && (
        <p className="text-xs text-[var(--color-muted)]">—</p>
      )}
      <ul className="space-y-1">
        {items.map((m) => (
          <li
            key={m.symbol}
            className="flex justify-between text-sm tabular-nums"
          >
            <span className="font-semibold">{m.symbol}</span>
            <span
              className={
                tone === "good"
                  ? "text-[var(--color-profit)]"
                  : "text-[var(--color-loss)]"
              }
            >
              {formatPercent(m.dailyChangePct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "good" | "bad";
}) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-bold tabular-nums",
          tone === "good" && "text-[var(--color-profit)]",
          tone === "bad" && "text-[var(--color-loss)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up")
    return <ArrowUpRight size={14} className="text-[var(--color-profit)]" />;
  if (trend === "down")
    return <ArrowDownRight size={14} className="text-[var(--color-loss)]" />;
  return <Minus size={14} className="text-[var(--color-muted)]" />;
}

function MiniSpark({
  series,
}: {
  series: { date: string; investors: number }[];
}) {
  if (series.length < 2) {
    return <div className="h-6 w-16 rounded bg-[var(--color-surface-muted)]" />;
  }
  const values = series.map((s) => s.investors);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} className="justify-self-end" aria-hidden>
      <polyline
        fill="none"
        stroke={rising ? "var(--color-profit)" : "var(--color-loss)"}
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  );
}

function SymbolRows({
  rows,
  notes,
  showTechnical,
}: {
  rows: HoldingDTO[];
  notes: Map<string, string>;
  showTechnical?: boolean;
}) {
  return (
    <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
      {rows.map((h) => {
        const up =
          h.analysis?.trendSignal === "UP" ||
          h.analysis?.trendSignal === "STRONG_UP";
        return (
          <div
            key={h.symbol}
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_minmax(0,14rem)] gap-3 items-center py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold">{h.symbol}</p>
                <span className="text-[10px] text-[var(--color-muted)]">
                  {ASSET_META[h.assetType].label}
                </span>
              </div>
              {h.name && (
                <p className="text-[11px] text-[var(--color-muted)] truncate">
                  {h.name}
                </p>
              )}
              {notes.get(h.symbol) && (
                <p className="text-[11px] text-[var(--color-foreground)]/80 mt-1 line-clamp-2">
                  {notes.get(h.symbol)}
                </p>
              )}
            </div>
            <div className="text-right text-xs tabular-nums">
              <p className="font-semibold">{h.weightPct.toFixed(1)}%</p>
              <p
                className={cn(
                  "font-bold",
                  (h.dailyChangePct ?? 0) > 0 && "text-[var(--color-profit)]",
                  (h.dailyChangePct ?? 0) < 0 && "text-[var(--color-loss)]",
                )}
              >
                {h.dailyChangePct != null
                  ? formatPercent(h.dailyChangePct)
                  : "—"}
              </p>
            </div>
            {showTechnical && (
              <>
                <ScoreRing score={h.analysis?.score ?? null} />
                <div className="hidden sm:flex flex-wrap gap-1 justify-end">
                  {h.analysis ? (
                    <>
                      <SignalChip tone={up ? "good" : "bad"}>
                        {up ? (
                          <TrendingUp size={10} />
                        ) : (
                          <TrendingDown size={10} />
                        )}
                        {h.analysis.trendSignal.replace("_", " ")}
                      </SignalChip>
                      <SignalChip
                        tone={
                          h.analysis.macdSignal.includes("BUY") ||
                          h.analysis.macdSignal === "POSITIVE"
                            ? "good"
                            : "bad"
                        }
                      >
                        {h.analysis.macdSignal}
                      </SignalChip>
                      <SignalChip
                        tone={
                          h.analysis.rsiZone === "OVERSOLD"
                            ? "good"
                            : h.analysis.rsiZone === "OVERBOUGHT"
                              ? "bad"
                              : "neutral"
                        }
                      >
                        {h.analysis.rsiZone}
                      </SignalChip>
                    </>
                  ) : (
                    <span className="text-[11px] text-[var(--color-muted)]">
                      Teknik yok
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span className="text-xs text-[var(--color-muted)] tabular-nums">—</span>
    );
  }
  const tone =
    score >= 65
      ? "text-[var(--color-profit)]"
      : score <= 35
        ? "text-[var(--color-loss)]"
        : "text-[var(--color-muted)]";
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] text-xs font-black tabular-nums",
        tone,
      )}
      title="Kural tabanlı teknik skor"
    >
      {score}
    </span>
  );
}

function SignalChip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "good" | "bad" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        tone === "good" &&
          "bg-[var(--color-profit-soft)] text-[var(--color-profit)]",
        tone === "bad" &&
          "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
        tone === "neutral" &&
          "bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]",
      )}
    >
      {children}
    </span>
  );
}
