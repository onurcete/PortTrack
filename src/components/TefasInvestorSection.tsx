"use client";

import React, { useMemo, useState } from "react";
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
  Flame,
  Search,
  ChevronRight,
  ShieldAlert,
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
  const [viewMode, setViewMode] = useState<TefasViewMode>("TABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFund, setSelectedFund] = useState<TefasFundInvestorStats | null>(null);

  const { funds, risingCount, fallingCount, flatCount, topInflow, topOutflow } = tefasInvestors;

  // Filtered funds list by filter & search query
  const filteredFunds = useMemo(() => {
    return funds.filter((f) => {
      // Type filter
      if (filter === "RISING" && (f.weekDeltaPct ?? 0) <= 0.1) return false;
      if (filter === "FALLING" && (f.weekDeltaPct ?? 0) >= -0.1) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!f.symbol.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [funds, filter, searchQuery]);

  const totalFunds = funds.length;
  const risingPct = totalFunds > 0 ? (risingCount / totalFunds) * 100 : 0;
  const fallingPct = totalFunds > 0 ? (fallingCount / totalFunds) * 100 : 0;
  const flatPct = totalFunds > 0 ? (flatCount / totalFunds) * 100 : 0;

  // Total net investor influx across all portfolio TEFAS funds
  const totalNetDelta = useMemo(() => {
    return funds.reduce((acc, f) => acc + (f.weekDelta ?? 0), 0);
  }, [funds]);

  const topInflowFund = useMemo(() => {
    if (!topInflow) return null;
    return funds.find((f) => f.symbol === topInflow.symbol) ?? null;
  }, [funds, topInflow]);

  const topOutflowFund = useMemo(() => {
    if (!topOutflow) return null;
    return funds.find((f) => f.symbol === topOutflow.symbol) ?? null;
  }, [funds, topOutflow]);

  return (
    <section className="space-y-6 pt-4 border-t border-[var(--color-border)]/50">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center gap-1.5">
            <Users size={14} className="text-[var(--color-brand)]" />
            TEFAS Fon Akışı & Yatırımcı İntelligence
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)] mt-1">
            Haftalık Yatırımcı Sayısı Dinamikleri
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Portföyünüzdeki fonlara olan haftalık yatırımcı giriş/çıkış trendi ve piyasa ilgisi.
          </p>
        </div>

        {/* View Mode & Search Controls */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              placeholder="Fon Ara (örn: TCD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-all w-36 sm:w-44"
            />
          </div>

          {/* Grid / Table Switcher */}
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

      {/* 3-Card Interactive Bento Intelligence Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Yatırımcı Talebi & Sentiment Dağılımı */}
        <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <Users size={13} className="text-[var(--color-brand)]" />
              Genel Fon Talep Dengesi
            </span>
            <span
              className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-lg border tabular-nums",
                totalNetDelta >= 0
                  ? "bg-emerald-500/10 border-emerald-500/20 text-[var(--color-profit)]"
                  : "bg-rose-500/10 border-rose-500/20 text-[var(--color-loss)]"
              )}
            >
              Net {totalNetDelta >= 0 ? `+${formatNumber(totalNetDelta, 0)}` : formatNumber(totalNetDelta, 0)} Yatırımcı
            </span>
          </div>

          {/* Segmented Gradient Bar */}
          <div className="space-y-1.5">
            <div className="relative h-3 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${risingPct}%` }}
                title={`Artan: %${risingPct.toFixed(0)}`}
              />
              <div
                className="bg-amber-400/80 h-full transition-all duration-500"
                style={{ width: `${flatPct}%` }}
                title={`Nötr: %${flatPct.toFixed(0)}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${fallingPct}%` }}
                title={`Azalan: %${fallingPct.toFixed(0)}`}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-bold pt-0.5">
              <span className="text-[var(--color-profit)] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                {risingCount} Fon Artışta (%{risingPct.toFixed(0)})
              </span>
              <span className="text-[var(--color-loss)] flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                {fallingCount} Fon Azalışta (%{fallingPct.toFixed(0)})
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: En Yüksek Yatırımcı Girişi (Top Inflow) */}
        {topInflow ? (
          <div
            onClick={() => topInflowFund && setSelectedFund(topInflowFund)}
            className="card p-5 bg-gradient-to-br from-emerald-500/10 via-[var(--color-surface)] to-[var(--color-surface)] border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl shadow-xs transition-all cursor-pointer space-y-2 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-profit)]">
              <span className="flex items-center gap-1">
                <TrendingUp size={13} /> Haftanın Talep Lideri
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[var(--color-profit)] font-black text-[9px]">
                TOP GİRİŞ
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[var(--color-foreground)] tracking-tight group-hover:text-[var(--color-profit)] transition-colors">
                  {topInflow.symbol}
                </span>
                {topInflowFund?.latest != null && (
                  <span className="text-[10px] font-bold text-[var(--color-muted)]">
                    ({formatNumber(topInflowFund.latest, 0)} kişi)
                  </span>
                )}
              </div>
              <span className="text-sm font-black text-[var(--color-profit)] tabular-nums flex items-center gap-0.5">
                <ArrowUpRight size={14} />
                +{formatPercent(topInflow.weekDeltaPct)}
              </span>
            </div>

            <p className="text-xs text-[var(--color-muted)] font-medium">
              Haftalık net <strong className="text-[var(--color-profit)]">+{formatNumber(topInflow.weekDelta, 0)}</strong> yeni yatırımcı katıldı
            </p>
          </div>
        ) : (
          <div className="card p-5 border border-[var(--color-border)]/50 rounded-2xl flex items-center justify-center text-xs text-[var(--color-muted)]">
            Giriş verisi bulunmuyor
          </div>
        )}

        {/* Card 3: En Yüksek Yatırımcı Çıkışı (Top Outflow) */}
        {topOutflow ? (
          <div
            onClick={() => topOutflowFund && setSelectedFund(topOutflowFund)}
            className="card p-5 bg-gradient-to-br from-rose-500/10 via-[var(--color-surface)] to-[var(--color-surface)] border border-rose-500/30 hover:border-rose-500/60 rounded-2xl shadow-xs transition-all cursor-pointer space-y-2 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-loss)]">
              <span className="flex items-center gap-1">
                <TrendingDown size={13} /> En Yüksek Yatırımcı Çıkışı
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-[var(--color-loss)] font-black text-[9px]">
                TOP ÇIKIŞ
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-[var(--color-foreground)] tracking-tight group-hover:text-[var(--color-loss)] transition-colors">
                  {topOutflow.symbol}
                </span>
                {topOutflowFund?.latest != null && (
                  <span className="text-[10px] font-bold text-[var(--color-muted)]">
                    ({formatNumber(topOutflowFund.latest, 0)} kişi)
                  </span>
                )}
              </div>
              <span className="text-sm font-black text-[var(--color-loss)] tabular-nums flex items-center gap-0.5">
                <ArrowDownRight size={14} />
                {formatPercent(topOutflow.weekDeltaPct)}
              </span>
            </div>

            <p className="text-xs text-[var(--color-muted)] font-medium">
              Haftalık net <strong className="text-[var(--color-loss)]">{formatNumber(topOutflow.weekDelta, 0)}</strong> yatırımcı ayrıldı
            </p>
          </div>
        ) : (
          <div className="card p-5 border border-[var(--color-border)]/50 rounded-2xl flex items-center justify-center text-xs text-[var(--color-muted)]">
            Çıkış verisi bulunmuyor
          </div>
        )}
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {[
            { id: "ALL", label: `Tüm TEFAS Fonları (${totalFunds})` },
            { id: "RISING", label: `📈 Talep Artanlar (${risingCount})` },
            { id: "FALLING", label: `📉 Talep Azalanlar (${fallingCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as TefasFilter)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === tab.id
                  ? "bg-[var(--color-foreground)] text-white shadow-xs font-black"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)]/60 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-[var(--color-muted)] flex items-center gap-1 font-medium">
          <Info size={12} className="text-[var(--color-brand)]" />
          Grafiğini ve geçmişini görmek için fona tıklayın
        </span>
      </div>

      {/* Funds Content Display */}
      {filteredFunds.length === 0 ? (
        <div className="card p-8 text-center text-xs text-[var(--color-muted)] rounded-2xl">
          Seçilen filtreye veya arama kriterine uygun TEFAS fonu bulunamadı.
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
                className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)]/60 hover:border-[var(--color-brand)]/60 shadow-xs hover:shadow-md transition-all cursor-pointer rounded-2xl space-y-3 relative group"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-xs shadow-2xs">
                      {f.symbol}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-brand-strong)] transition-colors">
                        {f.symbol}
                      </h4>
                      <span className="text-[10px] text-[var(--color-muted)] font-bold">
                        TEFAS Fonu
                      </span>
                    </div>
                  </div>

                  {/* Trend Pill */}
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                      isRising
                        ? "bg-emerald-500/10 border-emerald-500/25 text-[var(--color-profit)]"
                        : isFalling
                        ? "bg-rose-500/10 border-rose-500/25 text-[var(--color-loss)]"
                        : "bg-[var(--color-surface-muted)] border-[var(--color-border)]/40 text-[var(--color-muted)]"
                    )}
                  >
                    {isRising ? <ArrowUpRight size={12} /> : isFalling ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                    {f.magnitude === "strong" ? (isRising ? "Güçlü Talep" : "Hızlı Çıkış") : (isRising ? "Talep Artışta" : isFalling ? "Zayıf Seyir" : "Dengeli")}
                  </span>
                </div>

                {/* Main Stats: Investor Count & Delta */}
                <div className="pt-2 border-t border-[var(--color-border)]/30 space-y-1">
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
                        {deltaCount > 0 ? `+${formatNumber(deltaCount, 0)}` : formatNumber(deltaCount, 0)}
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
                          <span className="font-black text-sm text-[var(--color-foreground)]">{f.symbol}</span>
                          <span className="text-[10px] font-bold text-[var(--color-muted)] px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)]">
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white font-black text-sm shadow-md">
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
