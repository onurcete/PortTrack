"use client";

import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { ASSET_META } from "@/lib/assets";
import type { AnalysisPulse as PulseDTO } from "@/lib/analysisPulse";
import { cn, formatMoney, formatPercent } from "@/lib/utils";

export function AnalysisPulse({ pulse }: { pulse: PulseDTO }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
            Portföy nabzı
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-[var(--color-foreground)]">
            {formatMoney(pulse.totalValueTRY, "TRY")}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {pulse.openCount} açık pozisyon
          </p>
          <div className="mt-4 space-y-1.5">
            {pulse.typeSlices.slice(0, 5).map((slice) => (
              <div
                key={slice.assetType}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: ASSET_META[slice.assetType].color }}
                  />
                  <span className="truncate text-[var(--color-muted)]">
                    {slice.label}
                  </span>
                </span>
                <span className="font-semibold tabular-nums shrink-0">
                  {slice.weightPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            En büyük ağırlıklar
          </p>
          <div className="space-y-2.5">
            {pulse.topWeights.length === 0 && (
              <p className="text-xs text-[var(--color-muted)]">Veri yok</p>
            )}
            {pulse.topWeights.map((w) => (
              <div key={w.symbol}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold">{w.symbol}</span>
                  <span className="tabular-nums text-[var(--color-muted)]">
                    {w.weightPct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-brand)]"
                    style={{ width: `${Math.min(w.weightPct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-3">
            Günlük hareket
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-[var(--color-profit)] mb-1.5 flex items-center gap-1">
                <TrendingUp size={12} /> Kazananlar
              </p>
              {pulse.topGainers.length === 0 && (
                <p className="text-[11px] text-[var(--color-muted)]">—</p>
              )}
              {pulse.topGainers.map((m) => (
                <div
                  key={m.symbol}
                  className="flex justify-between text-xs py-0.5"
                >
                  <span className="font-semibold">{m.symbol}</span>
                  <span className="tabular-nums text-[var(--color-profit)]">
                    {formatPercent(m.dailyChangePct)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[var(--color-loss)] mb-1.5 flex items-center gap-1">
                <TrendingDown size={12} /> Kaybedenler
              </p>
              {pulse.topLosers.length === 0 && (
                <p className="text-[11px] text-[var(--color-muted)]">—</p>
              )}
              {pulse.topLosers.map((m) => (
                <div
                  key={m.symbol}
                  className="flex justify-between text-xs py-0.5"
                >
                  <span className="font-semibold">{m.symbol}</span>
                  <span className="tabular-nums text-[var(--color-loss)]">
                    {formatPercent(m.dailyChangePct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {pulse.attention.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pulse.attention.map((chip, i) => (
            <span
              key={`${chip.kind}-${chip.symbol ?? i}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold",
                chip.severity === "warn"
                  ? "border-[var(--color-loss)]/25 bg-[var(--color-loss-soft)] text-[var(--color-loss)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-foreground)]",
              )}
            >
              {chip.severity === "warn" && <AlertTriangle size={12} />}
              {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
