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
      shortDesc: "Muhafazakar Projeksiyon",
      rate: avgMonthlyReturn * 0.4,
      icon: TrendingDown,
      iconActiveBg: "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400",
      textClass: "text-rose-600 dark:text-rose-400",
    },
    realistic: {
      label: "Gerçekçi Senaryo",
      shortLabel: "Gerçekçi",
      shortDesc: "Mevcut Trend Çizgisi",
      rate: avgMonthlyReturn * 1.0,
      icon: Activity,
      iconActiveBg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400",
      textClass: "text-amber-600 dark:text-amber-400",
    },
    optimistic: {
      label: "İyimser Senaryo",
      shortLabel: "İyimser",
      shortDesc: "Pozitif Büyüme İvmesi",
      rate: avgMonthlyReturn * 1.4,
      icon: TrendingUp,
      iconActiveBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
      textClass: "text-emerald-600 dark:text-emerald-400",
    },
    custom: {
      label: "Özel Senaryo",
      shortLabel: "Özel",
      shortDesc: "Kişisel Getiri Oranı",
      rate: customRate,
      icon: Sliders,
      iconActiveBg: "bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400",
      textClass: "text-violet-600 dark:text-violet-400",
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

  // Özel senaryo preset oranları
  const customPresets = [-5, 0, 2.5, 5, 7.5, 10, 15, 20];

  return (
    <div className="card p-6 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/50 shadow-md rounded-2xl relative overflow-hidden">
      {/* Dekoratif Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--color-brand)]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Başlık Bölümü */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)]/40 pb-4 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shrink-0">
          <Brain size={22} className="animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base text-[var(--color-foreground)]">Yapay Zekâ Büyüme & Gelecek Projeksiyonu</h3>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={9} /> PRO
            </span>
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Geçmiş aylık performansınıza dayanarak {latestYear} yıl sonu portföy tahminleri
          </p>
        </div>
      </div>

      {/* Grid Layout: Sol Panel (Senaryolar & Slider) & Sağ Panel (Metrikler & Yorumlar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sol Sütun: Kontroller (3/12) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider mb-1">
            Projeksiyon Senaryosu
          </div>
          
          <div className="space-y-2">
            {(["pessimistic", "realistic", "optimistic", "custom"] as Scenario[]).map((s) => {
              const active = scenario === s;
              const cfg = scenarioConfig[s];
              const IconComponent = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer",
                    active
                      ? "bg-[var(--color-surface)] border-[var(--color-brand)]/40 shadow-xs ring-1 ring-[var(--color-brand)]/20"
                      : "bg-[var(--color-surface-muted)]/10 border-[var(--color-border)]/40 hover:bg-[var(--color-surface-muted)]/30"
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
                    active ? cfg.iconActiveBg : "bg-[var(--color-surface-muted)]/30 border-[var(--color-border)]/30 text-[var(--color-muted)]"
                  )}>
                    <IconComponent size={15} />
                  </div>
                  <div className="min-w-0 flex-1 flex justify-between items-center pr-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--color-foreground)]">{cfg.shortLabel}</span>
                      <span className="text-[9px] text-[var(--color-muted)] line-clamp-1">{cfg.shortDesc}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-extrabold tracking-tight tabular-nums",
                      active ? cfg.textClass : "text-[var(--color-muted)]"
                    )}>
                      {s === "custom" ? `%${customRate.toFixed(1)}` : `%${cfg.rate.toFixed(1)}`} / ay
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Özel Senaryo Sürgüsü */}
          {scenario === "custom" && (
            <div className="bg-[var(--color-surface)] p-3.5 rounded-xl border border-[var(--color-border)]/50 space-y-3 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center text-[10px] font-bold text-[var(--color-muted)]">
                <span>Özel Aylık Getiri Oranı</span>
                <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400">% {customRate.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-15"
                  max="30"
                  step="0.1"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-600 dark:accent-violet-500"
                />
                <input
                  type="number"
                  min="-99"
                  max="999"
                  step="0.1"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                  className="w-14 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]/30 px-1.5 py-1 text-[11px] text-center font-bold outline-none focus:border-[var(--color-brand)] tabular-nums"
                />
              </div>
              {/* Preset Butonları */}
              <div className="flex flex-wrap gap-1 pt-1 border-t border-[var(--color-border)]/20">
                {customPresets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCustomRate(val)}
                    className={cn(
                      "px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer",
                      customRate === val
                        ? "bg-violet-600 text-white dark:bg-violet-500"
                        : "bg-[var(--color-surface-muted)]/40 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]/80"
                    )}
                  >
                    {val > 0 ? `+${val}` : val}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ Sütun: Sonuçlar (9/12) */}
        <div className="lg:col-span-9 space-y-4">
          <div className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase tracking-wider mb-1">
            Projeksiyon Sonuçları
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Değer Projeksiyonu */}
            <div className="bg-[var(--color-surface-muted)]/15 border border-[var(--color-border)]/30 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/20 transition-all">
              <div className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
                <DollarSign size={11} className={currentScenario.textClass} />
                Yıl Sonu Beklenen
              </div>
              <div className="text-lg font-black text-[var(--color-foreground)] tracking-tight tabular-nums">
                {formatMoney(projectedValue, currency)}
              </div>
              <div className="text-[9px] text-[var(--color-muted)] flex justify-between items-center pt-1.5 border-t border-[var(--color-border)]/10">
                <span>Mevcut: {formatMoney(latestVal, currency)}</span>
                <span className={cn(
                  "font-bold",
                  projectedValue >= latestVal ? "text-emerald-500" : "text-rose-500"
                )}>
                  {projectedValue >= latestVal ? "▲" : "▼"} {formatPercent(((projectedValue / latestVal) - 1) * 100)}
                </span>
              </div>
            </div>

            {/* Getiri Projeksiyonu */}
            <div className="bg-[var(--color-surface-muted)]/15 border border-[var(--color-border)]/30 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/20 transition-all">
              <div className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={11} className="text-emerald-500" />
                Tahmini Yıllık Getiri
              </div>
              <div className={cn(
                "text-lg font-black tracking-tight tabular-nums",
                projectedYtdReturn >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
              )}>
                {projectedYtdReturn >= 0 ? "+" : ""}{projectedYtdReturn.toFixed(1)}%
              </div>
              <div className="text-[9px] text-[var(--color-muted)] pt-1.5 border-t border-[var(--color-border)]/10 flex justify-between">
                <span>Kalan {monthsRemaining} Ay:</span>
                <span className="font-bold text-[var(--color-foreground)]">{projectedReturnPct >= 0 ? "+" : ""}{projectedReturnPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* Büyüme Çarpanı */}
            <div className="bg-[var(--color-surface-muted)]/15 border border-[var(--color-border)]/30 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/20 transition-all">
              <div className="text-[9px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
                <Layers size={11} className="text-violet-500" />
                Büyüme Çarpanı
              </div>
              <div className="text-lg font-black text-[var(--color-foreground)] tracking-tight tabular-nums">
                {growthMultiplier.toFixed(2)}x
              </div>
              <div className="text-[9px] text-[var(--color-muted)] pt-1.5 border-t border-[var(--color-border)]/10 flex justify-between">
                <span>Kalan Artış:</span>
                <span className="font-bold text-[var(--color-brand-strong)]">{(growthMultiplier - 1 >= 0 ? "+" : "") + ((growthMultiplier - 1) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* AI Yorum Balonu */}
          <div className="bg-gradient-to-br from-[var(--color-brand-soft)]/20 to-[var(--color-brand-soft)]/5 p-4.5 rounded-2xl border border-[var(--color-brand-soft)]/35 text-xs leading-relaxed space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-brand-strong)] uppercase tracking-wider border-b border-[var(--color-brand-soft)]/20 pb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Yapay Zekâ Analiz Raporu
            </div>
            
            <div className="space-y-2 text-[var(--color-foreground)]/90">
              <p>{text.intro}</p>
              <p>{text.middle}</p>
            </div>
            

          </div>
        </div>

      </div>

      {/* Bilgilendirme Notu */}
      <div className="flex gap-2 text-[9px] text-[var(--color-muted)] leading-normal bg-[var(--color-surface-muted)]/30 p-3 rounded-xl border border-[var(--color-border)]/10 mt-6">
        <Info size={13} className="shrink-0 text-slate-400 mt-0.5" />
        <span>
          Bu analiz ve projeksiyonlar, portföyünüzün belirtilen dönemdeki getiri eğilimlerine göre doğrusal ve bileşik faiz matematik modelleri kullanılarak hesaplanmıştır. Gelecekteki piyasa dalgalanmaları, ek yatırımlarınız veya nakit çıkışlarınız bu sonuçları değiştirebilir. Yatırım tavsiyesi niteliğinde değildir.
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
