"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Table,
  Upload,
  BarChart2,
  Users,
  Brain,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Layers,
  Sparkles,
  PieChart,
  FileSpreadsheet,
  Calendar,
  Lock,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  GitCompareArrows,
  Activity,
  Check,
  AlertTriangle,
  RotateCcw,
  Zap,
} from "lucide-react";
import { formatMoney, formatPercent, cn } from "@/lib/utils";

export function LandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  useEffect(() => {
    if (!isLoggedIn && typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-987323960/RjpCCJK2qeEcELi85dYD",
        value: 1.0,
        currency: "TRY",
      });
    }
  }, [isLoggedIn]);

  // Simulator State
  const [initialBalance, setInitialBalance] = useState<number>(100000);
  const [monthlyAddition, setMonthlyAddition] = useState<number>(10000);
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(35);
  const [targetYears, setTargetYears] = useState<number>(5);

  // Compound Interest Calculation
  const monthlyRate = annualReturnRate / 12 / 100;
  const totalMonths = targetYears * 12;

  let futureValue = initialBalance * Math.pow(1 + monthlyRate, totalMonths);
  for (let i = 1; i <= totalMonths; i++) {
    futureValue += monthlyAddition * Math.pow(1 + monthlyRate, totalMonths - i);
  }

  const totalInvested = initialBalance + monthlyAddition * totalMonths;
  const netProfit = Math.max(0, futureValue - totalInvested);
  const growthMultiplier = totalInvested > 0 ? futureValue / totalInvested : 1;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-foreground)] selection:bg-[var(--color-brand)] selection:text-white font-sans">
      {/* 1. Hero Section */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[30rem] bg-gradient-to-tr from-[var(--color-brand)]/15 via-indigo-500/10 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
          {/* Main Title & Subtitle */}
          <div className="text-center space-y-4 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30 text-[11px] font-extrabold text-[var(--color-brand-strong)] shadow-2xs">
              <Table size={13} className="text-[var(--color-brand)]" />
              <span>BIST · TEFAS · Yabancı Borsa · Kripto · Döviz · BES Takip Platformu</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-[var(--color-foreground)]">
              Tüm Yatırımlarınızı Tek Bir{" "}
              <span className="bg-gradient-to-r from-[var(--color-brand)] via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                Güçlü Merkezde
              </span>{" "}
              Anlık İzleyin.
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[var(--color-muted)] max-w-3xl mx-auto font-medium leading-relaxed">
              BIST Hisseleri, TEFAS Fonları, Yabancı Borsalar (Nasdaq), Kripto, Döviz ve BES yatırımlarınızı detaylı pozisyon tabloları, ay ay performans matrisleri, esnek CSV ekstre aktarımı ve kural tabanlı 0-100 teknik sağlık skorlarıyla yönetin.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={isLoggedIn ? "/" : "/register"}
                className="btn btn-primary text-sm font-black px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoggedIn ? "Portföy Paneline Git" : "Ücretsiz Hesabınızı Oluşturun"}
                <ArrowRight size={16} />
              </Link>
              {!isLoggedIn && (
                <a
                  href="/api/auth/demo"
                  className="inline-flex items-center gap-2 text-sm font-extrabold px-6 py-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-brand)]/40 text-[var(--color-foreground)] transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm"
                >
                  <Zap size={15} className="text-[var(--color-brand)]" />
                  Demo'yu Dene
                </a>
              )}
              {!isLoggedIn && (
                <Link
                  href="/login"
                  className="btn btn-outline text-sm font-extrabold px-6 py-3.5 rounded-2xl hover:bg-[var(--color-surface-muted)] transition-all"
                >
                  Giriş Yap
                </Link>
              )}
            </div>
          </div>

          {/* Screenshot #7 Visual Mockup: Genel Bakış Dashboard */}
          <div className="pt-4 max-w-5xl mx-auto">
            <div className="card p-5 sm:p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl text-left space-y-4 relative group hover:border-[var(--color-brand)]/40 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]/40 text-xs font-bold text-[var(--color-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[var(--color-foreground)]">Genel Bakış</span>
                  <span className="text-[10px] text-[var(--color-muted)]">Son güncelleme: 26.07.2026 03:00:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]/40 text-[11px] font-bold">
                    📝 Notlar
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-[11px] font-extrabold">
                    1 USD = 47.33 ₺
                  </span>
                </div>
              </div>

              {/* Grid Metric Cards from Screenshot #7 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Portfolio Card */}
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/40 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">TOPLAM PORTFÖY</span>
                  <div className="text-2xl font-black tabular-nums text-[var(--color-foreground)] tracking-tight">3.192.206 ₺</div>
                  <div className="text-xs font-bold text-[var(--color-muted)]">$67.449</div>
                  <div className="pt-1 border-t border-[var(--color-border)]/30 text-[10px] font-extrabold text-[var(--color-profit)]">
                    BUGÜN +67,51 ₺ (+0,00%)
                  </div>
                  <div className="text-[10px] space-y-0.5 pt-1 text-[var(--color-muted)] font-semibold">
                    <div className="flex justify-between"><span>● TEFAS Fon</span><span className="text-[var(--color-loss)]">-4.377 ₺ (-0,21%)</span></div>
                    <div className="flex justify-between"><span>● Yabancı Borsa</span><span className="text-[var(--color-loss)]">-1.931 ₺ (-1,17%)</span></div>
                    <div className="flex justify-between"><span>● Kıymetli Maden</span><span className="text-[var(--color-profit)]">+396,00 ₺ (+0,55%)</span></div>
                    <div className="flex justify-between"><span>● Kripto</span><span className="text-[var(--color-profit)]">+77,48 ₺ (+0,17%)</span></div>
                  </div>
                </div>

                {/* Hafta Card */}
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/40 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">HAFTA (SON 5 İŞLEM GÜNÜ)</span>
                  <div className="text-2xl font-black tabular-nums text-[var(--color-profit)] tracking-tight">+0,63%</div>
                  <div className="text-xs font-bold text-[var(--color-profit)]">+19.984 ₺</div>
                  <div className="pt-2 border-t border-[var(--color-border)]/30 text-[10px] space-y-1 font-semibold text-[var(--color-muted)]">
                    <div className="flex justify-between"><span>TEFAS</span><span className="text-[var(--color-profit)]">+1,00%</span></div>
                    <div className="flex justify-between"><span>Y.Borsa</span><span className="text-[var(--color-loss)]">-2,01%</span></div>
                    <div className="flex justify-between"><span>K.Maden</span><span className="text-[var(--color-profit)]">+4,95%</span></div>
                    <div className="flex justify-between"><span>Kripto</span><span className="text-[var(--color-loss)]">-0,09%</span></div>
                  </div>
                </div>

                {/* MTD & YTD Cards */}
                <div className="space-y-3">
                  <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40 space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-[var(--color-muted)]">MTD - CARİ AY</span>
                    <div className="text-lg font-black text-[var(--color-profit)] tabular-nums">+3,25%</div>
                    <div className="text-[10px] font-bold text-[var(--color-profit)]">+100.530 ₺</div>
                  </div>
                  <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40 space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-[var(--color-muted)]">YTD - YIL BAŞINDAN BERİ</span>
                    <div className="text-lg font-black text-[var(--color-profit)] tabular-nums">+53,75%</div>
                    <div className="text-[10px] font-bold text-[var(--color-profit)]">+1.116.006 ₺</div>
                  </div>
                </div>

                {/* All Time & XIRR Card */}
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/40 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">ALL TIME - TÜM ZAMANLAR</span>
                  <div className="text-2xl font-black tabular-nums text-[var(--color-profit)] tracking-tight">+840,98%</div>
                  <div className="text-xs font-bold text-[var(--color-profit)]">+2.852.957 ₺</div>
                  <div className="pt-2 border-t border-[var(--color-border)]/30">
                    <span className="text-[9px] font-extrabold uppercase text-[var(--color-muted)] block">XIRR (İÇ VERİM ORANI)</span>
                    <span className="text-base font-black text-[var(--color-profit)] tabular-nums">+48,21% / yıl</span>
                  </div>
                </div>
              </div>

              {/* Varlık Dağılımı Bar from Screenshot #7 */}
              <div className="p-3 bg-[var(--color-surface-muted)]/20 rounded-xl border border-[var(--color-border)]/40 space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-[var(--color-foreground)]">Varlık Dağılımı</span>
                  <span className="text-[var(--color-foreground)] tabular-nums">3.192.206 ₺</span>
                </div>
                <div className="h-2.5 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex gap-0.5">
                  <div className="h-full bg-purple-500 w-[64.6%]" title="TEFAS Fon %64.6" />
                  <div className="h-full bg-slate-400 w-[26.6%]" title="BES %26.6" />
                  <div className="h-full bg-cyan-500 w-[5.1%]" title="Yabancı Borsa %5.1" />
                  <div className="h-full bg-amber-500 w-[2.3%]" title="Kıymetli Maden %2.3" />
                  <div className="h-full bg-rose-500 w-[1.4%]" title="Kripto %1.4" />
                </div>
                <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[var(--color-muted)] pt-1">
                  <span><strong className="text-purple-400">● TEFAS Fon:</strong> 2.061.256 ₺ (%64,6)</span>
                  <span><strong className="text-slate-300">● BES:</strong> 850.478 ₺ (%26,6)</span>
                  <span><strong className="text-cyan-400">● Yabancı Borsa:</strong> 163.185 ₺ (%5,1)</span>
                  <span><strong className="text-amber-400">● Kıymetli Maden:</strong> 72.670 ₺ (%2,3)</span>
                  <span><strong className="text-rose-400">● Kripto:</strong> 44.618 ₺ (%1,4)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Section 1: Pozisyon Tablosu (Screenshot #8) */}
      <section id="overview-tables" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-y border-[var(--color-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Table size={14} className="text-[var(--color-brand)]" /> Detaylı Pozisyon Tabloları
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Tüm Varlık Türleriniz Tek Tabloda Bir Arada
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Borsa İstanbul hisseleri, TEFAS fonları, Yabancı borsalar (Nasdaq/S&P), Kripto, Döviz ve BES birikimleriniz anlık fiyatlar, ortalama maliyetler ve getiri oranlarıyla izlenir.
            </p>
          </div>

          {/* Screenshot #8 Visual Mockup: Yabancı Borsa Pozisyon Tablosu */}
          <div className="card p-5 sm:p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl max-w-5xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]/40 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">Y</span>
                <span className="text-sm font-extrabold text-[var(--color-foreground)]">Yabancı Borsa</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-muted)]">17 Varlık</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span>GRUP DEĞERİ: <strong className="text-[var(--color-foreground)] tabular-nums">163.185 ₺</strong></span>
                <span>GRUP K/Z: <strong className="text-[var(--color-loss)] tabular-nums">-11.241 ₺</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto border border-[var(--color-border)]/50 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="p-3">Sembol</th>
                    <th className="p-3">Gün</th>
                    <th className="p-3 text-right">Ort. Maliyet</th>
                    <th className="p-3 text-right">Güncel Fiyat</th>
                    <th className="p-3 text-right">Değer</th>
                    <th className="p-3 text-right">Günlük Değişim</th>
                    <th className="p-3 text-right">Kâr / Zarar</th>
                    <th className="p-3 text-right">Getiri %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/30 font-medium tabular-nums">
                  <tr>
                    <td className="p-3 font-black text-[var(--color-foreground)]">SOFI <span className="text-[10px] text-[var(--color-muted)] font-normal">41,047 adet</span></td>
                    <td className="p-3 text-[var(--color-muted)] font-bold">360 g</td>
                    <td className="p-3 text-right">903,33 ₺</td>
                    <td className="p-3 text-right">779,05 ₺</td>
                    <td className="p-3 text-right font-bold">31.978 ₺</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-0,51%</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-5.101 ₺</td>
                    <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold text-[11px]">-13,76%</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-[var(--color-foreground)]">COPX <span className="text-[10px] text-[var(--color-muted)] font-normal">5,82 adet</span></td>
                    <td className="p-3 text-[var(--color-muted)] font-bold">193 g</td>
                    <td className="p-3 text-right">3.720,59 ₺</td>
                    <td className="p-3 text-right">3.678,49 ₺</td>
                    <td className="p-3 text-right font-bold">21.409 ₺</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-0,05%</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-245,03 ₺</td>
                    <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold text-[11px]">-1,13%</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-[var(--color-foreground)]">INTC <span className="text-[10px] text-[var(--color-muted)] font-normal">4,1139 adet</span></td>
                    <td className="p-3 text-[var(--color-muted)] font-bold">275 g</td>
                    <td className="p-3 text-right">2.146,32 ₺</td>
                    <td className="p-3 text-right">4.369,51 ₺</td>
                    <td className="p-3 text-right font-bold">17.976 ₺</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-1,89%</td>
                    <td className="p-3 text-right text-[var(--color-profit)] font-bold">+9.146 ₺</td>
                    <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[11px]">+103,58%</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-[var(--color-foreground)]">SIVE.ST <span className="text-[10px] text-[var(--color-muted)] font-normal">89 adet</span></td>
                    <td className="p-3 text-[var(--color-muted)] font-bold">101 g</td>
                    <td className="p-3 text-right">150,34 ₺</td>
                    <td className="p-3 text-right">152,62 ₺</td>
                    <td className="p-3 text-right font-bold">13.583 ₺</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-6,95%</td>
                    <td className="p-3 text-right text-[var(--color-profit)] font-bold">+202,82 ₺</td>
                    <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[11px]">+1,52%</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-[var(--color-foreground)]">NVST <span className="text-[10px] text-[var(--color-muted)] font-normal">8,465 adet</span></td>
                    <td className="p-3 text-[var(--color-muted)] font-bold">61 g</td>
                    <td className="p-3 text-right">1.080,55 ₺</td>
                    <td className="p-3 text-right">1.246,20 ₺</td>
                    <td className="p-3 text-right font-bold">10.549 ₺</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-1,27%</td>
                    <td className="p-3 text-right text-[var(--color-profit)] font-bold">+1.402 ₺</td>
                    <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[11px]">+15,33%</span></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-black text-[var(--color-foreground)]">OUST <span className="text-[10px] text-[var(--color-muted)] font-normal">4,344 adet</span></td>
                    <td className="p-3 text-[var(--color-muted)] font-bold">230 g</td>
                    <td className="p-3 text-right">1.027,58 ₺</td>
                    <td className="p-3 text-right">1.611,11 ₺</td>
                    <td className="p-3 text-right font-bold">6.999 ₺</td>
                    <td className="p-3 text-right text-[var(--color-loss)] font-bold">-1,22%</td>
                    <td className="p-3 text-right text-[var(--color-profit)] font-bold">+2.535 ₺</td>
                    <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[11px]">+56,79%</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 2: Portföy Gelişimi, Kümülatif Yıllık Özet & Aylık Dağılım (Screenshots #1, #2, #3) */}
      <section id="monthly-matrix" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Calendar size={14} className="text-[var(--color-brand)]" /> Portföy Gelişimi & Getiri Matrisi
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Geçmiş Aylık & Yıllık Getiri Performansı
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Sistemimizde kullanılan gerçek **Portföy Gelişimi** modülü sayesinde yatırımlarınızın her yıl ve her ay kaç % kazandırdığını veya kaybettiğini şeffaf bir biçimde takip edin.
            </p>
          </div>

          <div className="space-y-8">
            {/* Screenshot #1 Visual Mockup: Aylık Portföy Getirisi (%) Grafiği */}
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold border-b border-[var(--color-border)]/40 pb-3">
                <span className="text-[var(--color-foreground)] flex items-center gap-2">
                  <TrendingUp size={16} className="text-[var(--color-brand)]" />
                  Portföy Gelişimi — Aylık Portföy Getirisi (%)
                </span>
                <span className="text-[11px] font-extrabold text-[var(--color-brand-strong)]">Geçmişi Güncelle</span>
              </div>

              {/* Bar Chart Header Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[9px] font-black uppercase text-[var(--color-muted)]">TOPLAM PORTFÖY</span>
                  <div className="text-base font-black text-[var(--color-foreground)]">3.192.198 ₺</div>
                  <div className="text-[10px] text-[var(--color-muted)]">1 Temmuz 2026</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[9px] font-black uppercase text-[var(--color-muted)]">DÖNEM GETİRİSİ</span>
                  <div className="text-base font-black text-[var(--color-profit)]">+2.852.957 ₺</div>
                  <div className="text-[10px] font-bold text-[var(--color-profit)]">+840,98%</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[9px] font-black uppercase text-[var(--color-muted)]">DÖNEM BAŞLANGIÇ</span>
                  <div className="text-base font-black text-[var(--color-foreground)]">339.241 ₺</div>
                  <div className="text-[10px] text-[var(--color-muted)]">1 Ocak 2023</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[9px] font-black uppercase text-[var(--color-muted)]">TOPLAM PORTFÖY ($)</span>
                  <div className="text-base font-black text-[var(--color-foreground)]">$67.448</div>
                  <div className="text-[10px] font-bold text-[var(--color-profit)]">+257,89%</div>
                </div>
              </div>
            </div>

            {/* Screenshot #2 Visual Mockup: Kümülatif Yıllık Özet Tablosu */}
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold border-b border-[var(--color-border)]/40 pb-3">
                <span className="text-[var(--color-foreground)]">Kümülatif Yıllık Özet Tablosu</span>
                <span className="text-[11px] font-bold text-[var(--color-muted)]">Gösterim Başlangıcı: <strong>Tüm Yıllar</strong></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3">YIL</th>
                      <th className="p-3 text-right">● BAŞLANGIÇ (₺)</th>
                      <th className="p-3 text-right">● BİTİŞ (₺)</th>
                      <th className="p-3 text-right">● BAŞLANGIÇ ($)</th>
                      <th className="p-3 text-right">● BİTİŞ ($)</th>
                      <th className="p-3 text-center">● KÜMÜLATİF GETİRİ (₺)</th>
                      <th className="p-3 text-center">● KÜMÜLATİF GETİRİ ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/30 font-bold tabular-nums">
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2021</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">45.927 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">54.359 ₺</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">$6.272</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">$4.090</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+18,36%</span></td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[11px] font-extrabold">-34,78%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2022</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">54.359 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">152.647 ₺</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">$4.090</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">$8.162</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+180,81%</span></td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+99,55%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2023</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">339.241 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">623.833 ₺</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">$18.846</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">$16.203</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+83,89%</span></td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[11px] font-extrabold">-14,02%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2024</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">623.833 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">1.027.045 ₺</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">$16.203</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">$29.343</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+64,63%</span></td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+81,10%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2025</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">1.027.045 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">2.076.191 ₺</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">$29.343</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">$48.338</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+102,15%</span></td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+64,73%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2026</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">2.076.191 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">3.192.198 ₺</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">$48.338</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">$67.448</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+53,75%</span></td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">+39,54%</span></td>
                    </tr>
                    <tr className="bg-[var(--color-surface-muted)]/30 font-black">
                      <td className="p-3 text-[var(--color-brand-strong)]">TOPLAM</td>
                      <td className="p-3 text-right text-[var(--color-brand-strong)]">45.927 ₺</td>
                      <td className="p-3 text-right text-[var(--color-brand-strong)]">3.192.198 ₺</td>
                      <td className="p-3 text-right text-indigo-400">$6.272</td>
                      <td className="p-3 text-right text-indigo-400">$67.448</td>
                      <td className="p-3 text-center"><span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">+6.850,61%</span></td>
                      <td className="p-3 text-center"><span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">+975,47%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Screenshot #3 Visual Mockup: Aylık Dağılım Tablosu */}
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold border-b border-[var(--color-border)]/40 pb-3">
                <div>
                  <span className="text-[var(--color-foreground)] block">Aylık Dağılım Tablosu (2026)</span>
                  <span className="text-[10px] text-[var(--color-muted)] font-normal">Tutar ve önceki aya göre değişim (%)</span>
                </div>
                <span className="text-[11px] font-extrabold text-[var(--color-brand-strong)]">Yıl: 2026</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3">AY</th>
                      <th className="p-3 text-right">● BES</th>
                      <th className="p-3 text-right">● TEFAS FON</th>
                      <th className="p-3 text-right">● YABANCI BORSA</th>
                      <th className="p-3 text-right">● DOVİZ</th>
                      <th className="p-3 text-right">● KIYMETLİ MADEN</th>
                      <th className="p-3 text-right">● KRİPTO</th>
                      <th className="p-3 text-right">DEĞİŞİM</th>
                      <th className="p-3 text-right font-black">TOPLAM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/30 font-medium tabular-nums">
                    <tr>
                      <td className="p-3 font-bold text-[var(--color-foreground)]">2026.01</td>
                      <td className="p-3 text-right"><div>638.400 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +6,4%</div></td>
                      <td className="p-3 text-right"><div>1.545.536 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +12,3%</div></td>
                      <td className="p-3 text-right"><div>31.646 ₺</div><div className="text-[10px] text-rose-500 font-bold">▼ -55,5%</div></td>
                      <td className="p-3 text-right"><div>29.549 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +1,2%</div></td>
                      <td className="p-3 text-right"><div>22.023 ₺</div></td>
                      <td className="p-3 text-right"><div>32.322 ₺</div></td>
                      <td className="p-3 text-right text-emerald-500 font-bold">+223.284 ₺</td>
                      <td className="p-3 text-right font-black"><div>2.299.475 ₺</div><div className="text-[10px] text-emerald-500">▲ +10,8%</div></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[var(--color-foreground)]">2026.07</td>
                      <td className="p-3 text-right"><div>850.478 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +0,5%</div></td>
                      <td className="p-3 text-right"><div>2.061.256 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +7,0%</div></td>
                      <td className="p-3 text-right"><div>163.180 ₺</div><div className="text-[10px] text-rose-500 font-bold">▼ -21,2%</div></td>
                      <td className="p-3 text-right"><div>—</div></td>
                      <td className="p-3 text-right"><div>72.667 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +0,5%</div></td>
                      <td className="p-3 text-right"><div>44.618 ₺</div><div className="text-[10px] text-emerald-500 font-bold">▲ +11,6%</div></td>
                      <td className="p-3 text-right text-emerald-500 font-bold">+100.530 ₺</td>
                      <td className="p-3 text-right font-black"><div>3.192.198 ₺</div><div className="text-[10px] text-emerald-500">▲ +3,3%</div></td>
                    </tr>
                    <tr className="bg-[var(--color-surface-muted)]/30 font-black">
                      <td className="p-3 text-[var(--color-brand-strong)]">2026 Getiri %</td>
                      <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">+41,75%</span></td>
                      <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">+49,81%</span></td>
                      <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">+129,48%</span></td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-right">—</td>
                      <td className="p-3 text-right text-emerald-400">+1.116.006 ₺</td>
                      <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">+53,75%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section 3: Varlık Bazlı Analiz & Teknik Göstergeler (Screenshot #4) */}
      <section id="technical" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-y border-[var(--color-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-profit)] flex items-center justify-center gap-1">
              <Activity size={14} className="text-[var(--color-profit)]" /> Varlık Bazlı Analiz
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Portföy Varlıkları & Teknik Göstergeler
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Her bir varlığınızın portföydeki ağırlığını, 0-100 teknik puanını ve RSI/MACD durum etiketlerini anlık görün.
            </p>
          </div>

          {/* Screenshot #4 Visual Mockup: Asset Cards */}
          <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl max-w-5xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]/40 pb-4">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-xl bg-[var(--color-brand)] text-white">Tüm Varlıklar</span>
                <span className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-muted)]">BIST Hisseleri</span>
                <span className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-muted)]">TEFAS Fonları</span>
                <span className="px-3 py-1.5 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-muted)]">BES Emeklilik</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-extrabold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">🟢 Yüksek Teknik Skor (&gt;=65)</span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">🔵 RSI Aşırı Satım (&lt;30)</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">⚡ MACD AI / Pozitif Momentum</span>
              </div>
            </div>

            {/* Asset Cards Grid from Screenshot #4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* PHE Card */}
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-extrabold text-xs">PHE</span>
                    <div><div className="font-black text-sm text-[var(--color-foreground)]">PHE</div><div className="text-[9px] text-[var(--color-muted)]">%15.6 portföy ağırlığı</div></div>
                  </div>
                  <span className="h-6 w-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold flex items-center justify-center text-[var(--color-foreground)]">43</span>
                </div>
                <div className="flex justify-between items-baseline"><span className="text-base font-black text-[var(--color-foreground)] tabular-nums">498.250 ₺</span><span className="text-xs font-bold text-[var(--color-profit)]">+0,15%</span></div>
                <div className="flex gap-1.5 text-[9px] font-black"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">UP</span><span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">NEGATIVE</span><span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">OVERBOUGHT</span></div>
              </div>

              {/* DFI Card */}
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-xs">DFI</span>
                    <div><div className="font-black text-sm text-[var(--color-foreground)]">DFI</div><div className="text-[9px] text-[var(--color-muted)]">%10.0 portföy ağırlığı</div></div>
                  </div>
                  <span className="h-6 w-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-bold flex items-center justify-center text-[var(--color-foreground)]">40</span>
                </div>
                <div className="flex justify-between items-baseline"><span className="text-base font-black text-[var(--color-foreground)] tabular-nums">317.793 ₺</span><span className="text-xs font-bold text-[var(--color-profit)]">+0,12%</span></div>
                <div className="flex gap-1.5 text-[9px] font-black"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">UP</span><span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">NEGATIVE</span><span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">OVERBOUGHT</span></div>
              </div>

              {/* OTJ Card */}
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-extrabold text-xs">OTJ</span>
                    <div><div className="font-black text-sm text-[var(--color-foreground)]">OTJ</div><div className="text-[9px] text-[var(--color-muted)]">%5.0 portföy ağırlığı</div></div>
                  </div>
                  <span className="h-6 w-6 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center">28</span>
                </div>
                <div className="flex justify-between items-baseline"><span className="text-base font-black text-[var(--color-foreground)] tabular-nums">158.879 ₺</span><span className="text-xs font-bold text-[var(--color-loss)]">-2,87%</span></div>
                <div className="flex gap-1.5 text-[9px] font-black"><span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">DOWN</span><span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">NEGATIVE</span><span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">NEUTRAL</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 4: Ürün Performansı Isı Haritası (Screenshot #5) */}
      <section id="performance" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <BarChart2 size={14} className="text-[var(--color-brand)]" /> Ürün Performansı Isı Haritası
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Ürün Bazlı Aylık Performans Isı Haritası (Heatmap)
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Her bir hissenin, fonun veya varlığın ay ay getiri yoğunluğunu renkli ısı haritası matrisinde görün.
            </p>
          </div>

          {/* Screenshot #5 Visual Mockup: Heatmap Matrix */}
          <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl max-w-6xl mx-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--color-border)]/40 pb-3 text-xs font-bold">
              <span className="text-[var(--color-foreground)] flex items-center gap-2">
                <BarChart2 size={16} className="text-[var(--color-brand)]" /> Ürün Bazlı Aylık Getiri Matrisi (Son 12 Ay)
              </span>
              <span className="text-[11px] text-[var(--color-brand-strong)]">AĞU 25 — TEM 26</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-center border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-muted)]/60 text-[var(--color-muted)] font-extrabold uppercase">
                    <th className="p-2 text-left">Ürün ▲</th>
                    <th className="p-2">AĞU 25</th>
                    <th className="p-2">EYL 25</th>
                    <th className="p-2">EKİ 25</th>
                    <th className="p-2">KAS 25</th>
                    <th className="p-2">ARA 25</th>
                    <th className="p-2">OCA 26</th>
                    <th className="p-2">ŞUB 26</th>
                    <th className="p-2">MAR 26</th>
                    <th className="p-2">NİS 26</th>
                    <th className="p-2">MAY 26</th>
                    <th className="p-2">HAZ 26</th>
                    <th className="p-2">TEM 26</th>
                    <th className="p-2 text-right font-black">Toplam</th>
                  </tr>
                </thead>
                <tbody className="font-extrabold tabular-nums divide-y divide-[var(--color-border)]/30">
                  <tr>
                    <td className="p-2 text-left font-black text-[var(--color-foreground)]">AAOI</td>
                    <td className="p-2 bg-emerald-600/30 text-emerald-400">+6.37%</td>
                    <td className="p-2 bg-emerald-600/40 text-emerald-400">+8.33%</td>
                    <td className="p-2 bg-emerald-600/70 text-emerald-300">+36.66%</td>
                    <td className="p-2 bg-rose-600/50 text-rose-300">-22.81%</td>
                    <td className="p-2 bg-emerald-600/70 text-emerald-300">+35.98%</td>
                    <td className="p-2 bg-emerald-600/50 text-emerald-300">+22.49%</td>
                    <td className="p-2 bg-emerald-600/90 text-emerald-200">+95.37%</td>
                    <td className="p-2 bg-emerald-600/20 text-emerald-400">+2.33%</td>
                    <td className="p-2 bg-emerald-600/80 text-emerald-200">+82.19%</td>
                    <td className="p-2 bg-emerald-600/30 text-emerald-400">+5.32%</td>
                    <td className="p-2 bg-rose-600/20 text-rose-400">-3.69%</td>
                    <td className="p-2 bg-rose-600/60 text-rose-300">-32.30%</td>
                    <td className="p-2 text-right text-emerald-400 font-black text-xs">+406.43%</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-black text-[var(--color-foreground)]">INTC</td>
                    <td className="p-2 bg-emerald-600/50 text-emerald-400">+21.35%</td>
                    <td className="p-2 bg-emerald-600/70 text-emerald-300">+43.10%</td>
                    <td className="p-2 bg-emerald-600/40 text-emerald-400">+17.73%</td>
                    <td className="p-2 bg-emerald-600/20 text-emerald-400">+2.10%</td>
                    <td className="p-2 bg-rose-600/30 text-rose-400">-7.03%</td>
                    <td className="p-2 bg-emerald-600/50 text-emerald-300">+26.04%</td>
                    <td className="p-2 bg-rose-600/10 text-rose-400">-0.72%</td>
                    <td className="p-2 bg-rose-600/30 text-rose-400">-8.63%</td>
                    <td className="p-2 bg-emerald-600/90 text-emerald-200">+133.61%</td>
                    <td className="p-2 bg-emerald-600/50 text-emerald-300">+22.98%</td>
                    <td className="p-2 bg-emerald-600/50 text-emerald-300">+23.87%</td>
                    <td className="p-2 bg-rose-600/60 text-rose-300">-32.98%</td>
                    <td className="p-2 text-right text-emerald-400 font-black text-xs">+429.27%</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-left font-black text-[var(--color-foreground)]">MSTR</td>
                    <td className="p-2 bg-rose-600/40 text-rose-300">-14.19%</td>
                    <td className="p-2 bg-rose-600/20 text-rose-400">-1.35%</td>
                    <td className="p-2 bg-rose-600/50 text-rose-300">-21.17%</td>
                    <td className="p-2 bg-rose-600/60 text-rose-300">-29.64%</td>
                    <td className="p-2 bg-rose-600/30 text-rose-400">-11.21%</td>
                    <td className="p-2 bg-rose-600/20 text-rose-400">-2.66%</td>
                    <td className="p-2 bg-rose-600/30 text-rose-400">-12.50%</td>
                    <td className="p-2 bg-rose-600/20 text-rose-400">-5.12%</td>
                    <td className="p-2 bg-emerald-600/60 text-emerald-300">+32.29%</td>
                    <td className="p-2 bg-emerald-600/20 text-emerald-400">+2.19%</td>
                    <td className="p-2 bg-rose-600/70 text-rose-300">-44.41%</td>
                    <td className="p-2 bg-emerald-600/30 text-emerald-400">+6.89%</td>
                    <td className="p-2 text-right text-rose-400 font-black text-xs">-72.94%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section 5: TEFAS Haftalık Yatırımcı Sayısı Dinamikleri (Screenshot #6) */}
      <section id="tefas" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-y border-[var(--color-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Users size={14} className="text-[var(--color-brand)]" /> TEFAS Yatırımcı Haritası
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              TEFAS Haftalık Yatırımcı Sayısı Dinamikleri
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              TEFAS fonlarındaki haftalık kişi sayısı katılımı, giriş/çıkış trendleri ve talep eğilimi grafiklerini anlık takip edin.
            </p>
          </div>

          {/* Screenshot #6 Visual Mockup: TEFAS Flow Dashboard */}
          <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border)]/40 pb-3 text-xs font-bold">
              <span className="text-[var(--color-foreground)] flex items-center gap-2">
                <Users size={16} className="text-[var(--color-brand)]" />
                FON AKIŞ & TALEP ANALİZİ — TEFAS Haftalık Yatırımcı Sayısı Dinamikleri
              </span>
              <span className="text-[11px] text-[var(--color-brand-strong)]">Kartlar / Tablo</span>
            </div>

            {/* Summary Row from Screenshot #6 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">YATIRIMCI TALEBİ DAĞILIMI</span>
                <div className="h-2 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 w-[55%]" />
                  <div className="h-full bg-amber-500 w-[9%]" />
                  <div className="h-full bg-rose-500 w-[36%]" />
                </div>
                <div className="flex justify-between text-[10px] font-extrabold">
                  <span className="text-emerald-500">● 6 Fon Artışta (%55)</span>
                  <span className="text-rose-500">● 4 Fon Azalışta (%36)</span>
                </div>
              </div>

              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-emerald-500/20 space-y-1">
                <div className="flex justify-between text-[10px] font-extrabold text-emerald-500">
                  <span>↗ EN YÜKSEK YATIRIMCI GİRİŞİ</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10">HAFTALIK TOP</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-black text-lg text-[var(--color-foreground)]">DFI</span>
                  <span className="font-black text-emerald-500 text-sm">↗ +10,89%</span>
                </div>
                <div className="text-[10px] text-[var(--color-muted)] font-semibold">Net <strong>+4.794</strong> yeni kişi katıldı</div>
              </div>

              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-rose-500/20 space-y-1">
                <div className="flex justify-between text-[10px] font-extrabold text-rose-500">
                  <span>↘ EN YÜKSEK YATIRIMCI ÇIKIŞI</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10">HAFTALIK ÇIKIŞ</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-black text-lg text-[var(--color-foreground)]">RIK</span>
                  <span className="font-black text-rose-500 text-sm">↘ -5,48%</span>
                </div>
                <div className="text-[10px] text-[var(--color-muted)] font-semibold">Net <strong>-284</strong> kişi ayrıldı</div>
              </div>
            </div>

            {/* Fund Cards from Screenshot #6 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">DFI</span>
                    <div><div className="font-black text-sm text-[var(--color-foreground)]">DFI</div><div className="text-[9px] text-[var(--color-muted)]">TEFAS Yatırımcı Fonu</div></div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">↗ Güçlü Talep</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold pt-1">
                  <div><span className="text-[9px] text-[var(--color-muted)] block">TOPLAM YATIRIMCI</span><span className="text-sm font-black text-[var(--color-foreground)]">48.802 kişi</span></div>
                  <div className="text-right"><span className="text-[9px] text-[var(--color-muted)] block">HAFTALIK DEĞİŞİM</span><span className="text-xs font-black text-emerald-500">+4.794 kişi (+10,89%)</span></div>
                </div>
                <div className="p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/40 text-[10px] text-[var(--color-muted)] font-semibold">
                  Yatırımcı girişi ile güçleniyor.
                </div>
              </div>

              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">PHE</span>
                    <div><div className="font-black text-sm text-[var(--color-foreground)]">PHE</div><div className="text-[9px] text-[var(--color-muted)]">TEFAS Yatırımcı Fonu</div></div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black">↗ Güçlü Talep</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold pt-1">
                  <div><span className="text-[9px] text-[var(--color-muted)] block">TOPLAM YATIRIMCI</span><span className="text-sm font-black text-[var(--color-foreground)]">159.246 kişi</span></div>
                  <div className="text-right"><span className="text-[9px] text-[var(--color-muted)] block">HAFTALIK DEĞİŞİM</span><span className="text-xs font-black text-emerald-500">+11.308 kişi (+7,64%)</span></div>
                </div>
              </div>

              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">RIK</span>
                    <div><div className="font-black text-sm text-[var(--color-foreground)]">RIK</div><div className="text-[9px] text-[var(--color-muted)]">TEFAS Yatırımcı Fonu</div></div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black">↘ Hızlı Çıkış</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold pt-1">
                  <div><span className="text-[9px] text-[var(--color-muted)] block">TOPLAM YATIRIMCI</span><span className="text-sm font-black text-[var(--color-foreground)]">4.896 kişi</span></div>
                  <div className="text-right"><span className="text-[9px] text-[var(--color-muted)] block">HAFTALIK DEĞİŞİM</span><span className="text-xs font-black text-rose-500">-284 kişi (-5,48%)</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section 6: Gelişmiş CSV İçe Aktarım Motoru */}
      <section id="csv-import" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Upload size={14} className="text-[var(--color-brand)]" /> Esnek Veri İçe Aktarımı
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Borsa Ekstrelerinizi CSV İle Tek Tıkla Aktarın
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Aracı kurumunuzdan veya Excel'den aldığınız CSV ekstrelerinizi otomatik tür eşleme ve Replace/Append seçenekleriyle kolayca PortTrack'e aktarın.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 font-extrabold text-sm">
                1
              </div>
              <h3 className="font-extrabold text-base text-[var(--color-foreground)]">CSV Dosyasını Yükleyin</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Tarih, Tür, Sembol, İşlem Yönü (Alış/Satış), Birim Fiyat ve Adet sütunlarını içeren herhangi bir `.csv` dosyasını seçin veya sürükleyin.
              </p>
            </div>

            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 font-extrabold text-sm">
                2
              </div>
              <h3 className="font-extrabold text-base text-[var(--color-foreground)]">Satır Satır Önizleme & Eşleme</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Veriler veritabanına yazılmadan önce satır satır kontrol edilir. Nasdaq, TEFAS veya BIST etiketleri otomatik olarak varlık türlerine eşlenir.
              </p>
            </div>

            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-extrabold text-sm">
                3
              </div>
              <h3 className="font-extrabold text-base text-[var(--color-foreground)]">Esnek Aktarım Modları</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                <strong>"Tüm Portföyü Değiştir"</strong> veya <strong>"Yalnızca Yeni Satırları Ekle"</strong> modlarından dilediğinizi seçerek aktarımı tamamlayın.
              </p>
            </div>
          </div>

          {/* Real System Visual Mockup: CSV Import Preview Dialog Card */}
          <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border)]/40 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-[var(--color-brand-strong)]" size={18} />
                <h3 className="font-extrabold text-sm text-[var(--color-foreground)]">CSV Önizleme & Otomatik Tür Eşleme Ekranı</h3>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                142 İşlem Satırı Analiz Edildi
              </span>
            </div>

            {/* CSV File Dropzone & Mode Picker Visual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Yüklenen Dosya</span>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 font-bold">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[var(--color-foreground)]">porttrack_islemler_2026.csv</div>
                    <div className="text-[10px] text-[var(--color-muted)]">14.2 KB · UTF-8 Kodlamalı</div>
                  </div>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/50 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Aktarım Modu Seçimi</span>
                <div className="space-y-1.5 text-xs font-bold">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-brand)]/40 text-[var(--color-brand-strong)] shadow-2xs">
                    <span>🔘 Tüm İşlemleri Sıfırla ve Değiştir (Replace)</span>
                    <Check size={14} />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--color-surface)]/50 text-[var(--color-muted)]">
                    <span>⚪ Yalnızca Yeni Satırları Ekleyerek Güncelle (Append)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line by line mapped table */}
            <div className="overflow-x-auto border border-[var(--color-border)]/50 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="p-2.5">Satır</th>
                    <th className="p-2.5">Tarih</th>
                    <th className="p-2.5">CSV Türü</th>
                    <th className="p-2.5">Sembol</th>
                    <th className="p-2.5">İşlem Yönü</th>
                    <th className="p-2.5 text-right">Fiyat & Adet</th>
                    <th className="p-2.5">Sistem Varlık Türü Eşleşmesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]/30 font-medium tabular-nums">
                  <tr>
                    <td className="p-2.5 text-[var(--color-muted)]">#1</td>
                    <td className="p-2.5 font-bold">29.05.2026</td>
                    <td className="p-2.5 font-semibold">Nasdaq</td>
                    <td className="p-2.5 font-black text-[var(--color-foreground)]">VPG</td>
                    <td className="p-2.5"><span className="text-[var(--color-profit)] font-bold">Alış</span></td>
                    <td className="p-2.5 text-right font-bold">124.49 $ × 0.803 ad.</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold text-[10px]">Yabancı Borsa</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--color-muted)]">#2</td>
                    <td className="p-2.5 font-bold">28.05.2026</td>
                    <td className="p-2.5 font-semibold">TEFAS</td>
                    <td className="p-2.5 font-black text-[var(--color-foreground)]">TCD</td>
                    <td className="p-2.5"><span className="text-[var(--color-profit)] font-bold">Alış</span></td>
                    <td className="p-2.5 text-right font-bold">4.12 ₺ × 5.000 ad.</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">TEFAS Fon</span></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-[var(--color-muted)]">#3</td>
                    <td className="p-2.5 font-bold">25.05.2026</td>
                    <td className="p-2.5 font-semibold">BIST</td>
                    <td className="p-2.5 font-black text-[var(--color-foreground)]">THYAO</td>
                    <td className="p-2.5"><span className="text-[var(--color-profit)] font-bold">Alış</span></td>
                    <td className="p-2.5 text-right font-bold">312.50 ₺ × 1.250 ad.</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold text-[10px]">BIST Hisse</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button className="btn btn-primary text-xs py-2.5 px-6 font-extrabold shadow-md">
                142 İşlemi Veritabanına Aktar ve Onayla
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section 7: Canlı Büyüme & Getiri Simülatörü Widget'ı */}
      <section id="simulator" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-t border-[var(--color-border)]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Sliders size={14} className="text-[var(--color-brand)]" /> Büyüme Simülatörü
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Gelecekteki Portföy Büyüklüğünüzü Hesaplayın
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
              Kendi birikim planınıza göre değerleri ayarlayarak bileşik getirinin gücünü canlı hesaplayın.
            </p>
          </div>

          <div className="card p-6 sm:p-8 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/20 to-[var(--color-brand-soft)]/20 border border-[var(--color-border)]/70 shadow-2xl rounded-3xl space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Başlangıç Portföyü (₺)</label>
                <input
                  type="number"
                  step="5000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input text-xs font-bold tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Aylık Ekleme (₺)</label>
                <input
                  type="number"
                  step="1000"
                  value={monthlyAddition}
                  onChange={(e) => setMonthlyAddition(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input text-xs font-bold tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Yıllık Getiri (%)</label>
                <input
                  type="number"
                  step="1"
                  value={annualReturnRate}
                  onChange={(e) => setAnnualReturnRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input text-xs font-bold tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Hedef Süre (Yıl)</label>
                <select
                  value={targetYears}
                  onChange={(e) => setTargetYears(parseInt(e.target.value))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[var(--color-brand)] cursor-pointer"
                >
                  <option value={1}>1 Yıl</option>
                  <option value={3}>3 Yıl</option>
                  <option value={5}>5 Yıl</option>
                  <option value={10}>10 Yıl</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]/50">
              <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-2xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)] flex items-center gap-1">
                  <DollarSign size={12} className="text-[var(--color-profit)]" /> {targetYears} Yıl Sonu Tahmini Değer
                </span>
                <div className="text-2xl font-black text-[var(--color-foreground)] tabular-nums">{formatMoney(futureValue, "TRY")}</div>
              </div>

              <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-2xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)] flex items-center gap-1">
                  <TrendingUp size={12} className="text-[var(--color-brand-strong)]" /> Net Kazanç Tutarı
                </span>
                <div className="text-2xl font-black text-[var(--color-profit)] tabular-nums">+{formatMoney(netProfit, "TRY")}</div>
              </div>

              <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-2xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)] flex items-center gap-1">
                  <Layers size={12} className="text-amber-500" /> Büyüme Çarpanı
                </span>
                <div className="text-2xl font-black text-[var(--color-brand-strong)] tabular-nums">{growthMultiplier.toFixed(2)}x Kat</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Conversion CTA Banner */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="card p-8 sm:p-12 bg-gradient-to-br from-[var(--color-brand)] via-[var(--color-brand-strong)] to-indigo-700 text-white rounded-3xl shadow-2xl text-center space-y-6 relative overflow-hidden">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Finansal Yatırımlarınızı Profesyonelce Takip Etmeye Bugün Başlayın.
            </h2>

            <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto font-medium leading-relaxed">
              Kredi kartı gerekmez. Saniyeler içinde hesabınızı açın, CSV ekstrenizi yükleyin veya işlemlerinizi kaydederek takibe başlayın.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="btn bg-white text-[var(--color-brand-strong)] hover:bg-slate-100 font-black text-sm px-8 py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Ücretsiz Hesabınızı Oluşturun <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="btn border border-white/40 text-white hover:bg-white/10 font-black text-sm px-6 py-3.5 rounded-2xl transition-all"
              >
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Footer with Legal Disclaimer */}
      <footer className="border-t border-[var(--color-border)]/60 py-10 bg-[var(--color-surface)] text-xs text-[var(--color-muted)] space-y-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          {/* YTD Yasal Uyarısı Kutusu */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] leading-relaxed text-[var(--color-muted)] font-medium">
            <span className="font-extrabold text-amber-600 dark:text-amber-400 mr-1.5 uppercase">⚠️ Yasal Uyarı (YTD):</span>
            PortTrack platformunda sunulan grafikler, veri hesaplamaları, ortalama maliyetler, TEFAS akışları ve Yapay Zeka (AI) asistan yanıtları yalnızca bilgilendirme ve kişisel takip amaçlıdır. Hiçbir şekilde SPK kapsamında yatırım danışmanlığı veya al-sat tavsiyesi teşkil etmez.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--color-border)]/30">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-[var(--color-foreground)]">PortTrack</span>
              <span>© 2026 PortTrack. Tüm hakları saklıdır.</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-bold">
              <Link href="/iletisim" className="hover:text-[var(--color-brand-strong)] transition-colors">
                İletişim
              </Link>
              <span className="text-[var(--color-border)]">•</span>
              <Link href="/kullanim-kosullari" className="hover:text-[var(--color-brand-strong)] transition-colors">
                Kullanım Koşulları
              </Link>
              <span className="text-[var(--color-border)]">•</span>
              <Link href="/gizlilik-politikasi" className="hover:text-[var(--color-brand-strong)] transition-colors">
                Gizlilik Politikası & KVKK
              </Link>
              <span className="text-[var(--color-border)]">•</span>
              <Link href="/login" className="hover:text-[var(--color-foreground)] transition-colors">Giriş Yap</Link>
              <Link href="/register" className="hover:text-[var(--color-foreground)] transition-colors">Kayıt Ol</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
