"use client";

import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, Users } from "lucide-react";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

function formatCount(n: number): string {
  return formatNumber(n, 0);
}

function Sparkline({
  series,
}: {
  series: { date: string; investors: number }[];
}) {
  if (series.length < 2) {
    return (
      <div className="h-8 w-20 rounded bg-[var(--color-surface-muted)]" />
    );
  }
  const values = series.map((s) => s.investors);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const rising = values[values.length - 1] >= values[0];

  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={
          rising ? "var(--color-profit)" : "var(--color-loss)"
        }
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" | "unknown" }) {
  if (trend === "up")
    return <ArrowUpRight size={14} className="text-[var(--color-profit)]" />;
  if (trend === "down")
    return <ArrowDownRight size={14} className="text-[var(--color-loss)]" />;
  return <Minus size={14} className="text-[var(--color-muted)]" />;
}

export function TefasInvestorPanel({
  summary,
  priceBySymbol,
}: {
  summary: TefasInvestorSummary;
  priceBySymbol: Map<
    string,
    { dailyChangePct: number | null; score: number | null }
  >;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Verisi olan fon"
          value={String(summary.fundsWithData)}
        />
        <SummaryTile
          label="Yatırımcı artan"
          value={String(summary.risingCount)}
          tone="good"
        />
        <SummaryTile
          label="Yatırımcı azalan"
          value={String(summary.fallingCount)}
          tone="bad"
        />
        <SummaryTile
          label="Nötr"
          value={String(summary.flatCount)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HighlightCard
          title="En güçlü giriş"
          symbol={summary.topInflow?.symbol}
          pct={summary.topInflow?.weekDeltaPct}
          delta={summary.topInflow?.weekDelta}
          tone="good"
        />
        <HighlightCard
          title="En güçlü çıkış"
          symbol={summary.topOutflow?.symbol}
          pct={summary.topOutflow?.weekDeltaPct}
          delta={summary.topOutflow?.weekDelta}
          tone="bad"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Users size={15} className="text-[var(--color-brand)]" />
          <h3 className="text-sm font-semibold">Fon yatırımcı detayı</h3>
          <span className="text-[10px] text-[var(--color-muted)] ml-auto">
            Haftalık değişim · 4 haftalık yön
          </span>
        </div>

        {summary.funds.length === 0 ? (
          <div className="card px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            TEFAS yatırımcı verisi bulunamadı. Fiyatları güncelleyin.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summary.funds.map((f) => {
              const price = priceBySymbol.get(f.symbol);
              const pct = f.weekDeltaPct;
              return (
                <article
                  key={f.symbol}
                  className="card flex flex-col gap-3 p-4 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-black tracking-tight">
                        {f.symbol}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-xs font-semibold tabular-nums",
                          (price?.dailyChangePct ?? 0) > 0 &&
                            "text-[var(--color-profit)]",
                          (price?.dailyChangePct ?? 0) < 0 &&
                            "text-[var(--color-loss)]",
                          price?.dailyChangePct == null &&
                            "text-[var(--color-muted)]",
                        )}
                      >
                        Fiyat{" "}
                        {price?.dailyChangePct != null
                          ? formatPercent(price.dailyChangePct)
                          : "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <TrendIcon trend={f.trend4w} />
                      {price?.score != null && (
                        <span className="rounded-md bg-[var(--color-neutral-soft)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-neutral)]">
                          Skor {price.score}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Metric
                      label="Yatırımcı"
                      value={f.latest != null ? formatCount(f.latest) : "—"}
                    />
                    <Metric
                      label="Haftalık Δ"
                      value={
                        f.weekDelta != null
                          ? `${f.weekDelta > 0 ? "+" : ""}${formatCount(f.weekDelta)}`
                          : "—"
                      }
                      tone={
                        (f.weekDelta ?? 0) > 0
                          ? "good"
                          : (f.weekDelta ?? 0) < 0
                            ? "bad"
                            : undefined
                      }
                    />
                    <Metric
                      label="Haftalık %"
                      value={
                        pct != null ? (
                          <span className="inline-flex items-center gap-1">
                            {formatPercent(pct)}
                            {f.magnitude === "strong" && (
                              <span className="text-[9px] uppercase text-[var(--color-brand-strong)]">
                                güçlü
                              </span>
                            )}
                          </span>
                        ) : (
                          "—"
                        )
                      }
                      tone={
                        (pct ?? 0) > 0
                          ? "good"
                          : (pct ?? 0) < 0
                            ? "bad"
                            : undefined
                      }
                    />
                    <div className="rounded-lg theme-inset border border-[var(--color-border)]/60 px-2.5 py-2 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
                        4h trend
                      </span>
                      <div className="mt-1 flex justify-end">
                        <Sparkline series={f.series} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg theme-inset border border-[var(--color-border)]/60 px-2.5 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </span>
      <p
        className={cn(
          "mt-1 text-sm font-bold tabular-nums",
          tone === "good" && "text-[var(--color-profit)]",
          tone === "bad" && "text-[var(--color-loss)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="card p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-black tabular-nums",
          tone === "good" && "text-[var(--color-profit)]",
          tone === "bad" && "text-[var(--color-loss)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function HighlightCard({
  title,
  symbol,
  pct,
  delta,
  tone,
}: {
  title: string;
  symbol?: string;
  pct?: number;
  delta?: number;
  tone: "good" | "bad";
}) {
  return (
    <div className="card p-3.5">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
        {title}
      </p>
      {symbol && pct != null ? (
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-lg font-bold">{symbol}</span>
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-bold tabular-nums",
                tone === "good"
                  ? "text-[var(--color-profit)]"
                  : "text-[var(--color-loss)]",
              )}
            >
              {formatPercent(pct)}
            </p>
            {delta != null && (
              <p className="text-[11px] text-[var(--color-muted)] tabular-nums">
                {delta > 0 ? "+" : ""}
                {formatCount(delta)} kişi
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-muted)]">Belirgin hareket yok</p>
      )}
    </div>
  );
}
