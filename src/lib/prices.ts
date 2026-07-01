// import "server-only";
import { resolvePriceMapping, type AssetType } from "./assets";

export interface PricePoint {
  date: Date;
  close: number;
}

export interface CurrentPrice {
  /** Enstrumanin kendi para biriminde fiyat */
  price: number;
  currency: string;
  /** TL cinsinden fiyat (cevrim sonrasi) */
  priceTRY: number;
  prevPrice?: number | null;
  prevPriceTRY?: number | null;
  prevDate?: Date | null;
}

const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/";
// Yeni TEFAS (2026 Next.js sitesi) resmi JSON endpoint'leri
const TEFAS_INFO_URL = "https://www.tefas.gov.tr/api/funds/fonGnlBlgSiraliGetir";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
type TefasKind = "YAT" | "EMK" | "BYF";
const TEFAS_KINDS: TefasKind[] = ["YAT", "EMK", "BYF"];

interface YahooChartResult {
  meta?: {
    regularMarketPrice?: number;
    currency?: string;
  };
  timestamp?: number[];
  indicators?: {
    quote?: { close?: (number | null)[] }[];
    adjclose?: { adjclose?: (number | null)[] }[];
  };
}

async function yahooChart(
  symbol: string,
  query: string,
): Promise<YahooChartResult | null> {
  try {
    const url = `${YAHOO_CHART}${encodeURIComponent(symbol)}?${query}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: { result?: YahooChartResult[] };
    };
    return json?.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

function fmtTefasDate(d: Date): string {
  // YYYYMMDD
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Guncel USD/TRY kuru. */
export async function getUsdTryRate(): Promise<number> {
  for (const sym of ["USDTRY=X", "TRY=X"]) {
    const r = await yahooChart(sym, "interval=1d&range=5d");
    const price = r?.meta?.regularMarketPrice;
    if (typeof price === "number" && price > 0) return price;
  }
  return NaN;
}

/** Belirli tarihten bugune USD/TRY gunluk kapanislari. */
export async function getUsdTryHistory(from: Date): Promise<PricePoint[]> {
  return fetchYahooHistory("USDTRY=X", from);
}

// Cross kur onbellegi (islem suresince)
const crossRateCache = new Map<string, number>();

/** Disa acik: bir para biriminin guncel TL karsiligi. */
export async function currencyToTryRate(
  currency: string,
  usdTry: number,
): Promise<number> {
  return getCurrencyTryRate(currency, usdTry);
}

/** Bir para biriminin TL karsiligi (USD haricindekiler icin <CUR>TRY=X). */
async function getCurrencyTryRate(
  currency: string,
  usdTry: number,
): Promise<number> {
  const cur = (currency || "USD").toUpperCase();
  if (cur === "TRY" || cur === "TL") return 1;
  if (cur === "USD") return usdTry;
  if (crossRateCache.has(cur)) return crossRateCache.get(cur)!;

  // 1) Dogrudan <CUR>TRY=X dene
  let rate: number | undefined;
  const direct = await yahooChart(`${cur}TRY=X`, "interval=1d&range=5d");
  const dPrice = direct?.meta?.regularMarketPrice;
  if (typeof dPrice === "number" && dPrice > 0) {
    rate = dPrice;
  } else {
    // 2) USD uzerinden capraz: <CUR>=X => 1 USD = ? CUR
    const cross = await yahooChart(`${cur}=X`, "interval=1d&range=5d");
    const curPerUsd = cross?.meta?.regularMarketPrice;
    if (typeof curPerUsd === "number" && curPerUsd > 0) {
      rate = usdTry / curPerUsd;
    }
  }

  const val = rate && rate > 0 ? rate : usdTry;
  crossRateCache.set(cur, val);
  return val;
}

/** Yahoo guncel fiyat (kendi para biriminde). */
export async function fetchYahooQuote(
  symbol: string,
): Promise<{ price: number; currency: string; prevPrice?: number | null; prevDate?: Date | null } | null> {
  const r = await yahooChart(symbol, "interval=1d&range=5d");
  const price = r?.meta?.regularMarketPrice;
  if (typeof price !== "number") return null;

  let prevPrice: number | null = null;
  let prevDate: Date | null = null;
  if (r?.timestamp && r.timestamp.length > 1) {
    const closes = r.indicators?.quote?.[0]?.close || [];
    for (let i = r.timestamp.length - 2; i >= 0; i--) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        prevPrice = c;
        prevDate = new Date(r.timestamp[i] * 1000);
        break;
      }
    }
  }

  return {
    price,
    currency: r?.meta?.currency || "USD",
    prevPrice,
    prevDate,
  };
}

/** Yahoo gunluk gecmis kapanislar. */
export async function fetchYahooHistory(
  symbol: string,
  from: Date,
): Promise<PricePoint[]> {
  const period1 = Math.floor(from.getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const r = await yahooChart(
    symbol,
    `interval=1d&period1=${period1}&period2=${period2}`,
  );
  if (!r?.timestamp) return [];
  const closes =
    r.indicators?.quote?.[0]?.close ??
    r.indicators?.adjclose?.[0]?.adjclose ??
    [];
  const points: PricePoint[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const c = closes[i];
    if (typeof c === "number" && Number.isFinite(c)) {
      points.push({ date: new Date(r.timestamp[i] * 1000), close: c });
    }
  }
  return points;
}

interface TefasRow {
  fonKodu: string;
  fonUnvan?: string;
  tarih: string;
  fiyat: number;
}

// --- TEFAS hiz sinirlayici (dakikada ~6 istek) ---
const TEFAS_MIN_GAP_MS = 9500;
let tefasQueue: Promise<unknown> = Promise.resolve();
let tefasLastAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** TEFAS isteklerini sirayla ve aralikli calistirir. */
function tefasEnqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = tefasQueue.then(async () => {
    const wait = TEFAS_MIN_GAP_MS - (Date.now() - tefasLastAt);
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      tefasLastAt = Date.now();
    }
  });
  tefasQueue = run.catch(() => {});
  return run as Promise<T>;
}

async function tefasPost(
  kind: TefasKind,
  fonKodu: string | null,
  from: Date,
  to: Date,
): Promise<TefasRow[]> {
  return tefasEnqueue(() => tefasPostRaw(kind, fonKodu, from, to));
}

async function tefasPostRaw(
  kind: TefasKind,
  fonKodu: string | null,
  from: Date,
  to: Date,
): Promise<TefasRow[]> {
  const body = {
    fonTipi: kind,
    fonKodu: fonKodu,
    aramaMetni: null,
    fonTurKod: null,
    fonGrubu: null,
    sfonTurKod: null,
    fonTurAciklama: null,
    kurucuKod: null,
    basTarih: fmtTefasDate(from),
    bitTarih: fmtTefasDate(to),
    basSira: 1,
    bitSira: 100000,
    dil: "TR",
    sFonTurKod: "",
    fonKod: "",
    fonGrup: "",
    fonUnvanTip: "",
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(TEFAS_INFO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          Origin: "https://www.tefas.gov.tr",
          Referer: "https://www.tefas.gov.tr/tr/fon-verileri",
          "User-Agent": UA,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.status === 429) {
        // hiz siniri: bekle ve tekrar dene
        await sleep(15000 + attempt * 10000);
        continue;
      }
      if (!res.ok) return [];
      const json = (await res.json()) as { resultList?: TefasRow[] };
      return json?.resultList ?? [];
    } catch {
      await sleep(3000);
    }
  }
  return [];
}

/** Tek bir fonun gunluk fiyat gecmisi (28 gunluk parcalara bolerek). */
export async function fetchTefasHistory(
  code: string,
  from: Date,
  to: Date = new Date(),
): Promise<PricePoint[]> {
  const upper = code.toUpperCase();
  const points = new Map<string, number>();
  const CHUNK = 28;

  for (const kind of TEFAS_KINDS) {
    let cur = new Date(from);
    let found = false;
    while (cur <= to) {
      const chunkEnd = new Date(cur);
      chunkEnd.setDate(chunkEnd.getDate() + CHUNK - 1);
      const end = chunkEnd > to ? to : chunkEnd;
      const rows = await tefasPost(kind, upper, cur, end);
      for (const r of rows) {
        if (r.fiyat != null && r.tarih) {
          points.set(r.tarih, Number(r.fiyat));
          found = true;
        }
      }
      cur = new Date(end);
      cur.setDate(cur.getDate() + 1);
    }
    if (found) break; // dogru fon tipi bulundu
  }

  return [...points.entries()]
    .map(([date, close]) => ({ date: new Date(date), close }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Tek bir fonun guncel (son) fiyati. */
export async function fetchTefasLatest(code: string): Promise<number | null> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 12);
  const hist = await fetchTefasHistory(code, from, to);
  if (hist.length === 0) return null;
  return hist[hist.length - 1].close;
}

/** Belirli bir fon tipi ve tarih araligindaki tum fon satirlari. */
export async function fetchTefasAll(
  kind: TefasKind,
  from: Date,
  to: Date,
): Promise<{ code: string; date: string; price: number }[]> {
  const rows = await tefasPost(kind, null, from, to);
  return rows
    .filter((r) => r.fiyat != null && r.tarih)
    .map((r) => ({ code: r.fonKodu, date: r.tarih, price: Number(r.fiyat) }));
}

export const ALL_TEFAS_KINDS = TEFAS_KINDS;

/**
 * Tum TEFAS fonlarinin guncel fiyatlarini tek seferde (tip basina 1 istek)
 * ceker. Sembol -> TL fiyat haritasi doner.
 */
export async function fetchTefasLatestMap(): Promise<Map<string, number>> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 10);
  const latestByCode = new Map<string, { date: string; price: number }>();

  for (const kind of TEFAS_KINDS) {
    const rows = await tefasPost(kind, null, from, to);
    for (const r of rows) {
      if (r.fiyat == null || !r.tarih) continue;
      const prev = latestByCode.get(r.fonKodu);
      if (!prev || r.tarih > prev.date) {
        latestByCode.set(r.fonKodu, { date: r.tarih, price: Number(r.fiyat) });
      }
    }
  }

  const map = new Map<string, number>();
  for (const [code, v] of latestByCode) map.set(code, v.price);
  return map;
}

/**
 * Bir enstrumanin guncel fiyatini TL cinsinden cozer.
 * manualPrice verilirse otomatik cekimden once o kullanilir.
 */
export async function resolveCurrentPriceTRY(
  assetType: AssetType,
  symbol: string,
  usdTry: number,
  manualPrice?: number | null,
): Promise<CurrentPrice | null> {
  const map = resolvePriceMapping(assetType, symbol);

  if (manualPrice != null && Number.isFinite(manualPrice)) {
    const priceTRY =
      map.currency === "USD" ? manualPrice * usdTry : manualPrice;
    return { price: manualPrice, currency: map.currency, priceTRY };
  }

  if (map.source === "manual") return null;

  if (map.source === "tefas" && map.tefasCode) {
    const p = await fetchTefasLatest(map.tefasCode);
    if (p == null) return null;
    return { price: p, currency: "TRY", priceTRY: p };
  }

  if (!map.yahooSymbol) return null;
  const q = await fetchYahooQuote(map.yahooSymbol);
  if (!q) return null;

  let price = q.price;
  if (map.perGramDivisor) price = price / map.perGramDivisor;

  let priceTRY: number;
  let nativeCurrency = q.currency;

  let prevPrice: number | null = null;
  let prevPriceTRY: number | null = null;

  if (map.source === "yahoo-fx") {
    // USDTRY=X dogrudan TL fiyat verir
    priceTRY = price;
    nativeCurrency = "TRY";
    if (q.prevPrice) {
      prevPrice = q.prevPrice;
      prevPriceTRY = q.prevPrice;
    }
  } else if (map.multiplyByUsdTry) {
    // Metal/kripto: USD bazli futures/parite
    priceTRY = price * usdTry;
    nativeCurrency = "TRY";
    if (q.prevPrice) {
      const pPrev = map.perGramDivisor ? q.prevPrice / map.perGramDivisor : q.prevPrice;
      prevPrice = pPrev;
      prevPriceTRY = pPrev * usdTry;
    }
  } else {
    // Hisse/ETF/fon: Yahoo'nun bildirdigi gercek para birimini kullan
    const rate = await getCurrencyTryRate(q.currency, usdTry);
    priceTRY = price * rate;
    if (q.prevPrice) {
      prevPrice = q.prevPrice;
      prevPriceTRY = q.prevPrice * rate;
    }
  }

  return {
    price,
    currency: nativeCurrency,
    priceTRY,
    prevPrice,
    prevPriceTRY,
    prevDate: q.prevDate,
  };
}
