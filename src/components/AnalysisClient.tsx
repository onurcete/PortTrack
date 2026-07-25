"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  ANALYSIS_TABS,
  type AnalysisPulse as PulseDTO,
  type AnalysisTabKey,
  tabKeyForAssetType,
} from "@/lib/analysisPulse";
import type { AssetType } from "@/lib/assets";
import type { TechnicalIndicators } from "@/lib/technical";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import { AnalysisPulse } from "./AnalysisPulse";
import { TefasInvestorPanel } from "./TefasInvestorPanel";
import {
  cn,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

export interface HoldingAnalysisDTO {
  symbol: string;
  assetType: AssetType;
  date: string;
  indicators: TechnicalIndicators;
  score: number;
  commentary: string;
  trendSignal: string;
  macdSignal: string;
  rsiZone: string;
  alerts: string[];
}

export interface HoldingDTO {
  symbol: string;
  assetType: AssetType;
  name: string | null;
  valueTRY: number;
  valueUSD: number;
  weightPct: number;
  dailyChangePct: number | null;
  quantity: number;
  currentPriceNative: number | null;
  nativeCurrency: "TRY" | "USD";
  analysis: HoldingAnalysisDTO | null;
}

export function AnalysisClient({
  pulse,
  holdings,
  tefasInvestors,
  lastAnalysisDate,
}: {
  pulse: PulseDTO;
  holdings: HoldingDTO[];
  tefasInvestors: TefasInvestorSummary | null;
  lastAnalysisDate: string | null;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalysisTabKey>(pulse.defaultTab);

  const visibleTabs = useMemo(
    () =>
      ANALYSIS_TABS.filter((t) => pulse.availableTabs.includes(t.key)),
    [pulse.availableTabs],
  );

  const tabHoldings = useMemo(
    () =>
      holdings
        .filter((h) => tabKeyForAssetType(h.assetType) === activeTab)
        .sort((a, b) => b.weightPct - a.weightPct),
    [holdings, activeTab],
  );

  const tefasPriceMap = useMemo(() => {
    const map = new Map<
      string,
      { dailyChangePct: number | null; score: number | null }
    >();
    for (const h of holdings) {
      if (h.assetType !== "TEFAS") continue;
      map.set(h.symbol, {
        dailyChangePct: h.dailyChangePct,
        score: h.analysis?.score ?? null,
      });
    }
    return map;
  }, [holdings]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setRefreshMsg(
          `${data.analyzed ?? 0} varlık analiz edildi` +
            (data.skipped ? `, ${data.skipped} atlandı` : ""),
        );
        router.refresh();
      } else {
        setRefreshMsg(data.error ?? "Analiz başarısız");
      }
    } catch {
      setRefreshMsg("Bağlantı hatası");
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(null), 6000);
    }
  }

  if (holdings.length === 0) {
    return (
      <div className="space-y-6">
        <Header
          lastAnalysisDate={lastAnalysisDate}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          refreshMsg={refreshMsg}
        />
        <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Activity className="text-[var(--color-muted)]" size={32} />
          <p className="font-semibold">Açık pozisyon yok</p>
          <p className="text-sm text-[var(--color-muted)] max-w-sm">
            Analiz için önce İşlemler sayfasından pozisyon ekleyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        lastAnalysisDate={lastAnalysisDate}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        refreshMsg={refreshMsg}
      />

      <AnalysisPulse pulse={pulse} />

      <div>
        <div
          className="flex flex-wrap gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1 mb-4"
          role="tablist"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-xs font-bold transition-all",
                activeTab === tab.key
                  ? "bg-[var(--color-surface)] text-[var(--color-brand-strong)] shadow-sm border border-[var(--color-border)]/50"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] border border-transparent",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "TEFAS" && tefasInvestors && (
          <TefasInvestorPanel
            summary={tefasInvestors}
            priceBySymbol={tefasPriceMap}
          />
        )}

        {activeTab === "TEFAS" && !tefasInvestors && (
          <p className="text-sm text-[var(--color-muted)] mb-4">
            TEFAS yatırımcı özeti için fiyat geçmişi gerekli.
          </p>
        )}

        {activeTab === "BES" ? (
          <BesPanel holdings={tabHoldings} />
        ) : activeTab !== "TEFAS" ? (
          <HoldingsTable holdings={tabHoldings} showTechnical />
        ) : (
          <div className="mt-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] mb-2">
              Teknik özet (ikincil)
            </p>
            <HoldingsTable holdings={tabHoldings} showTechnical compact />
          </div>
        )}
      </div>
    </div>
  );
}

