"use client";

import React from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Zap,
  BarChart2,
  Sliders,
  ShieldAlert,
} from "lucide-react";
import { ASSET_META } from "@/lib/assets";
import { formatMoney, formatNumber, formatPercent, cn } from "@/lib/utils";
import type { HoldingDTO } from "@/lib/analysisData";

interface TechnicalDetailModalProps {
  holding: HoldingDTO | null;
  onClose: () => void;
}

export function TechnicalDetailModal({
  holding,
  onClose,
}: TechnicalDetailModalProps) {
  if (!holding) return null;

  const { symbol, assetType, name, currentPriceNative, nativeCurrency, dailyChangePct, weightPct, analysis } = holding;
  const ind = analysis?.indicators;
  const score = analysis?.score ?? null;

  const rsi = ind?.rsi14 ?? null;
  const macd = ind?.macd ?? null;
  const macdSignal = ind?.macdSignal ?? null;
  const macdHist = ind?.macdHistogram ?? null;
  const sma20 = ind?.sma20 ?? null;
  const sma50 = ind?.sma50 ?? null;
  const sma200 = ind?.sma200 ?? null;
  const currentPrice = ind?.currentPrice ?? currentPriceNative ?? 0;
  const high52w = ind?.high52w ?? null;
  const low52w = ind?.low52w ?? null;
  const bollUpper = ind?.bollingerUpper ?? null;
  const bollMiddle = ind?.bollingerMiddle ?? null;
  const bollLower = ind?.bollingerLower ?? null;

  // 52W range % calculations
  let range52Pct = 50;
  if (high52w !== null && low52w !== null && high52w > low52w) {
    range52Pct = Math.min(100, Math.max(0, ((currentPrice - low52w) / (high52w - low52w)) * 100));
  }

  // Bollinger position %
  let bollPosPct = 50;
  if (bollUpper !== null && bollLower !== null && bollUpper > bollLower) {
    bollPosPct = Math.min(100, Math.max(0, ((currentPrice - bollLower) / (bollUpper - bollLower)) * 100));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)]/50 bg-gradient-to-r from-[var(--color-surface)] to-[var(--color-surface-muted)]/40">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-extrabold text-sm shadow-xs"
              style={{ backgroundColor: ASSET_META[assetType]?.color ?? "#6366f1" }}
            >
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-extrabold tracking-tight text-[var(--color-foreground)]">
                  {symbol}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-surface-muted)] text-[var(--color-muted)] border border-[var(--color-border)]/40">
                  {ASSET_META[assetType]?.label ?? assetType}
                </span>
                <span className="text-xs font-medium text-[var(--color-muted)]">
                  Ağırlık: %{weightPct.toFixed(1)}
                </span>
              </div>
              {name && (
                <p className="text-xs text-[var(--color-muted)] truncate max-w-sm mt-0.5">
                  {name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              {currentPrice > 0 && (
                <div className="text-lg font-black tracking-tight tabular-nums text-[var(--color-foreground)]">
                  {formatMoney(currentPrice, nativeCurrency)}
                </div>
              )}
              {dailyChangePct != null && (
                <div
                  className={cn(
                    "text-xs font-extrabold tabular-nums flex items-center justify-end gap-0.5",
                    dailyChangePct > 0 ? "text-[var(--color-profit)]" : dailyChangePct < 0 ? "text-[var(--color-loss)]" : "text-[var(--color-muted)]"
                  )}
                >
                  {dailyChangePct > 0 ? <TrendingUp size={12} /> : dailyChangePct < 0 ? <TrendingDown size={12} /> : null}
                  {formatPercent(dailyChangePct)}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Score Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Score Ring / Card */}
            <div className="card p-4 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--color-surface-muted)]/20 to-[var(--color-surface-muted)]/5 border border-[var(--color-border)]/60 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                Teknik Skor
              </span>
              <div
                className={cn(
                  "text-3xl font-black tabular-nums my-1",
                  score !== null && score >= 65
                    ? "text-[var(--color-profit)]"
                    : score !== null && score <= 35
                    ? "text-[var(--color-loss)]"
                    : "text-[var(--color-brand-strong)]"
                )}
              >
                {score ?? "—"}
                <span className="text-xs text-[var(--color-muted)] font-normal">/100</span>
              </div>
              <span className="text-[10px] font-semibold text-[var(--color-muted)]">
                {score !== null ? (score >= 70 ? "Güçlü Teknik" : score >= 40 ? "Nötr Görünüm" : "Zayıf Görünüm") : "Veri Yok"}
              </span>
            </div>

            {/* Trend Signal */}
            <div className="card p-4 flex flex-col justify-center border border-[var(--color-border)]/60">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1 mb-1">
                <Activity size={12} className="text-[var(--color-brand-strong)]" />
                Ana Trend
              </span>
              <div className="font-extrabold text-sm text-[var(--color-foreground)] capitalize">
                {analysis?.trendSignal?.replace("_", " ") ?? "—"}
              </div>
              <span className="text-[11px] text-[var(--color-muted)] mt-1">
                {sma200 ? (currentPrice > sma200 ? "SMA200 Üzerinde" : "SMA200 Altında") : "Trend hesabı"}
              </span>
            </div>

            {/* MACD Status */}
            <div className="card p-4 flex flex-col justify-center border border-[var(--color-border)]/60">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1 mb-1">
                <Zap size={12} className="text-amber-500" />
                MACD Momentum
              </span>
              <div className="font-extrabold text-sm text-[var(--color-foreground)]">
                {analysis?.macdSignal ?? "—"}
              </div>
              <span className="text-[11px] text-[var(--color-muted)] mt-1 tabular-nums">
                {macdHist !== null ? `Hist: ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(2)}` : "Histogram N/A"}
              </span>
            </div>

            {/* RSI Zone */}
            <div className="card p-4 flex flex-col justify-center border border-[var(--color-border)]/60">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1 mb-1">
                <BarChart2 size={12} className="text-blue-500" />
                RSI Bölgesi
              </span>
              <div className="font-extrabold text-sm text-[var(--color-foreground)]">
                {analysis?.rsiZone === "OVERSOLD" ? "Aşırı Satım (<30)" : analysis?.rsiZone === "OVERBOUGHT" ? "Aşırı Alım (>70)" : "Nötr (30-70)"}
              </div>
              <span className="text-[11px] text-[var(--color-muted)] mt-1 tabular-nums">
                RSI (14): {rsi !== null ? rsi.toFixed(1) : "—"}
              </span>
            </div>
          </div>

          {/* Visual Indicators Detail Grid */}
          <div className="space-y-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <Sliders size={14} className="text-[var(--color-brand)]" />
              Gösterge Metreleri & Hiyerarşi
            </h4>

            {/* RSI Meter */}
            <div className="card p-4 space-y-2 border border-[var(--color-border)]/60">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-[var(--color-foreground)]">RSI (Relative Strength Index)</span>
                <span className="font-black tabular-nums text-[var(--color-brand-strong)]">
                  {rsi !== null ? rsi.toFixed(1) : "—"}
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-3 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex">
                <div className="w-[30%] bg-emerald-500/20 border-r border-emerald-500/30 flex items-center justify-center text-[8px] font-bold text-emerald-600">Aşırı Satım</div>
                <div className="w-[40%] bg-slate-500/10 flex items-center justify-center text-[8px] font-bold text-[var(--color-muted)]">Nötr Bölge</div>
                <div className="w-[30%] bg-rose-500/20 border-l border-rose-500/30 flex items-center justify-center text-[8px] font-bold text-rose-600">Aşırı Alım</div>
                {rsi !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-[var(--color-foreground)] rounded-full -ml-1 border-2 border-[var(--color-surface)] shadow-md transition-all duration-300"
                    style={{ left: `${Math.min(100, Math.max(0, rsi))}%` }}
                    title={`RSI: ${rsi.toFixed(1)}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-medium">
                <span>0 (Aşırı Satış Dip)</span>
                <span>30</span>
                <span>70</span>
                <span>100 (Aşırı Alım Zirve)</span>
              </div>
            </div>

            {/* 52-Week Range Meter */}
            {high52w !== null && low52w !== null && (
              <div className="card p-4 space-y-2 border border-[var(--color-border)]/60">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-[var(--color-foreground)]">52 Haftalık Fiyat Aralığı</span>
                  <span className="text-[11px] text-[var(--color-muted)]">
                    Zirveye Uzaklık: <strong className="text-[var(--color-foreground)]">-%{(((high52w - currentPrice) / high52w) * 100).toFixed(1)}</strong>
                  </span>
                </div>

                <div className="relative h-3 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500/40 via-blue-500/40 to-indigo-500/40 rounded-full"
                    style={{ width: `${range52Pct}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-[var(--color-foreground)] rounded-full -ml-1 border border-[var(--color-surface)] shadow-md"
                    style={{ left: `${range52Pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-bold tabular-nums">
                  <span className="text-[var(--color-loss)]">52W Dip: {formatNumber(low52w, 2)}</span>
                  <span className="text-[var(--color-foreground)]">Şu an: {formatNumber(currentPrice, 2)}</span>
                  <span className="text-[var(--color-profit)]">52W Zirve: {formatNumber(high52w, 2)}</span>
                </div>
              </div>
            )}

            {/* Moving Averages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-3 border border-[var(--color-border)]/50 space-y-1">
                <div className="flex justify-between text-[11px] font-extrabold text-[var(--color-muted)]">
                  <span>SMA 20 (Kısa Vadeli)</span>
                  <span className={sma20 && currentPrice > sma20 ? "text-[var(--color-profit)] font-bold" : "text-[var(--color-loss)] font-bold"}>
                    {sma20 ? (currentPrice > sma20 ? "Üzerinde" : "Altında") : "—"}
                  </span>
                </div>
                <div className="text-sm font-black tabular-nums text-[var(--color-foreground)]">
                  {sma20 ? formatNumber(sma20, 2) : "—"}
                </div>
              </div>

              <div className="card p-3 border border-[var(--color-border)]/50 space-y-1">
                <div className="flex justify-between text-[11px] font-extrabold text-[var(--color-muted)]">
                  <span>SMA 50 (Orta Vadeli)</span>
                  <span className={sma50 && currentPrice > sma50 ? "text-[var(--color-profit)] font-bold" : "text-[var(--color-loss)] font-bold"}>
                    {sma50 ? (currentPrice > sma50 ? "Üzerinde" : "Altında") : "—"}
                  </span>
                </div>
                <div className="text-sm font-black tabular-nums text-[var(--color-foreground)]">
                  {sma50 ? formatNumber(sma50, 2) : "—"}
                </div>
              </div>

              <div className="card p-3 border border-[var(--color-border)]/50 space-y-1">
                <div className="flex justify-between text-[11px] font-extrabold text-[var(--color-muted)]">
                  <span>SMA 200 (Ana Trend)</span>
                  <span className={sma200 && currentPrice > sma200 ? "text-[var(--color-profit)] font-bold" : "text-[var(--color-loss)] font-bold"}>
                    {sma200 ? (currentPrice > sma200 ? "Üzerinde" : "Altında") : "—"}
                  </span>
                </div>
                <div className="text-sm font-black tabular-nums text-[var(--color-foreground)]">
                  {sma200 ? formatNumber(sma200, 2) : "—"}
                </div>
              </div>
            </div>

            {/* Bollinger & MACD breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bollinger detail */}
              <div className="card p-3 border border-[var(--color-border)]/50 space-y-1.5 text-xs">
                <span className="font-extrabold text-[var(--color-foreground)] block">Bollinger Bant Durumu</span>
                <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
                  <span>Üst Bant: <strong className="text-[var(--color-foreground)]">{bollUpper ? formatNumber(bollUpper, 2) : "—"}</strong></span>
                  <span>Alt Bant: <strong className="text-[var(--color-foreground)]">{bollLower ? formatNumber(bollLower, 2) : "—"}</strong></span>
                </div>
                <div className="relative h-2 bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 w-2 bg-[var(--color-brand-strong)] rounded-full -ml-1"
                    style={{ left: `${bollPosPct}%` }}
                  />
                </div>
              </div>

              {/* MACD detail */}
              <div className="card p-3 border border-[var(--color-border)]/50 space-y-1.5 text-xs">
                <span className="font-extrabold text-[var(--color-foreground)] block">MACD & Sinyal Çizgisi</span>
                <div className="flex justify-between text-[11px] text-[var(--color-muted)] tabular-nums">
                  <span>MACD: <strong className="text-[var(--color-foreground)]">{macd !== null ? formatNumber(macd, 2) : "—"}</strong></span>
                  <span>Signal: <strong className="text-[var(--color-foreground)]">{macdSignal !== null ? formatNumber(macdSignal, 2) : "—"}</strong></span>
                </div>
                <div className="text-[11px] font-semibold text-[var(--color-brand-strong)]">
                  {ind?.macdCrossover ? `⚠️ ${ind.macdCrossover.replace("_", " ")} tespit edildi!` : "Düzgün momentum takibi"}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Commentary Paragraph */}
          {analysis?.commentary && (
            <div className="space-y-2 border-t border-[var(--color-border)]/50 pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" />
                Teknik Analiz Özeti
              </h4>
              <p className="text-xs leading-relaxed text-[var(--color-foreground)]/90 bg-[var(--color-surface-muted)]/30 p-3.5 rounded-xl border border-[var(--color-border)]/40">
                {analysis.commentary}
              </p>
            </div>
          )}

          {/* Special Alerts */}
          {analysis?.alerts && analysis.alerts.length > 0 && (
            <div className="space-y-2 border-t border-[var(--color-border)]/50 pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-loss)] flex items-center gap-1.5">
                <ShieldAlert size={14} />
                Önemli Sinyal ve Uyarılar
              </h4>
              <ul className="space-y-1.5">
                {analysis.alerts.map((alert, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs font-medium text-[var(--color-foreground)] bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl"
                  >
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/20 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-outline text-xs"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
