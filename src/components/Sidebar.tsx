"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  LineChart,
  Wallet,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/transactions", label: "İşlemler", icon: ArrowLeftRight },
  { href: "/growth", label: "Portföy Gelişimi", icon: TrendingUp },
  { href: "/performance", label: "Ürün Performansı", icon: LineChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-[var(--color-border)]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white">
          <Wallet size={18} />
        </div>
        <div>
          <p className="font-bold text-[15px] leading-tight">PortTrack</p>
          <p className="text-[11px] text-[var(--color-muted)] leading-tight">
            Yatırım Takip
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[var(--color-border)] space-y-2">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
        >
          <LogOut size={18} />
          Çıkış Yap
        </button>
        <p className="px-3 text-[11px] text-[var(--color-muted)]">
          Fiyatlar Yahoo Finance &amp; TEFAS&apos;tan otomatik çekilir.
        </p>
      </div>
    </aside>
  );
}
