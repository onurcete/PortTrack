import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  PieChart,
  Building2,
  Globe2,
  PlusCircle,
} from "lucide-react";
import type { HoldingDTO } from "@/lib/analysisData";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import type { StockAnalysisSummary } from "@/lib/stockAnalysis";
import { TefasInvestorSection } from "./TefasInvestorSection";
import { StockAnalysisSection } from "./StockAnalysisSection";
import {
  PerformanceHeatmapSection,
  type ProductPerformanceDTO,
} from "./PerformanceHeatmapSection";
import { cn } from "@/lib/utils";

interface AnalysisBriefingClientProps {
  holdings: HoldingDTO[];
  tefasInvestors: TefasInvestorSummary | null;
  bistAnalysis: StockAnalysisSummary | null;
  foreignAnalysis: StockAnalysisSummary | null;
  lastTechnicalDate: string | null;
  productPerformance: ProductPerformanceDTO;
}

type AnalysisTab = "TEFAS" | "BIST" | "FOREIGN";

export function AnalysisBriefingClient({
  holdings,
  tefasInvestors,
  bistAnalysis,
  foreignAnalysis,
  productPerformance,
}: AnalysisBriefingClientProps) {
  const tefasCount = tefasInvestors?.funds?.length ?? holdings.filter((h) => h.assetType === "TEFAS").length;
  const bistCount = bistAnalysis?.stocks?.length ?? holdings.filter((h) => h.assetType === "BIST").length;
  const foreignCount = foreignAnalysis?.stocks?.length ?? holdings.filter((h) => h.assetType === "FOREIGN").length;

  // Varsayılan sekmeyi kullanıcının varlık durumuna göre akıllıca belirle
  const [activeTab, setActiveTab] = useState<AnalysisTab>(() => {
    if (tefasCount > 0) return "TEFAS";
    if (bistCount > 0) return "BIST";
    if (foreignCount > 0) return "FOREIGN";
    return "TEFAS";
  });

  if (holdings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 py-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] mb-3">
          <PieChart size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-foreground)]">Analiz</h1>
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto">
          Henüz açık bir pozisyonunuz bulunmuyor. İşlemler sayfasından varlık eklediğinizde otomatik istatistikler ve piyasa analizleri burada listelenecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* 1. Üst Bağımsız Sekmeler (Tabs) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]/50">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface-muted)]/70 rounded-2xl border border-[var(--color-border)]/60">
          <button
            onClick={() => setActiveTab("TEFAS")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "TEFAS"
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-xs"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <span>🏦</span>
            <span>TEFAS Fonları</span>
            {tefasCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                {tefasCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("BIST")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "BIST"
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-xs"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <span>🇹🇷</span>
            <span>BIST Hisseleri</span>
            {bistCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                {bistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("FOREIGN")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "FOREIGN"
                ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-xs"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
          >
            <span>🌐</span>
            <span>Yabancı Hisseler</span>
            {foreignCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                {foreignCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Aktif Sekmeye Göre Analiz Bölümü */}
      {activeTab === "TEFAS" && (
        <>
          {tefasInvestors && tefasInvestors.funds.length > 0 ? (
            <TefasInvestorSection
              tefasInvestors={tefasInvestors}
              symbolNotes={new Map()}
            />
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <PieChart size={24} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">
                Portföyünüzde Henüz TEFAS Fonu Bulunmuyor
              </h3>
              <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                TEFAS yatırım fonlarınızı portföyünüze ekleyerek haftalık yatırımcı giriş/çıkış trendlerini ve fon akışlarını burada analiz edebilirsiniz.
              </p>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-[var(--color-brand)] text-white hover:opacity-90 transition-opacity"
              >
                <PlusCircle size={14} />
                Fon İşlemi Ekle
              </Link>
            </div>
          )}
        </>
      )}

      {activeTab === "BIST" && (
        <>
          {bistAnalysis && bistAnalysis.stocks.length > 0 ? (
            <StockAnalysisSection summary={bistAnalysis} />
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <Building2 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">
                Portföyünüzde Henüz BIST Hissesi Bulunmuyor
              </h3>
              <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                BIST 100 hisse senetlerinizi portföyünüze ekleyerek 52 haftalık zirve iskontosu, hacim patlaması ve F/K, PD/DD çarpanlarını burada analiz edebilirsiniz.
              </p>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-[var(--color-brand)] text-white hover:opacity-90 transition-opacity"
              >
                <PlusCircle size={14} />
                BIST Hissesi Ekle
              </Link>
            </div>
          )}
        </>
      )}

      {activeTab === "FOREIGN" && (
        <>
          {foreignAnalysis && foreignAnalysis.stocks.length > 0 ? (
            <StockAnalysisSection summary={foreignAnalysis} />
          ) : (
            <div className="p-8 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500">
                <Globe2 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-foreground)]">
                Portföyünüzde Henüz Yabancı Hisse Bulunmuyor
              </h3>
              <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                ABD / Yabancı borsa hisselerinizi portföyünüze ekleyerek Wall Street analist hedef fiyatları, 52H aralıkları ve temettü verimlerini burada takip edebilirsiniz.
              </p>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl bg-[var(--color-brand)] text-white hover:opacity-90 transition-opacity"
              >
                <PlusCircle size={14} />
                Yabancı Hisse Ekle
              </Link>
            </div>
          )}
        </>
      )}

      {/* 3. Ürün Getiri Isı Haritası (Heatmap) */}
      <PerformanceHeatmapSection data={productPerformance} />

      {/* 4. YTD Yasal Uyarı Kutusu */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--color-muted)] flex items-start gap-3 mt-6">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-amber-600 dark:text-amber-400 uppercase text-[11px] tracking-wider">
            Yasal Uyarı (YTD)
          </p>
          <p className="leading-relaxed">
            Bu sayfada sunulan analiz göstergeleri, hisse çarpanları, 52 haftalık aralıklar, TEFAS yatırımcı hareketleri ve istatistiksel hesaplamalar yalnızca bilgilendirme ve kişisel analiz amaçlıdır. SPK mevzuatı kapsamında yatırım tavsiyesi veya portföy yönetim emri teşkil etmez.
          </p>
        </div>
      </div>
    </div>
  );
}
