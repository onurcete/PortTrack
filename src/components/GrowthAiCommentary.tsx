"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign,
  Briefcase,
  Layers,
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
    
    // YTD (Yıl Başından Beri) Hesapla: Yılın ilk ayının başı (yani bir önceki yılın sonu) referans alınır
    const prevYearDecKey = `${Number(latestYear) - 1}-12`;
    const prevYearDec = seriesByMonth.get(prevYearDecKey);
    const startVal = prevYearDec 
      ? (isTRY ? prevDecValue(prevYearDec, isTRY) : prevDecValue(prevYearDec, isTRY))
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
      rate: avgMonthlyReturn * 0.4,
      desc: "Piyasa koşullarının yavaşladığı veya düzeltme yaptığı muhafazakar projeksiyon.",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      indicatorColor: "bg-rose-500",
    },
    realistic: {
      label: "Gerçekçi Senaryo",
      rate: avgMonthlyReturn * 1.0,
      desc: "Geçtiğimiz aylardaki ortalama performansınızın aynı çizgide devam ettiği projeksiyon.",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      indicatorColor: "bg-amber-500",
    },
    optimistic: {
      label: "İyimser Senaryo",
      rate: avgMonthlyReturn * 1.4,
      desc: "Piyasaların güçlendiği ve portföy getiri ivmenizin arttığı pozitif projeksiyon.",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-900/30",
      indicatorColor: "bg-emerald-500",
    },
    custom: {
      label: "Özel Senaryo",
      rate: customRate,
      desc: "Kendi belirlediğiniz tahmini aylık ortalama getiri oranına dayalı projeksiyon.",
      color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
      indicatorColor: "bg-violet-500",
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
      conclusion = ` 🚀 **Önemli Eşik Hedefi:** Mevcut getiri momentumunuz bu şekilde devam ederse, portföyünüzün yıl bitmeden **${formatMoney(crossedMilestone, currency)}** kritik sınırını aşarak yeni bir finansal seviyeye ulaşması yüksek ihtimal dahilindedir.`;
    } else {
      conclusion = ` Portföyünüzün yıl sonuna kadar yaklaşık **${growthMultiplier.toFixed(2)}x** kat büyümesi hedeflenmektedir. Yatırımlarınızı düzenli artırarak ve piyasa fırsatlarını takip ederek bu büyüme hızını daha da yukarı taşıyabilirsiniz.`;
    }

    return { intro, middle, conclusion };
  };

  const text = getCommentaryText();

  return (
    <div className="card p-6 space-y-6 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-brand-soft)]/10 border border-[var(--color-border)]/50 shadow-md rounded-2xl relative overflow-hidden">
      {/* Dekoratif Işıltı Efekti */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[var(--color-brand)]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Başlık Bölümü */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)]/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] shrink-0">
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
      </div>

      {/* Senaryo Seçim Sekmeleri */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider">
          <span>Projeksiyon Senaryosu</span>
          <span className="text-[10px] text-[var(--color-brand-strong)] font-semibold">Tahmini Aylık Getiri: %{projectedMonthlyRate.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[var(--color-surface-muted)]/50">
          {(["pessimistic", "realistic", "optimistic", "custom"] as Scenario[]).map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={cn(
                "py-2 px-1 rounded-lg text-[11px] font-black transition-all cursor-pointer text-center whitespace-nowrap",
                scenario === s
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm border border-[var(--color-border)]/30"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              {s === "pessimistic" ? "📉 Kötümser" : s === "realistic" ? "📊 Gerçekçi" : s === "optimistic" ? "🚀 İyimser" : "⚙️ Özel"}
            </button>
          ))}
        </div>

        {/* Özel Senaryo Giriş Bölümü */}
        {scenario === "custom" && (
          <div className="bg-[var(--color-surface-muted)]/40 p-4 rounded-xl border border-[var(--color-border)]/20 flex flex-col sm:flex-row items-center gap-4 transition-all">
            <div className="flex-1 w-full space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-[var(--color-muted)]">
                <span>Özel Aylık Getiri Oranı</span>
                <span className="text-[var(--color-brand-strong)] font-extrabold">% {customRate.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-15"
                max="30"
                step="0.1"
                value={customRate}
                onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--color-brand)]"
              />
            </div>
            <div className="w-24 shrink-0">
              <input
                type="number"
                min="-99"
                max="999"
                step="0.1"
                value={customRate}
                onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-center font-bold outline-none focus:border-[var(--color-brand)] tabular-nums"
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-[var(--color-muted)] leading-relaxed italic px-1">
          💡 {currentScenario.desc}
        </p>
      </div>

      {/* Projeksiyon Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Değer Projeksiyonu */}
        <div className="bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/20 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/20 transition-all">
          <div className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <DollarSign size={11} className="text-blue-500" />
            Yıl Sonu Beklenen Değer
          </div>
          <div className="text-xl font-black text-[var(--color-foreground)] tracking-tight tabular-nums">
            {formatMoney(projectedValue, currency)}
          </div>
          <div className="text-[10px] text-[var(--color-muted)] flex items-center gap-1 pt-1 border-t border-[var(--color-border)]/10">
            <span>Mevcut: {formatMoney(latestVal, currency)}</span>
            <ArrowRight size={10} className="text-[var(--color-muted)]" />
          </div>
        </div>

        {/* Getiri Projeksiyonu */}
        <div className="bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/20 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/20 transition-all">
          <div className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={11} className="text-emerald-500" />
            Tahmini Yıllık Getiri (YTD)
          </div>
          <div className={cn(
            "text-xl font-black tracking-tight tabular-nums",
            projectedYtdReturn >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
          )}>
            {projectedYtdReturn >= 0 ? "+" : ""}{projectedYtdReturn.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[var(--color-muted)] pt-1 border-t border-[var(--color-border)]/10">
            Kalan {monthsRemaining} Ay Getirisi: {projectedReturnPct >= 0 ? "+" : ""}{projectedReturnPct.toFixed(1)}%
          </div>
        </div>

        {/* Büyüme Çarpanı */}
        <div className="bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/20 p-4 rounded-xl space-y-1 relative group hover:border-[var(--color-brand)]/20 transition-all">
          <div className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1">
            <Layers size={11} className="text-violet-500" />
            Portföy Büyüme Çarpanı
          </div>
          <div className="text-xl font-black text-[var(--color-foreground)] tracking-tight tabular-nums">
            {growthMultiplier.toFixed(2)}x
          </div>
          <div className="text-[10px] text-[var(--color-muted)] pt-1 border-t border-[var(--color-border)]/10">
            Son {monthsRemaining} ay içerisindeki çarpan
          </div>
        </div>
      </div>

      {/* Yorum Paragrafı */}
      <div className="bg-gradient-to-r from-[var(--color-brand-soft)]/20 to-transparent p-4 rounded-xl border border-[var(--color-brand-soft)]/40 text-xs leading-relaxed space-y-2">
        <p className="text-[var(--color-foreground)]">
          {text.intro} {text.middle}
        </p>
        {text.conclusion && (
          <p className="text-[var(--color-foreground)] mt-2 font-medium">
            {text.conclusion}
          </p>
        )}
      </div>

      {/* Bilgilendirme Notu */}
      <div className="flex gap-2 text-[10px] text-[var(--color-muted)] leading-normal bg-[var(--color-surface-muted)]/30 p-3 rounded-lg border border-[var(--color-border)]/10">
        <Info size={14} className="shrink-0 text-slate-400 mt-0.5" />
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
