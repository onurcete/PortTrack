"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Grid,
  List,
  Info,
  Calendar,
  X,
  Zap,
} from "lucide-react";
import type { TefasInvestorSummary, TefasFundInvestorStats } from "@/lib/tefasInvestors";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

interface TefasInvestorSectionProps {
  tefasInvestors: TefasInvestorSummary;
  symbolNotes?: Map<string, string>;
}

type TefasFilter = "ALL" | "RISING" | "FALLING";
type TefasViewMode = "GRID" | "TABLE";

export function TefasInvestorSection({
  tefasInvestors,
  symbolNotes,
}: TefasInvestorSectionProps) {
  const [filter, setFilter] = useState<TefasFilter>("ALL");
  const [viewMode, setViewMode] = useState<TefasViewMode>("GRID");
  const [selectedFund, setSelectedFund] = useState<TefasFundInvestorStats | null>(null);

  const { funds, risingCount, fallingCount, flatCount, topInflow, topOutflow } = tefasInvestors;

  // Filtered funds list
  const filteredFunds = funds.filter((f) => {
    if (filter === "RISING") return (f.weekDeltaPct ?? 0) > 0.1;
    if (filter === "FALLING") return (f.weekDeltaPct ?? 0) < -0.1;
    return true;
  });

  const totalFunds = funds.length;
  const risingPct = totalFunds > 0 ? (risingCount / totalFunds) * 100 : 0;
  const fallingPct = totalFunds > 0 ? (fallingCount / totalFunds) * 100 : 0;
  const flatPct = totalFunds > 0 ? (flatCount / totalFunds) * 100 : 0;

  return (
    <section className="space-y-6 pt-6 border-t border-[var(--color-border)]/50">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center gap-1.5">
            <Users size={14} className="text-[var(--color-brand)]" />
            Fon Akış & Talep Analizi
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)] mt-1">
            TEFAS Haftalık Yatırımcı Sayısı Dinamikleri
          </h2>
        </div>

        {/* View Mode & Live Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--color-surface-muted)]/60 p-1 rounded-xl border border-[var(--color-border)]/50">
            <button
              type="button"
              onClick={() => setViewMode("GRID")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                viewMode === "GRID"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Grid size={13} /> Kartlar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                viewMode === "TABLE"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-2xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <List size={13} /> Tablo
            </button>
          </div>
        </div>
      </div>

      {/* Overview Analytics Bar (Glassmorphism Header) */}
      <div className="card p-6 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/20 to-[var(--color-brand-soft)]/15 border border-[var(--color-border)]/60 shadow-md rounded-2xl space-y-5">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sentiment Distribution Card */}
          <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-xl space-y-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
              Yatırımcı Talebi Dağılımı
            </span>
            
            {/* Visual Bar */}
            <div className="relative h-3 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex">
              <div
                className="bg-[var(--color-profit)] h-full transition-all duration-500"
                style={{ width: `${risingPct}%` }}
                title={`Artan: %${risingPct.toFixed(0)}`}
              />
              <div
                className="bg-amber-500/60 h-full transition-all duration-500"
                style={{ width: `${flatPct}%` }}
                title={`Nötr: %${flatPct.toFixed(0)}`}
              />
              <div
                className="bg-[var(--color-loss)] h-full transition-all duration-500"
                style={{ width: `${fallingPct}%` }}
                title={`Azalan: %${fallingPct.toFixed(0)}`}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-1">
              <span className="text-[var(--color-profit)] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--color-profit)]" />
                {risingCount} Fon Artışta (%{risingPct.toFixed(0)})
              </span>
              <span className="text-[var(--color-loss)] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[var(--color-loss)]" />
                {fallingCount} Fon Azalışta (%{fallingPct.toFixed(0)})
              </span>
            </div>
          </div>

          {/* Top Inflow Highlight Card */}
          {topInflow ? (
            <div className="card p-4 bg-gradient-to-br from-emerald-500/10 via-[var(--color-surface)] to-[var(--color-surface)] border border-emerald-500/30 rounded-xl space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)]">
                <span className="flex items-center gap-1">
                  <TrendingUp size={13} /> En Yüksek Yatırımcı Girişi
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[var(--color-profit)]">
                  HAFTALIK TOP
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-black text-[var(--color-foreground)] tracking-tight">
                  {topInflow.symbol}
                </span>
                <span className="text-sm font-black text-[var(--color-profit)] tabular-nums flex items-center gap-0.5">
                  <ArrowUpRight size={14} />
                  {formatPercent(topInflow.weekDeltaPct)}
                </span>
              </div>

              <p className="text-xs text-[var(--color-muted)] font-medium pt-0.5">
                Net <strong className="text-[var(--color-profit)]">+{formatNumber(topInflow.weekDelta, 0)}</strong> yeni kişi katıldı
              </p>
            </div>
          ) : (
            <div className="card p-4 border border-[var(--color-border)]/50 rounded-xl flex items-center justify-center text-xs text-[var(--color-muted)]">
              Giriş verisi yok
            </div>
          )}

          {/* Top Outflow Highlight Card */}
          {topOutflow ? (
            <div className="card p-4 bg-gradient-to-br from-rose-500/10 via-[var(--color-surface)] to-[var(--color-surface)] border border-rose-500/30 rounded-xl space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-loss)]">
                <span className="flex items-center gap-1">
                  <TrendingDown size={13} /> En Yüksek Yatırımcı Çıkışı
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[var(--color-loss)]">
                  HAFTALIK ÇIKIŞ
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-lg font-black text-[var(--color-foreground)] tracking-tight">
                  {topOutflow.symbol}
                </span>
                <span className="text-sm font-black text-[var(--color-loss)] tabular-nums flex items-center gap-0.5">
                  <ArrowDownRight size={14} />
                  {formatPercent(topOutflow.weekDeltaPct)}
                </span>
              </div>

              <p className="text-xs text-[var(--color-muted)] font-medium pt-0.5">
                Net <strong className="text-[var(--color-loss)]">{formatNumber(topOutflow.weekDelta, 0)}</strong> kişi ayrıldı
              </p>
            </div>
          ) : (
            <div className="card p-4 border border-[var(--color-border)]/50 rounded-xl flex items-center justify-center text-xs text-[var(--color-muted)]">
              Çıkış verisi yok
            </div>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border)]/40">
          <div className="flex items-center gap-1.5">
            {[
              { id: "ALL", label: `Tüm Fonlar (${totalFunds})` },
              { id: "RISING", label: `📈 Talep Artanlar (${risingCount})` },
              { id: "FALLING", label: `📉 Talep Azalanlar (${fallingCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as TefasFilter)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                  filter === tab.id
                    ? "bg-[var(--color-brand)] text-white shadow-xs"
                    : "bg-[var(--color-surface)] border border-[var(--color-border)]/50 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-[var(--color-muted)] flex items-center gap-1">
            <Info size={12} /> Detaylar için fon kartlarına tıklayın
          </span>
        </div>
      </div>

      {/* Funds Content Display */}
      {filteredFunds.length === 0 ? (
        <div className="card p-8 text-center text-xs text-[var(--color-muted)] rounded-2xl">
          Seçilen filtreye uygun TEFAS fonu bulunamadı.
        </div>
      ) : viewMode === "GRID" ? (
        /* Rich Interactive Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredFunds.map((f) => {
            const isRising = (f.weekDeltaPct ?? 0) > 0;
            const isFalling = (f.weekDeltaPct ?? 0) < 0;
            const deltaCount = f.weekDelta ?? 0;
            const note = symbolNotes?.get(f.symbol);

            return (
              <div
                key={f.symbol}
                onClick={() => setSelectedFund(f)}
                className="card p-4 border border-[var(--color-border)]/60 hover:border-[var(--color-brand)]/50 shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl space-y-3 relative group"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs shadow-2xs">
                      {f.symbol}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-[var(--color-foreground)] group-hover:text-[var(--color-brand-strong)] transition-colors">
                        {f.symbol}
                      </h4>
                      <span className="text-[10px] text-[var(--color-muted)] font-medium">
                        TEFAS Yatırımcı Fonu
                      </span>
                    </div>
                  </div>

                  {/* Trend Pill */}
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1",
                      isRising
                        ? "bg-emerald-500/10 border-emerald-500/20 text-[var(--color-profit)]"
                        : isFalling
                        ? "bg-rose-500/10 border-rose-500/20 text-[var(--color-loss)]"
                        : "bg-[var(--color-surface-muted)] border-[var(--color-border)]/40 text-[var(--color-muted)]"
                    )}
                  >
                    {isRising ? <ArrowUpRight size={12} /> : isFalling ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                    {f.magnitude === "strong" ? (isRising ? "Güçlü Talep" : "Hızlı Çıkış") : (isRising ? "Talep Artışta" : isFalling ? "Zayıf Seyir" : "Dengeli")}
                  </span>
                </div>

                {/* Main Stats: Investor Count & Delta */}
                <div className="pt-2 border-t border-[var(--color-border)]/40 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                      Toplam Yatırımcı
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                      Haftalık Değişim
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline tabular-nums">
                    <div className="text-xl font-black text-[var(--color-foreground)] tracking-tight">
                      {f.latest != null ? `${formatNumber(f.latest, 0)}` : "—"}
                      <span className="text-xs font-medium text-[var(--color-muted)] ml-1">kişi</span>
                    </div>

                    <div
                      className={cn(
                        "text-xs font-black flex items-center gap-1",
                        isRising ? "text-[var(--color-profit)]" : isFalling ? "text-[var(--color-loss)]" : "text-[var(--color-muted)]"
                      )}
                    >
                      <span>
                        {deltaCount > 0 ? `+${formatNumber(deltaCount, 0)}` : formatNumber(deltaCount, 0)} kişi
                      </span>
                      <span>({f.weekDeltaPct != null ? formatPercent(f.weekDeltaPct) : "—"})</span>
                    </div>
                  </div>
                </div>

                {/* AI / Note snippet if present */}
                {note && (
                  <p className="text-[11px] text-[var(--color-foreground)]/80 bg-[var(--color-surface-muted)]/30 p-2 rounded-lg border border-[var(--color-border)]/30 line-clamp-2">
                    {note}
                  </p>
                )}

                {/* Detailed Area Sparkline Chart */}
                <div className="pt-1">
                  <RichAreaSparkline series={f.series} isRising={isRising} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Modern Analytical Table View */
        <div className="card border border-[var(--color-border)]/60 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] font-extrabold uppercase tracking-wider border-b border-[var(--color-border)]/50">
                <tr>
                  <th className="p-3.5">Fon Kodu</th>
                  <th className="p-3.5 text-right">Toplam Yatırımcı</th>
                  <th className="p-3.5 text-right">Haftalık Değişim (Kişi)</th>
                  <th className="p-3.5 text-right">Haftalık Değişim (%)</th>
                  <th className="p-3.5 text-center">4 Haftalık Eğilim</th>
                  <th className="p-3.5 text-right">Trend Grafiği</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/40 font-medium">
                {filteredFunds.map((f) => {
                  const isRising = (f.weekDeltaPct ?? 0) > 0;
                  const isFalling = (f.weekDeltaPct ?? 0) < 0;
                  return (
                    <tr
                      key={f.symbol}
                      onClick={() => setSelectedFund(f)}
                      className="hover:bg-[var(--color-surface-muted)]/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-[var(--color-foreground)]">{f.symbol}</span>
                          <span className="text-[10px] text-[var(--color-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)]">
                            TEFAS
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-extrabold tabular-nums text-[var(--color-foreground)] text-sm">
                        {f.latest != null ? `${formatNumber(f.latest, 0)} kişi` : "—"}
                      </td>
                      <td
                        className={cn(
                          "p-3.5 text-right font-bold tabular-nums",
                          isRising ? "text-[var(--color-profit)]" : isFalling ? "text-[var(--color-loss)]" : ""
                        )}
                      >
                        {f.weekDelta != null ? (f.weekDelta > 0 ? `+${formatNumber(f.weekDelta, 0)}` : formatNumber(f.weekDelta, 0)) : "—"}
                      </td>
                      <td
                        className={cn(
                          "p-3.5 text-right font-black tabular-nums",
                          isRising ? "text-[var(--color-profit)]" : isFalling ? "text-[var(--color-loss)]" : ""
                        )}
                      >
                        {f.weekDeltaPct != null ? formatPercent(f.weekDeltaPct) : "—"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            isRising
                              ? "bg-emerald-500/10 border-emerald-500/20 text-[var(--color-profit)]"
                              : isFalling
                              ? "bg-rose-500/10 border-rose-500/20 text-[var(--color-loss)]"
                              : "bg-[var(--color-surface-muted)] border-[var(--color-border)]/40 text-[var(--color-muted)]"
                          )}
                        >
                          {isRising ? <ArrowUpRight size={12} /> : isFalling ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                          {f.trend4w.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <RichAreaSparkline series={f.series} isRising={isRising} width={90} height={28} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fund Investor Detail Modal */}
      {selectedFund && (
        <TefasFundDetailModal
          fund={selectedFund}
          onClose={() => setSelectedFund(null)}
        />
      )}
    </section>
  );
}

/** Modern Area Sparkline with gradient fill */
function RichAreaSparkline({
  series,
  isRising,
  width = 180,
  height = 42,
}: {
  series: { date: string; investors: number }[];
  isRising: boolean;
  width?: number;
  height?: number;
}) {
  if (!series || series.length < 2) {
    return <div className="h-10 w-full rounded bg-[var(--color-surface-muted)]/30" />;
  }

  const values = series.map((s) => s.investors);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const polylinePts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPts = `0,${height} ${polylinePts} ${width},${height}`;

  const strokeColor = isRising ? "#16a34a" : "#e11d48";
  const gradientId = `tefas-grad-${isRising ? "up" : "down"}-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <div className="w-full flex items-center justify-center">
      <svg width={width} height={height} className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Filled Gradient Area */}
        <polygon points={areaPts} fill={`url(#${gradientId})`} />

        {/* Main Trend Line */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePts}
        />

        {/* End Point Marker */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill={strokeColor}
            className="animate-ping"
          />
        )}
      </svg>
    </div>
  );
}

