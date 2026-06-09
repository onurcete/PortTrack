import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Currency = "TRY" | "USD";

const CURRENCY_SYMBOL: Record<Currency, string> = {
  TRY: "₺",
  USD: "$",
};

/** Para birimine gore bicimlendirme (Turkce yerel ayar). */
export function formatMoney(
  value: number,
  currency: Currency,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  const { compact = false, decimals } = opts;
  if (!Number.isFinite(value)) return "-";

  const maximumFractionDigits =
    decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);

  const formatted = new Intl.NumberFormat("tr-TR", {
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: compact ? 0 : Math.min(maximumFractionDigits, 2),
    maximumFractionDigits,
  }).format(value);

  return currency === "USD"
    ? `${CURRENCY_SYMBOL.USD}${formatted}`
    : `${formatted} ${CURRENCY_SYMBOL.TRY}`;
}

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    year: "2-digit",
  }).format(new Date(y, m - 1, 1));
}
