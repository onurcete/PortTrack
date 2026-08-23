"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Brain,
  Send,
  MessageSquare,
  Zap,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  PieChart,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Flame,
  Layers,
} from "lucide-react";
import type { BriefingPayload, BriefingFocusMode } from "@/lib/analysisAi";
import { FOCUS_MODE_LABELS } from "@/lib/analysisAi";
import { cn } from "@/lib/utils";

export type BriefingData = {
  payload: BriefingPayload;
  model: string;
  createdAt: string;
  contextHash: string;
};

interface PortfolioIntelligenceProps {
  briefing: BriefingData | null;
  aiConfigured: boolean;
  contextHash: string;
  onRefresh: (mode: BriefingFocusMode, force: boolean) => Promise<BriefingData | null>;
  aiLoading: boolean;
  aiError: string | null;
}

const SMART_PROMPT_CHIPS = [
  {
    icon: BarChart3,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    label: "2026 Aylık Kazanç Dökümü",
    query: "2026 yılında aylık TL ve USD bazında ne kadar kazanç sağladım? Ay ay getirilerimi özetle.",
  },
  {
    icon: TrendingUp,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    label: "BIST100 & Benchmark Kıyası",
    query: "Bu ay portföyüm BIST100 ve diğer piyasa göstergelerine (Altın, Dolar) göre nasıl performans gösterdi? Aradaki fark nereden kaynaklandı?",
  },
  {
    icon: ShieldAlert,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    label: "Risk & Yoğunlaşma Analizi",
    query: "Portföyümdeki tek varlık yoğunlaşması, döviz koruma oranı ve genel risk durumu nedir?",
  },
  {
    icon: Flame,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    label: "En Çok Kazandıran / Kaybettirenler",
    query: "Portföyümün kârına ve zararına en çok etki eden varlıklarım hangileri? Getirilerimi özetle.",
  },
  {
    icon: PieChart,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    label: "Varlık Dağılımı & XIRR Durumu",
    query: "Portföyümün varlık sınıflarına göre dağılımını, genel kâr/zararını ve yıllıklandırılmış getirisini (XIRR) özetle.",
  },
  {
    icon: Layers,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    label: "TEFAS Yatırımcı Akışları",
    query: "Portföyümde bulunan TEFAS fonlarındaki haftalık yatırımcı sayısı değişimleri ve talep eğilimi nasıl?",
  },
];

