"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Shield, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("porttrack_cookie_consent");
    if (!consent) {
      // Small delay for smooth entry
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleAcceptAll() {
    localStorage.setItem("porttrack_cookie_consent", "all");
    setVisible(false);
  }

  function handleAcceptEssential() {
    localStorage.setItem("porttrack_cookie_consent", "essential");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="p-5 rounded-2xl bg-[var(--color-surface)]/95 backdrop-blur-md border border-[var(--color-border)] shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 font-bold shrink-0">
              <Cookie size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[var(--color-foreground)]">
                Çerez ve Gizlilik Tercihleri
              </h3>
              <p className="text-[11px] text-[var(--color-muted)] font-medium">
                KVKK & GDPR Standartları
              </p>
            </div>
          </div>
          <button
            onClick={handleAcceptEssential}
            className="text-[var(--color-muted)] hover:text-[var(--color-foreground)] p-1 rounded-lg transition-colors"
            title="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
          PortTrack, güvenli oturum açma, gece/gündüz tema tercihinizi hatırlama ve performans analizi için çerezler kullanır. Detaylı bilgi için{" "}
          <Link
            href="/gizlilik-politikasi"
            className="text-[var(--color-brand-strong)] underline font-bold"
          >
            Gizlilik Politikamızı
          </Link>{" "}
          inceleyebilirsiniz.
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleAcceptEssential}
            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-[var(--color-muted)] hover:text-[var(--color-foreground)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-border)]/40 transition-all"
          >
            Yalnızca Zorunlu
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[var(--color-brand)] hover:bg-[var(--color-brand-strong)] shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check size={14} /> Tümünü Kabul Et
          </button>
        </div>
      </div>
    </div>
  );
}
