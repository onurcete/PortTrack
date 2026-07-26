"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  TrendingUp,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  Sliders,
  TrendingDown,
  Activity,
  Target,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatMoney, formatPercent, cn } from "@/lib/utils";
import type { GrowthPointDTO } from "./GrowthClient";

type Scenario = "pessimistic" | "realistic" | "optimistic" | "custom";

interface GrowthAiCommentaryProps {
  series: GrowthPointDTO[];
  currency: "TRY" | "USD";
}

export function GrowthAiCommentary({ series, currency }: GrowthAiCommentaryProps) {
  const [scenario, setScenario] = useState<Scenario>("realistic");
  const isTRY = currency === "TRY";

  // Ayıklama mantığı: Serideki son yılı bul
  const stats = useMemo(() => {
    if (!series || series.length === 0) return null;

    // Tarihe göre sırala
    const sorted = [...series].sort((a, b) => a.month.localeCompare(b.month));
    const latestPoint = sorted[sorted.length - 1];
    const latestYear = latestPoint.month.slice(0, 4);

    // Son yıla ait tüm noktalar
    const yearPoints = sorted.filter((p) => p.month.startsWith(latestYear));
    if (yearPoints.length === 0) return null;

    // Tüm aylar için lookup haritası
    const seriesByMonth = new Map<string, GrowthPointDTO>();
    for (const p of series) {
      seriesByMonth.set(p.month, p);
    }

    // Aylık getirileri hesapla
    const monthlyReturns: { month: string; returnPct: number; value: number }[] = [];
    for (const p of yearPoints) {
      const val = isTRY ? p.valueTRY : p.valueUSD;

      // Önceki ayı bul
      const [y, m] = p.month.split("-").map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      const prev = seriesByMonth.get(prevKey);
      const prevVal = prev ? (isTRY ? prev.valueTRY : prev.valueUSD) : null;

      if (prevVal && prevVal > 0) {
        const returnPct = ((val / prevVal) - 1) * 100;
        monthlyReturns.push({ month: p.month, returnPct, value: val });
      }
    }

    if (monthlyReturns.length === 0) return null;

    // İstatiksel metrikler
    const returns = monthlyReturns.map((r) => r.returnPct);
    const avgMonthlyReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

    // YTD Hesapla
    const prevYearDecKey = `${Number(latestYear) - 1}-12`;
    const prevYearDec = seriesByMonth.get(prevYearDecKey);
    const startVal = prevYearDec
      ? prevDecValue(prevYearDec, isTRY)
      : (isTRY ? yearPoints[0].valueTRY : yearPoints[0].valueUSD);

    const latestVal = isTRY ? latestPoint.valueTRY : latestPoint.valueUSD;
    const ytdReturn = startVal > 0 ? ((latestVal / startVal) - 1) * 100 : 0;

    // Kalan aylar
    const currentMonthNum = Number(latestPoint.month.slice(5, 7));
    const monthsRemaining = Math.max(0, 12 - currentMonthNum);

    return {
      latestYear,
      latestVal,
      startVal,
      avgMonthlyReturn,
      ytdReturn,
      monthsRemaining,
      latestMonthName: getMonthName(currentMonthNum),
      currentMonthNum,
    };
  }, [series, currency, isTRY]);

  // Sürgü getiri oranı state
  const [customRate, setCustomRate] = useState<number>(() => {
    if (stats) {
      return Number(stats.avgMonthlyReturn.toFixed(1));
    }
    return 5.0;
  });

  if (!stats) return null;

  const {
    latestYear,
    latestVal,
    avgMonthlyReturn,
    ytdReturn,
    monthsRemaining,
    latestMonthName,
    currentMonthNum,
  } = stats;

  // Senaryo konfigürasyonu
  const scenarioConfig = {
    pessimistic: {
      label: "Kötümser Senaryo",
      shortLabel: "Kötümser",
      shortDesc: "Muhafazakar Yaklaşım",
      rate: avgMonthlyReturn * 0.4,
      icon: TrendingDown,
      badgeColor: "bg-rose-500/10 text-[var(--color-loss)] border-rose-500/20",
      textClass: "text-[var(--color-loss)]",
    },
    realistic: {
      label: "Gerçekçi Senaryo",
      shortLabel: "Gerçekçi",
      shortDesc: "Mevcut Ort. Trend",
      rate: avgMonthlyReturn * 1.0,
      icon: Activity,
      badgeColor: "bg-indigo-500/10 text-[var(--color-brand-strong)] border-indigo-500/20",
      textClass: "text-[var(--color-brand-strong)]",
    },
    optimistic: {
      label: "İyimser Senaryo",
      shortLabel: "İyimser",
      shortDesc: "Yüksek Büyüme İvmesi",
      rate: avgMonthlyReturn * 1.4,
      icon: TrendingUp,
      badgeColor: "bg-emerald-500/10 text-[var(--color-profit)] border-emerald-500/20",
      textClass: "text-[var(--color-profit)]",
    },
    custom: {
      label: "Özel Senaryo",
      shortLabel: "Özel Oran",
      shortDesc: "Kişisel Getiri Tahmini",
      rate: customRate,
      icon: Sliders,
      badgeColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      textClass: "text-amber-600",
    },
  };

  const currentScenario = scenarioConfig[scenario];
  const projectedMonthlyRate = currentScenario.rate;

  // Yıl sonu değer hesaplaması (Bileşik Faiz Formülü)
  const projectedValue = latestVal * Math.pow(1 + Math.max(-0.99, projectedMonthlyRate / 100), monthsRemaining);
  const growthMultiplier = latestVal > 0 ? projectedValue / latestVal : 1;
  const projectedReturnPct = latestVal > 0 ? ((projectedValue / latestVal) - 1) * 100 : 0;
  const projectedYtdReturn = stats.startVal > 0 ? ((projectedValue / stats.startVal) - 1) * 100 : 0;
  const netValueDiff = projectedValue - latestVal;

  // Kilometre taşları (Milestones)
  const milestones = isTRY
    ? [100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000]
    : [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

  const nextMilestone = milestones.find((m) => m > latestVal) ?? milestones[milestones.length - 1];
  const milestoneProgressPct = Math.min(100, Math.max(0, (projectedValue / nextMilestone) * 100));

  const customPresets = [-10, -5, 0, 2.5, 5, 7.5, 10, 15, 20, 25];

  const text = getCommentaryText();

  function getCommentaryText() {
    const isProfitable = avgMonthlyReturn > 0;

    if (monthsRemaining === 0) {
      return {
        trendText: `${latestYear} yılı tamamlandı. Yıllık toplam portföy getirisiniz %${ytdReturn.toFixed(1)} olarak gerçekleşti.`,
        projectionText: "Yeni yıl verileri eklendikçe projeksiyon modeli otomatik olarak güncellenecektir.",
        strategyText: "Gelecek dönem hedeflerinizi belirlemek için varlık dağılımınızı inceleyebilirsiniz.",
      };
    }

    let trendText = `${latestYear} yılının ilk ${currentMonthNum} ayında (Ocak - ${latestMonthName}) `;
    if (isProfitable) {
      trendText += `aylık ortalama %${avgMonthlyReturn.toFixed(2)}'lik istikrarlı bir büyüme performansı sergilendi. Portföyünüz pozitif ivmesini koruyor.`;
    } else {
      trendText += `aylık ortalama %${avgMonthlyReturn.toFixed(2)} seviyesinde bir seyir izlendi. Piyasa dalgalanmaları nedeniyle dikkatli takip önerilir.`;
    }

    let projectionText = `Önümüzdeki ${monthsRemaining} ay için seçilen ${currentScenario.label} (%${projectedMonthlyRate.toFixed(2)} / ay getiri) temel alındığında; `;
    if (projectedMonthlyRate > 0) {
      projectionText += `portföyünüzün yıl sonuna kadar %${projectedReturnPct.toFixed(1)} ek büyüme ile ${formatMoney(projectedValue, currency)} seviyesine ulaşması beklenmektedir. Yıl sonu kümülatif getiri oranınız %${projectedYtdReturn.toFixed(1)} olarak tahmin ediliyor.`;
    } else {
      projectionText += `portföy değerinizin yıl sonunda ${formatMoney(projectedValue, currency)} seviyesinde dengelenmesi öngörülmektedir.`;
    }

    let strategyText = "";
    const crossedMilestone = milestones.find((m) => latestVal < m && projectedValue >= m);
    if (crossedMilestone) {
      strategyText = `Mevcut getiri momentumu devam ederse, portföyünüz yıl bitmeden **${formatMoney(crossedMilestone, currency)}** kritik kilometre taşını aşacaktır!`;
    } else {
      strategyText = `Portföyünüzün yıl sonuna kadar yaklaşık **${growthMultiplier.toFixed(2)}x** büyümesi hedeflenmektedir. Düzenli ek yatırımlarla bu hedef daha yukarı taşınabilir.`;
    }

    return { trendText, projectionText, strategyText };
  }

  return (
    <div className="card p-6 sm:p-7 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/20 to-[var(--color-brand-soft)]/20 border border-[var(--color-border)]/60 shadow-xl rounded-2xl relative overflow-hidden space-y-6">
      {/* Decorative Blur Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--color-border)]/50">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-strong)] text-white shadow-md shrink-0">
            <Brain size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg sm:text-xl tracking-tight text-[var(--color-foreground)]">
                Yapay Zekâ Büyüme & Gelecek Projeksiyonu
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border border-[var(--color-brand)]/20">
                <Sparkles size={10} /> PRO BÜYÜME MOTORU
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Ocak - {latestMonthName} ({latestYear}) gerçekleşen getiri verileriyle yıl sonu projeksiyonları
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/60 text-[var(--color-foreground)] shadow-2xs">
            Para Birimi: <strong className="text-[var(--color-brand-strong)]">{currency} ({isTRY ? "₺" : "$"})</strong>
          </span>
          {monthsRemaining > 0 && (
            <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border border-[var(--color-brand)]/20">
              Yılın Bitmesine {monthsRemaining} Ay Kaldı
            </span>
          )}
        </div>
      </div>

      {/* Milestone Target Progress Gauge */}
      <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-3 shadow-2xs">
        <div className="flex flex-wrap justify-between items-center text-xs gap-2">
          <div className="flex items-center gap-1.5 font-extrabold text-[var(--color-foreground)]">
            <Target size={15} className="text-[var(--color-brand)]" />
            <span>Gelecek Hedef & Kilometre Taşı İlerlemesi</span>
          </div>
          <div className="text-[11px] font-semibold text-[var(--color-muted)]">
            Sonraki Hedef: <strong className="text-[var(--color-brand-strong)]">{formatMoney(nextMilestone, currency)}</strong>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="relative h-4 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden p-0.5 border border-[var(--color-border)]/40">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-brand)] via-indigo-500 to-emerald-500 rounded-full transition-all duration-500 relative"
            style={{ width: `${milestoneProgressPct}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-md animate-ping" />
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] font-bold tabular-nums">
          <span className="text-[var(--color-muted)]">Mevcut Değer: {formatMoney(latestVal, currency)}</span>
          <span className="text-[var(--color-brand-strong)]">
            Beklenen Ulaşma Oranı: %{milestoneProgressPct.toFixed(0)}
          </span>
          <span className={cn(projectedValue >= latestVal ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
            Tahmini Yıl Sonu: {formatMoney(projectedValue, currency)}
          </span>
        </div>
      </div>

      {/* Scenario Selector Tabs */}
      <div className="space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-extrabold uppercase tracking-wider text-[var(--color-muted)] text-[10px] flex items-center gap-1">
            <Sliders size={12} className="text-[var(--color-brand)]" /> Projeksiyon Senaryosu Seçin
          </span>
          <span className="text-[11px] text-[var(--color-muted)] font-medium">
            Seçili Mod: <strong className="text-[var(--color-foreground)]">{currentScenario.label}</strong> (%{projectedMonthlyRate.toFixed(1)} / ay)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(["pessimistic", "realistic", "optimistic", "custom"] as Scenario[]).map((s) => {
            const active = scenario === s;
            const cfg = scenarioConfig[s];
            const IconComponent = cfg.icon;

            return (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className={cn(
                  "p-3.5 rounded-xl border transition-all text-left cursor-pointer flex flex-col justify-between space-y-2 relative group",
                  active
                    ? "bg-[var(--color-surface)] border-[var(--color-brand)] shadow-sm ring-2 ring-[var(--color-brand)]/20"
                    : "bg-[var(--color-surface)]/70 border-[var(--color-border)]/50 hover:bg-[var(--color-surface)] hover:border-[var(--color-border)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-black", active ? "text-[var(--color-brand-strong)]" : "text-[var(--color-foreground)]")}>
                    {cfg.shortLabel}
                  </span>
                  <div className={cn("p-1 rounded-lg border", cfg.badgeColor)}>
                    <IconComponent size={14} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-[var(--color-muted)] block line-clamp-1">{cfg.shortDesc}</span>
                  <span className={cn("text-xs font-black tracking-tight tabular-nums block", active ? cfg.textClass : "text-[var(--color-foreground)]")}>
                    %{s === "custom" ? customRate.toFixed(1) : cfg.rate.toFixed(1)} <span className="text-[10px] font-normal text-[var(--color-muted)]">/ ay</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Scenario Inline Controls */}
        {scenario === "custom" && (
          <div className="p-4 bg-[var(--color-surface)] border border-amber-500/30 rounded-xl space-y-3 animate-in fade-in duration-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-[var(--color-foreground)] flex items-center gap-1.5">
                <Sliders size={13} className="text-amber-500" />
                Özel Tahmini Aylık Getiri Oranı
              </span>
              <span className="font-black text-sm text-amber-600 tabular-nums">%{customRate.toFixed(1)} / ay</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[var(--color-loss)]">-15%</span>
              <input
                type="range"
                min="-15"
                max="30"
                step="0.5"
                value={customRate}
                onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-[var(--color-surface-muted)] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[10px] font-bold text-[var(--color-profit)]">+30%</span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-[var(--color-muted)] mr-1">Hızlı Seçim:</span>
              {customPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCustomRate(val)}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer tabular-nums",
                    customRate === val
                      ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                      : "bg-[var(--color-surface-muted)]/40 border-[var(--color-border)]/40 text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]"
                  )}
                >
                  {val > 0 ? `+${val}` : val}%
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Projeksiyon Sonuçları — 3 Metrik Kartı */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Yıl Sonu Beklenen Değer */}
        <div className="card p-4.5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-1.5 relative group hover:border-[var(--color-brand)]/40 transition-all shadow-2xs">
          <div className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={13} className={currentScenario.textClass} />
            Yıl Sonu Beklenen Portföy
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--color-foreground)] tracking-tight tabular-nums">
            {formatMoney(projectedValue, currency)}
          </div>
          <div className="text-[11px] flex justify-between items-center pt-2 border-t border-[var(--color-border)]/30 font-medium">
            <span className="text-[var(--color-muted)]">Net Fark:</span>
            <span className={cn("font-bold tabular-nums flex items-center gap-0.5", netValueDiff >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
              {netValueDiff >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {netValueDiff >= 0 ? `+${formatMoney(netValueDiff, currency)}` : formatMoney(netValueDiff, currency)}
            </span>
          </div>
        </div>

        {/* Tahmini Yıllık Getiri */}
        <div className="card p-4.5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-1.5 relative group hover:border-[var(--color-brand)]/40 transition-all shadow-2xs">
          <div className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={13} className="text-[var(--color-profit)]" />
            Tahmini Yıllık Toplam Getiri (YTD)
          </div>
          <div className={cn("text-xl sm:text-2xl font-black tracking-tight tabular-nums", projectedYtdReturn >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]")}>
            {projectedYtdReturn >= 0 ? "+" : ""}{projectedYtdReturn.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[var(--color-muted)] pt-2 border-t border-[var(--color-border)]/30 flex justify-between font-medium">
            <span>Kalan {monthsRemaining} Ay Katkısı:</span>
            <span className="font-bold text-[var(--color-foreground)] tabular-nums">{projectedReturnPct >= 0 ? "+" : ""}{projectedReturnPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Büyüme Çarpanı */}
        <div className="card p-4.5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-1.5 relative group hover:border-[var(--color-brand)]/40 transition-all shadow-2xs">
          <div className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <Layers size={13} className="text-[var(--color-brand-strong)]" />
            Bileşik Büyüme Çarpanı
          </div>
          <div className="text-xl sm:text-2xl font-black text-[var(--color-foreground)] tracking-tight tabular-nums">
            {growthMultiplier.toFixed(2)}x
          </div>
          <div className="text-[11px] text-[var(--color-muted)] pt-2 border-t border-[var(--color-border)]/30 flex justify-between font-medium">
            <span>Net Oransal Artış:</span>
            <span className="font-bold text-[var(--color-brand-strong)] tabular-nums">
              {(growthMultiplier - 1 >= 0 ? "+" : "") + ((growthMultiplier - 1) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Yapay Zekâ Analiz Rapor Kartları (3 Yapılandırılmış Kart) */}
      <div className="space-y-3">
        <span className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider block">
          Yapay Zekâ Analiz Raporu & Stratejik Değerlendirme
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trend kartı */}
          <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--color-brand-strong)]">
              <Zap size={14} className="text-amber-500" />
              1. Büyüme İvmesi
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-foreground)]/90">
              {text.trendText}
            </p>
          </div>

          {/* Projeksiyon kartı */}
          <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--color-brand-strong)]">
              <TrendingUp size={14} className="text-[var(--color-profit)]" />
              2. Projeksiyon Tablosu
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-foreground)]/90">
              {text.projectionText}
            </p>
          </div>

          {/* Strateji kartı */}
          <div className="card p-4 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--color-brand-strong)]">
              <ShieldCheck size={14} className="text-[var(--color-brand-strong)]" />
              3. Stratejik Tavsiye
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-foreground)]/90">
              {text.strategyText}
            </p>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div className="flex items-start gap-2 text-[10px] text-[var(--color-muted)] leading-relaxed bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)]/40">
        <Info size={14} className="shrink-0 text-[var(--color-muted)] mt-0.5" />
        <span>
          Bu tahmin ve projeksiyonlar, portföyünüzün belirtilen dönemdeki getiri eğilimlerine göre doğrusal ve bileşik faiz matematiksel modelleri kullanılarak hesaplanmıştır. Gelecekteki piyasa dalgalanmaları, varlık tercihleri veya nakit akışlarınız bu sonuçları değiştirebilir. Yatırım tavsiyesi niteliğinde değildir.
        </span>
      </div>
    </div>
  );
}

function prevDecValue(p: GrowthPointDTO, isTRY: boolean): number {
  return isTRY ? p.valueTRY : p.valueUSD;
}

function getMonthName(monthNum: number): string {
  const names = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  return names[monthNum - 1] ?? "";
}