export function PortfolioIntelligenceSection({
  briefing,
  aiConfigured,
  contextHash,
  onRefresh,
  aiLoading,
  aiError,
}: PortfolioIntelligenceProps) {
  // Soru-Cevap (MCP Assistant) State
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{
      question: string;
      answer: string;
      usedTools?: string[];
      model?: string;
      durationMs?: number;
    }>
  >([]);
  const [askError, setAskError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Günlük Bülten (Briefing) State
  const [focusMode, setFocusMode] = useState<BriefingFocusMode>("general");
  const [modeCache, setModeCache] = useState<Record<BriefingFocusMode, BriefingData | null>>({
    general: briefing,
    technical: null,
    risk: null,
    opportunity: null,
  });

  const activeBriefing = modeCache[focusMode] ?? (focusMode === "general" ? briefing : null);

  async function handleModeChange(mode: BriefingFocusMode) {
    setFocusMode(mode);
    if (modeCache[mode]) return;
    const result = await onRefresh(mode, false);
    if (result) {
      setModeCache((prev) => ({ ...prev, [mode]: result }));
    }
  }

  async function handleForceRegenerate() {
    const result = await onRefresh(focusMode, true);
    if (result) {
      setModeCache((prev) => ({ ...prev, [focusMode]: result }));
    }
  }

  async function handleAsk(queryText?: string) {
    const q = (queryText ?? question).trim();
    if (!q || asking) return;

    setAsking(true);
    setAskError(null);
    if (!queryText) setQuestion("");

    try {
      const res = await fetch("/api/analysis/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAskError(data.error || "Yanıt oluşturulamadı.");
        return;
      }

      setChatHistory((prev) => [
        {
          question: q,
          answer: data.answer,
          usedTools: data.usedTools,
          model: data.model,
          durationMs: data.durationMs,
        },
        ...prev,
      ]);
    } catch {
      setAskError("Sunucu bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setAsking(false);
    }
  }

  function copyAnswer(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <section className="space-y-8">
      {/* 1. MCP PORTFOLIO INTELLIGENCE ENGINE ("Portföyüne Soru Sor") */}
      <div className="card p-6 sm:p-8 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/25 to-[var(--color-brand-soft)]/25 border border-[var(--color-border)]/70 shadow-xl rounded-3xl relative overflow-hidden space-y-6">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[var(--color-brand)]/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10 pb-5 border-b border-[var(--color-border)]/50">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-indigo-700 text-white shadow-lg shadow-[var(--color-brand)]/20">
              <Brain size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-[var(--color-foreground)]">
                  Portföy Zekâsı (MCP Asistanı)
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border border-[var(--color-brand)]/30 shadow-2xs">
                  <Zap size={11} className="text-amber-400 fill-amber-400" />
                  9 ANALİZ ARACI AKTİF
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)] font-medium mt-0.5">
                XIRR, getiri katkıları, TEFAS akışları ve benchmark kıyaslarını deterministik hesaplayan akıllı motor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--color-muted)] px-3 py-1 rounded-xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/40">
              ⚡ Sıfır Halüsinasyon / Kesin Veri
            </span>
          </div>
        </div>

        {/* Quick Question Prompt Chips */}
        <div className="space-y-2 relative z-10">
          <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
            <Sparkles size={12} className="text-[var(--color-brand)]" />
            Hızlı Analiz Soruları (Tek Tıkla Sorgula)
          </label>
          <div className="flex flex-wrap gap-2">
            {SMART_PROMPT_CHIPS.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={asking || !aiConfigured}
                  onClick={() => handleAsk(chip.query)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer text-left hover:scale-[1.02] active:scale-[0.98]",
                    chip.color,
                    asking && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative z-10 flex gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Örn: Bu ay en yüksek getiriyi hangi varlığım sağladı? Portföyüm dengeli mi?..."
              disabled={asking || !aiConfigured}
              className="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:font-medium placeholder:text-[var(--color-muted)] shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={asking || !question.trim() || !aiConfigured}
            className="btn btn-primary px-5 py-3.5 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {asking ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Analiz Ediliyor...</span>
              </>
            ) : (
              <>
                <span>Sor</span>
                <Send size={14} />
              </>
            )}
          </button>
        </form>

        {askError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{askError}</span>
          </div>
        )}

        {/* Responses Stream / History */}
        {chatHistory.length > 0 && (
          <div className="space-y-4 pt-2 relative z-10">
            {chatHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 shadow-md space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {/* Question Row & Meta Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shrink-0">
                      <MessageSquare size={14} />
                    </span>
                    <span className="font-extrabold text-xs text-[var(--color-foreground)] truncate">
                      {item.question}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tool Invocation Badges */}
                    {item.usedTools && item.usedTools.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        🛠️ {item.usedTools.length} Araç: {item.usedTools.join(", ")}
                      </span>
                    )}

                    {item.durationMs && (
                      <span className="text-[10px] font-semibold text-[var(--color-muted)] tabular-nums">
                        {(item.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => copyAnswer(item.answer, idx)}
                      className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
                      title="Yanıtı Kopyala"
                    >
                      {copiedIndex === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* AI Formatted Response */}
                <div className="text-xs text-[var(--color-foreground)] leading-relaxed space-y-2">
                  <FormattedMarkdownResponse content={item.answer} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. GÜNLÜK OTOMATİK PORTFÖY BÜLTENİ (Executive Briefing) */}
      <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-[var(--color-foreground)]">
                Günlük Portföy Bülteni & Yorumları
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-[var(--color-brand-strong)] border border-indigo-500/20">
                GPT-4o Sentezi
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Portföyün genel kâr/zarar eğilimleri, riskleri ve öne çıkan varlık notları
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceRegenerate}
              disabled={aiLoading || !aiConfigured}
              className="btn btn-primary text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={cn(aiLoading && "animate-spin")} />
              {aiLoading ? "Üretiliyor..." : "Yeniden Üret"}
            </button>
          </div>
        </div>

        {/* Focus Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["general", "technical", "risk", "opportunity"] as BriefingFocusMode[]).map((mode) => {
            const active = focusMode === mode;
            const meta = FOCUS_MODE_LABELS[mode];
            return (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                disabled={aiLoading}
                className={cn(
                  "p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between",
                  active
                    ? "bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-brand-strong)] shadow-xs"
                    : "bg-[var(--color-surface-muted)]/30 border-[var(--color-border)]/50 text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]/60",
                )}
              >
                <div className="font-extrabold text-xs">{meta.label}</div>
                <div className="text-[10px] opacity-80 line-clamp-1 mt-0.5">{meta.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Briefing Content Display */}
        {activeBriefing ? (
          <div className="space-y-4 pt-2">
            {/* Headline */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--color-brand-soft)]/50 to-[var(--color-surface)] border border-[var(--color-brand)]/25">
              <h4 className="text-sm font-black text-[var(--color-foreground)] leading-snug">
                {activeBriefing.payload.headline}
              </h4>
            </div>

            {/* Summary */}
            <div className="text-xs text-[var(--color-foreground)]/90 leading-relaxed whitespace-pre-line p-1">
              {activeBriefing.payload.summary}
            </div>

            {/* Highlights & Risks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Highlights */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Öne Çıkanlar & Fırsatlar
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--color-foreground)]/90">
                  {activeBriefing.payload.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  Risk & Dikkat Maddeleri
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--color-foreground)]/90">
                  {activeBriefing.payload.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* TEFAS Note */}
            {activeBriefing.payload.tefasNote && (
              <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs text-[var(--color-foreground)]/90 flex items-start gap-2.5">
                <PieChart size={15} className="text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-purple-600 dark:text-purple-400 block mb-0.5">TEFAS Fon Akış Notu:</strong>
                  {activeBriefing.payload.tefasNote}
                </div>
              </div>
            )}

            {/* Per-Symbol Notes */}
            {activeBriefing.payload.perSymbol.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Varlık Bazlı Kısa Notlar
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {activeBriefing.payload.perSymbol.map((item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/20 space-y-1"
                    >
                      <span className="font-black text-xs text-[var(--color-foreground)]">{item.symbol}</span>
                      <p className="text-[11px] text-[var(--color-muted)] leading-tight">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--color-muted)] space-y-2">
            <p>Bu odak modu için henüz briefing üretilmedi.</p>
            <button
              type="button"
              onClick={handleForceRegenerate}
              disabled={aiLoading}
              className="btn btn-primary text-xs cursor-pointer"
            >
              Şimdi Üret
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function parseInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-black text-[var(--color-foreground)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function FormattedMarkdownResponse({ content }: { content: string }) {
  // 1. "Portföy Notu" bölümünü ayır
  const noteRegex = /(?:💡\s*)?(?:\*\*)?Portföy Notu(?:\*\*)?:?\s*([\s\S]*)$/i;
  let mainContent = content;
  let noteText: string | null = null;

  const noteMatch = content.match(noteRegex);
  if (noteMatch && noteMatch[1]) {
    noteText = noteMatch[1].trim();
    mainContent = content.slice(0, noteMatch.index).trim();
  }

  const lines = mainContent.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();
      elements.push(<div key={`space-${idx}`} className="h-1.5" />);
      return;
    }

    // Başlık (# veya ## veya ###)
    if (line.startsWith("#")) {
      flushList();
      const cleanHeader = line.replace(/^#+\s*/, "");
      elements.push(
        <h4
          key={`header-${idx}`}
          className="text-xs sm:text-sm font-black text-[var(--color-foreground)] mt-3.5 mb-1.5 flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          {parseInlineBold(cleanHeader)}
        </h4>
      );
      return;
    }

    // Numaralı Varlık / Başlık (örn: "1. **BES (BES)**:" veya "2. **PHE (TEFAS)**:")
    const numberedMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (numberedMatch) {
      flushList();
      const num = numberedMatch[1];
      const itemTitle = numberedMatch[2];
      elements.push(
        <div
          key={`num-${idx}`}
          className="flex items-center gap-2 pt-2.5 pb-1 font-black text-xs sm:text-sm text-[var(--color-foreground)]"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-black text-[10px]">
            {num}
          </span>
          <span className="tracking-tight">{parseInlineBold(itemTitle)}</span>
        </div>
      );
      return;
    }

    // Madde İşareti (örn: "- Miktar: 1" veya "- Güncel Değer: 881.000 TL")
    if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
      const cleanBullet = line.replace(/^[-*•]\s*/, "");
      const kvMatch = cleanBullet.match(/^([^:]+):\s*(.+)$/);

      if (kvMatch) {
        const key = kvMatch[1].trim().replace(/^\*\*(.*)\*\*$/, "$1");
        const val = kvMatch[2].trim();
        currentList.push(
          <li key={`kv-${idx}`} className="ml-5 flex items-baseline gap-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]/70 shrink-0 mt-1.5" />
            <span className="text-[var(--color-muted)] font-medium">
              <strong className="text-[var(--color-foreground)] font-extrabold">{key}:</strong>{" "}
              <span className="font-bold text-[var(--color-brand-strong)] tabular-nums">
                {parseInlineBold(val)}
              </span>
            </span>
          </li>
        );
      } else {
        currentList.push(
          <li key={`bullet-${idx}`} className="ml-5 flex items-start gap-2 text-xs text-[var(--color-foreground)]/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shrink-0 mt-1.5" />
            <span>{parseInlineBold(cleanBullet)}</span>
          </li>
        );
      }
      return;
    }

    // Standart Paragraf
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs text-[var(--color-foreground)]/90 font-medium leading-relaxed">
        {parseInlineBold(line)}
      </p>
    );
  });

  flushList();

  return (
    <div className="space-y-1 font-sans">
      {elements}

      {/* Portföy Notu Callout Kartı */}
      {noteText && (
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[var(--color-surface-muted)]/40 to-indigo-500/10 border border-amber-500/30 text-xs text-[var(--color-foreground)] space-y-1.5 shadow-xs">
          <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider">
            <span className="text-sm">💡</span>
            <span>Portföy Notu & Stratejik Çıkarım</span>
          </div>
          <p className="leading-relaxed font-semibold text-[var(--color-foreground)]/95 text-xs">
            {parseInlineBold(noteText)}
          </p>
        </div>
      )}
    </div>
  );
}