/** Detail Modal for TEFAS Fund Investor History */
function TefasFundDetailModal({
  fund,
  onClose,
}: {
  fund: TefasFundInvestorStats;
  onClose: () => void;
}) {
  const { symbol, latest, priorWeek, weekDelta, weekDeltaPct, series, trend4w } = fund;
  const isRising = (weekDeltaPct ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm shadow-md">
              {symbol}
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-[var(--color-foreground)]">
                {symbol} Fon Detayları
              </h3>
              <p className="text-xs text-[var(--color-muted)]">TEFAS Yatırımcı Geçmişi & Trend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Key Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 border border-[var(--color-border)]/50 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                Mevcut Yatırımcı
              </span>
              <div className="text-xl font-black text-[var(--color-foreground)] tabular-nums">
                {latest != null ? `${formatNumber(latest, 0)}` : "—"}
                <span className="text-xs text-[var(--color-muted)] font-normal ml-1">kişi</span>
              </div>
            </div>

            <div className="card p-4 border border-[var(--color-border)]/50 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                Haftalık Değişim
              </span>
              <div
                className={cn(
                  "text-xl font-black tabular-nums flex items-center gap-1",
                  isRising ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
                )}
              >
                {isRising ? "+" : ""}{weekDeltaPct != null ? formatPercent(weekDeltaPct) : "—"}
                <span className="text-xs font-bold">
                  ({weekDelta != null && weekDelta > 0 ? `+${formatNumber(weekDelta, 0)}` : formatNumber(weekDelta ?? 0, 0)})
                </span>
              </div>
            </div>
          </div>

          {/* Large Sparkline Chart */}
          <div className="card p-4 border border-[var(--color-border)]/50 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-[var(--color-foreground)]">Son 28 Günlük Yatırımcı Sayısı Grafiği</span>
              <span className="text-[10px] text-[var(--color-muted)]">4-Haftalık Trend: <strong className="text-[var(--color-foreground)]">{trend4w.toUpperCase()}</strong></span>
            </div>
            <RichAreaSparkline series={series} isRising={isRising} width={420} height={70} />
          </div>

          {/* Investor Date History Table */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
              <Calendar size={13} /> Günlük Kayıtlı Veri Noktaları
            </span>

            <div className="card border border-[var(--color-border)]/50 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--color-surface-muted)]/60 text-[var(--color-muted)] font-extrabold border-b border-[var(--color-border)]/40 sticky top-0">
                  <tr>
                    <th className="p-2.5">Tarih</th>
                    <th className="p-2.5 text-right">Yatırımcı Sayısı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/30 tabular-nums">
                  {[...series].reverse().map((pt, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-surface-muted)]/30">
                      <td className="p-2 text-[var(--color-muted)]">
                        {new Date(pt.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </td>
                      <td className="p-2 text-right font-extrabold text-[var(--color-foreground)]">
                        {formatNumber(pt.investors, 0)} kişi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/20 flex justify-end">
          <button onClick={onClose} className="btn btn-outline text-xs">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
