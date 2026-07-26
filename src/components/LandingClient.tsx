"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Brain,
  Zap,
  Activity,
  Users,
  PieChart,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sliders,
  DollarSign,
  Layers,
  ChevronRight,
  BarChart2,
  Lock,
  Globe,
  Upload,
} from "lucide-react";
import { formatMoney, formatPercent, cn } from "@/lib/utils";

export function LandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  // Simulator State
  const [initialBalance, setInitialBalance] = useState<number>(100000);
  const [monthlyAddition, setMonthlyAddition] = useState<number>(10000);
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(35);
  const [targetYears, setTargetYears] = useState<number>(5);

  // Active Showcase Tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<"ai" | "technical" | "tefas" | "growth">("ai");

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
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-bg)]/85 border-b border-[var(--color-border)]/60 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/welcome" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-strong)] text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
              PT
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight text-[var(--color-foreground)] leading-none">
                PortTrack
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--color-brand-strong)] mt-0.5">
                AI & Portföy Takibi
              </span>
            </div>
          </Link>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-[var(--color-muted)]">
            <a href="#features" className="hover:text-[var(--color-foreground)] transition-colors">
              Özellikler
            </a>
            <a href="#ai-assistant" className="hover:text-[var(--color-foreground)] transition-colors">
              Yapay Zekâ
            </a>
            <a href="#technical" className="hover:text-[var(--color-foreground)] transition-colors">
              Teknik Göstergeler
            </a>
            <a href="#tefas" className="hover:text-[var(--color-foreground)] transition-colors">
              TEFAS Akışı
            </a>
            <a href="#simulator" className="hover:text-[var(--color-foreground)] transition-colors">
              Büyüme Simülatörü
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/"
                className="btn btn-primary text-xs shadow-md hover:shadow-lg transition-all"
              >
                Portföy Paneline Git <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn btn-ghost text-xs font-extrabold hover:bg-[var(--color-surface-muted)]"
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary text-xs font-extrabold shadow-md hover:shadow-lg transition-all"
                >
                  Ücretsiz Kayıt Ol <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[25rem] bg-gradient-to-tr from-[var(--color-brand)]/15 via-indigo-500/10 to-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-8">
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/30 text-[11px] font-extrabold text-[var(--color-brand-strong)] shadow-2xs animate-bounce-subtle">
            <Sparkles size={13} className="text-amber-500" />
            <span>PortTrack v2.0 Yayında — Yapay Zekâ & Derin Teknik Analiz Gücü</span>
            <ChevronRight size={12} />
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto text-[var(--color-foreground)]">
            Tüm Yatırımlarınızı Tek Bir{" "}
            <span className="bg-gradient-to-r from-[var(--color-brand)] via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
              Akıllı Merkezde
            </span>{" "}
            Yönetin ve Büyütün.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-[var(--color-muted)] max-w-2xl mx-auto font-medium leading-relaxed">
            BIST Hisseleri, TEFAS Fonları, Yabancı Borsalar (Nasdaq), Kripto, Döviz ve BES emeklilik yatırımlarınızı <strong>GPT-4o yapay zekâ briefing’leri</strong> ve <strong>kural tabanlı 0-100 teknik skorlarla</strong> anlık takip edin.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href={isLoggedIn ? "/" : "/register"}
              className="btn btn-primary text-sm font-black px-7 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoggedIn ? "Portföyü İncele" : "Hemen Ücretsiz Başlayın"}
              <ArrowRight size={16} />
            </Link>
            <a
              href="#simulator"
              className="btn btn-outline text-sm font-extrabold px-6 py-3 rounded-2xl hover:bg-[var(--color-surface-muted)] transition-all"
            >
              Büyüme Simülatörünü Dene
            </a>
          </div>

          {/* Key Stats Bar */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-6 sm:gap-12 text-xs font-extrabold text-[var(--color-muted)] border-t border-[var(--color-border)]/40 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[var(--color-profit)]" />
              <span>BIST + TEFAS + Yabancı Borsa</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[var(--color-profit)]" />
              <span>0-100 Kural Tabanlı Teknik Skor</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[var(--color-profit)]" />
              <span>%100 Ücretsiz & Reklamsız</span>
            </div>
          </div>

          {/* 3. Interactive Hero Product Showcase Mockup */}
          <div className="pt-6">
            <div className="card p-4 sm:p-6 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/20 to-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-2xl rounded-3xl text-left max-w-4xl mx-auto relative group hover:border-[var(--color-brand)]/40 transition-all">
              {/* Top Browser Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="text-[11px] font-mono text-[var(--color-muted)] ml-2">porttrack.app/analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-[var(--color-profit)] border border-emerald-500/20">
                    ● Canlı Veri Akışı
                  </span>
                </div>
              </div>

              {/* Showcase Body Preview */}
              <div className="py-4 space-y-4">
                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40 space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">Toplam Portföy</span>
                    <div className="text-xl font-black tabular-nums text-[var(--color-foreground)]">1.485.200 ₺</div>
                    <span className="text-[10px] font-bold text-[var(--color-profit)] flex items-center gap-0.5">
                      <TrendingUp size={11} /> +24.150 ₺ (%+1.65) bugün
                    </span>
                  </div>

                  <div className="p-3.5 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40 space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">Teknik Sağlık Skoru</span>
                    <div className="text-xl font-black tabular-nums text-[var(--color-profit)]">78 <span className="text-xs text-[var(--color-muted)] font-normal">/100</span></div>
                    <span className="text-[10px] font-semibold text-[var(--color-muted)]">Güçlü Yükseliş Trendi</span>
                  </div>

                  <div className="p-3.5 bg-[var(--color-surface-muted)]/30 rounded-xl border border-[var(--color-border)]/40 space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">AI Briefing Modu</span>
                    <div className="text-sm font-black text-[var(--color-brand-strong)] flex items-center gap-1">
                      <Sparkles size={13} /> Dengeli Genel Bakış
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600">✓ Anlık Önbellekte Hazır</span>
                  </div>
                </div>

                {/* AI Commentary Preview */}
                <div className="p-4 bg-gradient-to-br from-[var(--color-brand-soft)]/30 to-[var(--color-brand-soft)]/10 border border-[var(--color-brand)]/20 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-brand-strong)] uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Brain size={13} /> Yapay Zekâ Portföy Yorumu
                    </span>
                    <span className="text-emerald-600 font-extrabold">GPT-4o BRIEFING</span>
                  </div>
                  <p className="leading-relaxed text-[var(--color-foreground)]/90">
                    BIST hisselerinizdeki toparlanma momentumu devam ediyor. RSI göstergeleri nötr bölgede seyrederken TEFAS fonlarında haftalık kişi sayısı %2.4 artış gösterdi...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Feature Showcase Section */}
      <section id="features" className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-y border-[var(--color-border)]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Zap size={14} className="text-amber-500" /> Tam Kapsamlı Modüller
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Yatırımlarınızı Neden PortTrack İle Yönetmelisiniz?
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
              Karmaşık borsa tabloları ve Excel ekstreleri yerine finansal kararlarınızı destekleyen yapay zekâ ve matematiksel teknik göstergeler.
            </p>
          </div>

          {/* Showcase Tabs */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { id: "ai", label: "🤖 Yapay Zekâ & Soru-Cevap" },
                { id: "technical", label: "📊 Derin Teknik Göstergeler" },
                { id: "tefas", label: "👥 TEFAS Yatırımcı Akışları" },
                { id: "growth", label: "📈 Büyüme & Gelecek Projeksiyonu" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveShowcaseTab(tab.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer",
                    activeShowcaseTab === tab.id
                      ? "bg-[var(--color-brand)] text-white shadow-md scale-[1.02]"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)]/60 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Showcase Tab Content Cards */}
            <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)]/70 shadow-xl rounded-3xl transition-all">
              {activeShowcaseTab === "ai" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] px-3 py-1 rounded-full border border-[var(--color-brand)]/20">
                      GPT-4o ENTEGRASYONU
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                      Odaklı Yapay Zekâ Yorumları & Anlık Soru-Cevap
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed font-medium">
                      Portföyünüzün teknik verilerini, TEFAS hareketlerini ve varlık ağırlıklarını OpenAI GPT-4o sentezlesin. 4 farklı analiz odağı (`Dengeli`, `Teknik`, `Risk`, `Fırsat`) arasında sıfır ekstra API maliyetiyle anında geçiş yapın.
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-[var(--color-foreground)]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[var(--color-profit)] shrink-0" />
                        <span>Portföyünüz hakkındaki soruları yapay zekâya anlık sorun.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[var(--color-profit)] shrink-0" />
                        <span>Önbellekleme sistemiyle gereksiz API maliyetlerinden kaçının.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-[var(--color-brand-soft)]/30 via-[var(--color-surface-muted)]/20 to-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]/60 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-brand-strong)]">
                      <Brain size={16} /> Yapay Zekâ Soru-Cevap Demosu
                    </div>
                    <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]/40 text-xs font-semibold text-[var(--color-foreground)]">
                      "Portföyümdeki riskler neler?"
                    </div>
                    <div className="p-3.5 bg-[var(--color-brand-soft)]/40 rounded-xl border border-[var(--color-brand)]/20 text-xs leading-relaxed text-[var(--color-foreground)]">
                      Portföyünüzün %42'si tek bir BIST hissesinde yoğunlaşmış durumda. RSI göstergesi 74 ile aşırı alım bölgesinde olduğu için kısa vadeli kâr realizasyonları yaşanabilir...
                    </div>
                  </div>
                </div>
              )}

              {activeShowcaseTab === "technical" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-profit)] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      MATEMATİKSEL TEKNİK SKORLAMA
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                      RSI, MACD, Bollinger & 52-Hafta Göstergeleri
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed font-medium">
                      Herhangi bir varlığa tıkladığınızda açılan detay penceresinde RSI (14) metresi, 52 haftalık fiyat aralığı barı, SMA20/50/200 hiyerarşisi ve kural tabanlı 0-100 teknik sağlık skorunu saniyeler içinde görün.
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-[var(--color-foreground)]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[var(--color-profit)] shrink-0" />
                        <span>Golden Cross ve Death Cross kesişim sinyalleri.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[var(--color-profit)] shrink-0" />
                        <span>RSI aşırı satım (&lt;30) dip fırsatlarını süzgeçten geçirin.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-[var(--color-foreground)]">THYAO - Teknik Gösterge Metresi</span>
                      <span className="font-black text-[var(--color-profit)]">Skor: 82/100</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-bold">
                        <span>RSI (14): 28.4 (Aşırı Satım)</span>
                        <span>Alış Fırsatı</span>
                      </div>
                      <div className="h-2 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden flex">
                        <div className="w-[30%] bg-emerald-500/30" />
                        <div className="w-[40%] bg-slate-500/10" />
                        <div className="w-[30%] bg-rose-500/20" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeShowcaseTab === "tefas" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-brand-strong)] bg-[var(--color-brand-soft)] px-3 py-1 rounded-full border border-[var(--color-brand)]/20">
                      FON TALEP HARİTASI
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                      TEFAS Haftalık Yatırımcı Sayısı Dinamikleri
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed font-medium">
                      Yatırım yaptığınız veya takip ettiğiniz TEFAS fonlarındaki haftalık kişi sayısı değişimlerini, net giren/çıkan yatırımcı sayılarını ve alan dolgulu sparkline grafiklerini anlık takip edin.
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-[var(--color-foreground)]">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[var(--color-profit)] shrink-0" />
                        <span>En çok yatırımcı kazanan ve kaybeden fonlar.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[var(--color-profit)] shrink-0" />
                        <span>28 günlük geçmiş kayıt noktaları ve 4 haftalık trend.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>TCD Fon Yatırımcı Akışı</span>
                      <span className="text-[var(--color-profit)]">+420 kişi (+%2.8)</span>
                    </div>
                    <div className="text-[11px] text-[var(--color-muted)]">
                      Haftalık net kişi katılımı yükselişte. 4 haftalık eğilim: <strong className="text-[var(--color-profit)]">GÜÇLÜ TALEP</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeShowcaseTab === "growth" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      BİLEŞİK FAİZ & HEDEF
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--color-foreground)]">
                      Yıl Sonu Büyüme & Kilometre Taşları
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed font-medium">
                      Portföyünüzün bileşik büyüme çarpanını (`1.45x`), iyimser/gerçekçi/kötümser senaryolarla yıl sonu tahminlerini ve hedef kilometre taşlarını hesaplayın.
                    </p>
                  </div>

                  <div className="p-5 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-[var(--color-foreground)]">Hedef İlerleme Barı</span>
                      <span className="font-black text-[var(--color-brand-strong)]">500.000 ₺ Hedefi</span>
                    </div>
                    <div className="h-2.5 w-full bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[var(--color-brand)] to-emerald-500 w-[68%]" />
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-bold">
                      <span>Mevcut: 340.000 ₺</span>
                      <span>İlerleme: %68</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Portfolio Growth Simulator Widget */}
      <section id="simulator" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center justify-center gap-1">
              <Sliders size={14} className="text-[var(--color-brand)]" /> Canlı Büyüme Simülatörü
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Gelecekteki Portföy Büyüklüğünüzü Hesaplayın
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
              Aşağıdaki değerleri kendi birikim planınıza göre ayarlayarak bileşik getirinin potansiyel gücünü hemen görün.
            </p>
          </div>

          <div className="card p-6 sm:p-8 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface-muted)]/20 to-[var(--color-brand-soft)]/20 border border-[var(--color-border)]/70 shadow-2xl rounded-3xl space-y-8">
            {/* Input Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Initial Balance */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Başlangıç Portföyü (₺)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input text-xs font-bold tabular-nums"
                />
              </div>

              {/* Monthly Addition */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Aylık Düzenli Ekleme (₺)
                </label>
                <input
                  type="number"
                  step="1000"
                  value={monthlyAddition}
                  onChange={(e) => setMonthlyAddition(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input text-xs font-bold tabular-nums"
                />
              </div>

              {/* Annual Return Rate */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Tahmini Yıllık Getiri (%)
                </label>
                <input
                  type="number"
                  step="1"
                  value={annualReturnRate}
                  onChange={(e) => setAnnualReturnRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="input text-xs font-bold tabular-nums"
                />
              </div>

              {/* Target Years */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)]">
                  Hedef Süre (Yıl)
                </label>
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

            {/* Results Overview Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]/50">
              {/* Result 1: Future Value */}
              <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-2xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
                  <DollarSign size={12} className="text-[var(--color-profit)]" />
                  {targetYears} Yıl Sonu Tahmini Değer
                </span>
                <div className="text-2xl font-black text-[var(--color-foreground)] tabular-nums tracking-tight">
                  {formatMoney(futureValue, "TRY")}
                </div>
                <span className="text-[10px] font-bold text-[var(--color-profit)] block pt-1">
                  ▲ Net Bileşik Büyüme
                </span>
              </div>

              {/* Result 2: Invested vs Profit */}
              <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-2xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
                  <TrendingUp size={12} className="text-[var(--color-brand-strong)]" />
                  Net Getiri Kazancı
                </span>
                <div className="text-2xl font-black text-[var(--color-profit)] tabular-nums tracking-tight">
                  +{formatMoney(netProfit, "TRY")}
                </div>
                <span className="text-[10px] font-medium text-[var(--color-muted)] block pt-1">
                  Yatırılan Anapara: {formatMoney(totalInvested, "TRY")}
                </span>
              </div>

              {/* Result 3: Multiplier */}
              <div className="card p-5 bg-[var(--color-surface)] border border-[var(--color-border)]/50 rounded-2xl space-y-1 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1">
                  <Layers size={12} className="text-amber-500" />
                  Toplam Büyüme Çarpanı
                </span>
                <div className="text-2xl font-black text-[var(--color-brand-strong)] tabular-nums tracking-tight">
                  {growthMultiplier.toFixed(2)}x Kat
                </div>
                <span className="text-[10px] font-medium text-[var(--color-muted)] block pt-1">
                  Anaparanızın {growthMultiplier.toFixed(1)} katı büyüklük
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Key Features Grid */}
      <section className="py-16 md:py-24 bg-[var(--color-surface-muted)]/20 border-t border-[var(--color-border)]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)]">
              Kapsamlı Finansal Ekosistem
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              İhtiyacınız Olan Tüm Takip Araçları
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Yapay Zekâ Analiz Asistanı",
                desc: "GPT-4o ile günlük portföy özeti, risk sinyalleri ve interaktif soru-cevap desteği.",
                color: "text-indigo-500 bg-indigo-500/10",
              },
              {
                icon: BarChart2,
                title: "0-100 Teknik Sağlık Skorları",
                desc: "RSI, MACD, Bollinger ve SMA hiyerarşisiyle objektif kural tabanlı puanlama.",
                color: "text-emerald-500 bg-emerald-500/10",
              },
              {
                icon: Users,
                title: "TEFAS Yatırımcı Akışları",
                desc: "Fonlardaki haftalık kişi sayısı değişimleri, giriş/çıkış trendleri ve sparkline'lar.",
                color: "text-purple-500 bg-purple-500/10",
              },
              {
                icon: Globe,
                title: "Otomatik Kur Dönüştürücü",
                desc: "Tüm varlıklarınızı anlık döviz kurlarıyla hem ₺ TRY hem $ USD olarak görüntüleyin.",
                color: "text-amber-500 bg-amber-500/10",
              },
              {
                icon: Upload,
                title: "CSV & Ekstre İçe Aktarım",
                desc: "Borsa ekstrelerinizi ve CSV dosyalarınızı tek tıkla analiz edip veritabanına aktarın.",
                color: "text-blue-500 bg-blue-500/10",
              },
              {
                icon: Lock,
                title: "%100 Veri Gizliliği & Güvenlik",
                desc: "Şifreli oturum yönetimi, reklamsız deneyim ve kişisel verilerinize %100 saygı.",
                color: "text-rose-500 bg-rose-500/10",
              },
            ].map((f, i) => {
              const IconComp = f.icon;
              return (
                <div
                  key={i}
                  className="card p-6 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-2xl space-y-3 hover:border-[var(--color-brand)]/40 transition-all shadow-xs hover:shadow-md"
                >
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl font-bold", f.color)}>
                    <IconComp size={22} />
                  </div>
                  <h3 className="font-extrabold text-base text-[var(--color-foreground)]">{f.title}</h3>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Conversion CTA Box */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="card p-8 sm:p-12 bg-gradient-to-br from-[var(--color-brand)] via-[var(--color-brand-strong)] to-indigo-700 text-white rounded-3xl shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white border border-white/30">
              <Sparkles size={13} /> Finansal Özgürlüğünüze Adım Atın
            </span>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Yatırımlarınızı Yapay Zekâ Gücüyle Yönetmeye Bugün Başlayın.
            </h2>

            <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto font-medium leading-relaxed">
              Kredi kartı gerekmez. Kaydolun ve portföyünüzü hemen ekleyerek yapay zekâ analizlerini deneyimleyin.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href={isLoggedIn ? "/" : "/register"}
                className="btn bg-white text-[var(--color-brand-strong)] hover:bg-slate-100 font-black text-sm px-8 py-3.5 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isLoggedIn ? "Portföy Paneline Git" : "Ücretsiz Hesabınızı Oluşturun"}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-[var(--color-border)]/60 py-8 bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[var(--color-foreground)]">PortTrack</span>
            <span>© 2026 PortTrack. Tüm hakları saklıdır.</span>
          </div>

          <div className="flex items-center gap-4 font-semibold">
            <a href="#features" className="hover:text-[var(--color-foreground)] transition-colors">Özellikler</a>
            <a href="#simulator" className="hover:text-[var(--color-foreground)] transition-colors">Simülatör</a>
            <Link href={isLoggedIn ? "/" : "/login"} className="hover:text-[var(--color-foreground)] transition-colors">
              {isLoggedIn ? "Paneli Aç" : "Giriş Yap"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
