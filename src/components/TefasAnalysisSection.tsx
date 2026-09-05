"use client";

import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Info,
  Calendar,
  X,
  Zap,
  Flame,
  Search,
  ChevronRight,
  Layers,
  PieChart,
  Wallet,
  Coins,
  DollarSign,
  Building2,
  Filter,
} from "lucide-react";
import type { TefasAnalysisSummary, TefasFundAnalysisItem } from "@/lib/tefasAnalysis";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

function ColumnTooltip({
  title,
  desc,
  good,
  bad,
  align = "center",
}: {
  title: string;
  desc: string;
  good?: string;
  bad?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <span className="relative inline-flex items-center group/tip ml-1.5 align-middle cursor-help">
      <span className="h-3.5 w-3.5 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center text-[9px] font-bold text-[var(--color-muted)] group-hover/tip:text-[var(--color-foreground)] group-hover/tip:border-[var(--color-brand)] group-hover/tip:bg-[var(--color-brand-soft)] transition-colors shadow-2xs">
        i
      </span>
      <span
        className={cn(
          "absolute top-full mt-2 hidden group-hover/tip:flex flex-col z-50 w-64 sm:w-72 p-3 rounded-xl",
          "bg-slate-900/95 dark:bg-slate-900/95 text-slate-100 backdrop-blur-md shadow-2xl border border-slate-700/70 text-[11px] font-normal normal-case leading-relaxed pointer-events-none text-left",
          align === "left" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "right" && "right-0"
        )}
      >
        <span className="font-extrabold text-[11.5px] text-white mb-1.5 tracking-tight flex items-center gap-1.5 border-b border-slate-700/60 pb-1.5">
          <Info size={13} className="text-indigo-400 shrink-0" />
          {title}
        </span>
        <span className="text-slate-300 font-medium leading-relaxed">{desc}</span>

        {(good || bad) && (
          <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1.5 text-[10.5px]">
            {good && (
              <div className="flex items-start gap-1.5 text-emerald-400 font-medium">
                <span className="font-bold shrink-0">🟢 İyi:</span>
                <span>{good}</span>
              </div>
            )}
            {bad && (
              <div className="flex items-start gap-1.5 text-rose-400 font-medium">
                <span className="font-bold shrink-0">🔴/🟡 Dikkat:</span>
                <span>{bad}</span>
              </div>
            )}
          </div>
        )}

        <span
          className={cn(
            "absolute bottom-full -mb-[1px] border-4 border-transparent border-b-slate-900/95",
            align === "left" && "left-2",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "right" && "right-2"
          )}
        />
      </span>
    </span>
  );
}

interface TefasAnalysisSectionProps {
  tefasAnalysis: TefasAnalysisSummary | null;
  symbolNotes?: Map<string, string>;
}

type TefasFilter = "ALL" | "INFLOW" | "DEMAND" | "EQUITY" | "MONEY_MARKET";

