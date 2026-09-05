import YahooFinance from "yahoo-finance2";
import type { HoldingDTO } from "./analysisData";
import { resolvePriceMapping } from "./assets";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface StockAnalysisItem {
  symbol: string;
  name: string;
  assetType: "BIST" | "FOREIGN";
  price: number;
  currency: "TRY" | "USD";
  dailyChangePct: number | null;
  valueTRY: number;
  valueUSD: number;
  weightPct: number;
  quantity: number;
  costTRY: number;
  unrealizedPctTRY: number | null;
  // 52 Hafta
  high52: number | null;
  low52: number | null;
  discountFromHighPct: number | null; // Örn: -14.2% (Zirveye uzaklık)
  gainFromLowPct: number | null; // Örn: +35.1% (Dipten prim)
  // Değerleme Çarpanları
  pe: number | null; // F/K
  forwardPe: number | null;
  pb: number | null; // PD/DD
  // Temettü
  dividendYield: number | null; // Yıllık Temettü Verimi (% cinsinden örn: 4.8)
  dividendRate: number | null; // Hisse başı yıllık temettü
  // Hacim & Likidite
  volume: number | null;
  avgVolume: number | null;
  relativeVolume: number | null; // volume / avgVolume (örn: 2.1x)
  isHighVolume: boolean; // relativeVolume >= 1.5
  // Piyasa Değeri
  marketCap: number | null;
  // Analist Hedefleri
  targetMeanPrice: number | null;
  targetUpsidePct: number | null; // Güncel fiyata göre yukarı potansiyel %
  recommendation: string | null; // "buy", "strong_buy", "hold", "sell"
  analystCount: number | null;
  // Teknik Özet
  trendSignal?: string | null;
  rsi14?: number | null;
}

export interface StockAnalysisSummary {
  stocks: StockAnalysisItem[];
  assetType: "BIST" | "FOREIGN";
  totalValueTRY: number;
  totalValueUSD: number;
  weightedPe: number | null;
  weightedPb: number | null;
  topDiscount: StockAnalysisItem | null;
  volumeLeader: StockAnalysisItem | null;
  topDividend: StockAnalysisItem | null;
  highVolumeCount: number;
  avgDiscountFromHigh: number | null;
}

// 10 dakikalık bellek içi önbellek
interface CachedQuote {
  timestamp: number;
  data: Partial<StockAnalysisItem>;
}
const quoteCache = new Map<string, CachedQuote>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function fetchQuoteWithFallback(yahooSymbol: string): Promise<Partial<StockAnalysisItem>> {
  const cached = quoteCache.get(yahooSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let partial: Partial<StockAnalysisItem> = {};

  try {
    const q: any = await yf.quote(yahooSymbol);
    if (q) {
      const price = q.regularMarketPrice ?? 0;
      const high52 = q.fiftyTwoWeekHigh ?? null;
      const low52 = q.fiftyTwoWeekLow ?? null;
      const discountFromHighPct =
        high52 && price > 0 ? ((price - high52) / high52) * 100 : null;
      const gainFromLowPct =
        low52 && low52 > 0 && price > 0 ? ((price - low52) / low52) * 100 : null;

      const volume = q.regularMarketVolume ?? null;
      const avgVolume = q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null;
      const relativeVolume =
        volume && avgVolume && avgVolume > 0 ? volume / avgVolume : null;

      // Yahoo dividendYield bazen 0.052 (ondalık), bazen 5.2 gelebilir
      let rawDivYield: number | null = q.trailingAnnualDividendYield ?? null;
      if (rawDivYield != null && rawDivYield > 0) {
        if (rawDivYield < 0.5) rawDivYield = rawDivYield * 100; // 0.045 -> 4.5%
      }

      const targetMeanPrice = q.targetMeanPrice ?? null;
      const targetUpsidePct =
        targetMeanPrice && price > 0 ? ((targetMeanPrice - price) / price) * 100 : null;

      partial = {
        name: q.shortName || q.longName,
        high52,
        low52,
        discountFromHighPct: discountFromHighPct != null ? Number(discountFromHighPct.toFixed(2)) : null,
        gainFromLowPct: gainFromLowPct != null ? Number(gainFromLowPct.toFixed(2)) : null,
        pe: q.trailingPE ? Number(q.trailingPE.toFixed(2)) : null,
        forwardPe: q.forwardPE ? Number(q.forwardPE.toFixed(2)) : null,
        pb: q.priceToBook ? Number(q.priceToBook.toFixed(2)) : null,
        dividendYield: rawDivYield != null ? Number(rawDivYield.toFixed(2)) : null,
        dividendRate: q.trailingAnnualDividendRate ?? null,
        volume,
        avgVolume,
        relativeVolume: relativeVolume != null ? Number(relativeVolume.toFixed(2)) : null,
        isHighVolume: (relativeVolume ?? 0) >= 1.5,
        marketCap: q.marketCap ?? null,
        targetMeanPrice,
        targetUpsidePct: targetUpsidePct != null ? Number(targetUpsidePct.toFixed(2)) : null,
        recommendation: q.recommendationKey ?? null,
        analystCount: q.numberOfAnalystOpinions ?? null,
      };

      quoteCache.set(yahooSymbol, { timestamp: Date.now(), data: partial });
      return partial;
    }
  } catch (err) {
    // Fallback to YAHOO_CHART
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (res.ok) {
        const json: any = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta) {
          const price = meta.regularMarketPrice ?? 0;
          const high52 = meta.fiftyTwoWeekHigh ?? null;
          const low52 = meta.fiftyTwoWeekLow ?? null;
          const discountFromHighPct =
            high52 && price > 0 ? ((price - high52) / high52) * 100 : null;
          const gainFromLowPct =
            low52 && low52 > 0 && price > 0 ? ((price - low52) / low52) * 100 : null;

          partial = {
            name: meta.shortName || meta.longName,
            high52,
            low52,
            discountFromHighPct: discountFromHighPct != null ? Number(discountFromHighPct.toFixed(2)) : null,
            gainFromLowPct: gainFromLowPct != null ? Number(gainFromLowPct.toFixed(2)) : null,
            volume: meta.regularMarketVolume ?? null,
          };
          quoteCache.set(yahooSymbol, { timestamp: Date.now(), data: partial });
          return partial;
        }
      }
    } catch {
      /* ignore */
    }
  }

  return partial;
}

