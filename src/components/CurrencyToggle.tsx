"use client";

import { useCurrency } from "@/context/currency";
import { cn } from "@/lib/utils";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-0.5 text-xs sm:text-sm font-bold select-none shrink-0 relative z-20">
      {(["TRY", "USD"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => setCurrency(c)}
          className={cn(
            "rounded-lg px-2.5 sm:px-3 py-1.5 transition-all duration-150 cursor-pointer touch-manipulation active:scale-95",
            currency === c
              ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-xs border border-[var(--color-border)]/60"
              : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
          )}
        >
          {c === "TRY" ? "₺ TL" : "$ USD"}
        </button>
      ))}
    </div>
  );
}
