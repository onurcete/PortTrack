"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  Coins,
  PiggyBank,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { formatMoney, formatPercent, cn } from "@/lib/utils";

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("fill-current", className)}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Mock Market Instruments for Animated Ticker
const MARKET_TICKER = [
  { symbol: "BIST 100", price: "9.845,20", change: "+1,42%", positive: true },
  { symbol: "NASDAQ", price: "18.239,80", change: "+0,85%", positive: true },
  { symbol: "USD/TRY", price: "34,18", change: "+0,08%", positive: true },
  { symbol: "EUR/TRY", price: "37,42", change: "-0,12%", positive: false },
  { symbol: "ALTIN (GR)", price: "2.890 ₺", change: "+0,65%", positive: true },
  { symbol: "BITCOIN", price: "$64.850", change: "+3,18%", positive: true },
  { symbol: "TEFAS PHE", price: "4,8215 ₺", change: "+0,74%", positive: true },
  { symbol: "TEFAS TLY", price: "12,490 ₺", change: "+1,12%", positive: true },
  { symbol: "THYAO", price: "312,50 ₺", change: "+2,20%", positive: true },
  { symbol: "AAPL", price: "$228,40", change: "+0,94%", positive: true },
];

export function LandingClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const trackDemoClick = (source: string) => {
    if (typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "demo_click", {
        event_category: "Engagement",
        event_label: source,
        button_location: source,
      });
    }
  };

  useEffect(() => {
    if (!isLoggedIn && typeof window !== "undefined" && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "conversion", {
        send_to: "AW-987323960/RjpCCJK2qeEcELi85dYD",
        value: 1.0,
        currency: "TRY",
      });
    }
  }, [isLoggedIn]);

  // Active Interactive Demo Tab
  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "analysis" | "ai" | "import">("overview");

  // Interactive AI Assistant Simulation State
  const [aiQuestionIndex, setAiQuestionIndex] = useState<number>(0);
  const [aiAsking, setAiAsking] = useState(false);

  const AI_SAMPLE_QUERIES = [
    {
      q: "2026 yılında en çok kazandıran varlığım hangisiydi?",
      tools: ["get_portfolio_contributors", "get_period_returns"],
      time: "0.4s",
      ans: "2026 yılında portföyünüzde en yüksek kazancı sağlayan enstrüman %49,81 getiri ve +48.950 ₺ net kâr ile TEFAS Fonu (PHE) olmuştur. İkinci sırada ise %39,54 getiri ile Nasdaq hisseniz (INTC) yer almaktadır.",
    },
    {
      q: "Portföyümün döviz ve enflasyon karşısındaki reel durumu nedir?",
      tools: ["get_asset_allocation", "get_xirr_metrics"],
      time: "0.3s",
      ans: "Portföyünüzün %42'si döviz/yabancı hisse ve emtia bazlıdır. Yıllıklandırılmış iç verim oranınız (XIRR) TRY bazında %53,75, USD bazında %39,54 olarak gerçekleşmiş olup döviz artışının üzerinde reel büyüme sağlamıştır.",
    },
    {
      q: "Hangi TEFAS fonuma haftalık en çok yeni yatırımcı girişi oldu?",
      tools: ["get_tefas_investor_dynamics"],
      time: "0.5s",
      ans: "Son haftalık verilere göre portföyünüzdeki fonlar arasında en yüksek talep artışı +3.450 yeni yatırımcı (+%4.2) ile TLY fonunda görülmüştür. Toplam fonlarınızın %75'i pozitif yatırımcı akışı kaydetmiştir.",
    },
  ];

  function handleTriggerAiSample(index: number) {
    if (aiAsking) return;
    setAiAsking(true);
    setAiQuestionIndex(index);
    setTimeout(() => {
      setAiAsking(false);
    }, 450);
  }

  // Interactive Compound Interest Wealth Simulator State
  const [initialBalance, setInitialBalance] = useState<number>(250000);
  const [monthlyAddition, setMonthlyAddition] = useState<number>(15000);
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(40);
  const [targetYears, setTargetYears] = useState<number>(5);

  // Compound Interest Calculation
  const { futureValue, totalInvested, netProfit, growthMultiplier } = useMemo(() => {
    const monthlyRate = annualReturnRate / 12 / 100;
    const totalMonths = targetYears * 12;

    let fVal = initialBalance * Math.pow(1 + monthlyRate, totalMonths);
    for (let i = 1; i <= totalMonths; i++) {
      fVal += monthlyAddition * Math.pow(1 + monthlyRate, totalMonths - i);
    }

    const tInvested = initialBalance + monthlyAddition * totalMonths;
    const nProfit = Math.max(0, fVal - tInvested);
    const gMultiplier = tInvested > 0 ? fVal / tInvested : 1;

    return {
      futureValue: fVal,
      totalInvested: tInvested,
      netProfit: nProfit,
      growthMultiplier: gMultiplier,
    };
  }, [initialBalance, monthlyAddition, annualReturnRate, targetYears]);

  // FAQ Open State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const FAQS = [
    {
      q: "PortTrack hangi varlık türlerini destekler?",
      a: "PortTrack; BIST Hisseleri (Borsa İstanbul), TEFAS Yatırım Fonları, Yabancı Borsalar (Nasdaq, NYSE, Avrupa), Kripto Paralar, Döviz Varlıkları, Altın & Kıymetli Madenler ve Bireysel Emeklilik Sistemi (BES) olmak üzere 7 farklı varlık sınıfını tam entegre olarak destekler.",
    },
    {
      q: "Banka veya aracı kurum şifrelerimi girmem gerekir mi?",
      a: "Hayır, kesinlikle hayır! PortTrack %100 güvenli ve gizlilik odaklıdır. Hiçbir banka veya borsa şifresi talep edilmez. İşlemlerinizi aracı kurumunuzdan aldığınız standart CSV veya Excel ekstre dosyalarını yükleyerek veya manuel girişle saniyeler içinde takip edebilirsiniz.",
    },
    {
      q: "Güncel fiyatlar ve kurlar otomatik güncellenir mi?",
      a: "Evet. TEFAS fon fiyatları, BIST ve Yabancı hisse fiyatları ile anlık döviz kurları finans API'lerimiz üzerinden otomatik olarak güncellenir. Dilediğiniz an tek tıkla güncel piyasa değerlerinizi çekebilirsiniz.",
    },
    {
      q: "XIRR (Yıllıklandırılmış Getiri) nedir ve neden önemlidir?",
      a: "XIRR (Genişletilmiş İç Verim Oranı), farklı tarihlerde yaptığınız nakit giriş-çıkışlarını (kademeli alım-satımları) hesaba katan gerçek getiri standardıdır. Basit kâr/zarar oranının aksine, portföyünüzün yıllık bazda enflasyon veya dövize karşı gerçek getirisini net gösterir.",
    },
    {
      q: "PortTrack'i ücretsiz olarak deneyebilir miyim?",
      a: "Evet! Hemen 'Demo' butonuna tıklayarak örnek zengin bir portföyü anında inceleyebilir veya ücretsiz hesap oluşturarak kendi portföyünüzü dakikalar içinde yönetmeye başlayabilirsiniz.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-foreground)] selection:bg-[var(--color-brand)] selection:text-white font-sans overflow-x-hidden">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[60rem] h-[35rem] bg-gradient-to-b from-[var(--color-brand)]/20 via-indigo-600/10 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-[40%] -left-32 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-[70%] -right-32 w-[35rem] h-[35rem] bg-cyan-500/10 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Top Floating Glass Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group select-none">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--color-brand)] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[var(--color-brand)]/20 transition-transform group-hover:scale-105">
              <TrendingUp size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight text-[var(--color-foreground)] flex items-center gap-1.5">
                PortTrack
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]">
                  PRO
                </span>
              </span>
              <span className="text-[9px] font-bold text-[var(--color-muted)] tracking-wider uppercase">
                Varlık & Getiri Platformu
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-extrabold text-[var(--color-muted)]">
            <a href="#preview" className="px-3 py-1.5 rounded-xl hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors">
              Canlı Önizleme
            </a>
            <a href="#calculator" className="px-3 py-1.5 rounded-xl hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors">
              Bileşik Faiz Hesaplayıcı
            </a>
            <a href="#features" className="px-3 py-1.5 rounded-xl hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors">
              Özellikler
            </a>
            <a href="#faq" className="px-3 py-1.5 rounded-xl hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors">
              Sıkça Sorulanlar
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <a
                href="/api/auth/demo"
                onClick={() => trackDemoClick("header")}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-xl border border-[var(--color-brand)]/40 bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] hover:bg-[var(--color-brand)] hover:text-white transition-all shadow-2xs hover:scale-105 active:scale-95"
                title="Şifresiz anında örnek demo hesabına giriş yap"
              >
                <Zap size={14} className="fill-current" />
                <span>Demo Portföy</span>
              </a>
            )}

            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="btn btn-outline text-xs font-extrabold px-3.5 py-2 rounded-xl hover:bg-[var(--color-surface-muted)] transition-all"
                >
                  Giriş
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary text-xs font-extrabold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  Ücretsiz Başla
                </Link>
              </>
            ) : (
              <Link
                href="/"
                className="btn btn-primary text-xs font-extrabold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Panoya Git <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Live Market Ticker Ribbon */}
      <div className="w-full bg-[var(--color-surface-muted)]/60 border-b border-[var(--color-border)]/50 py-2 overflow-hidden select-none">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          {MARKET_TICKER.concat(MARKET_TICKER).map((item, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 text-xs font-bold shrink-0">
              <span className="text-[var(--color-foreground)] font-extrabold">{item.symbol}</span>
              <span className="text-[var(--color-muted)] font-semibold tabular-nums">{item.price}</span>
              <span className={cn("text-[10px] font-black px-1.5 py-0.2 rounded", item.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                {item.change}
              </span>
              <span className="text-[var(--color-border)] opacity-40 ml-2">•</span>
            </div>
          ))}
        </div>
      </div>

      <main className="relative z-10 space-y-20 md:space-y-32">
        {/* ========================================================================= */}
        {/* 1. HERO SECTION */}
        {/* ========================================================================= */}
        <section className="pt-12 md:pt-20 px-4 sm:px-6 max-w-7xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/35 text-xs font-black text-[var(--color-brand-strong)] shadow-xs animate-in fade-in duration-500">
            <Sparkles size={14} className="text-[var(--color-brand)] animate-pulse" />
            <span>BIST · TEFAS · Yabancı Borsa · BES · Kripto · Döviz & Altın</span>
          </div>

          {/* Heading */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[var(--color-foreground)]">
              Tüm Yatırımlarınızı Tek Bir{" "}
              <span className="bg-gradient-to-r from-[var(--color-brand)] via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                Akıllı Merkezde
              </span>{" "}
              Anlık Yönetin.
            </h1>

            <p className="text-sm sm:text-base md:text-xl text-[var(--color-muted)] max-w-3xl mx-auto font-medium leading-relaxed">
              Borsa İstanbul, TEFAS Fonları, Yurt Dışı Hisseleri, BES, Kripto ve Emtia varlıklarınızı gerçek zamanlı fiyatlar, kümülatif getiri matrisleri, yıllık XIRR analitiği ve yapay zekâ asistanı ile zahmetsizce takip edin.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={isLoggedIn ? "/" : "/register"}
              className="btn btn-primary text-sm sm:text-base font-black px-8 py-4 rounded-2xl shadow-xl shadow-[var(--color-brand)]/20 hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
            >
              {isLoggedIn ? "Portföy Paneline Git" : "Ücretsiz Hesabınızı Oluşturun"}
              <ArrowRight size={18} />
            </Link>

            {!isLoggedIn && (
              <a
                href="/api/auth/demo"
                onClick={() => trackDemoClick("hero")}
                className="inline-flex items-center gap-2 text-sm sm:text-base font-black px-7 py-4 rounded-2xl border-2 border-[var(--color-brand)]/40 bg-[var(--color-surface)] hover:bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] hover:border-[var(--color-brand)] transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <Zap size={18} className="fill-current text-[var(--color-brand)]" />
                <span>Demo Portföyü Dene</span>
              </a>
            )}
          </div>

          {/* Trust Highlights */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-bold text-[var(--color-muted)]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>%100 Gizli & Şifresiz Güvenlik</span>
            </div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-blue-500" />
              <span>Tek Tıkla CSV & Excel İçe Aktarma</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-purple-500" />
              <span>Gerçek XIRR & Yıllık Getiri Standardı</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. INTERACTIVE LIVE PRODUCT DEMO PREVIEW */}
        {/* ========================================================================= */}
        <section id="preview" className="px-4 sm:px-6 max-w-7xl mx-auto space-y-6 scroll-mt-24">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)]">
              İNTERAKTİF ÜRÜN TURU
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Gelişmiş FinTech Deneyimi
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
              Aşağıdaki sekmelere tıklayarak PortTrack'in canlı modüllerini keşfedin.
            </p>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-[var(--color-surface-muted)]/80 border border-[var(--color-border)] rounded-2xl max-w-4xl mx-auto shadow-inner">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "overview"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-md border border-[var(--color-border)]/80"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <PieChart size={15} className="text-[var(--color-brand)]" />
              <span>Genel Bakış</span>
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "matrix"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-md border border-[var(--color-border)]/80"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <BarChart2 size={15} className="text-emerald-500" />
              <span>Getiri Matrisi</span>
            </button>

            <button
              onClick={() => setActiveTab("analysis")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "analysis"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-md border border-[var(--color-border)]/80"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Activity size={15} className="text-amber-500" />
              <span>Analiz & TEFAS</span>
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "ai"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-md border border-[var(--color-border)]/80"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <Brain size={15} className="text-indigo-500" />
              <span>Portföy Zekâsı (AI)</span>
            </button>

            <button
              onClick={() => setActiveTab("import")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                activeTab === "import"
                  ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-md border border-[var(--color-border)]/80"
                  : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              <FileSpreadsheet size={15} className="text-blue-500" />
              <span>CSV & Excel İçe Aktar</span>
            </button>
          </div>

          {/* Tab Screen 1: Genel Bakış & Varlıklar */}
          {activeTab === "overview" && (
            <div className="card p-5 sm:p-7 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-3xl space-y-6 animate-in fade-in duration-300">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]/60 text-xs font-bold text-[var(--color-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[var(--color-foreground)]">Canlı Portföy Özeti</span>
                  <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    ● Canlı Senkronize
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]/60 text-[11px] font-bold">
                    TRY (₺) / USD ($)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-[11px] font-extrabold">
                    1 USD = 34,18 ₺
                  </span>
                </div>
              </div>

              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">TOPLAM PORTFÖY</span>
                  <div className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--color-foreground)] tracking-tight">3.408.871 ₺</div>
                  <div className="text-xs font-bold text-[var(--color-muted)]">$99.732</div>
                  <div className="pt-1.5 border-t border-[var(--color-border)]/40 text-[11px] font-extrabold text-[var(--color-profit)]">
                    BUGÜN +18.420 ₺ (+0,54%)
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">CARİ AY (MTD)</span>
                  <div className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--color-profit)] tracking-tight">+6,42%</div>
                  <div className="text-xs font-bold text-[var(--color-profit)]/90">+206.114 ₺</div>
                  <div className="pt-1.5 border-t border-[var(--color-border)]/40 text-[10px] text-[var(--color-muted)] font-semibold">
                    Ağustos 2026 Dönemi
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">YIL BAŞINDAN BERİ (YTD)</span>
                  <div className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--color-profit)] tracking-tight">+53,75%</div>
                  <div className="text-xs font-bold text-[var(--color-profit)]/90">+1.189.400 ₺</div>
                  <div className="pt-1.5 border-t border-[var(--color-border)]/40 text-[10px] text-[var(--color-muted)] font-semibold">
                    2026 Kümülatif Büyüme
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">YILLIK XIRR ORANI</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xs font-bold text-[var(--color-muted)]">TRY Bazlı</span>
                      <span className="text-xl font-black text-[var(--color-profit)] tabular-nums">+64,82%</span>
                    </div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-xs font-bold text-[var(--color-muted)]">USD Bazlı</span>
                      <span className="text-xl font-black text-cyan-400 tabular-nums">+42,10%</span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-[var(--color-border)]/40 text-[10px] text-[var(--color-muted)] font-semibold">
                    Zaman Ağırlıklı İç Verim
                  </div>
                </div>
              </div>

              {/* Asset Allocation Strip */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold text-[var(--color-muted)]">
                  <span>VARLIK SINIFI DAĞILIMI</span>
                  <span>5 Farklı Kategori · Dengeli Risk</span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden flex shadow-inner gap-0.5 bg-[var(--color-surface-muted)]">
                  <div className="h-full bg-purple-500" style={{ width: "64%" }} title="TEFAS Fon %64" />
                  <div className="h-full bg-slate-400" style={{ width: "25%" }} title="BES %25" />
                  <div className="h-full bg-cyan-500" style={{ width: "6%" }} title="Yabancı Borsa %6" />
                  <div className="h-full bg-amber-500" style={{ width: "3%" }} title="Altın & Maden %3" />
                  <div className="h-full bg-pink-500" style={{ width: "2%" }} title="Kripto %2" />
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-[var(--color-muted)] pt-1">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> TEFAS Fon %64</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> BES %25</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Yabancı Borsa %6</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Kıymetli Maden %3</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-500" /> Kripto %2</span>
                </div>
              </div>

              {/* Sample Positions Table */}
              <div className="overflow-x-auto border border-[var(--color-border)]/60 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/60 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3.5">Sembol & Adet</th>
                      <th className="p-3.5 text-right">Ort. Maliyet</th>
                      <th className="p-3.5 text-right">Güncel Fiyat</th>
                      <th className="p-3.5 text-right">Değer</th>
                      <th className="p-3.5 text-right">Günlük %</th>
                      <th className="p-3.5 text-right">Kâr / Zarar</th>
                      <th className="p-3.5 text-right">Toplam Getiri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/40 font-bold tabular-nums">
                    <tr>
                      <td className="p-3.5 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black text-xs">
                          <Layers size={15} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[var(--color-foreground)]">PHE</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)] border">207 g</span>
                          </div>
                          <span className="text-[11px] text-[var(--color-muted)] font-medium">126.413 adet</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-semibold text-[var(--color-muted)]">3,24 ₺</td>
                      <td className="p-3.5 text-right text-[var(--color-foreground)]">4,82 ₺</td>
                      <td className="p-3.5 text-right font-black text-[var(--color-foreground)]">609.310 ₺</td>
                      <td className="p-3.5 text-right text-[var(--color-profit)]">+0,84%</td>
                      <td className="p-3.5 text-right text-[var(--color-profit)]">+199.732 ₺</td>
                      <td className="p-3.5 text-right"><span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-extrabold">+48,76%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-black text-xs">
                          <Globe size={15} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[var(--color-foreground)]">NVDA</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)] border">340 g</span>
                          </div>
                          <span className="text-[11px] text-[var(--color-muted)] font-medium">42 adet</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-semibold text-[var(--color-muted)]">$68,20</td>
                      <td className="p-3.5 text-right text-[var(--color-foreground)]">$128,50</td>
                      <td className="p-3.5 text-right font-black text-[var(--color-foreground)]">184.469 ₺</td>
                      <td className="p-3.5 text-right text-[var(--color-profit)]">+2,15%</td>
                      <td className="p-3.5 text-right text-[var(--color-profit)]">+86.530 ₺</td>
                      <td className="p-3.5 text-right"><span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-extrabold">+88,41%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3.5 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs">
                          <TrendingUp size={15} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-[var(--color-foreground)]">THYAO</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)] border">184 g</span>
                          </div>
                          <span className="text-[11px] text-[var(--color-muted)] font-medium">850 adet</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-semibold text-[var(--color-muted)]">245,50 ₺</td>
                      <td className="p-3.5 text-right text-[var(--color-foreground)]">312,50 ₺</td>
                      <td className="p-3.5 text-right font-black text-[var(--color-foreground)]">265.625 ₺</td>
                      <td className="p-3.5 text-right text-[var(--color-profit)]">+2,20%</td>
                      <td className="p-3.5 text-right text-[var(--color-profit)]">+56.950 ₺</td>
                      <td className="p-3.5 text-right"><span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 font-extrabold">+27,29%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Screen 2: Getiri & XIRR Matrisi */}
          {activeTab === "matrix" && (
            <div className="card p-5 sm:p-7 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-3xl space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]/60 text-xs font-bold">
                <span className="text-sm font-black text-[var(--color-foreground)]">Yıllara Göre Kümülatif Getiri Büyümesi</span>
                <span className="text-[11px] text-[var(--color-brand-strong)] font-extrabold">2021 — 2026 Tüm Geçmiş</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--color-surface-muted)]/60 text-[var(--color-muted)] uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="p-3">Yıl</th>
                      <th className="p-3 text-right">Başlangıç (₺)</th>
                      <th className="p-3 text-right">Bitiş (₺)</th>
                      <th className="p-3 text-right">Kümülatif Getiri (₺)</th>
                      <th className="p-3 text-right">Kümülatif Getiri ($)</th>
                      <th className="p-3 text-center">Yıllık XIRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]/40 font-bold tabular-nums">
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2023</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">339.241 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">623.833 ₺</td>
                      <td className="p-3 text-right text-[var(--color-profit)]">+83,89%</td>
                      <td className="p-3 text-right text-rose-500">-14,02%</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px]">+78,4%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2024</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">623.833 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">1.027.045 ₺</td>
                      <td className="p-3 text-right text-[var(--color-profit)]">+64,63%</td>
                      <td className="p-3 text-right text-emerald-500">+81,10%</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px]">+62,1%</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 text-[var(--color-foreground)]">2025</td>
                      <td className="p-3 text-right text-[var(--color-muted)]">1.027.045 ₺</td>
                      <td className="p-3 text-right text-[var(--color-foreground)]">2.076.191 ₺</td>
                      <td className="p-3 text-right text-[var(--color-profit)]">+102,15%</td>
                      <td className="p-3 text-right text-emerald-500">+64,73%</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px]">+94,8%</span></td>
                    </tr>
                    <tr className="bg-[var(--color-brand-soft)]/20 font-black">
                      <td className="p-3 text-[var(--color-brand-strong)]">2026 (Cari Yıl)</td>
                      <td className="p-3 text-right text-[var(--color-brand-strong)]">2.076.191 ₺</td>
                      <td className="p-3 text-right text-[var(--color-brand-strong)]">3.408.871 ₺</td>
                      <td className="p-3 text-right text-emerald-400 text-sm">+53,75%</td>
                      <td className="p-3 text-right text-emerald-400 text-sm">+39,54%</td>
                      <td className="p-3 text-center"><span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">+64,82%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Screen 3: Analiz & TEFAS Dinamikleri */}
          {activeTab === "analysis" && (
            <div className="card p-5 sm:p-7 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-3xl space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]/60 text-xs font-bold text-[var(--color-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[var(--color-foreground)]">Portföy Analizi & TEFAS Dinamikleri</span>
                  <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md">
                    ● Sermaye Akışları & Isı Haritası
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]/60 text-[11px] font-bold">
                    30 Açık Pozisyon
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">
                    %62.5 Talep Artışı
                  </span>
                </div>
              </div>

              {/* 4 KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-muted)]">TOPLAM BÜYÜKLÜK</span>
                  <div className="text-xl font-black text-[var(--color-foreground)]">3.408.871 ₺</div>
                  <div className="text-[11px] font-semibold text-[var(--color-muted)]">Ort: 113.629 ₺ / varlık</div>
                </div>
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-muted)]">VARLIK ÇEŞİTLİLİĞİ</span>
                  <div className="text-xl font-black text-cyan-400">5 Farklı Tür</div>
                  <div className="text-[11px] font-semibold text-[var(--color-muted)]">En büyük 3 varlık: %55.8 pay</div>
                </div>
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-muted)]">TEFAS FON TALEBİ</span>
                  <div className="text-xl font-black text-emerald-400">+5 / -3 Fon</div>
                  <div className="text-[11px] font-semibold text-emerald-500">Yatırımcı Çeken: %62.5</div>
                </div>
                <div className="p-4 bg-[var(--color-surface-muted)]/30 rounded-2xl border border-[var(--color-border)]/60 space-y-1">
                  <span className="text-[10px] font-black uppercase text-[var(--color-muted)]">GÜNÜN LİDERİ</span>
                  <div className="text-xl font-black text-emerald-400">MSTR (+4,88%)</div>
                  <div className="text-[11px] font-semibold text-[var(--color-muted)]">NVDA (+2,15%)</div>
                </div>
              </div>

              {/* Sub-grid: TEFAS Investor Flows & Heatmap Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* TEFAS Investor Flows */}
                <div className="p-5 bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/60 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[var(--color-foreground)] flex items-center gap-2">
                      <Users size={15} className="text-purple-400" />
                      TEFAS Haftalık Yatırımcı Akışı
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-muted)]">Kişi Sayısı Değişimi</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">PHE</span>
                        <div>
                          <div className="font-extrabold text-xs text-[var(--color-foreground)]">PHE Fonu</div>
                          <div className="text-[10px] text-[var(--color-muted)]">%15.6 portföy ağırlığı</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400">+2.450 Kişi</span>
                        <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">Güçlü Talep</div>
                      </div>
                    </div>

                    <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">TLY</span>
                        <div>
                          <div className="font-extrabold text-xs text-[var(--color-foreground)]">TLY Fonu</div>
                          <div className="text-[10px] text-[var(--color-muted)]">%8.4 portföy ağırlığı</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400">+1.890 Kişi</span>
                        <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">Pozitif Giriş</div>
                      </div>
                    </div>

                    <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)]/60 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-xs">OTJ</span>
                        <div>
                          <div className="font-extrabold text-xs text-[var(--color-foreground)]">OTJ Fonu</div>
                          <div className="text-[10px] text-[var(--color-muted)]">%5.0 portföy ağırlığı</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-400">-420 Kişi</span>
                        <div className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded">Çıkış Trendi</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heatmap Preview */}
                <div className="p-5 bg-[var(--color-surface-muted)]/20 border border-[var(--color-border)]/60 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[var(--color-foreground)] flex items-center gap-2">
                      <BarChart2 size={15} className="text-emerald-400" />
                      Ürün Bazlı Aylık Performans Isı Haritası
                    </span>
                    <span className="text-[10px] font-bold text-[var(--color-muted)]">Son 5 Ay</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-center border-collapse">
                      <thead>
                        <tr className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase">
                          <th className="p-1.5 text-left">Varlık</th>
                          <th className="p-1.5">NİS</th>
                          <th className="p-1.5">MAY</th>
                          <th className="p-1.5">HAZ</th>
                          <th className="p-1.5">TEM</th>
                          <th className="p-1.5">AĞU</th>
                          <th className="p-1.5 text-right">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="font-bold tabular-nums divide-y divide-[var(--color-border)]/30">
                        <tr>
                          <td className="p-1.5 text-left font-black text-[var(--color-foreground)]">PHE</td>
                          <td className="p-1.5 bg-emerald-500/30 text-emerald-300 rounded">+6.4%</td>
                          <td className="p-1.5 bg-emerald-500/50 text-emerald-200 rounded">+12.3%</td>
                          <td className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded">+3.8%</td>
                          <td className="p-1.5 bg-emerald-500/60 text-emerald-200 rounded">+18.5%</td>
                          <td className="p-1.5 bg-emerald-500/40 text-emerald-300 rounded">+8.2%</td>
                          <td className="p-1.5 text-right font-black text-emerald-400">+56.2%</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 text-left font-black text-[var(--color-foreground)]">NVDA</td>
                          <td className="p-1.5 bg-emerald-500/70 text-emerald-100 rounded">+28.5%</td>
                          <td className="p-1.5 bg-emerald-500/40 text-emerald-300 rounded">+9.4%</td>
                          <td className="p-1.5 bg-rose-500/30 text-rose-300 rounded">-4.2%</td>
                          <td className="p-1.5 bg-emerald-500/80 text-emerald-100 rounded">+34.1%</td>
                          <td className="p-1.5 bg-emerald-500/30 text-emerald-300 rounded">+5.6%</td>
                          <td className="p-1.5 text-right font-black text-emerald-400">+88.4%</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 text-left font-black text-[var(--color-foreground)]">THYAO</td>
                          <td className="p-1.5 bg-emerald-500/30 text-emerald-300 rounded">+7.1%</td>
                          <td className="p-1.5 bg-rose-500/25 text-rose-300 rounded">-3.5%</td>
                          <td className="p-1.5 bg-emerald-500/50 text-emerald-200 rounded">+14.2%</td>
                          <td className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded">+4.0%</td>
                          <td className="p-1.5 bg-emerald-500/40 text-emerald-300 rounded">+6.8%</td>
                          <td className="p-1.5 text-right font-black text-emerald-400">+31.2%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Screen 4: Portföy Zekâsı AI */}
          {activeTab === "ai" && (
            <div className="card p-5 sm:p-7 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-3xl space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]/60">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Brain size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[var(--color-foreground)]">Portföy Zekâsı (AI Asistan)</h3>
                    <p className="text-[10px] text-[var(--color-muted)]">Doğal dilde sorularla deterministik portföy analitiği</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  GPT-4o & MCP Entegre
                </span>
              </div>

              {/* Sample Question Chips */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                  Örnek Bir Soru Seçin:
                </span>
                <div className="flex flex-wrap gap-2">
                  {AI_SAMPLE_QUERIES.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTriggerAiSample(idx)}
                      className={cn(
                        "text-xs font-bold px-3.5 py-2 rounded-xl border transition-all text-left cursor-pointer",
                        aiQuestionIndex === idx
                          ? "bg-[var(--color-brand-soft)] border-[var(--color-brand)] text-[var(--color-brand-strong)] shadow-xs"
                          : "bg-[var(--color-surface-muted)]/50 border-[var(--color-border)]/60 text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-[var(--color-brand)]/40"
                      )}
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Simulation Window */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-surface-muted)]/40 border border-[var(--color-border)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--color-brand-strong)]">
                  <Brain size={14} />
                  <span>Soru: {AI_SAMPLE_QUERIES[aiQuestionIndex].q}</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] font-mono">
                  <span>Araçlar: {AI_SAMPLE_QUERIES[aiQuestionIndex].tools.join(", ")}</span>
                  <span>•</span>
                  <span>Yanıt Süresi: {AI_SAMPLE_QUERIES[aiQuestionIndex].time}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 text-xs sm:text-sm font-medium leading-relaxed text-[var(--color-foreground)]">
                  {aiAsking ? (
                    <span className="flex items-center gap-2 text-[var(--color-muted)]">
                      <span className="w-3.5 h-3.5 border-2 border-[var(--color-brand)] border-t-transparent rounded-full animate-spin" />
                      Yapay zekâ portföy verilerinizi analiz ediyor...
                    </span>
                  ) : (
                    AI_SAMPLE_QUERIES[aiQuestionIndex].ans
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Screen 5: CSV & Excel İçe Aktar (Enriched Details) */}
          {activeTab === "import" && (
            <div className="card p-5 sm:p-7 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-3xl space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]/60 text-xs font-bold text-[var(--color-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[var(--color-foreground)]">Ultra-Hızlı CSV & Excel İçe Aktarma Motoru</span>
                  <span className="text-[10px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md">
                    .csv · .xlsx · .xls
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-extrabold">
                  ✓ %100 Otomatik Kolon Algılama
                </span>
              </div>

              {/* 3-Step Pipeline Visual Graphic */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1 */}
                <div className="p-4 bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/60 rounded-2xl space-y-2.5 relative">
                  <div className="flex items-center justify-between text-xs font-black text-[var(--color-brand-strong)]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-[var(--color-brand)] text-white text-[10px] flex items-center justify-center">1</span>
                      Dosya Seç & Yükle
                    </span>
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                  </div>
                  <div className="p-3 bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] rounded-xl text-center space-y-1">
                    <FileSpreadsheet size={22} className="text-emerald-500 mx-auto" />
                    <div className="text-xs font-extrabold text-[var(--color-foreground)]">portfoy_ekstre.xlsx</div>
                    <div className="text-[10px] text-[var(--color-muted)]">128 İşlem Satırı · 142 KB</div>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-medium">
                    Sürükleyip bırakın. Virgüllü veya noktalı sayı ve tarih formatları otomatik tanınır.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/60 rounded-2xl space-y-2.5 relative">
                  <div className="flex items-center justify-between text-xs font-black text-indigo-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center">2</span>
                      Akıllı Tür Eşleme
                    </span>
                    <GitCompareArrows size={16} className="text-indigo-400" />
                  </div>
                  <div className="space-y-1 text-[11px] font-bold">
                    <div className="flex justify-between p-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]/50">
                      <span>PHE / TLY</span>
                      <span className="text-purple-400 font-extrabold">TEFAS Fonu 🟢</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]/50">
                      <span>NVDA / AAPL</span>
                      <span className="text-cyan-400 font-extrabold">Yabancı (USD) 🟢</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]/50">
                      <span>THYAO</span>
                      <span className="text-blue-400 font-extrabold">BIST Hissesi 🟢</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-medium">
                    Sembolleriniz PortTrack varlık havuzuyla eşlenir; dilerseniz tek tıkla değiştirebilirsiniz.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/60 rounded-2xl space-y-2.5 relative">
                  <div className="flex items-center justify-between text-xs font-black text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">3</span>
                      Önizleme & Onay
                    </span>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                  <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl space-y-1.5 text-center">
                    <div className="text-xs font-black text-emerald-400">✓ 128 Geçerli Satır Hazır</div>
                    <div className="text-[10px] text-[var(--color-muted)]">0 Hatalı Kayıt · Çift Kayıt Koruması</div>
                    <span className="inline-block px-3 py-1 bg-emerald-500 text-white font-extrabold text-[10px] rounded-lg shadow-xs">
                      Portföye İşle
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted)] leading-relaxed font-medium">
                    Siz onay vermeden hiçbir kayıt yazılmaz. İşlem sonrası geçmiş ve getiriler otomatik güncellenir.
                  </p>
                </div>
              </div>

              {/* Supported Brokerages / Banks Badges */}
              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] block">
                  Doğrudan Desteklenen Başlıca Kurum & Ekstreler:
                </span>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  {["Midas", "İş Bankası (İşCep)", "Garanti BBVA", "Yapı Kredi", "Ziraat Yatırım", "Akbank", "TEB", "Binance", "QNB Finansinvest", "DenizBank", "Gedik Yatırım", "Özel Excel Dosyaları"].map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-foreground)] border border-[var(--color-border)]/60 text-[11px] flex items-center gap-1.5 font-bold"
                    >
                      <Check size={12} className="text-emerald-500" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE WEALTH & COMPOUND INTEREST CALCULATOR */}
        {/* ========================================================================= */}
        <section id="calculator" className="px-4 sm:px-6 max-w-7xl mx-auto space-y-8 scroll-mt-24">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-profit)] flex items-center justify-center gap-1.5">
              <Sliders size={14} className="text-emerald-500" />
              BİLEŞİK GETİRİ SİMÜLATÖRÜ
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Gelecekteki Servetinizi Hesaplayın
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] font-medium">
              Düzenli birikim ve bileşik getirinin gücüyle portföyünüzün yıllar içindeki büyüme potansiyelini test edin.
            </p>
          </div>

          <div className="card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl rounded-3xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls: Sliders */}
            <div className="lg:col-span-7 space-y-6">
              {/* Başlangıç Sermayesi */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-[var(--color-muted)] uppercase tracking-wide">Başlangıç Sermayesi</span>
                  <span className="text-[var(--color-foreground)] font-black text-sm tabular-nums">
                    {formatMoney(initialBalance, "TRY", { decimals: 0 })}
                  </span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={2000000}
                  step={10000}
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand)] h-2 bg-[var(--color-surface-muted)] rounded-lg cursor-pointer"
                />
              </div>

              {/* Aylık Düzenli Birikim */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-[var(--color-muted)] uppercase tracking-wide">Aylık Düzenli Yatırım</span>
                  <span className="text-[var(--color-foreground)] font-black text-sm tabular-nums">
                    {formatMoney(monthlyAddition, "TRY", { decimals: 0 })} / ay
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={monthlyAddition}
                  onChange={(e) => setMonthlyAddition(Number(e.target.value))}
                  className="w-full accent-[var(--color-brand)] h-2 bg-[var(--color-surface-muted)] rounded-lg cursor-pointer"
                />
              </div>

              {/* Yıllık Beklenen Getiri */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-[var(--color-muted)] uppercase tracking-wide">Yıllık Beklenen Getiri Oranı</span>
                  <span className="text-emerald-500 font-black text-sm tabular-nums">%{annualReturnRate}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={1}
                  value={annualReturnRate}
                  onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-2 bg-[var(--color-surface-muted)] rounded-lg cursor-pointer"
                />
              </div>

              {/* Vade / Süre */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold">
                  <span className="text-[var(--color-muted)] uppercase tracking-wide">Yatırım Süresi</span>
                  <span className="text-cyan-400 font-black text-sm tabular-nums">{targetYears} Yıl</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={targetYears}
                  onChange={(e) => setTargetYears(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-2 bg-[var(--color-surface-muted)] rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Right Projection Results Card */}
            <div className="lg:col-span-5 p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[var(--color-brand-soft)]/40 via-[var(--color-surface-muted)]/30 to-[var(--color-surface)] border border-[var(--color-brand)]/30 space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)] block">
                  {targetYears} Yıl Sonundaki Toplam Portföy Değeri
                </span>
                <div className="text-3xl sm:text-4xl font-black tabular-nums text-[var(--color-foreground)] tracking-tight mt-1 text-emerald-400">
                  {formatMoney(futureValue, "TRY", { decimals: 0 })}
                </div>
              </div>

              {/* Visual Breakdown Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-extrabold text-[var(--color-muted)]">
                  <span>Yatırılan Sermaye: {formatMoney(totalInvested, "TRY", { decimals: 0 })}</span>
                  <span className="text-emerald-400 font-black">{growthMultiplier.toFixed(1)}x Büyüme</span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-700/40">
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${Math.min(100, Math.max(10, (totalInvested / futureValue) * 100))}%` }}
                    title="Ana Para"
                  />
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${Math.min(100, Math.max(0, (netProfit / futureValue) * 100))}%` }}
                    title="Bileşik Getiri Kârı"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)]/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[var(--color-muted)] block">Cebinizden Çıkan</span>
                  <span className="font-extrabold text-[var(--color-foreground)] tabular-nums">
                    {formatMoney(totalInvested, "TRY", { decimals: 0 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--color-muted)] block">Bileşik Faiz Kârı</span>
                  <span className="font-black text-emerald-400 tabular-nums">
                    +{formatMoney(netProfit, "TRY", { decimals: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. 6 CORE PILLARS / FEATURES GRID */}
        {/* ========================================================================= */}
        <section id="features" className="px-4 sm:px-6 max-w-7xl mx-auto space-y-10 scroll-mt-24">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)]">
              NEDEN PORTTRACK?
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Yatırımcılar İçin Özel Tasarlanmış Mimari
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 hover:border-[var(--color-brand)]/50 transition-all shadow-sm hover:shadow-xl space-y-3 group">
              <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                <Layers size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">7 Farklı Varlık Sınıfı</h3>
              <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                TEFAS Fonları, BIST Hisseleri, Nasdaq/Yurt Dışı, Kripto, Döviz, Kıymetli Madenler ve BES yatırımlarınızı tek çatı altında eksiksiz konsolide edin.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 hover:border-[var(--color-brand)]/50 transition-all shadow-sm hover:shadow-xl space-y-3 group">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                <Activity size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">Zaman Ağırlıklı XIRR Getirisi</h3>
              <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                Tüm alım-satım nakit akışlarınızın zamanlamasını hesaba katan uluslararası standartlarda yıllıklandırılmış iç verim oranınızı (XIRR) hem TL hem USD olarak görün.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 hover:border-[var(--color-brand)]/50 transition-all shadow-sm hover:shadow-xl space-y-3 group">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                <Brain size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">Portföy Zekâsı (AI Asistanı)</h3>
              <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                "2026'da en çok hangi hissem kazandırdı?" veya "Döviz riskim dengeli mi?" diye sorun; yapay zekâ modeliniz işlemlerinizi anında analiz edip yanıtlasın.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 hover:border-[var(--color-brand)]/50 transition-all shadow-sm hover:shadow-xl space-y-3 group">
              <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">TEFAS Fon Yatırımcı Akışı</h3>
              <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                Haftalık kişi sayısı değişimlerini, fonlara giren ve çıkan taze sermaye trendlerini ve yatırımcı talep dinamiklerini anlık takip edin.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 hover:border-[var(--color-brand)]/50 transition-all shadow-sm hover:shadow-xl space-y-3 group">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">Süper Hızlı CSV & Excel Desteği</h3>
              <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                Banka ve aracı kurum ekstrelerinizi tek tıkla yükleyin. Akıllı ayrıştırıcı sütunları otomatik eşler, önizler ve veritabanınıza güvenle işler.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)]/80 hover:border-[var(--color-brand)]/50 transition-all shadow-sm hover:shadow-xl space-y-3 group">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">%100 Gizlilik & Şifresiz Kullanım</h3>
              <p className="text-xs text-[var(--color-muted)] font-medium leading-relaxed">
                Banka API şifresi yok, üçüncü taraf yetkilendirmesi yok. Verileriniz tamamen şifreli ve yalnızca size özel olarak korunur.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. FAQ SECTION */}
        {/* ========================================================================= */}
        <section id="faq" className="px-4 sm:px-6 max-w-4xl mx-auto space-y-8 scroll-mt-24">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)]">
              MERK EDİLENLER
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[var(--color-foreground)]">
              Sıkça Sorulan Sorular
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left font-extrabold text-xs sm:text-sm flex items-center justify-between gap-3 hover:bg-[var(--color-surface-muted)]/40 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} className="text-[var(--color-brand)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--color-muted)] shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[var(--color-muted)] font-medium leading-relaxed border-t border-[var(--color-border)]/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. BOTTOM HIGH-CONVERSION CTA BANNER */}
        {/* ========================================================================= */}
        <section className="px-4 sm:px-6 max-w-5xl mx-auto pb-16">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Portföyünüzü Profesyonel Seviyede Yönetmeye Hazır mısınız?
              </h2>
              <p className="text-xs sm:text-sm text-cyan-100 font-medium leading-relaxed">
                Yatırımlarınızı dağınık Excel sayfalarından ve karmaşık tablolardan kurtarın. PortTrack ile dakikalar içinde finansal özgürlük yolculuğunuzu anlık izleyin.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={isLoggedIn ? "/" : "/register"}
                className="px-8 py-3.5 rounded-2xl bg-white text-indigo-950 font-black text-sm shadow-xl hover:bg-cyan-50 hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
              >
                {isLoggedIn ? "Portföy Paneline Git" : "Hemen Ücretsiz Başla"}
                <ArrowRight size={16} />
              </Link>
              {!isLoggedIn && (
                <a
                  href="/api/auth/demo"
                  onClick={() => trackDemoClick("footer_cta")}
                  className="px-6 py-3.5 rounded-2xl bg-indigo-950/40 text-white border border-white/30 font-black text-sm hover:bg-indigo-950/60 transition-all"
                >
                  ⚡ Demo Hesabı Gör
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]/60 bg-[var(--color-surface)]/50 py-10 px-4 sm:px-6 text-center text-xs text-[var(--color-muted)] space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2 font-black text-sm text-[var(--color-foreground)]">
            <TrendingUp size={16} className="text-[var(--color-brand)]" />
            <span>PortTrack</span>
          </div>

          <span className="text-[var(--color-border)] hidden sm:inline">•</span>

          <a
            href="https://x.com/porttrackx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-foreground)] hover:text-[var(--color-brand-strong)] transition-all hover:scale-105 shadow-2xs"
            title="PortTrack Resmi X Hesabı @porttrackx"
          >
            <XIcon className="w-3.5 h-3.5 text-[var(--color-brand-strong)]" />
            <span>Bizi X'te Takip Edin (@porttrackx)</span>
            <ArrowUpRight size={13} className="text-[var(--color-muted)]" />
          </a>
        </div>

        <p className="font-medium text-[11px]">
          © {new Date().getFullYear()} PortTrack. Tüm hakları saklıdır. Yatırım tavsiyesi içermez.
        </p>
      </footer>
    </div>
  );
}