export async function buildStockAnalysisSummary(
  holdings: HoldingDTO[],
  assetType: "BIST" | "FOREIGN"
): Promise<StockAnalysisSummary | null> {
  const targetHoldings = holdings.filter((h) => h.assetType === assetType);
  if (targetHoldings.length === 0) return null;

  // Sembolleri tek tek veya paralel yükle
  const items: StockAnalysisItem[] = await Promise.all(
    targetHoldings.map(async (h) => {
      const map = resolvePriceMapping(h.assetType, h.symbol);
      const yahooSymbol = map.yahooSymbol || h.symbol;

      const info = await fetchQuoteWithFallback(yahooSymbol);

      const price = h.currentPriceNative ?? (h.nativeCurrency === "TRY" ? h.valueTRY / (h.quantity || 1) : h.valueUSD / (h.quantity || 1));

      return {
        symbol: h.symbol,
        name: info.name || h.name || h.symbol,
        assetType,
        price,
        currency: h.nativeCurrency,
        dailyChangePct: h.dailyChangePct,
        valueTRY: h.valueTRY,
        valueUSD: h.valueUSD,
        weightPct: h.weightPct,
        quantity: h.quantity,
        costTRY: h.costTRY,
        unrealizedPctTRY: h.unrealizedPctTRY,
        high52: info.high52 ?? null,
        low52: info.low52 ?? null,
        discountFromHighPct: info.discountFromHighPct ?? null,
        gainFromLowPct: info.gainFromLowPct ?? null,
        pe: info.pe ?? null,
        forwardPe: info.forwardPe ?? null,
        pb: info.pb ?? null,
        dividendYield: info.dividendYield ?? null,
        dividendRate: info.dividendRate ?? null,
        volume: info.volume ?? null,
        avgVolume: info.avgVolume ?? null,
        relativeVolume: info.relativeVolume ?? null,
        isHighVolume: Boolean(info.isHighVolume),
        marketCap: info.marketCap ?? null,
        targetMeanPrice: info.targetMeanPrice ?? null,
        targetUpsidePct: info.targetUpsidePct ?? null,
        recommendation: info.recommendation ?? null,
        analystCount: info.analystCount ?? null,
        trendSignal: h.analysis?.trendSignal ?? null,
        rsi14: h.analysis?.indicators?.rsi14 ?? null,
      };
    })
  );

  const totalValueTRY = items.reduce((sum, s) => sum + s.valueTRY, 0);
  const totalValueUSD = items.reduce((sum, s) => sum + s.valueUSD, 0);

  // Ağırlıklı P/E ve P/B hesaplama
  let peWeightedSum = 0;
  let peWeightTotal = 0;
  let pbWeightedSum = 0;
  let pbWeightTotal = 0;

  for (const s of items) {
    if (s.pe && s.pe > 0 && s.pe < 150) {
      peWeightedSum += s.pe * s.valueTRY;
      peWeightTotal += s.valueTRY;
    }
    if (s.pb && s.pb > 0 && s.pb < 50) {
      pbWeightedSum += s.pb * s.valueTRY;
      pbWeightTotal += s.valueTRY;
    }
  }

  const weightedPe = peWeightTotal > 0 ? Number((peWeightedSum / peWeightTotal).toFixed(1)) : null;
  const weightedPb = pbWeightTotal > 0 ? Number((pbWeightedSum / pbWeightTotal).toFixed(1)) : null;

  // En iskontolu hisse (52H zirveden en çok düşen / discountFromHighPct en negatif olan)
  const discountCandidates = items.filter((s) => s.discountFromHighPct != null);
  const topDiscount =
    discountCandidates.length > 0
      ? [...discountCandidates].sort((a, b) => (a.discountFromHighPct ?? 0) - (b.discountFromHighPct ?? 0))[0]
      : null;

  // Hacim lideri (relativeVolume en yüksek olan)
  const volumeCandidates = items.filter((s) => s.relativeVolume != null && s.relativeVolume > 0);
  const volumeLeader =
    volumeCandidates.length > 0
      ? [...volumeCandidates].sort((a, b) => (b.relativeVolume ?? 0) - (a.relativeVolume ?? 0))[0]
      : null;

  // En yüksek temettü verimi olan hisse
  const divCandidates = items.filter((s) => s.dividendYield != null && s.dividendYield > 0);
  const topDividend =
    divCandidates.length > 0
      ? [...divCandidates].sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0))[0]
      : null;

  const highVolumeCount = items.filter((s) => s.isHighVolume).length;

  const avgDiscountFromHigh =
    discountCandidates.length > 0
      ? Number(
          (
            discountCandidates.reduce((acc, c) => acc + (c.discountFromHighPct ?? 0), 0) /
            discountCandidates.length
          ).toFixed(1)
        )
      : null;

  return {
    stocks: items,
    assetType,
    totalValueTRY,
    totalValueUSD,
    weightedPe,
    weightedPb,
    topDiscount,
    volumeLeader,
    topDividend,
    highVolumeCount,
    avgDiscountFromHigh,
  };
}
