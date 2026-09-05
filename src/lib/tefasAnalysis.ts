/**
 * TEFAS Fon Röntgeni & Kapsamlı Analiz Servisi
 * Resmi TEFAS API'sinden (dagilimSiraliGetirT ve fonGnlBlgSiraliGetir):
 * - Varlık Dağılımı (% Hisse, % Repo, % Mevduat, % Altın, % Tahvil vb.)
 * - Fon Büyüklüğü (AUM)
 * - Tedavüldeki Pay Sayısı & Net Para/Sermaye Akışı
 * - Ortalama Yatırımcı Bakiyesi
 * - Kümülatif Fon Portföyü Röntgeni
 */

import { prisma } from "./prisma";
import type { HoldingDTO } from "./analysisData";

export interface FundAllocationSlice {
  key: string;
  label: string;
  percent: number;
  color: string;
}

export interface TefasFundAnalysisItem {
  symbol: string;
  name: string;
  fundType: string;
  price: number;
  valueTRY: number;
  weightPct: number;
  quantity: number;
  // Büyüklük (AUM) & Pay
  fundSizeTRY: number | null; // portfoyBuyukluk
  sharesCount: number | null; // tedPaySayisi
  sharesDeltaWeek: number | null; // 1 haftalık pay adedi değişimi
  capitalFlowTRY: number | null; // 1 haftalık net para girişi/çıkışı (TL)
  // Yatırımcı Bilgileri
  investorCount: number | null;
  investorDeltaWeek: number | null;
  investorDeltaPct: number | null;
  avgTicketTRY: number | null; // Kisi basi ortalama büyüklük
  // Varlık Dağılımı (Röntgen)
  allocations: FundAllocationSlice[];
  primaryAsset: string;
  primaryAssetPct: number;
  date: string;
  // Geçmiş Serisi (Grafik için)
  investorSeries: { date: string; investors: number }[];
}

export interface TefasAnalysisSummary {
  funds: TefasFundAnalysisItem[];
  totalFundValueTRY: number;
  totalMarketAUM: number; // Kullanıcının fonlarının piyasadaki toplam büyüklüğü
  cumulativeAllocations: FundAllocationSlice[]; // Tüm fonların kümülatif varlık röntgeni
  topInflowFund: { symbol: string; flowTRY: number } | null;
  topOutflowFund: { symbol: string; flowTRY: number } | null;
  topDemandFund: { symbol: string; deltaPct: number; deltaCount: number } | null;
  largestFund: { symbol: string; aumTRY: number } | null;
  totalNetFlowTRY: number;
}

const ALLOCATION_MAP: Record<string, { label: string; color: string }> = {
  hs: { label: "Hisse Senedi", color: "#3b82f6" }, // Blue
  yhs: { label: "Yabancı Hisse", color: "#f59e0b" }, // Amber
  tr: { label: "Ters Repo", color: "#10b981" }, // Emerald
  tpp: { label: "Takasbank Para Piyasası", color: "#06b6d4" }, // Cyan
  dt: { label: "Devlet Tahvili", color: "#6366f1" }, // Indigo
  fb: { label: "Finansman Bonosu", color: "#8b5cf6" }, // Violet
  hb: { label: "Hazine Bonosu", color: "#a855f7" }, // Purple
  ost: { label: "Özel Sektör Tahvili", color: "#d946ef" }, // Fuchsia
  vmtl: { label: "Vadeli Mevduat (TL)", color: "#14b8a6" }, // Teal
  vmd: { label: "Vadeli Mevduat (Döviz)", color: "#0284c7" }, // Sky
  eut: { label: "Eurobond", color: "#f97316" }, // Orange
  km: { label: "Kıymetli Madenler (Altın)", color: "#eab308" }, // Yellow
  kmbyf: { label: "Altın Fonu (BYF)", color: "#facc15" },
  byf: { label: "Borsa Yatırım Fonu", color: "#84cc16" }, // Lime
  khtl: { label: "Katılma Hesabı (TL)", color: "#22c55e" }, // Green
  kkstl: { label: "Kira Sertifikası (Sukuk)", color: "#38bdf8" },
  vint: { label: "VİOP Teminatı", color: "#ec4899" }, // Pink
  bpp: { label: "Borsa Para Piyasası", color: "#64748b" },
  d: { label: "Diğer", color: "#94a3b8" }, // Slate
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// 15 dakikalık bellek içi önbellek
interface CachedTefasData {
  timestamp: number;
  allocations: Map<string, FundAllocationSlice[]>;
  metrics: Map<
    string,
    {
      fundSizeTRY: number;
      sharesCount: number;
      price: number;
      fundUnvan: string;
      date: string;
    }
  >;
}

let tefasGlobalCache: CachedTefasData | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

function fmtTefasDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getLatestBusinessDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  // Hafta sonu ise Cuma gününe git
  if (d.getDay() === 0) d.setDate(d.getDate() - 2); // Pazar -> Cuma
  else if (d.getDay() === 6) d.setDate(d.getDate() - 1); // Cumartesi -> Cuma
  return fmtTefasDate(d);
}

