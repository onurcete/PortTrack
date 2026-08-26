"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Lightbulb,
  MessageSquare,
  Bug,
  HelpCircle,
  X,
  Send,
  Star,
  CheckCircle2,
  ThumbsUp,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingPrompt {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export function FeedbackPromptModal() {
  const pathname = usePathname();
  const [prompt, setPrompt] = useState<PendingPrompt | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedInSession, setDismissedInSession] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"REQUEST" | "SUGGESTION" | "OTHER" | "BUG">("REQUEST");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dismissedInSession) return;
    let isMounted = true;
    fetch("/api/feedback/prompt", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.ok && data.prompt) {
          setPrompt(data.prompt);
          setIsOpen(true);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname, dismissedInSession]);

  async function handleDismiss() {
    if (!prompt) return;
    setDismissedInSession(true);
    setIsOpen(false);
    try {
      await fetch("/api/feedback/prompt/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: prompt.id,
          action: "DISMISS",
        }),
      });
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt) return;
    if (!message.trim()) {
      setError("Lütfen birkaç kelimeyle de olsa görüş veya isteğinizi yazınız.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback/prompt/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: prompt.id,
          action: "SUBMIT",
          type: feedbackType,
          message: message.trim(),
          rating: rating > 0 ? rating : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setDismissedInSession(true);
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
        }, 2200);
      } else {
        setError(data.error || "Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.");
      }
    } catch {
      setError("Bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen || !prompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 40px -10px rgba(99, 102, 241, 0.25)",
        }}
      >
        {/* Glow Header Background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-all z-20 cursor-pointer"
          title="Daha Sonra / Kapat"
        >
          <X size={18} />
        </button>

        {success ? (
          <div className="p-8 sm:p-10 text-center space-y-4 relative z-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[var(--color-foreground)]">Harikasınız! 🌟</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-sm mx-auto">
                Geri bildiriminiz başarıyla iletildi. PortTrack'i sizin için daha da iyi hale getirmek için sabırsızlanıyoruz!
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-primary px-6 py-2 rounded-xl text-xs font-extrabold"
              >
                Tamamdır
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 relative z-10">
            {/* Header */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--color-foreground)] leading-snug">
                  {prompt.title}
                </h3>
                <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                  {prompt.message}
                </p>
              </div>
            </div>

            {/* Category Selector Tabs */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                Geri Bildirim Türü
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[var(--color-surface-muted)]/50 p-1.5 rounded-2xl border border-[var(--color-border)]/60 text-xs">
                <button
                  type="button"
                  onClick={() => setFeedbackType("REQUEST")}
                  className={cn(
                    "py-2 px-2 rounded-xl font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer",
                    feedbackType === "REQUEST"
                      ? "bg-[var(--color-brand)] text-white shadow-xs"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  <Lightbulb size={14} />
                  <span className="text-[11px]">Yeni İstek</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("SUGGESTION")}
                  className={cn(
                    "py-2 px-2 rounded-xl font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer",
                    feedbackType === "SUGGESTION"
                      ? "bg-cyan-500 text-white shadow-xs"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  <Sparkles size={14} />
                  <span className="text-[11px]">Öneri</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("OTHER")}
                  className={cn(
                    "py-2 px-2 rounded-xl font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer",
                    feedbackType === "OTHER"
                      ? "bg-purple-500 text-white shadow-xs"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  <MessageSquare size={14} />
                  <span className="text-[11px]">Yorum</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("BUG")}
                  className={cn(
                    "py-2 px-2 rounded-xl font-extrabold transition-all flex flex-col items-center gap-1 cursor-pointer",
                    feedbackType === "BUG"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  <Bug size={14} />
                  <span className="text-[11px]">Hata</span>
                </button>
              </div>
            </div>

            {/* Star Rating (Optional) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/50">
              <span className="text-xs font-bold text-[var(--color-foreground)]">
                PortTrack Deneyiminiz:
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-amber-400 hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      size={18}
                      className={cn(
                        "transition-colors",
                        (hoverRating || rating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-[var(--color-border)]"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Message Area */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                Mesajınız / Düşünceleriniz
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  feedbackType === "REQUEST"
                    ? "Sitede hangi yeni özelliği veya analiz aracını görmek istersiniz? (Örn: temettü takvimi, yeni borsa entegrasyonu...)"
                    : feedbackType === "SUGGESTION"
                      ? "Mevcut sayfalarda neyi daha pratik veya kullanışlı yapabiliriz?"
                      : feedbackType === "BUG"
                        ? "Karşılaştığınız hatayı ve hangi sayfada olduğunu kısaca açıklayınız..."
                        : "Genel düşünce, tecrübe veya yorumlarınızı yazabilirsiniz..."
                }
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3.5 text-xs text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]/60 focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-soft)] resize-none"
              />
            </div>

            {/* Error banner */}
            {error && (
              <p className="text-xs font-bold text-[var(--color-loss)] bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                {error}
              </p>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-all cursor-pointer"
              >
                Daha Sonra
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary px-6 py-2.5 rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    İletiliyor...
                  </span>
                ) : (
                  <>
                    <span>Geri Bildirimi Gönder</span>
                    <Send size={13} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