export function TefasAnalysisSection({
  tefasAnalysis,
  symbolNotes,
}: TefasAnalysisSectionProps) {
  const [filter, setFilter] = useState<TefasFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFund, setSelectedFund] = useState<TefasFundAnalysisItem | null>(null);

  if (!tefasAnalysis || tefasAnalysis.funds.length === 0) {
    return (
      <div className="card p-8 text-center text-xs text-[var(--color-muted)] rounded-2xl border border-[var(--color-border)]">
        Portföyünüzde henüz açık bir TEFAS yatırım fonu bulunmuyor.
      </div>
    );
  }

  const {
    funds,
    totalFundValueTRY,
    totalMarketAUM,
    cumulativeAllocations,
    topInflowFund,
    topOutflowFund,
    topDemandFund,
    largestFund,
    totalNetFlowTRY,
  } = tefasAnalysis;

  // Filtrelenmiş fonlar
  const filteredFunds = useMemo(() => {
    return funds.filter((f) => {
      // Metin araması
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = f.symbol.toLowerCase().includes(q);
        const matchName = f.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }

      // Kategori filtresi
      if (filter === "INFLOW") return (f.capitalFlowTRY ?? 0) > 0;
      if (filter === "DEMAND") return (f.investorDeltaPct ?? 0) > 0;
      if (filter === "EQUITY") return f.fundType === "Hisse Senedi";
      if (filter === "MONEY_MARKET")
        return f.fundType === "Para Piyasası" || f.fundType === "Borçlanma Araçları";

      return true;
    });
  }, [funds, filter, searchQuery]);

  // Fon büyüklüğünü Milyar veya Milyon TL olarak formatla
  const formatAUM = (val: number | null) => {
    if (val == null || val <= 0) return "—";
    if (val >= 1e9) {
      return `₺${(val / 1e9).toFixed(2)} Mr`;
    }
    if (val >= 1e6) {
      return `₺${(val / 1e6).toFixed(1)} Mn`;
    }
    return `₺${formatNumber(val, 0)}`;
  };

  // Net sermaye akışını formatla (+₺42.5 Mn / -₺12.1 Mn)
  const formatFlow = (val: number | null) => {
    if (val == null) return "—";
    const isPos = val > 0;
    const abs = Math.abs(val);
    let str = "";
    if (abs >= 1e9) str = `${(abs / 1e9).toFixed(2)} Mr`;
    else if (abs >= 1e6) str = `${(abs / 1e6).toFixed(1)} Mn`;
    else str = `${formatNumber(abs, 0)} ₺`;

    return `${isPos ? "+" : "-"}₺${str}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. KÜMÜLATİF RÖNTGEN & ÖZET KARTLARI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kümülatif Fon Röntgeni Kartı (Geniş 2 Kolon) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-brand-strong)] flex items-center gap-1.5">
                <Layers size={14} className="text-[var(--color-brand)]" />
                Fon Portföyü Kümülatif Röntgeni
              </span>
              <h3 className="text-base font-black text-[var(--color-foreground)] mt-0.5">
                Tüm Fonlarınızın İç Varlık Dağılımı (%100)
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--color-muted)] font-medium">Toplam Fon Değeriniz</span>
              <div className="text-lg font-black text-[var(--color-foreground)] tabular-nums">
                ₺{formatNumber(totalFundValueTRY, 0)}
              </div>
            </div>
          </div>

          {/* Görsel Dağılım Barı (Segment Bar) */}
          <div className="space-y-2.5">
            <div className="h-4.5 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden flex shadow-inner">
              {cumulativeAllocations.map((slice) => (
                <div
                  key={slice.key}
                  style={{
                    width: `${slice.percent}%`,
                    backgroundColor: slice.color,
                  }}
                  className="h-full transition-all hover:opacity-85 relative group cursor-pointer"
                  title={`${slice.label}: %${slice.percent}`}
                />
              ))}
            </div>

            {/* Dağılım Lejantı (Tüm Varlıklar Eksiksiz) */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-1">
              {cumulativeAllocations.map((slice) => (
                <div
                  key={slice.key}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--color-surface-muted)]/40 border border-[var(--color-border)]/40 text-xs"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-medium text-[var(--color-muted)] text-[11px]">{slice.label}</span>
                  <span className="font-black text-[var(--color-foreground)] tabular-nums text-[11.5px]">
                    %{slice.percent.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Toplam Büyüklük & Net Para Akışı Kartı */}
        <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
              <Building2 size={14} className="text-indigo-500" />
              Piyasa Büyüklüğü & Sermaye Akışı
            </span>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-black text-[var(--color-foreground)] tabular-nums">
                  {formatAUM(totalMarketAUM)}
                </div>
                <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
                  Fonlarınızın piyasadaki toplam AUM büyüklüğü
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border)]/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Haftalık Net Para Akışı</span>
              <div
                className={cn(
                  "text-sm font-black tabular-nums mt-0.5",
                  totalNetFlowTRY >= 0 ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"
                )}
              >
                {formatFlow(totalNetFlowTRY)}
              </div>
            </div>
            {topInflowFund && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Lider Fon</span>
                <div className="text-xs font-black text-[var(--color-foreground)]">
                  {topInflowFund.symbol} ({formatFlow(topInflowFund.flowTRY)})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. FİLTRELER VE ARAMA ÇUBUĞU */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: `Tüm Fonlar (${funds.length})` },
            { id: "INFLOW", label: "💰 Para Girişi Olanlar" },
            { id: "DEMAND", label: "👥 Yatırımcı Talebi Artanlar" },
            { id: "EQUITY", label: "📈 Hisse Yoğun Fonlar" },
            { id: "MONEY_MARKET", label: "🛡️ Para Piyasası / Borçlanma" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as TefasFilter)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                filter === tab.id
                  ? "bg-[var(--color-foreground)] text-[var(--color-surface)] shadow-xs"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="text"
            placeholder="Fon kodu veya adı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>
      </div>

      {/* 3. DETAYLI FON RÖNTGENİ VE ANALİZ TABLOSU */}
      <div className="card border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-xs bg-[var(--color-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--color-surface-muted)]/60 text-[var(--color-muted)] font-extrabold uppercase tracking-wider border-b border-[var(--color-border)]">
              <tr>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1">
                    <span>Fon</span>
                    <ColumnTooltip
                      title="Fon Kodu & Türü"
                      desc="Fonun TEFAS kodu, unvanı ve şemsiye fon türü (Hisse, Değişken, Borçlanma vb.)."
                      good="Portföy risk toleransınıza ve hedeflerinize uygun şemsiye türü seçimi."
                      bad="Stratejinize uygun olmayan aşırı riskli veya yüksek yönetim giderli fonlar."
                      align="left"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Portföy Değeri</span>
                    <ColumnTooltip
                      title="Portföy Değeri & Ağırlık"
                      desc="Bu fondaki mevcut yatırım tutarınız ve toplam fon sepetiniz içindeki yüzdesel ağırlığı."
                      good="Dengeli varlık dağılımı (tek bir fona aşırı yığılma olmaması, örn. %40+)."
                      bad="Aşırı konsantrasyon riski; tek fonun değer kaybının portföye yüksek etkisi."
                      align="right"
                    />
                  </div>
                </th>
                <th className="py-3 px-3.5 min-w-[190px]">
                  <div className="flex items-center gap-1">
                    <span>Varlık Dağılımı (Röntgen)</span>
                    <ColumnTooltip
                      title="Fon İç Varlık Dağılımı (Röntgen)"
                      desc="Fonun kasasındaki varlıkların resmi TEFAS kırılımı (% Hisse, % Eurobond, % Repo, % Altın vb.)."
                      good="Fon izahnamesine ve konjonktüre sadık, esnek ve şeffaf varlık yönetimi."
                      bad="İzahname dışı beklenmedik varlık yığılması veya likidite tuzağı riskleri."
                      align="left"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Fon Büyüklüğü (AUM)</span>
                    <ColumnTooltip
                      title="Fon Toplam Büyüklüğü (AUM)"
                      desc="Fonun kasasında yönettiği toplam net aktif portföy büyüklüğü."
                      good="Yüksek AUM (₺1 Mr+): Kurumsal güven, derin likidite, emirlerde rahat işlem kabiliyeti."
                      bad="Çok Düşük AUM (₺50 Mn altı): Likidite kısıtları, yüksek fon yönetim gider oranı ve tasfiye riski."
                      align="right"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Toplam Yatırımcı</span>
                    <ColumnTooltip
                      title="Toplam Yatırımcı Sayısı"
                      desc="Fonda payı bulunan güncel tekil yatırımcı (kişi/kurum) sayısı."
                      good="Geniş kitlelere yayılmış, popülerliği ve piyasa güveni oturmuş fonlar."
                      bad="Çok az yatırımcılı fonlarda birkaç büyük yatırımcının ani çıkışı fon yönetimini ve fiyatı sarsabilir."
                      align="right"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Haftalık Yatırımcı</span>
                    <ColumnTooltip
                      title="Haftalık Yatırımcı Değişimi"
                      desc="Son 1 haftada fon yatırımcı sayısındaki net kişi değişimi ve yüzdesel talep oranı."
                      good="(+ Artış): Fona taze bireysel/kurumsal talep olduğunu ve ilginin güçlendiğini gösterir."
                      bad="(- Azalış): Yatırımcıların fondan çıkış yaptığını, getiri veya güven kaybı eğilimini gösterir."
                      align="right"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Para Akışı</span>
                    <ColumnTooltip
                      title="Haftalık Net Sermaye Akışı"
                      desc="Tedavüldeki katılma payı adet değişimi üzerinden hesaplanan son 1 haftalık net fon nakit girişi/çıkışı."
                      good="(+ Pozitif Akış): Fona net taze nakit girmesi. Fiyat düşerken para girişi 'akıllı para alımı' sinyalidir."
                      bad="(- Negatif Akış): Fiyat yükselse dahi fondan net para kaçışı olduğunu gösterir."
                      align="right"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>Kişi Başı Bakiye</span>
                    <ColumnTooltip
                      title="Ortalama Yatırımcı Bakiyesi"
                      desc="Toplam Fon Büyüklüğü / Yatırımcı Sayısı (Ortalama Bilet Boyutu)."
                      good="Yüksek Bakiye (₺250.000+): Kurumsal veya 'akıllı para' ağırlığına işaret eder; panik satışları nadirdir."
                      bad="Çok Düşük Bakiye (₺20.000 altı): Küçük tasarruf sahibi ağırlığı; piyasa düzeltmelerinde panik satış riski yüksektir."
                      align="right"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>Trend</span>
                    <ColumnTooltip
                      title="4 Haftalık Talep Trendi"
                      desc="Son 4 haftalık periyotta fonun yatırımcı sayısı seyrinin çubuk grafiği."
                      good="Sürekli yükselen yeşil sütunlar: Fonun istikrarlı olarak yeni yatırımcı çektiği büyüme evresi."
                      bad="Azalan kırmızı sütunlar: Fonun düzenli kan kaybettiği ve yatırımcı ilgisinin azaldığı evre."
                      align="right"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/50 font-medium">
              {filteredFunds.map((f) => {
                const isInvUp = (f.investorDeltaPct ?? 0) > 0;
                const isInvDown = (f.investorDeltaPct ?? 0) < 0;
                const isFlowUp = (f.capitalFlowTRY ?? 0) > 0;
                const isFlowDown = (f.capitalFlowTRY ?? 0) < 0;

                return (
                  <tr
                    key={f.symbol}
                    onClick={() => setSelectedFund(f)}
                    className="hover:bg-[var(--color-surface-muted)]/40 transition-colors cursor-pointer group"
                  >
                    {/* 1. Fon Kodu & Adı */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {f.symbol}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-[var(--color-foreground)] group-hover:text-[var(--color-brand-strong)] transition-colors">
                              {f.symbol}
                            </span>
                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-muted)]">
                              {f.fundType}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--color-muted)] truncate max-w-[170px] mt-0.5">
                            {f.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 2. Portföy Değeri & Ağırlığı */}
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                      <div className="font-bold text-[var(--color-foreground)]">
                        ₺{formatNumber(f.valueTRY, 0)}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted)] font-semibold">
                        %{f.weightPct.toFixed(1)} Portföy Payı
                      </div>
                    </td>

                    {/* 3. Varlık Dağılımı (Röntgen) */}
                    <td className="py-3.5 px-3.5 min-w-[190px]">
                      {f.allocations.length > 0 ? (
                        <div className="space-y-1.5">
                          {/* Mini Dağılım Şeridi */}
                          <div className="h-2 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden flex shadow-2xs">
                            {f.allocations.map((slice) => (
                              <div
                                key={slice.key}
                                style={{ width: `${slice.percent}%`, backgroundColor: slice.color }}
                                className="h-full"
                                title={`${slice.label}: %${slice.percent}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-[var(--color-foreground)] truncate max-w-[130px]">
                              {f.primaryAsset}
                            </span>
                            <span className="font-black text-[var(--color-brand-strong)] tabular-nums">
                              %{f.primaryAssetPct}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--color-muted)]">—</span>
                      )}
                    </td>

                    {/* 4. Fon Büyüklüğü (AUM) */}
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                      <div className="font-extrabold text-[var(--color-foreground)]">
                        {formatAUM(f.fundSizeTRY)}
                      </div>
                      <div className="text-[10px] text-[var(--color-muted)]">Piyasa Fon Değeri</div>
                    </td>

                    {/* 5. Toplam Yatırımcı */}
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-[var(--color-foreground)]">
                      {f.investorCount != null ? `${formatNumber(f.investorCount, 0)} kişi` : "—"}
                    </td>

                    {/* 6. Haftalık Yatırımcı Değişimi */}
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                      {f.investorDeltaPct != null ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-extrabold",
                            isInvUp
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isInvDown
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
                          )}
                        >
                          {isInvUp ? "+" : ""}
                          {formatPercent(f.investorDeltaPct, 1)}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>

                    {/* 7. Net Para / Sermaye Akışı */}
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                      {f.capitalFlowTRY != null && Math.abs(f.capitalFlowTRY) > 1000 ? (
                        <div
                          className={cn(
                            "font-extrabold text-[11px]",
                            isFlowUp
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isFlowDown
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-[var(--color-muted)]"
                          )}
                        >
                          {formatFlow(f.capitalFlowTRY)}
                        </div>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>

                    {/* 8. Kişi Başı Bakiye */}
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                      {f.avgTicketTRY != null ? (
                        <span className="font-semibold text-[var(--color-muted)]">
                          ₺{formatNumber(f.avgTicketTRY, 0)}
                        </span>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>

                    {/* 9. Mini Trend Sparkline */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="w-16 h-5 mx-auto flex items-end gap-0.5">
                        {f.investorSeries.slice(-8).map((pt, i, arr) => {
                          const min = Math.min(...arr.map((p) => p.investors));
                          const max = Math.max(...arr.map((p) => p.investors));
                          const range = max - min || 1;
                          const heightPct = Math.max(15, ((pt.investors - min) / range) * 100);

                          return (
                            <div
                              key={pt.date}
                              style={{ height: `${heightPct}%` }}
                              className={cn(
                                "flex-1 rounded-t-sm transition-all",
                                isInvUp ? "bg-emerald-500/70" : isInvDown ? "bg-rose-500/70" : "bg-indigo-500/60"
                              )}
                              title={`${pt.date.split("T")[0]}: ${pt.investors} kişi`}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SEÇİLEN FON İÇİN DETAY MODALI / RÖNTGEN PENCERESİ */}
      {selectedFund && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                  {selectedFund.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[var(--color-foreground)]">
                      {selectedFund.symbol}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                      {selectedFund.fundType}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">{selectedFund.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFund(null)}
                className="p-1.5 rounded-xl hover:bg-[var(--color-surface-muted)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Metrik Rozetleri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/50">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Fon Büyüklüğü</span>
                <div className="text-sm font-black text-[var(--color-foreground)] mt-0.5 tabular-nums">
                  {formatAUM(selectedFund.fundSizeTRY)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/50">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Yatırımcı Sayısı</span>
                <div className="text-sm font-black text-[var(--color-foreground)] mt-0.5 tabular-nums">
                  {selectedFund.investorCount != null ? `${formatNumber(selectedFund.investorCount, 0)}` : "—"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/50">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Net Para Akışı</span>
                <div className="text-sm font-black text-[var(--color-foreground)] mt-0.5 tabular-nums">
                  {formatFlow(selectedFund.capitalFlowTRY)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface-muted)]/50 border border-[var(--color-border)]/50">
                <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Kişi Başı Ortalama</span>
                <div className="text-sm font-black text-[var(--color-foreground)] mt-0.5 tabular-nums">
                  {selectedFund.avgTicketTRY != null ? `₺${formatNumber(selectedFund.avgTicketTRY, 0)}` : "—"}
                </div>
              </div>
            </div>

            {/* Fon Varlık Dağılımı (Röntgen Kırılımı) */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-black text-[var(--color-foreground)] uppercase tracking-wider flex items-center gap-1.5">
                <PieChart size={14} className="text-[var(--color-brand)]" />
                Resmi Portföy Varlık Kırılımı (% Dağılım)
              </span>

              {selectedFund.allocations.length > 0 ? (
                <div className="space-y-2">
                  {/* Segment Çubuğu */}
                  <div className="h-3 w-full rounded-full bg-[var(--color-surface-muted)] overflow-hidden flex shadow-inner">
                    {selectedFund.allocations.map((slice) => (
                      <div
                        key={slice.key}
                        style={{ width: `${slice.percent}%`, backgroundColor: slice.color }}
                        className="h-full"
                      />
                    ))}
                  </div>

                  {/* Kalem Kalem Liste */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {selectedFund.allocations.map((slice) => (
                      <div
                        key={slice.key}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-muted)]/30 border border-[var(--color-border)]/40 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: slice.color }}
                          />
                          <span className="font-semibold text-[var(--color-foreground)]">{slice.label}</span>
                        </div>
                        <span className="font-black text-[var(--color-foreground)] tabular-nums">
                          %{slice.percent.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-muted)] italic">
                  Bu fon için TEFAS varlık dağılımı verisi bulunamadı.
                </p>
              )}
            </div>

            {/* Modal Alt Kapatma */}
            <div className="pt-3 border-t border-[var(--color-border)]/60 flex justify-end">
              <button
                onClick={() => setSelectedFund(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--color-surface-muted)] hover:bg-[var(--color-border)] text-[var(--color-foreground)] transition-colors cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
