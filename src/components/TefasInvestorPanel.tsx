"use client";

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

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
          <Users size={15} className="text-[var(--color-brand)]" />
          <h3 className="text-sm font-semibold">Fon yatırımcı detayı</h3>
          <span className="text-[10px] text-[var(--color-muted)] ml-auto">
            Haftalık değişim · 4 haftalık yön
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="theme-table-head text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Fon</th>
                <th className="px-3 py-2.5 text-right font-semibold">Fiyat</th>
                <th className="px-3 py-2.5 text-right font-semibold">Yatırımcı</th>
                <th className="px-3 py-2.5 text-right font-semibold">Hf. Δ</th>
                <th className="px-3 py-2.5 text-right font-semibold">Hf. %</th>
                <th className="px-3 py-2.5 text-center font-semibold">4h</th>
                <th className="px-3 py-2.5 text-right font-semibold">Trend</th>
                <th className="px-3 py-2.5 text-right font-semibold">Skor</th>
              </tr>
            </thead>
            <tbody>
              {summary.funds.map((f) => {
                const price = priceBySymbol.get(f.symbol);
                const pct = f.weekDeltaPct;
                return (
                  <tr
                    key={f.symbol}
                    className="border-b border-[var(--color-border)] last:border-0 theme-surface-hover"
                  >
                    <td className="px-4 py-2.5 font-bold">{f.symbol}</td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums text-xs",
                        (price?.dailyChangePct ?? 0) > 0 &&
                          "text-[var(--color-profit)]",
                        (price?.dailyChangePct ?? 0) < 0 &&
                          "text-[var(--color-loss)]",
                      )}
                    >
                      {price?.dailyChangePct != null
                        ? formatPercent(price.dailyChangePct)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {f.latest != null ? formatCount(f.latest) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums text-xs",
                        (f.weekDelta ?? 0) > 0 && "text-[var(--color-profit)]",
                        (f.weekDelta ?? 0) < 0 && "text-[var(--color-loss)]",
                      )}
                    >
                      {f.weekDelta != null
                        ? `${f.weekDelta > 0 ? "+" : ""}${formatCount(f.weekDelta)}`
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 text-right tabular-nums text-xs font-semibold",
                        (pct ?? 0) > 0 && "text-[var(--color-profit)]",
                        (pct ?? 0) < 0 && "text-[var(--color-loss)]",
                      )}
                    >
                      {pct != null ? formatPercent(pct) : "—"}
                      {f.magnitude === "strong" && (
                        <span className="ml-1 text-[9px] uppercase text-[var(--color-brand-strong)]">
                          güçlü
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <TrendIcon trend={f.trend4w} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Sparkline series={f.series} />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-[var(--color-muted)]">
                      {price?.score != null ? price.score : "—"}
                    </td>
                  </tr>
                );
              })}
              {summary.funds.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-[var(--color-muted)]"
                  >
                    TEFAS yatırımcı verisi bulunamadı. Fiyatları güncelleyin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
