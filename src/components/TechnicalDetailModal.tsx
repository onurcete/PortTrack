"use client";

import React from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { ASSET_META } from "@/lib/assets";
import { formatMoney, formatPercent, cn } from "@/lib/utils";
import type { HoldingDTO } from "@/lib/analysisData";
import { TechnicalAnalysisContent } from "./TechnicalAnalysisContent";

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
  const currentPrice = analysis?.indicators?.currentPrice ?? currentPriceNative ?? 0;

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
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          <TechnicalAnalysisContent
            analysis={analysis}
            symbol={symbol}
            assetType={assetType}
            currentPriceNative={currentPriceNative}
            nativeCurrency={nativeCurrency}
          />
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
