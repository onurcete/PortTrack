"use client";

import {
  AlertTriangle,
  PieChart,
} from "lucide-react";
import type { HoldingDTO } from "@/lib/analysisData";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import { TefasInvestorSection } from "./TefasInvestorSection";
import {
  PerformanceHeatmapSection,
  type ProductPerformanceDTO,
} from "./PerformanceHeatmapSection";

interface AnalysisBriefingClientProps {
  holdings: HoldingDTO[];
  tefasInvestors: TefasInvestorSummary | null;
  lastTechnicalDate: string | null;
  productPerformance: ProductPerformanceDTO;
}

export function AnalysisBriefingClient({
  holdings,
  tefasInvestors,
  productPerformance,
}: AnalysisBriefingClientProps) {
  if (holdings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 py-12 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] mb-3">
          <PieChart size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-foreground)]">Analiz</h1>
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto">
          Henüz açık bir pozisyonunuz bulunmuyor. İşlemler sayfasından varlık eklediğinizde otomatik istatistikler ve TEFAS analizleri burada listelenecektir.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* 1. TEFAS Fon Akış & Yatırımcı Analizi Section */}
      {tefasInvestors && (
        <TefasInvestorSection
          tefasInvestors={tefasInvestors}
          symbolNotes={new Map()}
        />
      )}

      {/* 2. Ürün Getiri Isı Haritası (Heatmap) */}
      <PerformanceHeatmapSection data={productPerformance} />

      {/* 3. YTD Yasal Uyarı Kutusu */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--color-muted)] flex items-start gap-3 mt-6">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-amber-600 dark:text-amber-400 uppercase text-[11px] tracking-wider">
            Yasal Uyarı (YTD)
          </p>
          <p className="leading-relaxed">
            Bu sayfada sunulan analiz göstergeleri, TEFAS yatırımcı hareketleri ve istatistiksel hesaplamalar yalnızca bilgilendirme ve kişisel analiz amaçlıdır. SPK mevzuatı kapsamında yatırım tavsiyesi veya portföy yönetim emri teşkil etmez.
          </p>
        </div>
      </div>
    </div>
  );
}