function Header({
  lastAnalysisDate,
  refreshing,
  onRefresh,
  refreshMsg,
}: {
  lastAnalysisDate: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  refreshMsg: string | null;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analiz</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          {lastAnalysisDate
            ? `Son teknik analiz: ${formatDate(lastAnalysisDate)}`
            : "Teknik analiz henüz çalıştırılmadı"}
        </p>
        {refreshMsg && (
          <p className="text-xs text-[var(--color-brand-strong)] mt-1 font-medium">
            {refreshMsg}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="btn btn-outline"
        title="Açık pozisyonlar için teknik analizi yeniden hesapla"
      >
        <RefreshCw size={15} className={cn(refreshing && "animate-spin")} />
        {refreshing ? "Hesaplanıyor..." : "Tekniği Güncelle"}
      </button>
    </div>
  );
}

function BesPanel({ holdings }: { holdings: HoldingDTO[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold">BES bakiyesi</h3>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          BES için teknik skor üretilmez; değer manuel / işlem bakiyesinden gelir.
        </p>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {holdings.map((h) => (
          <div
            key={h.symbol}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-bold">{h.symbol}</p>
              <p className="text-xs text-[var(--color-muted)]">
                Ağırlık {h.weightPct.toFixed(1)}%
              </p>
            </div>
            <p className="text-lg font-black tabular-nums">
              {formatMoney(h.valueTRY, "TRY")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingsTable({
  holdings,
  showTechnical,
  compact,
}: {
  holdings: HoldingDTO[];
  showTechnical?: boolean;
  compact?: boolean;
}) {
  if (holdings.length === 0) {
    return (
      <div className="card px-4 py-10 text-center text-sm text-[var(--color-muted)]">
        Bu kategoride açık pozisyon yok.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="theme-table-head text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Sembol</th>
              <th className="px-3 py-2.5 text-right font-semibold">Ağırlık</th>
              <th className="px-3 py-2.5 text-right font-semibold">Günlük</th>
              {!compact && (
                <th className="px-3 py-2.5 text-right font-semibold">Değer</th>
              )}
              {showTechnical && (
                <>
                  <th className="px-3 py-2.5 text-right font-semibold">Skor</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Sinyaller</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => (
              <tr
                key={h.symbol}
                className="border-b border-[var(--color-border)] last:border-0 theme-surface-hover"
              >
                <td className="px-4 py-2.5">
                  <p className="font-bold">{h.symbol}</p>
                  {h.name && (
                    <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[180px]">
                      {h.name}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                  {h.weightPct.toFixed(1)}%
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right tabular-nums text-xs font-semibold",
                    (h.dailyChangePct ?? 0) > 0 && "text-[var(--color-profit)]",
                    (h.dailyChangePct ?? 0) < 0 && "text-[var(--color-loss)]",
                  )}
                >
                  {h.dailyChangePct != null
                    ? formatPercent(h.dailyChangePct)
                    : "—"}
                </td>
                {!compact && (
                  <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                    {formatMoney(h.valueTRY, "TRY")}
                    {h.currentPriceNative != null && (
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {h.nativeCurrency === "USD" ? "$" : "₺"}
                        {formatNumber(h.currentPriceNative)}
                      </p>
                    )}
                  </td>
                )}
                {showTechnical && (
                  <>
                    <td className="px-3 py-2.5 text-right">
                      {h.analysis ? (
                        <ScoreBadge score={h.analysis.score} />
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {h.analysis ? (
                        <SignalBadges analysis={h.analysis} />
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">
                          Teknik yok
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 65
      ? "bg-[var(--color-profit-soft)] text-[var(--color-profit)]"
      : score <= 35
        ? "bg-[var(--color-loss-soft)] text-[var(--color-loss)]"
        : "bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]";
  return (
    <span
      className={cn(
        "inline-flex min-w-[2.25rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums",
        tone,
      )}
    >
      {score}
    </span>
  );
}

function SignalBadges({ analysis }: { analysis: HoldingAnalysisDTO }) {
  const trendLabel: Record<string, string> = {
    STRONG_UP: "Güçlü yükseliş",
    UP: "Yükseliş",
    DOWN: "Düşüş",
    STRONG_DOWN: "Güçlü düşüş",
  };
  const macdLabel: Record<string, string> = {
    POSITIVE: "MACD+",
    NEGATIVE: "MACD−",
    BUY_CROSS: "MACD alış",
    SELL_CROSS: "MACD satış",
  };
  const rsiLabel: Record<string, string> = {
    OVERSOLD: "RSI aşırı satım",
    NEUTRAL: "RSI nötr",
    OVERBOUGHT: "RSI aşırı alım",
  };

  const trendUp =
    analysis.trendSignal === "UP" || analysis.trendSignal === "STRONG_UP";

  return (
    <div className="flex flex-wrap gap-1">
      <Badge
        tone={trendUp ? "good" : "bad"}
        icon={trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      >
        {trendLabel[analysis.trendSignal] ?? analysis.trendSignal}
      </Badge>
      <Badge
        tone={
          analysis.macdSignal === "POSITIVE" ||
          analysis.macdSignal === "BUY_CROSS"
            ? "good"
            : "bad"
        }
      >
        {macdLabel[analysis.macdSignal] ?? analysis.macdSignal}
      </Badge>
      <Badge
        tone={
          analysis.rsiZone === "OVERSOLD"
            ? "good"
            : analysis.rsiZone === "OVERBOUGHT"
              ? "bad"
              : "neutral"
        }
      >
        {rsiLabel[analysis.rsiZone] ?? analysis.rsiZone}
      </Badge>
    </div>
  );
}

function Badge({
  children,
  tone,
  icon,
}: {
  children: ReactNode;
  tone: "good" | "bad" | "neutral";
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        tone === "good" &&
          "bg-[var(--color-profit-soft)] text-[var(--color-profit)]",
        tone === "bad" &&
          "bg-[var(--color-loss-soft)] text-[var(--color-loss)]",
        tone === "neutral" &&
          "bg-[var(--color-neutral-soft)] text-[var(--color-neutral)]",
      )}
    >
      {icon}
      {children}
    </span>
  );
}
