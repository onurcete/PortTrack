"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  Zap,
  BarChart2,
  Sliders,
  ShieldAlert,
  Info,
} from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";
import type { TechnicalIndicators } from "@/lib/technical";

export interface TechnicalAnalysisDTO {
  symbol: string;
  assetType?: string;
  date?: string;
  indicators?: TechnicalIndicators | null;
  score: number;
  commentary?: string;
  trendSignal?: string;
  macdSignal?: string;
  rsiZone?: string;
  alerts?: string[];
}

export interface TechnicalAnalysisContentProps {
  analysis: TechnicalAnalysisDTO | null;
  symbol?: string;
  assetType?: string;
  currentPriceNative?: number | null;
  nativeCurrency?: string;
  loading?: boolean;
}

export function TechnicalAnalysisContent({
  analysis,
  symbol,
  currentPriceNative,
  loading,
}: TechnicalAnalysisContentProps) {
  if (loading) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/40" />
          ))}
        </div>
        <div className="h-44 rounded-2xl bg-[var(--color-surface-muted)]/40 border border-[var(--color-border)]/40 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-muted)]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-brand-strong)]" />
            <span>Teknik analiz göstergeleri hesaplanıyor...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[var(--color-surface-muted)]/40 border border-[var(--color-border)]/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/20 space-y-3 my-4">
        <div className="mx-auto w-10 h-10 rounded-xl bg-[var(--color-surface-muted)] flex items-center justify-center text-[var(--color-muted)]">
          <Info size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--color-foreground)]">Teknik Analiz Verisi Bulunamadı</h4>
          <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto mt-1 leading-relaxed">
            {symbol ? `"${symbol}"` : "Bu varlık"} için yeterli geçmiş fiyat verisi (en az 14 gün) bulunamadığından veya fiyat kaynağı teknik analizi desteklemediğinden göstergeler üretilemedi.
          </p>
        </div>
      </div>
    );
  }

  const ind = analysis.indicators;
  const score = analysis.score ?? null;

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
    <div className="space-y-6">
      {/* 4'lü Hızlı Skor ve Durum Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Score Ring / Card */}
        <div className="card p-4 flex flex-col items-center justify-center bg-gradient-to-br from-[var(--color-surface-muted)]/30 to-[var(--color-surface-muted)]/10 border border-[var(--color-border)]/60 text-center rounded-2xl">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-1">
            Teknik Skor
          </span>
          <div
            className={cn(
              "text-3xl font-black tabular-nums my-0.5",
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
          <span className="text-[10px] font-bold text-[var(--color-muted)]">
            {score !== null ? (score >= 70 ? "🟢 Güçlü Teknik" : score >= 40 ? "🟡 Nötr Görünüm" : "🔴 Zayıf Görünüm") : "Veri Yok"}
          </span>
        </div>

        {/* Trend Signal */}
        <div className="card p-4 flex flex-col justify-center border border-[var(--color-border)]/60 rounded-2xl bg-[var(--color-surface-muted)]/15">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1 mb-1">
            <Activity size={12} className="text-[var(--color-brand-strong)]" />
            Ana Trend
          </span>
          <div className="font-black text-xs sm:text-sm text-[var(--color-foreground)] capitalize">
            {analysis.trendSignal ? analysis.trendSignal.replace(/_/g, " ") : "—"}
          </div>
          <span className="text-[10px] text-[var(--color-muted)] mt-1">
            {sma200 && currentPrice > 0 ? (currentPrice > sma200 ? "SMA200 Üzerinde" : "SMA200 Altında") : "Trend hesabı"}
          </span>
        </div>

        {/* MACD Status */}
        <div className="card p-4 flex flex-col justify-center border border-[var(--color-border)]/60 rounded-2xl bg-[var(--color-surface-muted)]/15">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1 mb-1">
            <Zap size={12} className="text-amber-500" />
            MACD Momentum
          </span>
          <div className="font-black text-xs sm:text-sm text-[var(--color-foreground)] truncate">
            {analysis.macdSignal ?? "—"}
          </div>
          <span className="text-[10px] text-[var(--color-muted)] mt-1 tabular-nums">
            {macdHist !== null ? `Hist: ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(2)}` : "Histogram N/A"}
          </span>
        </div>

        {/* RSI Zone */}
        <div className="card p-4 flex flex-col justify-center border border-[var(--color-border)]/60 rounded-2xl bg-[var(--color-surface-muted)]/15">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1 mb-1">
            <BarChart2 size={12} className="text-blue-500" />
            RSI Bölgesi
          </span>
          <div className="font-black text-xs sm:text-sm text-[var(--color-foreground)]">
            {analysis.rsiZone === "OVERSOLD" ? "Aşırı Satım (<30)" : analysis.rsiZone === "OVERBOUGHT" ? "Aşırı Alım (>70)" : "Nötr (30-70)"}
          </div>
          <span className="text-[10px] text-[var(--color-muted)] mt-1 tabular-nums">
            RSI (14): {rsi !== null ? rsi.toFixed(1) : "—"}
          </span>
        </div>
      </div>

      {/* Gösterge Metreleri & Hiyerarşi */}
      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
          <Sliders size={14} className="text-[var(--color-brand-strong)]" />
          Gösterge Metreleri & Osilatörler
        </h4>

        {/* RSI Meter */}
        <div className="card p-4 space-y-2 border border-[var(--color-border)]/60 rounded-2xl bg-[var(--color-surface)]">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-[var(--color-foreground)]">RSI (Relative Strength Index - 14 Günlük)</span>
            <span className="font-black tabular-nums text-[var(--color-brand-strong)] text-sm">
              {rsi !== null ? rsi.toFixed(1) : "—"}
            </span>
          </div>

          {/* Bar */}
          <div className="relative h-3.5 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex">
            <div className="w-[30%] bg-emerald-500/20 border-r border-emerald-500/30 flex items-center justify-center text-[8px] font-extrabold text-emerald-600 dark:text-emerald-400">Aşırı Satım</div>
            <div className="w-[40%] bg-slate-500/10 flex items-center justify-center text-[8px] font-bold text-[var(--color-muted)]">Nötr Bölge</div>
            <div className="w-[30%] bg-rose-500/20 border-l border-rose-500/30 flex items-center justify-center text-[8px] font-extrabold text-rose-600 dark:text-rose-400">Aşırı Alım</div>
            {rsi !== null && (
              <div
                className="absolute top-0 bottom-0 w-3 bg-[var(--color-foreground)] rounded-full -ml-1.5 border-2 border-[var(--color-surface)] shadow-md transition-all duration-300"
                style={{ left: `${Math.min(100, Math.max(0, rsi))}%` }}
                title={`RSI: ${rsi.toFixed(1)}`}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-medium">
            <span>0 (Dip Baskısı)</span>
            <span>30</span>
            <span>70</span>
            <span>100 (Tepe Baskısı)</span>
          </div>
        </div>

        {/* 52-Week Range Meter */}
        {high52w !== null && low52w !== null && (
          <div className="card p-4 space-y-2 border border-[var(--color-border)]/60 rounded-2xl bg-[var(--color-surface)]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-[var(--color-foreground)]">52 Haftalık Fiyat Aralığı</span>
              {currentPrice > 0 && high52w > 0 && (
                <span className="text-[11px] text-[var(--color-muted)]">
                  Zirveye Uzaklık: <strong className="text-[var(--color-foreground)] font-bold">-%{(((high52w - currentPrice) / high52w) * 100).toFixed(1)}</strong>
                </span>
              )}
            </div>

            <div className="relative h-3 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500/40 via-blue-500/40 to-indigo-500/40 rounded-full"
                style={{ width: `${range52Pct}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-[var(--color-foreground)] rounded-full -ml-1.5 border border-[var(--color-surface)] shadow-md"
                style={{ left: `${range52Pct}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] font-bold tabular-nums">
              <span className="text-[var(--color-loss)]">52H Dip: {formatNumber(low52w, 2)}</span>
              <span className="text-[var(--color-foreground)]">Şu an: {formatNumber(currentPrice, 2)}</span>
              <span className="text-[var(--color-profit)]">52H Zirve: {formatNumber(high52w, 2)}</span>
            </div>
          </div>
        )}

        {/* Moving Averages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="card p-3 border border-[var(--color-border)]/50 rounded-xl space-y-1 bg-[var(--color-surface-muted)]/10">
            <div className="flex justify-between text-[11px] font-extrabold text-[var(--color-muted)]">
              <span>SMA 20 (Kısa Vade)</span>
              <span className={sma20 && currentPrice > sma20 ? "text-[var(--color-profit)] font-bold" : "text-[var(--color-loss)] font-bold"}>
                {sma20 ? (currentPrice > sma20 ? "Üzerinde" : "Altında") : "—"}
              </span>
            </div>
            <div className="text-sm font-black tabular-nums text-[var(--color-foreground)]">
              {sma20 ? formatNumber(sma20, 2) : "—"}
            </div>
          </div>

          <div className="card p-3 border border-[var(--color-border)]/50 rounded-xl space-y-1 bg-[var(--color-surface-muted)]/10">
            <div className="flex justify-between text-[11px] font-extrabold text-[var(--color-muted)]">
              <span>SMA 50 (Orta Vade)</span>
              <span className={sma50 && currentPrice > sma50 ? "text-[var(--color-profit)] font-bold" : "text-[var(--color-loss)] font-bold"}>
                {sma50 ? (currentPrice > sma50 ? "Üzerinde" : "Altında") : "—"}
              </span>
            </div>
            <div className="text-sm font-black tabular-nums text-[var(--color-foreground)]">
              {sma50 ? formatNumber(sma50, 2) : "—"}
            </div>
          </div>

          <div className="card p-3 border border-[var(--color-border)]/50 rounded-xl space-y-1 bg-[var(--color-surface-muted)]/10">
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
          <div className="card p-3.5 border border-[var(--color-border)]/50 rounded-xl space-y-1.5 text-xs bg-[var(--color-surface-muted)]/10">
            <span className="font-extrabold text-[var(--color-foreground)] block">Bollinger Bant Durumu</span>
            <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
              <span>Üst Bant: <strong className="text-[var(--color-foreground)]">{bollUpper ? formatNumber(bollUpper, 2) : "—"}</strong></span>
              <span>Alt Bant: <strong className="text-[var(--color-foreground)]">{bollLower ? formatNumber(bollLower, 2) : "—"}</strong></span>
            </div>
            <div className="relative h-2 bg-[var(--color-surface-muted)] rounded-full overflow-hidden mt-1">
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-[var(--color-brand-strong)] rounded-full -ml-1"
                style={{ left: `${bollPosPct}%` }}
              />
            </div>
          </div>

          {/* MACD detail */}
          <div className="card p-3.5 border border-[var(--color-border)]/50 rounded-xl space-y-1.5 text-xs bg-[var(--color-surface-muted)]/10">
            <span className="font-extrabold text-[var(--color-foreground)] block">MACD & Sinyal Çizgisi</span>
            <div className="flex justify-between text-[11px] text-[var(--color-muted)] tabular-nums">
              <span>MACD: <strong className="text-[var(--color-foreground)]">{macd !== null ? formatNumber(macd, 2) : "—"}</strong></span>
              <span>Signal: <strong className="text-[var(--color-foreground)]">{macdSignal !== null ? formatNumber(macdSignal, 2) : "—"}</strong></span>
            </div>
            <div className="text-[11px] font-semibold text-[var(--color-brand-strong)] mt-1">
              {ind?.macdCrossover ? `⚡ ${ind.macdCrossover.replace(/_/g, " ")} tespit edildi!` : "Düzgün momentum takibi"}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Commentary Paragraph */}
      {analysis.commentary && (
        <div className="space-y-2 border-t border-[var(--color-border)]/50 pt-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" />
            Teknik Analiz Özeti
          </h4>
          <p className="text-xs leading-relaxed text-[var(--color-foreground)]/90 bg-[var(--color-surface-muted)]/30 p-3.5 rounded-xl border border-[var(--color-border)]/40 font-medium">
            {analysis.commentary}
          </p>
        </div>
      )}

      {/* Special Alerts */}
      {analysis.alerts && analysis.alerts.length > 0 && (
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
  );
}
