"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  PieChart,
  RefreshCw,
} from "lucide-react";
import type { HoldingDTO } from "@/lib/analysisData";
import type { TefasInvestorSummary } from "@/lib/tefasInvestors";
import { cn } from "@/lib/utils";
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
  lastTechnicalDate,
  productPerformance,
}: AnalysisBriefingClientProps) {
  const router = useRouter();

  // Technical Refresh State
  const [techLoading, setTechLoading] = useState(false);
  const [techMsg, setTechMsg] = useState<string | null>(null);

  // Run Technical Analysis
  async function runTechnical() {
    setTechLoading(true);
    setTechMsg(null);
    try {
      const res = await fetch("/api/analysis/run", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTechMsg(
          `${data.analyzed ?? 0} varlık analiz edildi` +
            (data.skipped ? `, ${data.skipped} atlandı` : ""),
        );
        router.refresh();
      } else {
        setTechMsg(data.error ?? "Teknik analiz başarısız");
      }
    } catch {
      setTechMsg("Bağlantı hatası");
    } finally {
      setTechLoading(false);
      setTimeout(() => setTechMsg(null), 6000);
    }
  }

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
      {/* 1. Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
            Analiz
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            TEFAS yatırımcı dinamikleri ve ürün bazlı getiri ısı haritası
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runTechnical}
            disabled={techLoading}
            className="btn btn-outline text-xs shadow-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={cn(techLoading && "animate-spin")}
            />
            {techLoading ? "Hesaplanıyor..." : "Teknik Analizi Yenile"}
          </button>
        </div>
      </div>

      {techMsg && (
        <p className="text-xs font-semibold text-[var(--color-profit)] bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 inline-block animate-in fade-in">
          {techMsg}
        </p>
      )}

      {/* 2. TEFAS Fon Akış & Yatırımcı Analizi Section */}
      {tefasInvestors && (
        <TefasInvestorSection
          tefasInvestors={tefasInvestors}
          symbolNotes={new Map()}
        />
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
            Bu sayfada sunulan analiz göstergeleri, TEFAS yatırımcı hareketleri ve istatistiksel hesaplamalar yalnızca bilgilendirme ve kişisel analiz amaçlıdır. SPK mevzuatı kapsamında yatırım tavsiyesi veya portföy yönetim emri teşkil etmez.
          </p>
        </div>
      </div>
    </div>
  );
}
