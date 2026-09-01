"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, UserPlus, LogIn } from "lucide-react";

export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.isDemo) {
          setIsDemo(true);
        } else {
          setIsDemo(false);
        }
      })
      .catch(() => setIsDemo(false));
  }, []);

  if (!isDemo) return null;

  return (
    <div className="w-full mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-emerald-500/30 dark:border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 dark:from-emerald-950/40 dark:via-slate-900/80 dark:to-indigo-950/40 backdrop-blur-md shadow-lg shadow-emerald-500/5">
        {/* Glow effect background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/15 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Sol Kısım: Rozet ve Açıklama */}
          <div className="flex items-start sm:items-center gap-3.5 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Örnek Demo Portföyü
                </span>
                <span className="text-xs text-[var(--color-muted)] hidden sm:inline">• Tüm veriler örnektir</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[var(--color-foreground)] leading-snug">
                Kendi BİST, TEFAS, Yabancı Borsa ve Kripto yatırımlarınızı canlı takip etmek için hemen ücretsiz hesabınızı oluşturun.
              </p>
            </div>
          </div>

          {/* Sağ Kısım: Aksiyon Butonları */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 pt-1 md:pt-0">
            <Link
              href="/register"
              onClick={() => {
                if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
                  (window as any).gtag("event", "demo_signup_click", {
                    event_category: "Engagement",
                    button_location: "demo_banner"
                  });
                }
              }}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <UserPlus size={16} />
              <span>Ücretsiz Üyelik Aç (10 Sn)</span>
              <ArrowRight size={15} />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 hover:bg-[var(--color-surface-muted)] text-[var(--color-foreground)] font-bold text-xs sm:text-sm transition-all"
            >
              <LogIn size={14} className="text-[var(--color-muted)]" />
              <span>Giriş Yap</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
