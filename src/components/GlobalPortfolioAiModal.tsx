"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Sparkles,
  Zap,
  Send,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Copy,
  Check,
  X,
  TrendingUp,
  ShieldAlert,
  Flame,
  PieChart,
  Layers,
  BarChart3,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    query: "2026 yılında portföyümde en çok kazandıran ve kaybettiren enstrümanlar hangileri?",
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

export function GlobalPortfolioAiModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{
      question: string;
      answer: string;
      usedTools?: string[];
      durationMs?: number;
    }>
  >([]);
  const [askError, setAskError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Global Keyboard Shortcut: Ctrl+J or Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "j" || e.key === "J" || e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleAsk(customQuery?: string) {
    const q = (customQuery || question).trim();
    if (!q || asking) return;

    setAsking(true);
    setAskError(null);

    try {
      const res = await fetch("/api/analysis/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Yanıt alınamadı.");
      }

      setChatHistory((prev) => [
        {
          question: q,
          answer: data.answer,
          usedTools: data.usedTools,
          durationMs: data.durationMs,
        },
        ...prev,
      ]);
      setQuestion("");
    } catch (err: any) {
      setAskError(err?.message || "Soru yanıtlanırken bir hata oluştu.");
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
    <>
      {/* Global Floating AI Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-black text-xs shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer select-none ring-2 ring-indigo-500/40 active:scale-95 animate-in fade-in"
        title="Portföy Zekâsı (Ctrl+J)"
      >
        <div className="relative">
          <Brain size={18} className="animate-pulse text-cyan-200" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300"></span>
          </span>
        </div>
        <span className="tracking-tight font-black">Portföy Zekâsı</span>
        <span className="hidden md:inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-extrabold text-white/90">
          ⌘K
        </span>
      </button>

      {/* Interactive Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand)] to-indigo-700 text-white shadow-md shadow-[var(--color-brand)]/20">
                  <Brain size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-[var(--color-foreground)] tracking-tight">
                      Portföy Zekâsı (AI Asistan)
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border border-[var(--color-brand)]/30">
                      <Zap size={10} className="text-amber-400 fill-amber-400" />
                      10 ANALİZ ARACI
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] font-medium">
                    Sıfır halüsinasyon, deterministik hesaplanan kesin verilerle portföy analizi.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {chatHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setChatHistory([])}
                    className="p-2 rounded-xl text-[var(--color-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Sohbeti Temizle"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
                  title="Kapat (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Quick Question Prompt Chips */}
              <div className="space-y-2">
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
                        disabled={asking}
                        onClick={() => handleAsk(chip.query)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer text-left hover:scale-[1.02] active:scale-[0.98]",
                          chip.color,
                          asking && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <Icon size={13} className="shrink-0" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Box */}
              {askError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{askError}</span>
                </div>
              )}

              {/* Chat Thread */}
              {chatHistory.length > 0 ? (
                <div className="space-y-4">
                  {chatHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl bg-[var(--color-surface-muted)]/25 border border-[var(--color-border)]/80 shadow-xs space-y-3"
                    >
                      {/* Question Row & Meta Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)]/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="p-1 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shrink-0">
                            <MessageSquare size={13} />
                          </span>
                          <span className="font-extrabold text-xs text-[var(--color-foreground)]">
                            {item.question}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
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
                            {copiedIndex === idx ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
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
              ) : (
                <div className="py-10 text-center space-y-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] mx-auto shadow-inner">
                    <Sparkles size={26} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-[var(--color-foreground)]">
                      Portföyünüze Dair Her Şeyi Sorun
                    </h4>
                    <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
                      Getiriler, varlık dağılımı, XIRR, 2026 ayı kazançları veya TEFAS fon yatırımcı hareketlerini anında analiz edin.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-[var(--color-border)]/60 bg-[var(--color-surface)] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Portföyünüze soru sorun (Örn: 2026 yılında en az kazandığım ay hangisi ve sebebi neydi?)..."
                  disabled={asking}
                  className="flex-1 px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 text-xs font-bold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:font-medium placeholder:text-[var(--color-muted)] shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className="btn btn-primary px-5 py-3 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {asking ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Analiz Ediliyor...</span>
                    </>
                  ) : (
                    <>
                      <span>Sor</span>
                      <Send size={13} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
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

function renderTable(tableLines: string[], keyPrefix: string): React.ReactNode {
  const parsedRows = tableLines.map((row) =>
    row
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1),
  );

  if (parsedRows.length < 2) return null;

  const headerRow = parsedRows[0];
  const dataRows = parsedRows.slice(1).filter((r) => !r.every((c) => /^[:\s-]+$/.test(c)));

  return (
    <div
      key={keyPrefix}
      className="overflow-x-auto my-3 rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)] shadow-xs"
    >
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className="bg-[var(--color-surface-muted)]/60 border-b border-[var(--color-border)]/60 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
            {headerRow.map((col, cIdx) => (
              <th key={cIdx} className={cn("px-3.5 py-2.5 font-black whitespace-nowrap", cIdx > 0 && "text-right")}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]/30 text-xs">
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[var(--color-surface-muted)]/30 transition-colors">
              {row.map((cell, cIdx) => {
                const headerText = (headerRow[cIdx] || "").toLowerCase();
                const isFirstCol = cIdx === 0;

                const cleanNum = cell.replace(/[%,₺$\s]/g, "").replace(",", ".");
                const numVal = parseFloat(cleanNum);
                const isNumeric = !isNaN(numVal) && !isFirstCol && !isNaN(Number(cleanNum));

                const isPositive = isNumeric && numVal > 0;
                const isNegative = isNumeric && numVal < 0;

                const isPercentCol =
                  headerText.includes("%") ||
                  headerText.includes("getiri") ||
                  headerText.includes("oran") ||
                  cell.includes("%");

                const isAmountCol =
                  headerText.includes("kar") ||
                  headerText.includes("kâr") ||
                  headerText.includes("tl") ||
                  headerText.includes("usd") ||
                  headerText.includes("değer");

                return (
                  <td
                    key={cIdx}
                    className={cn(
                      "px-3.5 py-2.5 whitespace-nowrap",
                      isFirstCol
                        ? "font-extrabold text-[var(--color-foreground)]"
                        : "text-right font-bold tabular-nums",
                      isPercentCol && isPositive && "text-[var(--color-profit)] font-black",
                      isPercentCol && isNegative && "text-[var(--color-loss)] font-black",
                      !isPercentCol && isAmountCol && isPositive && "text-[var(--color-profit)]/90",
                      !isPercentCol && isAmountCol && isNegative && "text-[var(--color-loss)]/90",
                    )}
                  >
                    {isPercentCol && isNumeric ? (
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded-lg text-[11px] font-black tabular-nums shadow-2xs",
                          isPositive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : isNegative
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            : "text-[var(--color-muted)]",
                        )}
                      >
                        {isPositive ? "+" : ""}%{Math.abs(numVal).toFixed(2)}
                      </span>
                    ) : (
                      parseInlineBold(cell)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

  const rawLines = mainContent.split("\n");
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed === "") {
      const prev = lines[lines.length - 1] || "";
      let next = "";
      for (let j = i + 1; j < rawLines.length; j++) {
        if (rawLines[j].trim() !== "") {
          next = rawLines[j].trim();
          break;
        }
      }
      if (prev.startsWith("|") && prev.endsWith("|") && next.startsWith("|") && next.endsWith("|")) {
        continue;
      }
    }
    lines.push(trimmed);
  }

  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let currentTableLines: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1.5 my-2">
          {currentList}
        </ul>,
      );
      currentList = [];
    }
  };

  const flushTable = () => {
    if (currentTableLines.length > 0) {
      const tableNode = renderTable(currentTableLines, `table-${elements.length}`);
      if (tableNode) elements.push(tableNode);
      currentTableLines = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    if (line.startsWith("|") && line.endsWith("|")) {
      flushList();
      currentTableLines.push(line);
      return;
    }

    flushTable();

    if (!line) {
      flushList();
      elements.push(<div key={`space-${idx}`} className="h-1.5" />);
      return;
    }

    if (line.startsWith("#")) {
      flushList();
      const cleanHeader = line.replace(/^#+\s*/, "");
      elements.push(
        <h4
          key={`header-${idx}`}
          className="text-xs sm:text-sm font-black text-[var(--color-foreground)] mt-3 mb-1.5 flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--color-brand)]" />
          {parseInlineBold(cleanHeader)}
        </h4>,
      );
      return;
    }

    const numberedMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (numberedMatch) {
      flushList();
      const num = numberedMatch[1];
      const itemTitle = numberedMatch[2];
      elements.push(
        <div
          key={`num-${idx}`}
          className="flex items-center gap-2 pt-2 pb-1 font-black text-xs text-[var(--color-foreground)]"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-black text-[10px]">
            {num}
          </span>
          <span className="tracking-tight">{parseInlineBold(itemTitle)}</span>
        </div>,
      );
      return;
    }

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
          </li>,
        );
      } else {
        currentList.push(
          <li key={`bullet-${idx}`} className="ml-5 flex items-start gap-2 text-xs text-[var(--color-foreground)]/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)] shrink-0 mt-1.5" />
            <span>{parseInlineBold(cleanBullet)}</span>
          </li>,
        );
      }
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs text-[var(--color-foreground)]/90 font-medium leading-relaxed">
        {parseInlineBold(line)}
      </p>,
    );
  });

  flushList();
  flushTable();

  return (
    <div className="space-y-1 font-sans">
      {elements}

      {noteText && (
        <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[var(--color-surface-muted)]/40 to-indigo-500/10 border border-amber-500/30 text-xs text-[var(--color-foreground)] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">
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
