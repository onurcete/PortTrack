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

export interface FundStockHolding {
  symbol: string;
  name: string;
  weightPct?: number;
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
  // Portföydeki Öne Çıkan Hisseler (KAP Portföy Dağılım Raporu)
  topHoldings?: FundStockHolding[];
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
  // Hisse Senetleri
  hs: { label: "Hisse Senedi (BIST)", color: "#3b82f6" },
  btaa: { label: "Hisse Senedi (BIST)", color: "#3b82f6" },
  btas: { label: "Hisse Senedi (BIST)", color: "#3b82f6" },
  yhs: { label: "Yabancı Hisse", color: "#f59e0b" },
  yyf: { label: "Yabancı Hisse & Fon", color: "#d97706" },
  ybyf: { label: "Yabancı Hisse & Fon", color: "#d97706" },
  ymk: { label: "Yabancı Menkul Kıymet", color: "#b45309" },

  // Eurobond & Dış Borçlanma
  eut: { label: "Eurobond (Dış Borçlanma)", color: "#f97316" },
  osdb: { label: "Eurobond (Dış Borçlanma)", color: "#f97316" },
  db: { label: "Eurobond (Dış Borçlanma)", color: "#f97316" },
  dot: { label: "Eurobond (Dış Borçlanma)", color: "#f97316" },
  yba: { label: "Eurobond (Dış Borçlanma)", color: "#ea580c" },
  kba: { label: "Eurobond (Dış Borçlanma)", color: "#c2410c" },
  ybkb: { label: "Eurobond (Dış Borçlanma)", color: "#ea580c" },
  ybosb: { label: "Eurobond (Dış Borçlanma)", color: "#c2410c" },
  oksyd: { label: "Eurobond (Dış Borçlanma)", color: "#f97316" },

  // Para Piyasası & Repo
  tr: { label: "Ters Repo", color: "#10b981" },
  r: { label: "Ters Repo", color: "#10b981" },
  tpp: { label: "Takasbank Para Piyasası", color: "#06b6d4" },
  bpp: { label: "Borsa Para Piyasası", color: "#0891b2" },

  // Mevduat & Katılma
  vmtl: { label: "Vadeli Mevduat (TL)", color: "#14b8a6" },
  vmd: { label: "Döviz Mevduatı", color: "#0284c7" },
  vdm: { label: "Döviz Mevduatı", color: "#0284c7" },
  khtl: { label: "Katılma Hesabı (TL)", color: "#22c55e" },
  khd: { label: "Döviz Katılma Hesabı", color: "#16a34a" },
  kh: { label: "Katılma Hesabı", color: "#22c55e" },
  khau: { label: "Altın Katılma Hesabı", color: "#eab308" },
  vm: { label: "Vadeli Mevduat", color: "#14b8a6" },
  vmau: { label: "Altın Mevduatı", color: "#eab308" },

  // Tahvil & Bono
  dt: { label: "Devlet Tahvili", color: "#6366f1" },
  hb: { label: "Hazine Bonosu", color: "#a855f7" },
  ost: { label: "Özel Sektör Tahvili", color: "#d946ef" },
  fb: { label: "Finansman Bonosu", color: "#8b5cf6" },
  bb: { label: "Banka Bonosu", color: "#8b5cf6" },
  t: { label: "Devlet Tahvili", color: "#6366f1" },
  kibd: { label: "İpotek Teminatlı Menkul Kıymet", color: "#64748b" },

  // Kira Sertifikası (Sukuk)
  kkstl: { label: "Kira Sertifikası (Sukuk)", color: "#38bdf8" },
  kks: { label: "Kira Sertifikası (Sukuk)", color: "#38bdf8" },
  kksd: { label: "Kira Sertifikası (Döviz)", color: "#0284c7" },
  kksyd: { label: "Kira Sertifikası (Döviz)", color: "#0284c7" },
  osks: { label: "Özel Sektör Kira Sertifikası", color: "#60a5fa" },

  // Kıymetli Madenler (Altın/Gümüş)
  km: { label: "Kıymetli Madenler (Altın)", color: "#eab308" },
  kmbyf: { label: "Altın Fonu (BYF)", color: "#facc15" },
  gas: { label: "Altın Sertifikası (Darphane)", color: "#eab308" },
  kmkks: { label: "Altın Kira Sertifikası", color: "#ca8a04" },
  kmkba: { label: "Altın Tahvili/Bonosu", color: "#a16207" },

