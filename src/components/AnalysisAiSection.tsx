"use client";

import React, { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Brain,
  TrendingUp,
  AlertTriangle,
  Send,
  MessageSquare,
  Compass,
  Zap,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import type { BriefingPayload } from "@/lib/analysisAi";
import { FOCUS_MODE_LABELS, type BriefingFocusMode } from "@/lib/analysisAi";
import { cn, formatDate } from "@/lib/utils";

interface AnalysisAiSectionProps {
  briefing: {
    payload: BriefingPayload;
    model: string;
    createdAt: string;
    contextHash: string;
  } | null;
  aiConfigured: boolean;
  contextHash: string;
  onRefresh: (mode: BriefingFocusMode, force: boolean) => Promise<void>;
  aiLoading: boolean;
  aiError: string | null;
}

const SAMPLE_QUESTIONS = [
  "Portföyümde en yüksek riske sahip varlıklar hangileri?",
  "BIST hisselerimdeki teknik göstergeler ne yönde?",
  "TEFAS fonlarımdaki yatırımcı hareketlerini yorumla.",
  "Mevcut piyasa şartlarında portföy dengem nasıl?",
];

export function AnalysisAiSection({
  briefing,
  aiConfigured,
  contextHash,
  onRefresh,
  aiLoading,
  aiError,
}: AnalysisAiSectionProps) {
  const [focusMode, setFocusMode] = useState<BriefingFocusMode>("general");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askAnswer, setAskAnswer] = useState<{ question: string; answer: string } | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const staleCache = briefing && briefing.contextHash !== contextHash;

  async function handleModeChange(mode: BriefingFocusMode) {
    setFocusMode(mode);
    await onRefresh(mode, true);
  }

  async function handleAskQuestion(qText?: string) {
    const q = (qText ?? question).trim();
    if (!q) return;

    setAsking(true);
    setAskError(null);
    setQuestion(q);

    try {
      const res = await fetch("/api/analysis/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAskError(data.error ?? "Yapay zekâ yanıt oluşturamadı");
        return;
      }
      setAskAnswer({ question: q, answer: data.answer });
    } catch {
      setAskError("Sunucu bağlantı hatası");
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Modern AI Command Center Header */}
      <div className="card p-6 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/20 to-[var(--color-brand-soft)]/20 border border-[var(--color-border)]/60 shadow-lg rounded-2xl relative overflow-hidden">
        {/* Glow backdrop effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--color-border)]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-strong)] text-white shadow-md">
              <Brain size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-[var(--color-foreground)]">
                  Yapay Zekâ Analiz Asistanı
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border border-[var(--color-brand)]/20">
                  <Sparkles size={10} /> GPT-4o BRIEFING
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Portföy teknik sinyalleri, TEFAS verileri ve varlık ağırlıkları sentezi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh(focusMode, true)}
              disabled={aiLoading || !aiConfigured}
              className="btn btn-primary text-xs shadow-sm hover:shadow-md transition-all"
              title={aiConfigured ? "Seçili mod ile yeni yapay zekâ yorumu üret" : "OPENAI_API_KEY tanımlı değil"}
            >
              <Sparkles size={14} className={cn(aiLoading && "animate-spin")} />
              {aiLoading ? "Üretiliyor..." : "AI Yorumunu Yenile"}
            </button>
          </div>
        </div>

        {/* Focus Mode Selector Tabs */}
        <div className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <Compass size={13} className="text-[var(--color-brand)]" />
              Analiz Odağı Seçin
            </span>
            {briefing && (
              <span className="text-[11px] text-[var(--color-muted)]">
                Model: <strong className="text-[var(--color-foreground)]">{briefing.model}</strong> · {formatDate(briefing.createdAt)}
                {staleCache && <span className="text-amber-500 font-bold ml-1.5">· Yeni veri mevcut!</span>}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(FOCUS_MODE_LABELS) as BriefingFocusMode[]).map((mode) => {
              const active = focusMode === mode;
              const cfg = FOCUS_MODE_LABELS[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  disabled={aiLoading || !aiConfigured}
                  className={cn(
                    "text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1",
                    active
                      ? "bg-[var(--color-surface)] border-[var(--color-brand)]/50 shadow-xs ring-2 ring-[var(--color-brand)]/20"
                      : "bg-[var(--color-surface-muted)]/20 border-[var(--color-border)]/40 hover:bg-[var(--color-surface-muted)]/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold", active ? "text-[var(--color-brand-strong)]" : "text-[var(--color-foreground)]")}>
                      {cfg.label}
                    </span>
                    {active && <CheckCircle2 size={13} className="text-[var(--color-brand-strong)] shrink-0" />}
                  </div>
                  <span className="text-[10px] text-[var(--color-muted)] line-clamp-1">
                    {cfg.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Briefing Display Box */}
        <div className="mt-5 pt-5 border-t border-[var(--color-border)]/50">
          {!aiConfigured ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <p className="font-bold text-amber-600">OpenAI API Key Tanımlı Değil</p>
              <p className="text-[var(--color-muted)]">
                Gerçek yapay zekâ briefing üretimi için ortam değişkenlerine <code className="font-mono text-[var(--color-foreground)]">OPENAI_API_KEY</code> ekleyin. Sayfa aşağıdaki teknik metriklerle çalışmaya devam eder.
              </p>
            </div>
          ) : !briefing ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-sm font-bold text-[var(--color-foreground)]">Henüz AI briefing üretilmedi</p>
              <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
                Portföyünüzün teknik skorları, varlık ağırlıkları ve TEFAS hareketlerinden oluşan yapay zekâ analizini başlatın.
              </p>
              <button
                type="button"
                onClick={() => onRefresh(focusMode, false)}
                disabled={aiLoading}
                className="btn btn-primary text-xs"
              >
                <Sparkles size={14} />
                İlk Briefing'i Oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Big Headline */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)] leading-snug">
                  {briefing.payload.headline}
                </h3>
              </div>

              {/* Main Summary */}
              <div className="text-xs sm:text-sm leading-relaxed text-[var(--color-foreground)]/90 space-y-2 whitespace-pre-line bg-[var(--color-surface)]/60 p-4 rounded-xl border border-[var(--color-border)]/40 shadow-2xs">
                {briefing.payload.summary}
              </div>

              {/* Highlights & Risks Grid */}
              {(briefing.payload.highlights.length > 0 || briefing.payload.risks.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Highlights */}
                  {briefing.payload.highlights.length > 0 && (
                    <div className="card p-4 bg-emerald-500/5 border border-emerald-500/20 space-y-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)]">
                        <TrendingUp size={14} />
                        Öne Çıkan Fırsat & Olumlu Sinyaller
                      </div>
                      <ul className="space-y-2 text-xs">
                        {briefing.payload.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-[var(--color-foreground)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-profit)] mt-1.5 shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {briefing.payload.risks.length > 0 && (
                    <div className="card p-4 bg-rose-500/5 border border-rose-500/20 space-y-2.5 rounded-xl">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-loss)]">
                        <AlertTriangle size={14} />
                        Riskler & Dikkat Edilmesi Gerekenler
                      </div>
                      <ul className="space-y-2 text-xs">
                        {briefing.payload.risks.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-[var(--color-foreground)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-loss)] mt-1.5 shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TEFAS AI Note if present */}
              {briefing.payload.tefasNote && (
                <div className="p-3.5 bg-[var(--color-brand-soft)]/30 border border-[var(--color-brand)]/20 rounded-xl text-xs space-y-1">
                  <span className="font-extrabold text-[var(--color-brand-strong)] block">TEFAS Fon Yatırımcı Yorumu</span>
                  <p className="text-[var(--color-foreground)]/90">{briefing.payload.tefasNote}</p>
                </div>
              )}

              {/* Per Symbol Short AI Notes */}
              {briefing.payload.perSymbol && briefing.payload.perSymbol.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                    Varlık Bazlı Öne Çıkan Yorumlar
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {briefing.payload.perSymbol.map((ps) => (
                      <div key={ps.symbol} className="p-2.5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-xl text-xs space-y-0.5">
                        <span className="font-extrabold text-[var(--color-foreground)]">{ps.symbol}</span>
                        <p className="text-[11px] text-[var(--color-muted)] line-clamp-2">{ps.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {aiError && (
            <p className="mt-3 text-xs font-bold text-[var(--color-loss)]">{aiError}</p>
          )}
        </div>
      </div>

      {/* Interactive Ask AI Box */}
      <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border)]/40 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[var(--color-brand)]" />
            <h3 className="font-extrabold text-sm text-[var(--color-foreground)]">
              Yapay Zekâya Soru Sor (Interactive Q&A)
            </h3>
          </div>
          <span className="text-[10px] text-[var(--color-muted)]">Portföy Context'i İle Yanıtlar</span>
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Portföyünüz hakkında soru sorun (ör. En riskli varlığım hangisi?)..."
            disabled={asking || !aiConfigured}
            className="input text-xs flex-1"
          />
          <button
            type="submit"
            disabled={asking || !question.trim() || !aiConfigured}
            className="btn btn-primary text-xs shrink-0"
          >
            {asking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Sor
          </button>
        </form>

        {/* Sample Question Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <HelpCircle size={11} /> Örnek Sorular
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_QUESTIONS.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(sq)}
                disabled={asking || !aiConfigured}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--color-surface-muted)]/40 hover:bg-[var(--color-surface-muted)] border border-[var(--color-border)]/40 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors text-left flex items-center gap-1 cursor-pointer"
              >
                <span>{sq}</span>
                <ChevronRight size={10} />
              </button>
            ))}
          </div>
        </div>

        {/* Answer Display */}
        {askError && (
          <p className="text-xs font-bold text-[var(--color-loss)]">{askError}</p>
        )}

        {askAnswer && (
          <div className="mt-3 p-4 bg-gradient-to-br from-[var(--color-brand-soft)]/20 to-[var(--color-surface-muted)]/20 border border-[var(--color-brand)]/20 rounded-xl space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand-strong)]">
              <Zap size={13} />
              <span>Soru: "{askAnswer.question}"</span>
            </div>
            <div className="text-xs leading-relaxed text-[var(--color-foreground)] whitespace-pre-line border-t border-[var(--color-border)]/30 pt-2">
              {askAnswer.answer}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
