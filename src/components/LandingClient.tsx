"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { formatMoney, formatPercent, cn } from "@/lib/utils";

export function LandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
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
      {/* 2. Hero Section */}

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45rem] h-[28rem] bg-gradient-to-tr from-[var(--color-brand)]/15 via-indigo-500/10 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
          {/* Main Title & Subtitle */}
          <div className="text-center space-y-4 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30 text-[11px] font-extrabold text-[var(--color-brand-strong)] shadow-2xs">
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
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href={isLoggedIn ? "/" : "/register"}
                className="btn btn-primary text-sm font-black px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoggedIn ? "Portföy Paneline Git" : "Ücretsiz Hesabınızı Oluşturun"}
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="btn btn-outline text-sm font-extrabold px-6 py-3.5 rounded-2xl hover:bg-[var(--color-surface-muted)] transition-all"
              >
                Mevcut Hesaba Giriş Yap
              </Link>
            </div>
          </div>

          {/* Hero Live Dashboard Table Showcase Mockup */}
          <div className="pt-4 max-w-5xl mx-auto">
            <div className="card p-4 sm:p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl text-left space-y-4 relative group hover:border-[var(--color-brand)]/40 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-[11px] font-mono text-[var(--color-muted)] ml-2">porttrack.app/dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
                    ₺ TRY Bazında
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                    $ USD Bazında
                  </span>
                </div>
              </div>

              {/* Summary Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Net Portföy Değeri</span>
                  <div className="text-base sm:text-lg font-black text-[var(--color-foreground)] tabular-nums">1.485.200 ₺</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Günlük Değişim</span>
                  <div className="text-base sm:text-lg font-black text-[var(--color-profit)] tabular-nums">+24.150 ₺ (+%1.65)</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">Toplam Kâr/Zarar</span>
                  <div className="text-base sm:text-lg font-black text-[var(--color-profit)] tabular-nums">+485.200 ₺ (+%48.5)</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40">
                  <span className="text-[10px] font-extrabold uppercase text-[var(--color-muted)]">İç Verim Oranı (XIRR)</span>
                  <div className="text-base sm:text-lg font-black text-[var(--color-brand-strong)] tabular-nums">%54.2 / yıl</div>
                </div>
              </div>

              {/* Position Table Preview */}
              <div className="overflow-x-auto border border-[var(--color-border)]/50 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3">Sembol</th>
                      <th className="p-3">Varlık Türü</th>
                      <th className="p-3 text-right">Adet</th>
                      <th className="p-3 text-right">Birim Fiyat</th>
                      <th className="p-3 text-right">Toplam Değer</th>
                      <th className="p-3 text-right">Kâr / Zarar %</th>
                      <th className="p-3 text-right">Ağırlık</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/30 font-medium">
                    <tr>
                      <td className="p-3 font-extrabold text-[var(--color-foreground)]">THYAO</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold text-[10px]">BIST Hisse</span></td>
                      <td className="p-3 text-right tabular-nums">1.250</td>
                      <td className="p-3 text-right tabular-nums">312.50 ₺</td>
                      <td className="p-3 text-right tabular-nums font-bold">390.625 ₺</td>
                      <td className="p-3 text-right tabular-nums font-bold text-[var(--color-profit)]">+%42.5</td>
                      <td className="p-3 text-right tabular-nums font-bold">%26.3</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-extrabold text-[var(--color-foreground)]">AAPL</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold text-[10px]">Yabancı Borsa</span></td>
                      <td className="p-3 text-right tabular-nums">45</td>
                      <td className="p-3 text-right tabular-nums">$224.50</td>
                      <td className="p-3 text-right tabular-nums font-bold">353.587 ₺</td>
                      <td className="p-3 text-right tabular-nums font-bold text-[var(--color-profit)]">+%28.4</td>
                      <td className="p-3 text-right tabular-nums font-bold">%23.8</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-extrabold text-[var(--color-foreground)]">TCD (TEFAS)</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">TEFAS Fon</span></td>
                      <td className="p-3 text-right tabular-nums">85.000</td>
                      <td className="p-3 text-right tabular-nums">4.12 ₺</td>
                      <td className="p-3 text-right tabular-nums font-bold">350.200 ₺</td>
                      <td className="p-3 text-right tabular-nums font-bold text-[var(--color-profit)]">+%64.2</td>
                      <td className="p-3 text-right tabular-nums font-bold">%23.5</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-extrabold text-[var(--color-foreground)]">BTC/USD</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold text-[10px]">Kripto Varlık</span></td>
                      <td className="p-3 text-right tabular-nums">0.12</td>
                      <td className="p-3 text-right tabular-nums">$67.800</td>
                      <td className="p-3 text-right tabular-nums font-bold">284.760 ₺</td>
                      <td className="p-3 text-right tabular-nums font-bold text-[var(--color-profit)]">+%85.0</td>
                      <td className="p-3 text-right tabular-nums font-bold">%19.1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Section 1: Genel Bakış — Detaylı Portföy Tabloları & Varlık Dağılımı */}
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
              Borsa İstanbul hisseleri, TEFAS yatırım fonları, Amerikan borsaları (Nasdaq/S&P), Kripto paralar, Kıymetli Madenler ve BES emeklilik birikimleriniz anlık fiyatlarla canlı güncellenir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 font-bold">
                <Globe size={20} />
              </div>
              <h3 className="font-extrabold text-base text-[var(--color-foreground)]">Anlık Çift Para Birimi (TRY & USD)</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Tüm portföyünüzün toplam değerini, kâr/zarar durumunu ve maliyetlerinizi tek tıkla ister <strong>₺ Türk Lirası</strong> ister <strong>$ Amerikan Doları</strong> bazında görüntüleyin.
              </p>
            </div>

            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold">
                <PieChart size={20} />
              </div>
              <h3 className="font-extrabold text-base text-[var(--color-foreground)]">Varlık Dağılım Ağırlıkları</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Portföyünüzün varlık sınıflarına göre % kaç dağıldığını (Hisse %, Fon %, Kripto %, Nakit %) pasta grafikler ve oran çubuklarıyla takip ederek riski dengede tutun.
              </p>
            </div>

            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 font-bold">
                <GitCompareArrows size={20} />
              </div>
              <h3 className="font-extrabold text-base text-[var(--color-foreground)]">Karşılaştırma Endeksleri</h3>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Portföyünüzün getiri performansını <strong>BIST 100</strong>, <strong>Dolar/TL</strong>, <strong>Gram Altın</strong> ve <strong>TÜFE Enflasyonu</strong> karşısında kıyaslayın; reel kazancınızı görün.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section 2: Portföy Gelişimi — Gerçek Aylık & Yıllık Performans Tabloları */}
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
              Sistemimizde kullanılan gerçek **Portföy Gelişimi** tablosu sayesinde yatırımlarınızın her yıl ve her ay varlık bazında kaç % kazandırdığını veya kaybettiğini şeffaf bir biçimde takip edin.
            </p>
          </div>

          <div className="space-y-8">
            {/* Real App Component Replica 1: Dönemlik Kümülatif Getiri Tablosu */}
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold border-b border-[var(--color-border)]/40 pb-3">
                <span className="text-[var(--color-foreground)] flex items-center gap-2">
                  <TrendingUp size={16} className="text-[var(--color-brand)]" />
                  Yıllara Göre Dönemlik Kümülatif Getiri Performansı
                </span>
                <span className="text-[11px] font-extrabold text-[var(--color-brand-strong)]">Gerçek Sistem Görünümü</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3">Dönem / Yıl</th>
                      <th className="p-3 text-right">Dönem Başı Değer</th>
                      <th className="p-3 text-right">Dönem Sonu Değer</th>
                      <th className="p-3 text-center">Net Getiri (₺ TRY)</th>
                      <th className="p-3 text-center">Net Getiri ($ USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/30 font-bold tabular-nums">
                    <tr>
                      <td className="p-3 font-black text-[var(--color-foreground)]">2026 YTD (Yıl Başından Beri)</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">1.200.000 ₺</td>
                      <td className="p-3 text-right font-black text-[var(--color-foreground)]">1.485.200 ₺</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%23.77
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%14.20
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-black text-[var(--color-foreground)]">2025 Yılı Tam Dönem</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">712.500 ₺</td>
                      <td className="p-3 text-right font-black text-[var(--color-foreground)]">1.200.000 ₺</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%68.42
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%34.15
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-black text-[var(--color-foreground)]">2024 Yılı Tam Dönem</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">450.000 ₺</td>
                      <td className="p-3 text-right font-black text-[var(--color-foreground)]">712.500 ₺</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%58.33
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%28.60
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Real App Component Replica 2: Aylık Varlık Dağılım & Değişim Tablosu */}
            <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold border-b border-[var(--color-border)]/40 pb-3">
                <span className="text-[var(--color-foreground)] flex items-center gap-2">
                  <Table size={16} className="text-[var(--color-brand)]" />
                  Aylık Varlık Değerleri ve Bir Önceki Aya Göre Getiri Yüzdeleri
                </span>
                <span className="text-[11px] font-extrabold text-[var(--color-brand-strong)]">Aylık Matris Görünümü</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/50 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3">Ay</th>
                      <th className="p-3 text-right">BES</th>
                      <th className="p-3 text-right">BIST Hisse</th>
                      <th className="p-3 text-right">TEFAS Fon</th>
                      <th className="p-3 text-right">Yabancı Borsa</th>
                      <th className="p-3 text-right">Kripto</th>
                      <th className="p-3 text-right font-black">Toplam Portföy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/30 font-medium tabular-nums">
                    <tr>
                      <td className="p-3 font-bold text-[var(--color-foreground)]">2026.06</td>
                      <td className="p-3 text-right">
                        <div>125.400 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%3.2</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>390.625 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%5.8</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>350.200 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%2.4</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>353.587 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%4.1</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>284.760 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-loss)]">-%1.8</div>
                      </td>
                      <td className="p-3 text-right font-bold">
                        <div className="text-sm font-black text-[var(--color-foreground)]">1.485.200 ₺</div>
                        <span className="inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%3.45
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-[var(--color-foreground)]">2026.05</td>
                      <td className="p-3 text-right">
                        <div>121.500 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%2.1</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>369.200 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%4.5</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>342.000 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%1.9</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>339.650 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%3.8</div>
                      </td>
                      <td className="p-3 text-right">
                        <div>289.980 ₺</div>
                        <div className="text-[10px] font-bold text-[var(--color-profit)]">+%6.2</div>
                      </td>
                      <td className="p-3 text-right font-bold">
                        <div className="text-sm font-black text-[var(--color-foreground)]">1.435.660 ₺</div>
                        <span className="inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-bold bg-[var(--color-profit-soft)] text-[var(--color-profit)]">
                          +%3.85
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section 3: Gelişmiş CSV İçe Aktarım — Gerçek Ekran Görseli */}
      <section id="csv-import" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-y border-[var(--color-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Upload size={14} className="text-[var(--color-brand)]" /> Kolay Veri İçe Aktarımı
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Borsa Ekstrelerinizi CSV İle Tek Tıkla Aktarın
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Geçmiş işlemlerinizi elle tek tek girmek zorunda değilsiniz. Aracı kurumunuzdan veya Excel'den aldığınız CSV ekstrelerinizi PortTrack'e doğrudan yükleyin.
            </p>
          </div>

          {/* Real App Component Replica: CSV Import Modal Visual Mockup */}
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

      {/* 6. Section 4: Derin Teknik Analiz & 0-100 Skorlama */}
      <section id="technical" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-profit)] flex items-center justify-center gap-1">
              <BarChart2 size={14} className="text-[var(--color-profit)]" /> Objektif Teknik Analiz
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Kural Tabanlı 0-100 Teknik Sağlık Skorları
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              Kulaktan dolma bilgiler yerine matematiksel göstergelerle hareket edin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-2">
              <span className="text-xs font-extrabold text-[var(--color-foreground)] block">RSI (14) Metresi</span>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Aşırı alım (&gt;70) ve aşırı satım (&lt;30) dip fırsatlarını anlık izleyin.
              </p>
            </div>

            <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-2">
              <span className="text-xs font-extrabold text-[var(--color-foreground)] block">MACD Momentum Sinyali</span>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Sinyal çizgisi kesişimleri ve yükseliş ivmesi kontrolü.
              </p>
            </div>

            <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-2">
              <span className="text-xs font-extrabold text-[var(--color-foreground)] block">SMA 20/50/200 Hiyerarşisi</span>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Golden Cross (50 &gt; 200) ve Death Cross trend dönüşüm uyarıları.
              </p>
            </div>

            <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-2">
              <span className="text-xs font-extrabold text-[var(--color-foreground)] block">52-Hafta Zirve/Dip Aralığı</span>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                Son 1 yıldaki en yüksek ve en düşük fiyata göre konum çubuğu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section 5: TEFAS Fon Akışları — Gerçek Ekran Görseli */}
      <section id="tefas" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-y border-[var(--color-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Users size={14} className="text-[var(--color-brand)]" /> TEFAS Yatırımcı Haritası
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Fonlardaki Kişi Sayısı Hareketlerini Takip Edin
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed">
              TEFAS yatırım fonlarında haftalık bazda kaç yeni yatırımcının katıldığını veya ayrıldığını sparkline grafiklerle izleyin.
            </p>
          </div>

          {/* Real App Component Replica: TEFAS Investor Count Showcase */}
          <div className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl max-w-4xl mx-auto space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--color-border)]/40 pb-3 text-xs font-bold">
              <span className="text-[var(--color-foreground)] flex items-center gap-2">
                <Users size={16} className="text-emerald-500" />
                TEFAS Haftalık Yatırımcı Katılımı ve Talep Haritası
              </span>
              <span className="text-emerald-600 font-extrabold">🔥 En Yüksek Talep Gören Fonlar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-sm text-[var(--color-foreground)]">TCD</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">+%3.83 / hf</span>
                </div>
                <div className="text-xs font-extrabold text-[var(--color-profit)]">+1.420 Kişi Katıldı</div>
                <div className="text-[10px] text-[var(--color-muted)] font-medium">Toplam Yatırımcı: 38.450 kişi</div>
              </div>

              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-emerald-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-sm text-[var(--color-foreground)]">IIH</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">+%3.65 / hf</span>
                </div>
                <div className="text-xs font-extrabold text-[var(--color-profit)]">+850 Kişi Katıldı</div>
                <div className="text-[10px] text-[var(--color-muted)] font-medium">Toplam Yatırımcı: 24.120 kişi</div>
              </div>

              <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-rose-500/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-sm text-[var(--color-foreground)]">MAC</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">-%1.66 / hf</span>
                </div>
                <div className="text-xs font-extrabold text-[var(--color-loss)]">-320 Kişi Ayrıldı</div>
                <div className="text-[10px] text-[var(--color-muted)] font-medium">Toplam Yatırımcı: 18.900 kişi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section 6: Canlı Büyüme & Getiri Simülatörü Widget'ı */}
      <section id="simulator" className="py-16 md:py-24">
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

      {/* 10. Footer */}
      <footer className="border-t border-[var(--color-border)]/60 py-8 bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[var(--color-foreground)]">PortTrack</span>
            <span>© 2026 PortTrack. Tüm hakları saklıdır.</span>
          </div>

          <div className="flex items-center gap-4 font-semibold">
            <Link href="/login" className="hover:text-[var(--color-foreground)] transition-colors">Giriş Yap</Link>
            <Link href="/register" className="hover:text-[var(--color-foreground)] transition-colors">Kayıt Ol</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
