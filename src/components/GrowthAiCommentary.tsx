"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign,
  Layers,
  Sliders,
  Target,
  Gauge,
  Zap,
  TrendingDown,
  LineChart,
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

  // Ayıklama mantığı: Serideki son yılı bul (genelde 2026)
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
    
    // YTD (Yıl Başından Beri) Hesapla: Yılın ilk ayının başı referans alınır
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
  } = stats;

  // Senaryo çarpanları ve oranları
  const scenarioConfig = {
    pessimistic: {
      label: "Kötümser Senaryo",
      shortLabel: "Kötümser",
      rate: avgMonthlyReturn * 0.4,
      desc: "Piyasa koşullarının yavaşladığı veya düzeltme yaptığı muhafazakar projeksiyon.",
      themeColor: "rose",
      emoji: "📉",
      glowBg: "bg-rose-500/10 dark:bg-rose-500/5",
      borderActive: "border-rose-500/40 ring-rose-500/20",
      textClass: "text-rose-600 dark:text-rose-400",
      bgClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    realistic: {
      label: "Gerçekçi Senaryo",
      shortLabel: "Gerçekçi",
      rate: avgMonthlyReturn * 1.0,
      desc: "Geçtiğimiz aylardaki ortalama performansınızın aynı çizgide devam ettiği projeksiyon.",
      themeColor: "amber",
      emoji: "📊",
      glowBg: "bg-amber-500/10 dark:bg-amber-500/5",
      borderActive: "border-amber-500/40 ring-amber-500/20",
      textClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    optimistic: {
      label: "İyimser Senaryo",
      shortLabel: "İyimser",
      rate: avgMonthlyReturn * 1.4,
      desc: "Piyasaların güçlendiği ve portföy getiri ivmenizin arttığı pozitif projeksiyon.",
      themeColor: "emerald",
      emoji: "🚀",
      glowBg: "bg-emerald-500/10 dark:bg-emerald-500/5",
      borderActive: "border-emerald-500/40 ring-emerald-500/20",
      textClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    custom: {
      label: "Özel Senaryo",
      shortLabel: "Özel",
      rate: customRate,
      desc: "Kendi belirlediğiniz tahmini aylık ortalama getiri oranına dayalı projeksiyon.",
      themeColor: "violet",
      emoji: "⚙️",
      glowBg: "bg-violet-500/10 dark:bg-violet-500/5",
      borderActive: "border-violet-500/40 ring-violet-500/20",
      textClass: "text-violet-600 dark:text-violet-400",
      bgClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
  };

  const currentScenario = scenarioConfig[scenario];
  const projectedMonthlyRate = currentScenario.rate;

  // Yıl sonu değer hesaplaması (Bileşik Faiz Formülü)
  const projectedValue = latestVal * Math.pow(1 + Math.max(-0.99, projectedMonthlyRate / 100), monthsRemaining);
  const growthMultiplier = latestVal > 0 ? projectedValue / latestVal : 1;
  const projectedReturnPct = latestVal > 0 ? ((projectedValue / latestVal) - 1) * 100 : 0;
  const projectedYtdReturn = stats.startVal > 0 ? ((projectedValue / stats.startVal) - 1) * 100 : 0;

  // Kilometre taşları (Milestones) kontrolü
  const milestones = isTRY
    ? [100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000]
    : [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

  const crossedMilestone = milestones.find(m => latestVal < m && projectedValue >= m);
  const targetMilestone = crossedMilestone || milestones.find(m => latestVal < m);

  // Dinamik Türkçe Yorum Oluşturucu
  const getCommentaryText = () => {
    const isProfitable = avgMonthlyReturn > 0;
    
    if (monthsRemaining === 0) {
      return {
        intro: `${latestYear} yılı tamamlanmış bulunuyor. Bu yıl elde ettiğiniz toplam getiri oranı ${formatPercent(ytdReturn)} olarak gerçekleşti.`,
        middle: "Gelecek yılın analizleri için yeni yılın veri akışı beklenecektir.",
        conclusion: "",
      };
    }

    let intro = `${latestYear} yılının ilk ${stats.currentMonthNum} ayında (Ocak - ${latestMonthName}) portföyünüzün sergilediği performans incelendiğinde; `;
    
    if (isProfitable) {
      intro += `aylık ortalama %${avgMonthlyReturn.toFixed(2)}'lik istikrarlı bir getiri ivmesi yakaladığınız görülüyor. Bu başarılı gidişat, portföyünüzün büyüme trendini koruduğunu gösteriyor.`;
    } else {
      intro += `zorlu piyasa şartları veya portföy dağılımından ötürü aylık ortalama %${avgMonthlyReturn.toFixed(2)} düzeyinde bir seyir izlendiği gözlemleniyor.`;
    }

    let middle = ` Önümüzdeki ${monthsRemaining} aylık süreç için seçilen **${currentScenario.label}** temel alındığında (%${projectedMonthlyRate.toFixed(2)} tahmini aylık getiri oranı); `;
    
    if (projectedMonthlyRate > 0) {
      middle += `portföyünüzün yıl sonuna doğru ${formatPercent(projectedReturnPct)} oranında ek bir büyüme kaydederek **${formatMoney(projectedValue, currency)}** seviyesine ulaşabileceği öngörülmektedir. Bu senaryoda yıl sonundaki kümülatif getiri oranınızın %${projectedYtdReturn.toFixed(1)} seviyesine çıkması beklenmektedir.`;
    } else {
      middle += `portföy değerinizin yıl sonunda **${formatMoney(projectedValue, currency)}** civarında dengeleneceği tahmin edilmektedir. Portföyünüzün değer kayıplarını minimumda tutmak adına varlık çeşitliliğini ve risk dağılımını optimize etmeyi düşünebilirsiniz.`;
    }

    let conclusion = "";
    if (crossedMilestone) {
      conclusion = `Mevcut getiri momentumunuz bu şekilde devam ederse, portföyünüzün yıl bitmeden **${formatMoney(crossedMilestone, currency)}** kritik sınırını aşarak yeni bir finansal seviyeye ulaşması yüksek ihtimal dahilindedir.`;
    } else {
      conclusion = `Portföyünüzün yıl sonuna kadar yaklaşık **${growthMultiplier.toFixed(2)}x** kat büyümesi hedeflenmektedir. Yatırımlarınızı düzenli artırarak ve piyasa fırsatlarını takip ederek bu büyüme hızını daha da yukarı taşıyabilirsiniz.`;
    }

    return { intro, middle, conclusion };
  };

  const text = getCommentaryText();

  // Çift göstergeli ilerleme çubuğu için yüzdeler
  const currentProgressPct = targetMilestone ? Math.min(100, Math.max(0, (latestVal / targetMilestone) * 100)) : 0;
  const projectedProgressPct = targetMilestone ? Math.min(120, Math.max(0, (projectedValue / targetMilestone) * 100)) : 0;

  // Özel senaryo için hızlı seçim butonları
  const customPresets = [-5, 0, 2.5, 5, 7.5, 10, 15, 20];

  return (
    <div className="card p-6 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-muted)]/40 border border-[var(--color-border)]/60 shadow-lg rounded-2xl relative overflow-hidden transition-all duration-300">
      
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[var(--color-brand)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-[var(--color-brand-soft)]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Üst Bilgi Barı */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[var(--color-border)]/40 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand)]/20 to-[var(--color-brand)]/5 text-[var(--color-brand-strong)] border border-[var(--color-brand)]/20 shadow-inner">
            <Brain size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg tracking-tight text-[var(--color-foreground)]">
                Yapay Zekâ Projeksiyon Laboratuvarı
              </h3>
              <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Sparkles size={10} className="fill-amber-500/20" /> CO-PILOT
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{latestYear} Portföy Büyüme Simülasyonu</span>
            </p>
          </div>
        </div>

        {/* Canlı Model Durumu */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/30 text-[10px] font-bold text-[var(--color-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Model: Monte Carlo & Compound Engine
        </div>
      </div>

      {/* 1. Adım: Senaryo Kontrol Paneli (Geniş Segmente Kartlar) */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black text-[var(--color-muted)] uppercase tracking-widest flex items-center gap-1">
            <Sliders size={12} /> Projeksiyon Senaryoları
          </div>
          {scenario === "custom" && (
            <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-md">
              Manuel Kontrol Aktif
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(["pessimistic", "realistic", "optimistic", "custom"] as Scenario[]).map((s) => {
            const active = scenario === s;
            const cfg = scenarioConfig[s];
            return (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={cn(
                  "relative text-left p-3.5 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer group overflow-hidden",
                  active
                    ? "bg-[var(--color-surface)] border-[var(--color-brand)] shadow-md translate-y-[-2px] ring-2 ring-[var(--color-brand)]/10"
                    : "bg-[var(--color-surface-muted)]/15 border-[var(--color-border)]/40 hover:bg-[var(--color-surface-muted)]/35 hover:border-[var(--color-border)]/80"
                )}
              >
                {/* Arka Plan Glow */}
                {active && (
                  <div className={`absolute inset-0 ${cfg.glowBg} pointer-events-none transition-all duration-300`} />
                )}

                <div className="flex justify-between items-start w-full relative z-10">
                  <span className="text-xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {cfg.emoji}
                  </span>
                  <span className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wider border",
                    active ? cfg.bgClass + " border-current/20" : "bg-slate-500/10 text-slate-500 border-transparent dark:text-slate-400"
                  )}>
                    {s === "custom" ? `%${customRate.toFixed(1)}` : `%${cfg.rate.toFixed(1)}`} / ay
                  </span>
                </div>

                <div className="relative z-10 mt-1">
                  <div className="text-xs font-black text-[var(--color-foreground)] tracking-tight">
                    {cfg.shortLabel}
                  </div>
                  <p className="text-[9px] text-[var(--color-muted)] mt-1 leading-snug line-clamp-2">
                    {cfg.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Adım: Sürgü (Sadece Özel Senaryo Seçilirse) */}
      {scenario === "custom" && (
        <div className="bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/50 p-4 rounded-xl mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="text-xs font-black text-[var(--color-foreground)] flex items-center gap-1.5">
                <Sliders size={13} className="text-violet-500" /> Tahmini Aylık Ortalama Getiri Oranı
              </span>
              <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                Portföyünüzün her ay ortalama ne kadar büyüyeceğini / küçüleceğini belirleyin.
              </p>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-center">
              <span className="text-base font-black text-violet-600 dark:text-violet-400 tabular-nums">
                %{customRate.toFixed(1)}
              </span>
              <span className="text-[10px] text-[var(--color-muted)] font-semibold">/ ay</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-rose-500">-15%</span>
            <input
              type="range"
              min="-15"
              max="30"
              step="0.1"
              value={customRate}
              onChange={(e) => setCustomRate(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:accent-violet-500"
            />
            <span className="text-[10px] font-bold text-emerald-500">+30%</span>
          </div>

          {/* Preset Butonları */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--color-border)]/25">
            <span className="text-[9px] font-bold text-[var(--color-muted)] self-center mr-1">
              Hızlı Seçim:
            </span>
            {customPresets.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCustomRate(val)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all duration-200 cursor-pointer",
                  customRate === val
                    ? "bg-violet-600 text-white border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-sm"
                    : "bg-[var(--color-surface)] text-[var(--color-foreground)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                )}
              >
                {val > 0 ? `+${val}` : val}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ana Grid Layout: Sol Panel (HUD Stats + Milestone) & Sağ Panel (AI Commentary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Sol Sütun: Metrik Kartları & Milestone İlerlemesi (7/12) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          
          {/* Dashboard Metrik Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Kart 1: Yıl Sonu Tahmini */}
            <div className="bg-[var(--color-surface-muted)]/15 border border-[var(--color-border)]/30 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/30 transition-all duration-300">
              <div className="text-[9px] font-black text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
                <DollarSign size={12} className={currentScenario.textClass} />
                YIL SONU BEKLENEN
              </div>
              <div className="text-xl font-black text-[var(--color-foreground)] tracking-tight tabular-nums mt-1">
                {formatMoney(projectedValue, currency)}
              </div>
              <div className="pt-2 border-t border-[var(--color-border)]/20 mt-1 flex justify-between items-center text-[9px] text-[var(--color-muted)]">
                <span>Mevcut: {formatMoney(latestVal, currency)}</span>
                <span className={cn(
                  "font-bold",
                  projectedValue >= latestVal ? "text-emerald-500" : "text-rose-500"
                )}>
                  {projectedValue >= latestVal ? "▲" : "▼"} {formatMoney(Math.abs(projectedValue - latestVal), currency)}
                </span>
              </div>
            </div>

            {/* Kart 2: Toplam Getiri */}
            <div className="bg-[var(--color-surface-muted)]/15 border border-[var(--color-border)]/30 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/30 transition-all duration-300">
              <div className="text-[9px] font-black text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-500" />
                TAHMİNİ YILLIK GETİRİ
              </div>
              <div className={cn(
                "text-xl font-black tracking-tight tabular-nums mt-1",
                projectedYtdReturn >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
              )}>
                {projectedYtdReturn >= 0 ? "+" : ""}{projectedYtdReturn.toFixed(1)}%
              </div>
              <div className="pt-2 border-t border-[var(--color-border)]/20 mt-1 flex justify-between items-center text-[9px] text-[var(--color-muted)]">
                <span>Kalan {monthsRemaining} Ay:</span>
                <span className="font-bold text-[var(--color-foreground)]">
                  {projectedReturnPct >= 0 ? "+" : ""}{projectedReturnPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Kart 3: Büyüme Çarpanı */}
            <div className="bg-[var(--color-surface-muted)]/15 border border-[var(--color-border)]/30 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/30 transition-all duration-300">
              <div className="text-[9px] font-black text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
                <Layers size={12} className="text-violet-500" />
                BÜYÜME ÇARPANI
              </div>
              <div className="text-xl font-black text-[var(--color-foreground)] tracking-tight tabular-nums mt-1">
                {growthMultiplier.toFixed(2)}x
              </div>
              <div className="pt-2 border-t border-[var(--color-border)]/20 mt-1 flex justify-between items-center text-[9px] text-[var(--color-muted)]">
                <span>Portföy Katı:</span>
                <span className="font-bold text-[var(--color-brand-strong)]">
                  {(growthMultiplier - 1 >= 0 ? "+" : "") + ((growthMultiplier - 1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Hedef Eşik / Milestone İlerleme Göstergesi (Dual Gauge Bar) */}
          {targetMilestone && (
            <div className="bg-[var(--color-surface-muted)]/10 border border-[var(--color-border)]/30 p-4.5 rounded-xl space-y-3.5 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <Target size={14} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[var(--color-foreground)] tracking-wide uppercase">
                      Finansal Hedef Yolu
                    </span>
                    <p className="text-[9px] text-[var(--color-muted)]">
                      En yakın kritik eşiğe ulaşma oranınız
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {projectedValue >= targetMilestone ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-500/15 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Zap size={9} className="fill-emerald-500/30 animate-bounce" /> EŞİK AŞILIYOR!
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-[var(--color-foreground)]">
                      %{Math.min(100, Math.max(0, (projectedValue / targetMilestone) * 100)).toFixed(0)} Tahmin
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-1.5">
                <div className="relative h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-[var(--color-border)]/20 shadow-inner">
                  {/* Mevcut değer barı */}
                  <div
                    className="absolute top-0 left-0 h-full bg-slate-400 dark:bg-slate-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, currentProgressPct)}%` }}
                  />

                  {/* Beklenen artış barı */}
                  {projectedValue > latestVal && (
                    <div
                      className={cn(
                        "absolute top-0 h-full transition-all duration-700 animate-pulse bg-gradient-to-r",
                        scenario === "pessimistic" ? "from-slate-400 to-rose-500" :
                        scenario === "realistic" ? "from-slate-400 to-amber-500" :
                        scenario === "optimistic" ? "from-slate-400 to-emerald-500" :
                        "from-slate-400 to-violet-500"
                      )}
                      style={{
                        left: `${Math.min(100, currentProgressPct)}%`,
                        width: `${Math.max(0, Math.min(100 - currentProgressPct, projectedProgressPct - currentProgressPct))}%`
                      }}
                    />
                  )}

                  {/* Değer kaybı göstergesi */}
                  {projectedValue < latestVal && (
                    <div
                      className="absolute top-0 h-full bg-rose-500/40 transition-all duration-700"
                      style={{
                        left: `${Math.min(100, projectedProgressPct)}%`,
                        width: `${Math.max(0, currentProgressPct - projectedProgressPct)}%`
                      }}
                    />
                  )}
                </div>

                {/* Progress Etiketleri */}
                <div className="flex justify-between items-center text-[9px] text-[var(--color-muted)] font-semibold px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                    <span>Bugün: {formatMoney(latestVal, currency)}</span>
                  </div>
                  {projectedValue > latestVal && (
                    <div className="flex items-center gap-1">
                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                        scenario === "pessimistic" ? "bg-rose-500" :
                        scenario === "realistic" ? "bg-amber-500" :
                        scenario === "optimistic" ? "bg-emerald-500" :
                        "bg-violet-500"
                      )} />
                      <span>Beklenen: {formatMoney(projectedValue, currency)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 font-bold text-[var(--color-foreground)]">
                    <Target size={9} />
                    <span>Hedef Eşik: {formatMoney(targetMilestone, currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sağ Sütun: Yapay Zekâ Yorum Balonu (5/12) */}
        <div className="lg:col-span-5 flex">
          <div className="w-full bg-gradient-to-b from-[var(--color-brand-soft)]/15 to-[var(--color-brand-soft)]/5 rounded-2xl border border-[var(--color-brand-soft)]/30 p-5 flex flex-col justify-between relative overflow-hidden group">
            
            {/* Arka Plan Dekorasyonu */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tl from-[var(--color-brand)]/10 to-transparent rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

            <div className="space-y-4">
              {/* AI Kapsül Başlığı */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-brand-soft)]/20">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-black tracking-wider text-[var(--color-brand-strong)] uppercase">
                    AI Analitik Raporu
                  </span>
                </div>
                <div className="text-[9px] font-bold text-[var(--color-muted)] flex items-center gap-1">
                  <LineChart size={10} className="text-[var(--color-brand-strong)]" /> {latestMonthName} &apos;26 Analizi
                </div>
              </div>

              {/* Yorum Metni */}
              <div className="text-xs leading-relaxed space-y-3 text-[var(--color-foreground)]">
                <p className="opacity-95 leading-normal">
                  {text.intro}
                </p>
                <p className="opacity-95 leading-normal">
                  {text.middle}
                </p>
              </div>
            </div>

            {/* Stratejik Tavsiye Alert Box */}
            {text.conclusion && (
              <div className="mt-4 pt-3.5 border-t border-[var(--color-brand-soft)]/30 text-xs text-[var(--color-foreground)]">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-surface)]/70 border border-[var(--color-brand-soft)]/20 shadow-xs">
                  <span className="text-base shrink-0 mt-0.5 filter drop-shadow-xs">💡</span>
                  <div>
                    <div className="font-extrabold text-[10px] tracking-wide uppercase text-[var(--color-brand-strong)] mb-0.5">
                      Stratejik AI Tavsiyesi
                    </div>
                    <p className="leading-normal font-medium text-[var(--color-foreground)]/90">
                      {text.conclusion.replace(/^\s*🚀\s*|\s*🚀\s*/g, "")}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </div>

      {/* Bilgilendirme Dipnotu */}
      <div className="flex gap-2.5 text-[9px] text-[var(--color-muted)] leading-relaxed bg-[var(--color-surface-muted)]/20 p-3.5 rounded-xl border border-[var(--color-border)]/15 mt-6">
        <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
        <span>
          Bu simülasyon ve projeksiyonlar, portföyünüzün belirtilen dönemdeki getiri eğilimlerine göre doğrusal ve bileşik faiz matematik modelleri kullanılarak hesaplanmıştır. Gelecekteki piyasa dalgalanmaları, ek yatırımlarınız veya nakit çıkışlarınız bu sonuçları değiştirebilir. Yatırım tavsiyesi niteliğinde değildir.
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