const TEFAS_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=UTF-8",
  Accept: "application/json, text/plain, */*",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://www.tefas.gov.tr",
  Referer: "https://www.tefas.gov.tr/TarihselVeriler.aspx",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "tr-TR,tr;q=0.9",
};

/**
 * TEFAS API'sinden fonların varlık dağılımlarını tek seferde toplu çeker
 */
async function fetchTefasAllocations(symbols: Set<string>): Promise<Map<string, FundAllocationSlice[]>> {
  const result = new Map<string, FundAllocationSlice[]>();
  if (symbols.size === 0) return result;

  const dateStr = getLatestBusinessDate(0);

  try {
    const res = await fetch("https://www.tefas.gov.tr/api/funds/dagilimSiraliGetirT", {
      method: "POST",
      headers: TEFAS_HEADERS,
      body: JSON.stringify({
        fonTipi: "YAT",
        basTarih: dateStr,
        bitTarih: dateStr,
        basSira: 1,
        bitSira: 2500,
        dil: "TR",
      }),
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const rows: any[] = json?.resultList ?? [];

      for (const row of rows) {
        const sym = row.fonKodu?.toUpperCase();
        if (symbols.has(sym)) {
          const slices: FundAllocationSlice[] = [];
          let otherPct = 0;

          for (const [key, meta] of Object.entries(ALLOCATION_MAP)) {
            const val = row[key];
            if (typeof val === "number" && val > 0.01) {
              if (val >= 0.5) {
                slices.push({
                  key,
                  label: meta.label,
                  percent: Number(val.toFixed(2)),
                  color: meta.color,
                });
              } else {
                otherPct += val;
              }
            }
          }

          if (otherPct > 0.1) {
            slices.push({
              key: "d",
              label: "Diğer",
              percent: Number(otherPct.toFixed(2)),
              color: ALLOCATION_MAP.d.color,
            });
          }

          slices.sort((a, b) => b.percent - a.percent);
          result.set(sym, slices);
        }
      }
    }
  } catch (err) {
    console.error("❌ TEFAS Varlık Dağılımı Çekme Hatası:", err);
  }

  return result;
}

/**
 * TEFAS API'sinden güncel ve 7 gün önceki fon büyüklüklerini, pay sayılarını ve yatırımcı sayılarını tek seferde toplu çeker
 */
async function fetchTefasMetrics(
  symbols: Set<string>
): Promise<
  Map<
    string,
    {
      fundSizeTRY: number;
      sharesCount: number;
      sharesDeltaWeek: number;
      capitalFlowTRY: number;
      price: number;
      fundUnvan: string;
      date: string;
      kisiSayisi: number;
      kisiSayisiDeltaWeek: number;
    }
  >
> {
  const result = new Map<
    string,
    {
      fundSizeTRY: number;
      sharesCount: number;
      sharesDeltaWeek: number;
      capitalFlowTRY: number;
      price: number;
      fundUnvan: string;
      date: string;
      kisiSayisi: number;
      kisiSayisiDeltaWeek: number;
    }
  >();

  if (symbols.size === 0) return result;

  const latestDateStr = getLatestBusinessDate(0);
  const priorDateStr = getLatestBusinessDate(7);

  try {
    const [resLatest, resPrior] = await Promise.all([
      fetch("https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir", {
        method: "POST",
        headers: TEFAS_HEADERS,
        body: JSON.stringify({
          fonTipi: "YAT",
          basTarih: latestDateStr,
          bitTarih: latestDateStr,
          basSira: 1,
          bitSira: 2500,
          dil: "TR",
        }),
        cache: "no-store",
      }),
      fetch("https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir", {
        method: "POST",
        headers: TEFAS_HEADERS,
        body: JSON.stringify({
          fonTipi: "YAT",
          basTarih: priorDateStr,
          bitTarih: priorDateStr,
          basSira: 1,
          bitSira: 2500,
          dil: "TR",
        }),
        cache: "no-store",
      }),
    ]);

    if (resLatest.ok) {
      const jsonLatest = await resLatest.json();
      const latestRows: any[] = jsonLatest?.resultList ?? [];

      const priorMap = new Map<string, any>();
      if (resPrior.ok) {
        const jsonPrior = await resPrior.json();
        const priorRows: any[] = jsonPrior?.resultList ?? [];
        for (const pr of priorRows) {
          if (pr.fonKodu) priorMap.set(pr.fonKodu.toUpperCase(), pr);
        }
      }

      for (const row of latestRows) {
        const sym = row.fonKodu?.toUpperCase();
        if (symbols.has(sym)) {
          const prior = priorMap.get(sym);
          const latestShares = Number(row.tedPaySayisi) || 0;
          const prevShares = Number(prior?.tedPaySayisi) || latestShares;
          const deltaShares = latestShares - prevShares;
          const price = Number(row.fiyat) || 0;
          const fundSizeTRY = Number(row.portfoyBuyukluk) || 0;
          const capitalFlowTRY = deltaShares * price;
          const kisiSayisi = Number(row.kisiSayisi) || 0;
          const prevKisiSayisi = Number(prior?.kisiSayisi) || kisiSayisi;
          const kisiSayisiDeltaWeek = kisiSayisi - prevKisiSayisi;

          result.set(sym, {
            fundSizeTRY,
            sharesCount: latestShares,
            sharesDeltaWeek: deltaShares,
            capitalFlowTRY,
            price,
            fundUnvan: row.fonUnvan || "",
            date: row.tarih || latestDateStr,
            kisiSayisi,
            kisiSayisiDeltaWeek,
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ TEFAS Fon Metrikleri Çekme Hatası:", err);
  }

  return result;
}

/**
 * Fon ünvanından kategori / şemsiye fon türünü türetir
 */
function extractFundType(unvan: string): string {
  const u = unvan.toUpperCase();
  if (u.includes("HİSSE SENEDİ")) return "Hisse Senedi";
  if (u.includes("PARA PİYASASI")) return "Para Piyasası";
  if (u.includes("DEĞİŞKEN")) return "Değişken";
  if (u.includes("BORÇLANMA")) return "Borçlanma Araçları";
  if (u.includes("ALTIN") || u.includes("KIYMETLİ MADEN")) return "Kıymetli Madenler";
  if (u.includes("FON SEPETİ")) return "Fon Sepeti";
  if (u.includes("SERBEST")) return "Serbest Fon";
  if (u.includes("KATILIM")) return "Katılım Fonu";
  if (u.includes("EUROBOND") || u.includes("DIŞ BORÇLANMA")) return "Eurobond";
  return "Yatırım Fonu";
}

/**
 * Analiz sayfası için zenginleştirilmiş TEFAS Analiz Özetini oluşturur
 */
export async function buildTefasAnalysisSummary(
  holdings: HoldingDTO[],
  dbInvestorSnaps: { symbol: string; date: Date; investors: number | null }[]
): Promise<TefasAnalysisSummary | null> {
  const tefasHoldings = holdings.filter((h) => h.assetType === "TEFAS");
  if (tefasHoldings.length === 0) return null;

  const symbols = new Set(tefasHoldings.map((h) => h.symbol.toUpperCase()));

  // 1. Verileri çek (Önbellekli veya canlı)
  const [allocationsMap, metricsMap] = await Promise.all([
    fetchTefasAllocations(symbols),
    fetchTefasMetrics(symbols),
  ]);

  // 2. DB'deki yatırımcı geçmişini grupla
  const investorSnapsBySym = new Map<string, { date: Date; investors: number }[]>();
  for (const snap of dbInvestorSnaps) {
    if (snap.investors != null && snap.investors > 0) {
      const sym = snap.symbol.toUpperCase();
      let list = investorSnapsBySym.get(sym);
      if (!list) {
        list = [];
        investorSnapsBySym.set(sym, list);
      }
      list.push({ date: snap.date, investors: snap.investors });
    }
  }

  let totalFundValueTRY = 0;
  let totalMarketAUM = 0;
  let totalNetFlowTRY = 0;

  // Kümülatif varlık dağılımı için TL ağırlıklı toplam
  const cumulativeValueMap = new Map<string, { label: string; valueTRY: number; color: string }>();

  const funds: TefasFundAnalysisItem[] = [];

  for (const h of tefasHoldings) {
    const sym = h.symbol.toUpperCase();
    const metrics = metricsMap.get(sym);
    const allocations = allocationsMap.get(sym) || [];

    totalFundValueTRY += h.valueTRY;
    if (metrics?.fundSizeTRY) {
      totalMarketAUM += metrics.fundSizeTRY;
    }
    if (metrics?.capitalFlowTRY) {
      totalNetFlowTRY += metrics.capitalFlowTRY;
    }

    // Yatırımcı analizi (DB snapshotları öncelikli, yoksa canlı TEFAS kisiSayisi)
    const snaps = (investorSnapsBySym.get(sym) || []).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    let latestInv: number | null = null;
    let weekDeltaInv: number | null = null;
    let weekDeltaPctInv: number | null = null;

    if (snaps.length > 0) {
      latestInv = snaps[snaps.length - 1].investors;
      const prior =
        snaps.find((s) => {
          const d = (snaps[snaps.length - 1].date.getTime() - s.date.getTime()) / (1000 * 3600 * 24);
          return d >= 5 && d <= 10;
        }) ?? (snaps.length >= 2 ? snaps[snaps.length - 2] : null);

      if (prior && prior.investors > 0 && latestInv != null) {
        weekDeltaInv = latestInv - prior.investors;
        weekDeltaPctInv = (weekDeltaInv / prior.investors) * 100;
      }
    }

    const finalInv =
      latestInv ?? (metrics?.kisiSayisi && metrics.kisiSayisi > 0 ? metrics.kisiSayisi : null);
    const finalDeltaInv = weekDeltaInv ?? metrics?.kisiSayisiDeltaWeek ?? null;
    const finalDeltaPctInv =
      weekDeltaPctInv ??
      (metrics && metrics.kisiSayisi > 0 && finalDeltaInv != null
        ? (finalDeltaInv / (metrics.kisiSayisi - finalDeltaInv)) * 100
        : null);

    const avgTicketTRY =
      metrics?.fundSizeTRY && finalInv && finalInv > 0
        ? metrics.fundSizeTRY / finalInv
        : null;

    // Kümülatif dağılıma katkı
    if (h.valueTRY > 0 && allocations.length > 0) {
      for (const slice of allocations) {
        const sliceVal = (h.valueTRY * slice.percent) / 100;
        const exist = cumulativeValueMap.get(slice.key);
        if (exist) {
          exist.valueTRY += sliceVal;
        } else {
          cumulativeValueMap.set(slice.key, {
            label: slice.label,
            valueTRY: sliceVal,
            color: slice.color,
          });
        }
      }
    }

    const primary = allocations[0];

    funds.push({
      symbol: sym,
      name: h.name || metrics?.fundUnvan || sym,
      fundType: extractFundType(h.name || metrics?.fundUnvan || ""),
      price: h.currentPriceNative || metrics?.price || 0,
      valueTRY: h.valueTRY,
      weightPct: h.weightPct,
      quantity: h.quantity,
      fundSizeTRY: metrics?.fundSizeTRY ?? null,
      sharesCount: metrics?.sharesCount ?? null,
      sharesDeltaWeek: metrics?.sharesDeltaWeek ?? null,
      capitalFlowTRY: metrics?.capitalFlowTRY ?? null,
      investorCount: finalInv,
      investorDeltaWeek: finalDeltaInv,
      investorDeltaPct: finalDeltaPctInv,
      avgTicketTRY,
      allocations,
      primaryAsset: primary?.label || "Karma",
      primaryAssetPct: primary?.percent || 100,
      date: metrics?.date || new Date().toISOString(),
      investorSeries: snaps.slice(-28).map((s) => ({
        date: s.date.toISOString(),
        investors: s.investors,
      })),
    });
  }

  // Fonları portföydeki TL büyüklüğüne göre sırala
  funds.sort((a, b) => b.valueTRY - a.valueTRY);

  // Kümülatif dağılım dilimlerini hesapla
  const cumulativeAllocations: FundAllocationSlice[] = [];
  if (totalFundValueTRY > 0) {
    for (const [key, item] of cumulativeValueMap.entries()) {
      const pct = (item.valueTRY / totalFundValueTRY) * 100;
      if (pct >= 0.5) {
        cumulativeAllocations.push({
          key,
          label: item.label,
          percent: Number(pct.toFixed(1)),
          color: item.color,
        });
      }
    }
    cumulativeAllocations.sort((a, b) => b.percent - a.percent);
  }

  // Özet Liderleri
  const sortedByInflow = [...funds].filter((f) => (f.capitalFlowTRY ?? 0) > 0);
  sortedByInflow.sort((a, b) => (b.capitalFlowTRY ?? 0) - (a.capitalFlowTRY ?? 0));
  const topInflowFund = sortedByInflow[0]
    ? { symbol: sortedByInflow[0].symbol, flowTRY: sortedByInflow[0].capitalFlowTRY! }
    : null;

  const sortedByOutflow = [...funds].filter((f) => (f.capitalFlowTRY ?? 0) < 0);
  sortedByOutflow.sort((a, b) => (a.capitalFlowTRY ?? 0) - (b.capitalFlowTRY ?? 0));
  const topOutflowFund = sortedByOutflow[0]
    ? { symbol: sortedByOutflow[0].symbol, flowTRY: sortedByOutflow[0].capitalFlowTRY! }
    : null;

  const sortedByDemand = [...funds].filter((f) => (f.investorDeltaPct ?? 0) > 0);
  sortedByDemand.sort((a, b) => (b.investorDeltaPct ?? 0) - (a.investorDeltaPct ?? 0));
  const topDemandFund = sortedByDemand[0]
    ? {
        symbol: sortedByDemand[0].symbol,
        deltaPct: sortedByDemand[0].investorDeltaPct!,
        deltaCount: sortedByDemand[0].investorDeltaWeek || 0,
      }
    : null;

  const sortedByAUM = [...funds].filter((f) => (f.fundSizeTRY ?? 0) > 0);
  sortedByAUM.sort((a, b) => (b.fundSizeTRY ?? 0) - (a.fundSizeTRY ?? 0));
  const largestFund = sortedByAUM[0]
    ? { symbol: sortedByAUM[0].symbol, aumTRY: sortedByAUM[0].fundSizeTRY! }
    : null;

  return {
    funds,
    totalFundValueTRY,
    totalMarketAUM,
    cumulativeAllocations,
    topInflowFund,
    topOutflowFund,
    topDemandFund,
    largestFund,
    totalNetFlowTRY,
  };
}
