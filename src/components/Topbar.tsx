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
  Brain,
  Shield,
} from "lucide-react";
import { CurrencyToggle } from "./CurrencyToggle";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/transactions", label: "İşlemler", icon: ArrowLeftRight },
  { href: "/growth", label: "Portföy Gelişimi", icon: TrendingUp },
  { href: "/performance", label: "Ürün Performansı", icon: LineChart },
  { href: "/analysis", label: "Analiz", icon: Brain },
];

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

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
  if (user?.email === "admin@porttrack.com") {
    navItems.push({ href: "/admin", label: "Yönetim", icon: Shield });
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
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8 flex h-16 items-center justify-between gap-4">
        {/* Sol Taraf: Logo ve İsim */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white shadow-sm">
            <Wallet size={18} />
          </div>
          <div className="hidden sm:block">
            <p className="font-bold text-[14px] leading-tight">PortTrack</p>
            <p className="text-[10px] text-[var(--color-muted)] leading-tight">
              Yatırım Takip
            </p>
          </div>
        </Link>

        {/* Orta Bölüm: Yatay Menü Sekmeleri */}
        <nav className="flex items-center gap-1 md:gap-2">
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
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs md:text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shadow-sm"
                    : "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sağ Taraf: Butonlar */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-outline py-1.5 px-3 text-xs h-9"
            title="Güncel fiyatları çek"
          >
            <RefreshCw size={14} className={cn(refreshing && "animate-spin")} />
            <span className="hidden lg:inline">
              {refreshing ? "Güncelleniyor..." : "Fiyatları Güncelle"}
            </span>
          </button>
          
          <CurrencyToggle />
          <ThemeToggle />

          <button
            onClick={logout}
            className="btn btn-ghost py-1.5 px-2.5 h-9 text-xs flex items-center gap-1.5"
            title="Çıkış Yap"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
}