  // VİOP & Türev
  vint: { label: "VİOP Teminatı", color: "#ec4899" },

  // Yatırım Fonları & BYF
  byf: { label: "Borsa Yatırım Fonu (BYF)", color: "#84cc16" },
  gsykb: { label: "Girişim Sermayesi", color: "#a855f7" },
  gsyy: { label: "Girişim Sermayesi", color: "#a855f7" },
  gykb: { label: "Gayrimenkul Yatırım", color: "#6366f1" },
  gyy: { label: "Gayrimenkul Yatırım", color: "#6366f1" },
  fkb: { label: "Fon Katılma Belgesi", color: "#84cc16" },

  // Diğer
  d: { label: "Diğer / Nakit", color: "#94a3b8" },
};

/**
 * Fonların KAP Portföy Dağılım Raporu (PDR) bazlı öne çıkan hisse ve varlık pozisyonları
 */
export const KNOWN_FUND_HOLDINGS: Record<string, FundStockHolding[]> = {
  TLY: [
    { symbol: "DSTKF", name: "Destek Finans Faktoring", weightPct: 21.05 },
    { symbol: "OZATD", name: "Özata Denizcilik", weightPct: 8.40 },
    { symbol: "TERA", name: "Tera Yatırım Menkul Değerler", weightPct: 7.20 },
    { symbol: "REEDR", name: "Reeder Teknoloji", weightPct: 5.15 },
    { symbol: "EBEBK", name: "Ebebek Mağazacılık", weightPct: 4.30 },
    { symbol: "SURGY", name: "Sur Tatil Evleri GYO", weightPct: 3.85 },
    { symbol: "BORSK", name: "Bor Şeker", weightPct: 3.20 },
  ],
  TI2: [
    { symbol: "THYAO", name: "Türk Hava Yolları", weightPct: 9.80 },
    { symbol: "TUPRS", name: "Tüpraş", weightPct: 9.10 },
    { symbol: "BIMAS", name: "BİM Birleşik Mağazalar", weightPct: 8.40 },
    { symbol: "KCHOL", name: "Koç Holding", weightPct: 7.90 },
    { symbol: "AKBNK", name: "Akbank", weightPct: 7.20 },
    { symbol: "ISCTR", name: "İş Bankası (C)", weightPct: 6.80 },
    { symbol: "SAHOL", name: "Sabancı Holding", weightPct: 5.90 },
    { symbol: "ASELS", name: "Aselsan", weightPct: 5.20 },
  ],
  MAC: [
    { symbol: "KCHOL", name: "Koç Holding", weightPct: 8.60 },
    { symbol: "TTKOM", name: "Türk Telekom", weightPct: 8.20 },
    { symbol: "BIMAS", name: "BİM Birleşik Mağazalar", weightPct: 7.90 },
    { symbol: "TCELL", name: "Turkcell", weightPct: 7.10 },
    { symbol: "MGROS", name: "Migros Ticaret", weightPct: 6.80 },
    { symbol: "KRDMD", name: "Kardemir (D)", weightPct: 6.20 },
    { symbol: "TUPRS", name: "Tüpraş", weightPct: 5.80 },
  ],
  TCD: [
    { symbol: "TTRAK", name: "Türk Traktör", weightPct: 8.50 },
    { symbol: "CCOLA", name: "Coca-Cola İçecek", weightPct: 7.90 },
    { symbol: "MAVI", name: "Mavi Giyim", weightPct: 7.10 },
    { symbol: "LOGO", name: "Logo Yazılım", weightPct: 6.40 },
    { symbol: "FROTO", name: "Ford Otosan", weightPct: 5.90 },
  ],
  NNF: [
    { symbol: "LOGO", name: "Logo Yazılım", weightPct: 7.50 },
    { symbol: "INDES", name: "İndeks Bilgisayar", weightPct: 6.80 },
    { symbol: "KAREL", name: "Karel Elektronik", weightPct: 5.90 },
    { symbol: "ALARK", name: "Alarko Holding", weightPct: 5.40 },
    { symbol: "MTRKS", name: "Matriks Bilgi Dağıtım", weightPct: 4.80 },
  ],
  IIH: [
    { symbol: "ASELS", name: "Aselsan", weightPct: 9.20 },
    { symbol: "THYAO", name: "Türk Hava Yolları", weightPct: 8.60 },
    { symbol: "BIMAS", name: "BİM Birleşik Mağazalar", weightPct: 8.10 },
    { symbol: "SISE", name: "Şişecam", weightPct: 6.90 },
    { symbol: "PETKM", name: "Petkim", weightPct: 5.70 },
  ],
  AFA: [
    { symbol: "MSFT", name: "Microsoft Corp.", weightPct: 8.50 },
    { symbol: "AAPL", name: "Apple Inc.", weightPct: 8.10 },
    { symbol: "NVDA", name: "NVIDIA Corp.", weightPct: 7.90 },
    { symbol: "AMZN", name: "Amazon.com Inc.", weightPct: 6.80 },
    { symbol: "GOOGL", name: "Alphabet Inc.", weightPct: 5.90 },
    { symbol: "META", name: "Meta Platforms", weightPct: 5.10 },
  ],
  AFT: [
    { symbol: "NVDA", name: "NVIDIA Corp.", weightPct: 9.50 },
    { symbol: "MSFT", name: "Microsoft Corp.", weightPct: 8.80 },
    { symbol: "AAPL", name: "Apple Inc.", weightPct: 8.20 },
    { symbol: "AVGO", name: "Broadcom Inc.", weightPct: 7.40 },
    { symbol: "AMD", name: "Advanced Micro Devices", weightPct: 6.10 },
    { symbol: "QCOM", name: "Qualcomm Inc.", weightPct: 5.30 },
  ],
  YAY: [
    { symbol: "NVDA", name: "NVIDIA Corp.", weightPct: 9.10 },
    { symbol: "MSFT", name: "Microsoft Corp.", weightPct: 8.50 },
    { symbol: "AAPL", name: "Apple Inc.", weightPct: 8.00 },
    { symbol: "AMZN", name: "Amazon.com Inc.", weightPct: 6.90 },
    { symbol: "GOOGL", name: "Alphabet Inc.", weightPct: 5.80 },
  ],
  BIO: [
    { symbol: "GENIL", name: "Gen İlaç", weightPct: 11.20 },
    { symbol: "MPARK", name: "MLP Sağlık (Medical Park)", weightPct: 9.80 },
    { symbol: "SELEC", name: "Selçuk Ecza Deposu", weightPct: 8.50 },
    { symbol: "TRILC", name: "Türk İlaç Serum", weightPct: 6.40 },
  ],
  GMR: [
    { symbol: "KCHOL", name: "Koç Holding", weightPct: 7.50 },
    { symbol: "SAHOL", name: "Sabancı Holding", weightPct: 6.90 },
    { symbol: "ISCTR", name: "İş Bankası (C)", weightPct: 6.40 },
    { symbol: "THYAO", name: "Türk Hava Yolları", weightPct: 6.10 },
  ],
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
          const labelMap = new Map<string, { label: string; percent: number; color: string; key: string }>();
          let otherPct = 0;

          for (const [k, v] of Object.entries(row)) {
            if (k === "fonKodu" || k === "fonUnvan" || k === "tarih" || k === "bilFiyat") continue;
            const val = typeof v === "number" ? v : (typeof v === "string" ? parseFloat(v) : 0);
            if (!val || isNaN(val) || val <= 0.01) continue;

            const meta = ALLOCATION_MAP[k.toLowerCase()];
            if (meta) {
              if (val >= 0.5) {
                const existing = labelMap.get(meta.label);
                if (existing) {
                  existing.percent += val;
                } else {
                  labelMap.set(meta.label, {
                    key: k,
                    label: meta.label,
                    percent: val,
                    color: meta.color,
                  });
                }
              } else {
                otherPct += val;
              }
            } else {
              // Haritada henüz yer almayan diğer TEFAS alt kalemlerini kaybetmeden Diğer'e ekle
              otherPct += val;
            }
          }

          const slices: FundAllocationSlice[] = Array.from(labelMap.values()).map((item) => ({
            key: item.key,
            label: item.label,
            percent: Number(item.percent.toFixed(2)),
            color: item.color,
          }));

          if (otherPct > 0.1) {
            slices.push({
              key: "d",
              label: "Diğer / Nakit",
              percent: Number(otherPct.toFixed(2)),
              color: ALLOCATION_MAP.d.color,
            });
          }

          // Toplamı 100'e normalize et (yuvarlama farklarını gider)
          const sumPct = slices.reduce((acc, s) => acc + s.percent, 0);
          if (sumPct > 0 && Math.abs(sumPct - 100) > 0.05) {
            for (const s of slices) {
              s.percent = Number(((s.percent / sumPct) * 100).toFixed(2));
            }
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

    // Kümülatif dağılıma katkı (Aynı varlık sınıflarını tek grupta topla)
    if (h.valueTRY > 0) {
      if (allocations.length > 0) {
        for (const slice of allocations) {
          const sliceVal = (h.valueTRY * slice.percent) / 100;
          const groupKey = slice.label;
          const exist = cumulativeValueMap.get(groupKey);
          if (exist) {
            exist.valueTRY += sliceVal;
          } else {
            cumulativeValueMap.set(groupKey, {
              label: slice.label,
              valueTRY: sliceVal,
              color: slice.color,
            });
          }
        }
      } else {
        // Fonun TEFAS günlük kırılımı yoksa, fon türüne göre genel kategoriye veya diğer'e ata (sermaye kaybı olmadan)
        const fallbackType = extractFundType(h.name || metrics?.fundUnvan || "");
        let fallbackLabel = "Diğer / Portföy Fonu";
        let fallbackColor = "#94a3b8";

        if (fallbackType.includes("Hisse")) {
          fallbackLabel = "Hisse Senedi (BIST)";
          fallbackColor = "#3b82f6";
        } else if (fallbackType.includes("Para Piyasası")) {
          fallbackLabel = "Ters Repo";
          fallbackColor = "#10b981";
        } else if (fallbackType.includes("Eurobond") || fallbackType.includes("Dış Borç")) {
          fallbackLabel = "Eurobond (Dış Borçlanma)";
          fallbackColor = "#f97316";
        } else if (fallbackType.includes("Kıymetli") || fallbackType.includes("Altın")) {
          fallbackLabel = "Kıymetli Madenler (Altın)";
          fallbackColor = "#eab308";
        } else if (fallbackType.includes("Borçlanma") || fallbackType.includes("Tahvil")) {
          fallbackLabel = "Devlet Tahvili";
          fallbackColor = "#6366f1";
        }

        const exist = cumulativeValueMap.get(fallbackLabel);
        if (exist) {
          exist.valueTRY += h.valueTRY;
        } else {
          cumulativeValueMap.set(fallbackLabel, {
            label: fallbackLabel,
            valueTRY: h.valueTRY,
            color: fallbackColor,
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
      topHoldings: KNOWN_FUND_HOLDINGS[sym] || undefined,
    });
  }

  // Fonları portföydeki TL büyüklüğüne göre sırala
  funds.sort((a, b) => b.valueTRY - a.valueTRY);

  // Kümülatif dağılım dilimlerini hesapla (100% toplamla net dağılım)
  const cumulativeAllocations: FundAllocationSlice[] = [];
  const baseTotalTRY = totalFundValueTRY > 0 ? totalFundValueTRY : 1;

  if (baseTotalTRY > 0) {
    let otherSumTRY = 0;
    for (const [groupLabel, item] of cumulativeValueMap.entries()) {
      const pct = (item.valueTRY / baseTotalTRY) * 100;
      if (pct >= 0.5) {
        cumulativeAllocations.push({
          key: groupLabel,
          label: item.label,
          percent: Number(pct.toFixed(1)),
          color: item.color,
        });
      } else {
        otherSumTRY += item.valueTRY;
      }
    }

    if (otherSumTRY > 0) {
      const otherPct = (otherSumTRY / baseTotalTRY) * 100;
      const existOther = cumulativeAllocations.find((s) => s.label.includes("Diğer"));
      if (existOther) {
        existOther.percent = Number((existOther.percent + otherPct).toFixed(1));
      } else {
        cumulativeAllocations.push({
          key: "d",
          label: "Diğer / Nakit",
          percent: Number(otherPct.toFixed(1)),
          color: "#94a3b8",
        });
      }
    }

    // Yüzdeleri tam 100.0'e normalize et (1 haneli hassasiyet)
    const currentSum = cumulativeAllocations.reduce((acc, s) => acc + s.percent, 0);
    if (cumulativeAllocations.length > 0 && Math.abs(currentSum - 100) > 0.01) {
      const diff = 100 - currentSum;
      cumulativeAllocations[0].percent = Number(
        (cumulativeAllocations[0].percent + diff).toFixed(1)
      );
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
