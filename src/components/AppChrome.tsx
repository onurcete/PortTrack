"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { CookieBanner } from "@/components/CookieBanner";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { GlobalPortfolioAiModal } from "@/components/GlobalPortfolioAiModal";
import { FeedbackPromptModal } from "@/components/FeedbackPromptModal";

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setIsAuth(Boolean(data.user)))
      .catch(() => setIsAuth(false));
  }, [pathname]);

  // Public/Karşılama sayfalarında veya giriş yapılmamış ana sayfada App Topbar'ı gösterme
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/welcome" ||
    pathname === "/kullanim-kosullari" ||
    pathname === "/gizlilik-politikasi" ||
    pathname === "/iletisim" ||
    (pathname === "/" && isAuth === false);

  if (isPublicPage) {
    return (
      <>
        {children}
        <CookieBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-foreground)]">
      <Topbar />
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-5 py-7 md:px-10 md:py-9 pb-20 md:pb-9">
        {children}
      </main>

      {/* Logged in App Footer / Alt Banner */}
      <footer className="border-t border-[var(--color-border)]/60 py-6 bg-[var(--color-surface)] text-xs text-[var(--color-muted)] mt-auto">
        <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm text-[var(--color-foreground)]">PortTrack</span>
              <span>© {new Date().getFullYear()} PortTrack. Tüm hakları saklıdır.</span>
              <span className="text-[var(--color-border)] hidden sm:inline">•</span>
              <a
                href="https://x.com/porttrackx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-foreground)] hover:text-[var(--color-brand-strong)] transition-all hover:scale-105 shadow-2xs"
                title="PortTrack Resmi X (Twitter) Hesabı @porttrackx"
              >
                <XIcon className="w-3 h-3 text-[var(--color-brand-strong)]" />
                <span>@porttrackx</span>
              </a>
            </div>
            <p className="text-[10px] text-[var(--color-muted)] max-w-2xl font-medium">
              <strong className="text-amber-600 dark:text-amber-400">⚠️ Yasal Uyarı (YTD):</strong> Sitedeki tüm grafikler, veri hesaplamaları ve AI asistan yanıtları yalnızca kişisel bilgi amaçlıdır. SPK kapsamında yatırım tavsiyesi teşkil etmez.
            </p>
          </div>

          <div className="flex items-center gap-4 font-bold text-xs">
            <Link
              href="/iletisim"
              className="hover:text-[var(--color-brand-strong)] transition-colors underline"
            >
              İletişim
            </Link>
            <Link
              href="/kullanim-kosullari"
              className="hover:text-[var(--color-brand-strong)] transition-colors underline"
            >
              Kullanım Koşulları
            </Link>
            <Link
              href="/gizlilik-politikasi"
              className="hover:text-[var(--color-brand-strong)] transition-colors underline"
            >
              Gizlilik Politikası & KVKK
            </Link>
          </div>
        </div>
      </footer>

      <CookieBanner />
      <FeedbackWidget />
      <GlobalPortfolioAiModal />
      <FeedbackPromptModal />
    </div>
  );
}
