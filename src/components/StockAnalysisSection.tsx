"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Grid,
  List,
  Search,
  Flame,
  Target,
  Coins,
  BarChart3,
  Building2,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import type { StockAnalysisSummary, StockAnalysisItem } from "@/lib/stockAnalysis";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

function fmt(val: number | null | undefined, decimals = 2): string {
  if (val == null || !Number.isFinite(val)) return "—";
  return formatNumber(val, decimals);
}

interface StockAnalysisSectionProps {
  summary: StockAnalysisSummary;
}

type StockFilter = "ALL" | "DISCOUNT" | "HIGH_VOLUME" | "DIVIDEND" | "BUY_RATED";
type StockViewMode = "TABLE" | "GRID";

export function StockAnalysisSection({ summary }: StockAnalysisSectionProps) {
  const [filter, setFilter] = useState<StockFilter>("ALL");
  const [viewMode, setViewMode] = useState<StockViewMode>("TABLE");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    stocks,
    assetType,
    totalValueTRY,
    totalValueUSD,
    weightedPe,
    weightedPb,
    topDiscount,
    volumeLeader,
    topDividend,
    highVolumeCount,
    avgDiscountFromHigh,
  } = summary;

  const isTRY = assetType === "BIST";
  const currencySymbol = isTRY ? "₺" : "$";

  // Filter & Search
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      // Type filter
      if (filter === "DISCOUNT" && (s.discountFromHighPct == null || s.discountFromHighPct > -12)) {
        return false;
      }
      if (filter === "HIGH_VOLUME" && !s.isHighVolume) {
        return false;
      }
      if (filter === "DIVIDEND" && (s.dividendYield == null || s.dividendYield <= 0.5)) {
        return false;
      }
      if (
        filter === "BUY_RATED" &&
        (!s.recommendation || !s.recommendation.toLowerCase().includes("buy"))
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchSymbol = s.symbol.toLowerCase().includes(q);
        const matchName = s.name.toLowerCase().includes(q);
        if (!matchSymbol && !matchName) return false;
      }

      return true;
    });
  }, [stocks, filter, searchQuery]);

  return (
    <section className="space-y-6 pt-4 border-t border-[var(--color-border)]/50">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center gap-1.5">
            <Building2 size={14} className="text-[var(--color-brand)]" />
            {isTRY ? "BIST 100 & Hisse Senedi İstihbaratı" : "Yabancı Hisse & Wall Street İstihbaratı"}
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)] mt-1">
            {isTRY ? "BIST 52H İskonto, Hacim & Çarpan Dinamikleri" : "Yabancı Hisseler: Değerleme & Hedef Fiyat Dinamikleri"}
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Portföyünüzdeki {stocks.length} hissenin 52 haftalık zirve/dip mesafeleri, piyasa hacmi ve temel çarpanları.
          </p>
        </div>

        {/* View Mode & Search Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-36 sm:w-48 pl-8 pr-3 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-hidden focus:border-[var(--color-brand)] transition-colors"
            />
          </div>

          <div className="flex items-center bg-[var(--color-surface-muted)] p-0.5 rounded-xl border border-[var(--color-border)]">
            <button
              onClick={() => setViewMode("TABLE")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "TABLE"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
              title="Tablo Görünümü"
            >
              <List size={15} />
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "GRID"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-xs"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
              title="Kart Görünümü"
            >
              <Grid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Ana KPI Özet Kartı */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. En Çok İskontolu Hisse */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
              En Yüksek İskonto
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Target size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            {topDiscount ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-emerald-500 tabular-nums">
                    %{Math.abs(topDiscount.discountFromHighPct ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-foreground)] truncate max-w-[90px]">
                    {topDiscount.symbol}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                  52H Zirve: {fmt(topDiscount.high52, 2)} {currencySymbol} (Fiyat: {fmt(topDiscount.price, 2)} {currencySymbol})
                </p>
              </>
            ) : (
              <span className="text-sm font-semibold text-[var(--color-muted)]">—</span>
            )}
          </div>
        </div>

        {/* 2. Hacim Lideri */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
              Hacim Patlaması
            </span>
            <div className="h-7 w-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Flame size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            {volumeLeader && volumeLeader.relativeVolume ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-orange-500 tabular-nums">
                    {volumeLeader.relativeVolume.toFixed(1)}x
                  </span>
                  <span className="text-xs font-bold text-[var(--color-foreground)] truncate max-w-[90px]">
                    {volumeLeader.symbol}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                  3A ortalamasının {volumeLeader.relativeVolume.toFixed(1)} katı işlem görüyor
                </p>
              </>
            ) : (
              <>
                <span className="text-xl font-black text-[var(--color-foreground)]">
                  {highVolumeCount} Hisse
                </span>
                <p className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                  Yüksek hacimle işlem gören
                </p>
              </>
            )}
          </div>
        </div>

        {/* 3. Temettü Şampiyonu */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
              Temettü Şampiyonu
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Coins size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            {topDividend ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-amber-500 tabular-nums">
                    %{topDividend.dividendYield?.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-foreground)] truncate max-w-[90px]">
                    {topDividend.symbol}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
                  {topDividend.dividendRate ? `Hisse Başı: ${fmt(topDividend.dividendRate, 2)} ${currencySymbol}` : "Yıllık nakit temettü verimi"}
                </p>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-[var(--color-muted)]">Veri Yok</span>
                <p className="text-[11px] text-[var(--color-muted)] mt-1">Portföyde temettülü hisse yok</p>
              </>
            )}
          </div>
        </div>

        {/* 4. Ağırlıklı Portföy F/K & PD/DD */}
        <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-wider">
              Portföy Çarpanları
            </span>
            <div className="h-7 w-7 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center">
              <BarChart3 size={15} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[var(--color-foreground)] tabular-nums">
                {weightedPe ? `${weightedPe}x` : "—"}
              </span>
              <span className="text-xs font-bold text-[var(--color-muted)]">
                F/K {weightedPb ? `• ${weightedPb}x PD/DD` : ""}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-muted)] mt-1 truncate">
              Ağırlıklı hisse değerleme çarpanı
            </p>
          </div>
        </div>
      </div>

      {/* Filtre Rozetleri */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
            filter === "ALL"
              ? "bg-[var(--color-foreground)] text-[var(--color-surface)] shadow-xs"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          )}
        >
          Tümü ({stocks.length})
        </button>
        <button
          onClick={() => setFilter("DISCOUNT")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            filter === "DISCOUNT"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-emerald-500"
          )}
        >
          <Target size={13} />
          🎯 İskontolular (Zirveden %12+ Düşen)
        </button>
        <button
          onClick={() => setFilter("HIGH_VOLUME")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            filter === "HIGH_VOLUME"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-orange-500"
          )}
        >
          <Flame size={13} />
          🔥 Yüksek Hacimliler ({highVolumeCount})
        </button>
        <button
          onClick={() => setFilter("DIVIDEND")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            filter === "DIVIDEND"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-amber-500"
          )}
        >
          <Coins size={13} />
          💰 Temettü Verenler
        </button>
        <button
          onClick={() => setFilter("BUY_RATED")}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
            filter === "BUY_RATED"
              ? "bg-[var(--color-brand)] text-white shadow-xs"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-brand)]"
          )}
        >
          <Sparkles size={13} />
          🚀 Analist "Al" Verenler
        </button>
      </div>

      {/* Tablo Görünümü */}
      {viewMode === "TABLE" ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 text-[10.5px] uppercase font-bold text-[var(--color-muted)] tracking-wider">
                  <th className="py-3 px-4">Hisse & Şirket</th>
                  <th className="py-3 px-3 text-right">Fiyat</th>
                  <th className="py-3 px-4 min-w-[200px]">52 Haftalık Aralık (Termometre)</th>
                  <th className="py-3 px-3 text-right">Zirve İskontosu</th>
                  <th className="py-3 px-3 text-right">F/K</th>
                  <th className="py-3 px-3 text-right">PD/DD</th>
                  <th className="py-3 px-3 text-right">Temettü</th>
                  <th className="py-3 px-3 text-center">Hacim Durumu</th>
                  <th className="py-3 px-4 text-right">Portföy Payı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50 font-medium">
                {filteredStocks.map((stock) => {
                  const isDailyUp = (stock.dailyChangePct ?? 0) > 0.001;
                  const isDailyDown = (stock.dailyChangePct ?? 0) < -0.001;

                  // 52 Hafta Termometre pozisyonu (0% - 100%)
                  let rangeProgress = 50;
                  if (stock.high52 && stock.low52 && stock.high52 > stock.low52) {
                    rangeProgress = Math.min(
                      100,
                      Math.max(
                        0,
                        ((stock.price - stock.low52) / (stock.high52 - stock.low52)) * 100
                      )
                    );
                  }

                  return (
                    <tr
                      key={stock.symbol}
                      className="hover:bg-[var(--color-surface-muted)]/30 transition-colors group"
                    >
                      {/* 1. Hisse Adı & Sembol */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-black text-xs flex items-center justify-center shrink-0">
                            {stock.symbol.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[var(--color-foreground)] text-xs">
                                {stock.symbol}
                              </span>
                              {stock.recommendation && stock.recommendation.toLowerCase().includes("buy") && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Al
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[150px]">
                              {stock.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Fiyat & Günlük Değişim */}
                      <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-bold text-[var(--color-foreground)]">
                          {formatNumber(stock.price, 2)} {currencySymbol}
                        </div>
                        {stock.dailyChangePct != null && (
                          <div
                            className={cn(
                              "text-[10px] font-bold flex items-center justify-end gap-0.5",
                              isDailyUp
                                ? "text-emerald-500"
                                : isDailyDown
                                ? "text-rose-500"
                                : "text-[var(--color-muted)]"
                            )}
                          >
                            {isDailyUp ? "+" : ""}
                            {formatPercent(stock.dailyChangePct, 2)}
                          </div>
                        )}
                      </td>

                      {/* 3. 52 Haftalık Termometre */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        {stock.high52 && stock.low52 ? (
                          <div className="space-y-1">
                            <div className="relative h-2 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                                style={{ width: "100%" }}
                              />
                              {/* Gösterge Noktası */}
                              <div
                                className="absolute top-0 bottom-0 w-2 -ml-1 rounded-full bg-white shadow-md border border-slate-900"
                                style={{ left: `${rangeProgress}%` }}
                                title={`Mevcut konum: %${rangeProgress.toFixed(0)}`}
                              />
                            </div>
                            <div className="flex justify-between text-[9.5px] font-semibold text-[var(--color-muted)] tabular-nums">
                              <span>Dip: {fmt(stock.low52, 1)}</span>
                              <span>Zirve: {fmt(stock.high52, 1)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* 4. Zirve İskontosu */}
                      <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {stock.discountFromHighPct != null ? (
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-lg text-[11px] font-bold",
                              stock.discountFromHighPct <= -15
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : stock.discountFromHighPct <= -5
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
                            )}
                          >
                            %{Math.abs(stock.discountFromHighPct).toFixed(1)} İskonto
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* 5. F/K (P/E) */}
                      <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {stock.pe != null && stock.pe > 0 ? (
                          <span className="font-bold text-[var(--color-foreground)]">
                            {stock.pe.toFixed(1)}x
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* 6. PD/DD (P/B) */}
                      <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {stock.pb != null && stock.pb > 0 ? (
                          <span className="font-bold text-[var(--color-foreground)]">
                            {stock.pb.toFixed(1)}x
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* 7. Temettü Verimi */}
                      <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {stock.dividendYield != null && stock.dividendYield > 0 ? (
                          <span className="font-extrabold text-amber-500">
                            %{stock.dividendYield.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* 8. Hacim Durumu */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {stock.relativeVolume != null && stock.relativeVolume > 0 ? (
                          stock.isHighVolume ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-extrabold bg-orange-500/15 text-orange-600 dark:text-orange-400">
                              <Flame size={12} />
                              {stock.relativeVolume.toFixed(1)}x Hacim
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-[var(--color-muted)]">
                              {stock.relativeVolume.toFixed(1)}x (Normal)
                            </span>
                          )
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>

                      {/* 9. Portföy Payı & Tutarı */}
                      <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap">
                        <div className="font-extrabold text-[var(--color-foreground)]">
                          {formatNumber(isTRY ? stock.valueTRY : stock.valueUSD, 0)} {currencySymbol}
                        </div>
                        <div className="text-[10px] font-bold text-[var(--color-muted)]">
                          %{stock.weightPct.toFixed(1)} Pay
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kart (Grid) Görünümü */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStocks.map((stock) => {
            const isDailyUp = (stock.dailyChangePct ?? 0) > 0.001;
            const isDailyDown = (stock.dailyChangePct ?? 0) < -0.001;

            let rangeProgress = 50;
            if (stock.high52 && stock.low52 && stock.high52 > stock.low52) {
              rangeProgress = Math.min(
                100,
                Math.max(0, ((stock.price - stock.low52) / (stock.high52 - stock.low52)) * 100)
              );
            }

            return (
              <div
                key={stock.symbol}
                className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--color-border-strong)] transition-colors"
              >
                {/* Kart Başlığı */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-black text-xs flex items-center justify-center shrink-0">
                      {stock.symbol.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm text-[var(--color-foreground)]">
                          {stock.symbol}
                        </h3>
                        {stock.isHighVolume && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-500 flex items-center gap-0.5">
                            <Flame size={10} /> Hacim
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-muted)] truncate max-w-[160px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[var(--color-foreground)] tabular-nums">
                      {formatNumber(stock.price, 2)} {currencySymbol}
                    </div>
                    {stock.dailyChangePct != null && (
                      <span
                        className={cn(
                          "text-[10.5px] font-bold tabular-nums",
                          isDailyUp
                            ? "text-emerald-500"
                            : isDailyDown
                            ? "text-rose-500"
                            : "text-[var(--color-muted)]"
                        )}
                      >
                        {isDailyUp ? "+" : ""}
                        {formatPercent(stock.dailyChangePct, 2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 52 Haftalık Termometre Barı */}
                {stock.high52 && stock.low52 && (
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/50">
                    <div className="flex items-center justify-between text-[10.5px] font-bold">
                      <span className="text-[var(--color-muted)]">52 Haftalık Aralık</span>
                      {stock.discountFromHighPct != null && (
                        <span className="text-emerald-500">
                          %{Math.abs(stock.discountFromHighPct).toFixed(1)} İskontolu
                        </span>
                      )}
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                        style={{ width: "100%" }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-2 -ml-1 rounded-full bg-white shadow-md border border-slate-900"
                        style={{ left: `${rangeProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9.5px] font-semibold text-[var(--color-muted)] tabular-nums">
                      <span>Dip: {fmt(stock.low52, 1)}</span>
                      <span>Zirve: {fmt(stock.high52, 1)}</span>
                    </div>
                  </div>
                )}

                {/* Rasyolar Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[var(--color-border)]/40">
                  <div className="p-1.5 rounded-lg bg-[var(--color-surface-muted)]/30">
                    <p className="text-[9.5px] font-bold text-[var(--color-muted)]">F/K</p>
                    <p className="text-xs font-black text-[var(--color-foreground)] tabular-nums">
                      {stock.pe ? `${stock.pe.toFixed(1)}x` : "—"}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[var(--color-surface-muted)]/30">
                    <p className="text-[9.5px] font-bold text-[var(--color-muted)]">PD/DD</p>
                    <p className="text-xs font-black text-[var(--color-foreground)] tabular-nums">
                      {stock.pb ? `${stock.pb.toFixed(1)}x` : "—"}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[var(--color-surface-muted)]/30">
                    <p className="text-[9.5px] font-bold text-[var(--color-muted)]">Temettü</p>
                    <p className="text-xs font-black text-amber-500 tabular-nums">
                      {stock.dividendYield ? `%${stock.dividendYield.toFixed(1)}` : "—"}
                    </p>
                  </div>
                </div>

                {/* Alt Kısım: Portföy Değeri & Ağırlık */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--color-border)]/40">
                  <span className="text-[11px] text-[var(--color-muted)]">Portföy Tutarı</span>
                  <div className="text-right">
                    <span className="font-extrabold text-[var(--color-foreground)] tabular-nums">
                      {formatNumber(isTRY ? stock.valueTRY : stock.valueUSD, 0)} {currencySymbol}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-muted)] ml-1.5">
                      (%{stock.weightPct.toFixed(1)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hiç Eşleşen Sonuç Bulunamadı */}
      {filteredStocks.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-sm font-bold text-[var(--color-foreground)]">Seçili filtrelerle eşleşen hisse bulunamadı.</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Filtreleri sıfırlayarak veya arama terimini değiştirerek tekrar deneyin.</p>
          <button
            onClick={() => {
              setFilter("ALL");
              setSearchQuery("");
            }}
            className="mt-3 px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--color-brand)] text-white cursor-pointer"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}
    </section>
  );
}
