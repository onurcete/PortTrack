"use client";

import { useState } from "react";
import {
  MessageSquarePlus,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Bug,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackType = "SUGGESTION" | "BUG" | "COMPLAINT" | "OTHER";

const TYPES: Array<{
  id: FeedbackType;
  label: string;
  desc: string;
  icon: any;
  activeColor: string;
}> = [
  {
    id: "SUGGESTION",
    label: "İstek & Öneri",
    desc: "Yeni bir özellik veya geliştirme fikri",
    icon: Lightbulb,
    activeColor: "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400",
  },
  {
    id: "BUG",
    label: "Hata Bildirimi",
    desc: "Uygulamada gördüğünüz aksaklık",
    icon: Bug,
    activeColor: "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400",
  },
  {
    id: "COMPLAINT",
    label: "Şikayet & Sorun",
    desc: "Yaşadığınız bir problem",
    icon: AlertTriangle,
    activeColor: "bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400",
  },
  {
    id: "OTHER",
    label: "Diğer",
    desc: "Genel soru veya görüşleriniz",
    icon: HelpCircle,
    activeColor: "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400",
  },
];

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType>("SUGGESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || message.trim().length < 3) {
      setStatus("error");
      setErrorMsg("Lütfen en az 3 karakter açıklama giriniz.");
      return;
    }

    setLoading(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setStatus("success");
        setSubject("");
        setMessage("");
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
        }, 2500);
      } else {
        setStatus("error");
        setErrorMsg(data.error || "Gönderilirken bir hata oluştu.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[var(--color-brand)] text-white font-extrabold text-xs shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer select-none ring-2 ring-[var(--color-brand)]/30 active:scale-95"
        title="Geri Bildirim & Destek"
      >
        <MessageSquarePlus size={16} />
        <span className="hidden sm:inline">Geri Bildirim</span>
      </button>

      {/* Modal / Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !loading && setIsOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center font-extrabold">
                  <MessageSquarePlus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-[var(--color-foreground)]">
                    Geri Bildirim Gönder
                  </h2>
                  <p className="text-[11px] text-[var(--color-muted)] font-semibold">
                    Öneri, şikayet ve sorularınız doğrudan ekibimize iletilir.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="p-1.5 rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Success State */}
            {status === "success" ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center animate-bounce">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-black text-[var(--color-foreground)]">
                  Teşekkür Ederiz! 🎉
                </h3>
                <p className="text-xs text-[var(--color-muted)] font-medium max-w-xs mx-auto">
                  Geri bildiriminiz başarıyla ekibimize ulaştı. Değerli katkınız için teşekkür ederiz.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Geri Bildirim Türü
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((t) => {
                      const Icon = t.icon;
                      const isSelected = selectedType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedType(t.id)}
                          className={cn(
                            "p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 select-none",
                            isSelected
                              ? t.activeColor
                              : "border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/30 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                          )}
                        >
                          <Icon size={16} className="shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-xs font-black block truncate">
                              {t.label}
                            </span>
                            <span className="text-[9px] font-medium text-[var(--color-muted)] block truncate">
                              {t.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subject (Optional) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Konu Başlığı <span className="text-[9px] font-normal text-[var(--color-muted)]">(Opsiyonel)</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Örn: Mobil görünüm veya TEFAS fon isteği..."
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold outline-none focus:border-[var(--color-brand)]"
                  />
                </div>

                {/* Message (Required) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                    Açıklama / Mesajınız <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Fikirlerinizi, yaşadığınız bir sorunu veya eklenmesini istediğiniz bir özelliği buraya yazabilirsiniz..."
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[var(--color-brand)] resize-none"
                  />
                </div>

                {/* Error Banner */}
                {status === "error" && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="btn btn-primary px-6 py-2 rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Gönderiliyor...
                      </span>
                    ) : (
                      <>
                        <Send size={13} />
                        Gönder
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
