"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  RefreshCw,
  Wallet,
  LogOut,
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  LineChart,
  Activity,
  Shield,
  Settings,
  Sparkles,
} from "lucide-react";
import { CurrencyToggle } from "./CurrencyToggle";
import { ThemeToggle } from "./ThemeToggle";
import { PortTrackLogo } from "./PortTrackLogo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Genel Bakış", shortLabel: "Genel", icon: LayoutDashboard },
  { href: "/transactions", label: "İşlemler", shortLabel: "İşlemler", icon: ArrowLeftRight },
  { href: "/growth", label: "Portföy Gelişimi", shortLabel: "Gelişim", icon: TrendingUp },
  { href: "/analysis", label: "Analiz", shortLabel: "Analiz", icon: Activity },
  { href: "/settings", label: "Ayarlar", shortLabel: "Ayarlar", icon: Settings },
];

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; role: string; isDemo?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const navItems = [...NAV];
  if (user?.role === "ADMIN") {
    navItems.push({ href: "/admin", label: "Yönetim", shortLabel: "Yönetim", icon: Shield });
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch("/api/prices/refresh", { method: "POST" });
      router.refresh();
    } catch {
      // sessizce gec
    } finally {
      setRefreshing(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      {/* Üst Header Bar */}
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 md:px-8 flex h-16 items-center justify-between gap-2 md:gap-4">
          {/* Sol Taraf: Logo ve İsim */}
          <Link href="/" className="hover:opacity-90 transition-opacity shrink-0">
            <PortTrackLogo size={32} variant="horizontal" showTagline={false} />
          </Link>

          {/* Masaüstü Orta Bölüm: Yatay Menü Sekmeleri (Sadece md ve üzerinde görünür) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 md:gap-2">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs md:text-sm font-bold transition-all duration-150 whitespace-nowrap",
                    active
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shadow-xs"
                      : "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sağ Taraf: Butonlar */}
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {/* Demo Kullanıcıya Özel Dikkat Çekici Üyelik Butonu */}
            {user?.isDemo && (
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 transition-all duration-200"
                title="Kendi portföyünüzü oluşturmak için hemen ücretsiz üye olun"
              >
                <Sparkles size={14} className="animate-pulse shrink-0" />
                <span>Ücretsiz Üye Ol</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-outline py-1.5 px-2.5 sm:px-3 text-xs h-9"
              title="Güncel fiyatları çek"
            >
              <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
              <span className="hidden sm:inline text-[11px] sm:text-xs">
                {refreshing ? "Güncelleniyor..." : "Fiyatları Güncelle"}
              </span>
            </button>
            
            <CurrencyToggle />
            <ThemeToggle />

            <button
              onClick={logout}
              className="btn btn-ghost py-1.5 px-2 sm:px-2.5 h-9 text-xs flex items-center gap-1.5"
              title="Çıkış Yap"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobil Alt Sabit Navigasyon Barı (Mobil Finans Uygulaması Deneyimi - Sadece Mobilde Görünür) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl md:hidden px-1 py-1 shadow-lg">
        <div
          className="grid w-full gap-0.5"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all duration-150 text-center relative",
                  active
                    ? "text-[var(--color-brand)] font-bold bg-[var(--color-brand-soft)]/50"
                    : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                )}
              >
                <Icon size={18} className={cn("transition-transform", active && "scale-110")} />
                <span className="text-[10px] leading-tight mt-1 truncate max-w-full">
                  {item.shortLabel || item.label}
                </span>
                {active && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
