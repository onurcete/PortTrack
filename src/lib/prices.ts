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
  investors?: number | null;
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

export interface YahooQuoteData {
  price: number;
  currency: string;
  prevPrice?: number | null;
  prevDate?: Date | null;
}

const YAHOO_QUOTE = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=";

/**
 * Yahoo Finance toplu (batch) quote cekimi.
 * Tek bir HTTP isteginde cok sayida sembolun guncel fiyatini ve onceki kapanisini ceker.
 */
export async function fetchYahooQuoteMap(
  symbols: string[],
): Promise<Map<string, YahooQuoteData>> {
  const result = new Map<string, YahooQuoteData>();
  if (!symbols || symbols.length === 0) return result;

  const uniqueSymbols = Array.from(new Set(symbols.map((s) => s.trim()).filter(Boolean)));
  const CHUNK_SIZE = 45;
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueSymbols.length; i += CHUNK_SIZE) {
    chunks.push(uniqueSymbols.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const url = `${YAHOO_QUOTE}${encodeURIComponent(chunk.join(","))}`;
        const res = await fetch(url, {
          headers: { "User-Agent": UA, Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          quoteResponse?: {
            result?: Array<{
              symbol?: string;
              regularMarketPrice?: number;
              regularMarketPreviousClose?: number;
              currency?: string;
            }>;
          };
        };
        const list = json?.quoteResponse?.result || [];
        for (const item of list) {
          if (item.symbol && typeof item.regularMarketPrice === "number" && item.regularMarketPrice > 0) {
            result.set(item.symbol, {
              price: item.regularMarketPrice,
              currency: item.currency || "USD",
              prevPrice: typeof item.regularMarketPreviousClose === "number" ? item.regularMarketPreviousClose : null,
            });
          }
        }
      } catch {
        /* fallback upstream */
      }
    }),
  );

  return result;
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
  kisiSayisi?: number;
}

// --- TEFAS hiz sinirlayici ---
const TEFAS_MIN_GAP_MS = 1200;
let tefasQueue: Promise<unknown> = Promise.resolve();
let tefasLastAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** TEFAS isteklerini sirayla ve aralikli calistirir. */
function tefasEnqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = tefasQueue.catch(() => {}).then(async () => {
    const wait = TEFAS_MIN_GAP_MS - (Date.now() - tefasLastAt);
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      tefasLastAt = Date.now();
    }
  });
  tefasQueue = run;
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

let tefasCookieCache = "";
let tefasCookieFetchedAt = 0;

async function getTefasSessionCookie(): Promise<string> {
  if (tefasCookieCache && Date.now() - tefasCookieFetchedAt < 5 * 60 * 1000) {
    return tefasCookieCache;
  }
  try {
    const res = await fetch("https://www.tefas.gov.tr/TarihselVeriler.aspx", {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      cache: "no-store",
    });
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
    tefasCookieCache = setCookies.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
    tefasCookieFetchedAt = Date.now();
    return tefasCookieCache;
  } catch {
    return "";
  }
}

async function tefasPostRaw(
  kind: TefasKind,
  fonKodu: string | null,
  from: Date,
  to: Date,
): Promise<TefasRow[]> {
  const body: Record<string, any> = {
    fonTipi: kind,
    fonKodu: fonKodu || null,
    basTarih: fmtTefasDate(from),
    bitTarih: fmtTefasDate(to),
    basSira: 1,
    bitSira: 100000,
    dil: "TR",
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const cookieStr = await getTefasSessionCookie().catch(() => "");
      const headers: Record<string, string> = {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://www.tefas.gov.tr",
        Referer: "https://www.tefas.gov.tr/TarihselVeriler.aspx",
        "User-Agent": UA,
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      };
      if (cookieStr) headers["Cookie"] = cookieStr;

      const res = await fetch(TEFAS_INFO_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (res.status === 429) {
        tefasCookieFetchedAt = 0; // Cookie yenile
        await sleep(2000 + attempt * 1000);
        continue;
      }
      if (!res.ok) return [];
      const json = (await res.json()) as { resultList?: TefasRow[] };
      return json?.resultList ?? [];
    } catch {
      await sleep(1000);
    }
  }
  return [];
}

/** Tek bir fonun gunluk fiyat gecmisi (TEFAS 2026 New Endpoint: fonFiyatBilgiGetir). */
export async function fetchTefasHistory(
  code: string,
  from: Date,
  to: Date = new Date(),
): Promise<Array<PricePoint & { investors?: number }>> {
  const upper = code.toUpperCase();
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - from.getTime()) / (1000 * 3600 * 24));

  // TEFAS Periyod Kodlari: 1: 1 Ay, 3: 3 Ay, 6: 6 Ay, 12: 1 Yil, 36: 3 Yil, 60: 5 Yil
  let periyod = 12;
  if (diffDays <= 31) periyod = 1;
  else if (diffDays <= 95) periyod = 3;
  else if (diffDays <= 190) periyod = 6;
  else if (diffDays <= 380) periyod = 12;
  else if (diffDays <= 1100) periyod = 36;
  else periyod = 60;

  try {
    const res = await fetch("https://www.tefas.gov.tr/api/funds/fonFiyatBilgiGetir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest",
        Origin: "https://www.tefas.gov.tr",
        Referer: "https://www.tefas.gov.tr/tr/fon-verileri",
        "User-Agent": UA,
      },
      body: JSON.stringify({
        fonKodu: upper,
        dil: "TR",
        periyod: periyod,
      }),
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const rows: Array<{ tarih: string; fiyat: number; kisiSayisi?: number }> = json?.resultList ?? [];

      if (rows.length > 0) {
        return rows
          .filter((r) => r.fiyat != null && r.tarih)
          .map((r) => ({
            date: new Date(r.tarih),
            close: Number(r.fiyat),
            investors: r.kisiSayisi ? Number(r.kisiSayisi) : undefined,
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
      }
    }
  } catch (e) {
    console.error(`[TEFAS fonFiyatBilgiGetir Error for ${upper}]:`, e);
  }

  return [];
}

/** Tek bir fonun guncel (son) fiyati. */
export async function fetchTefasLatest(code: string): Promise<number | null> {
  const detail = await fetchTefasLatestDetail(code);
  return detail?.price ?? null;
}

/**
 * Tek bir fonun detayli guncel fiyati ve yatirimci bilgisi.
 * Tum fon tiplerini PARALEL sorgulayarak en hizli sonucu alir (tek tur istek).
 */
export async function fetchTefasLatestDetail(code: string): Promise<{ price: number; investors?: number } | null> {
  const upper = code.toUpperCase();
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 10); // Son 10 gün yeterli

  // Tüm fon tiplerini parallel sorgula — ilk sonucu döndür
  const results = await Promise.all(
    TEFAS_KINDS.map((kind) => tefasPostRaw(kind, upper, from, to))
  );

  // En son tarihe sahip kaydı bul
  let latestDate = "";
  let latestRow: TefasRow | null = null;
  for (const rows of results) {
    for (const r of rows) {
      if (r.fiyat != null && r.tarih && r.tarih > latestDate) {
        latestDate = r.tarih;
        latestRow = r;
      }
    }
  }

  if (!latestRow) return null;
  return {
    price: Number(latestRow.fiyat),
    investors: latestRow.kisiSayisi ? Number(latestRow.kisiSayisi) : undefined,
  };
}

/** Belirli bir fon tipi ve tarih araligindaki tum fon satirlari. */
export async function fetchTefasAll(
  kind: TefasKind,
  from: Date,
  to: Date,
): Promise<{ code: string; date: string; price: number; investors?: number }[]> {
  const rows = await tefasPost(kind, null, from, to);
  return rows
    .filter((r) => r.fiyat != null && r.tarih)
    .map((r) => ({
      code: r.fonKodu,
      date: r.tarih,
      price: Number(r.fiyat),
      investors: r.kisiSayisi ? Number(r.kisiSayisi) : undefined,
    }));
}

export const ALL_TEFAS_KINDS = TEFAS_KINDS;

/**
 * Tum TEFAS fonlarinin guncel fiyatlarini tek seferde (tip basina 1 istek)
 * ceker. Sembol -> { price, investors } haritasi doner.
 *
 * `heldCodes` verilirse tutulan tum kodlar bulundugu anda kalan fon tipi
 * istekleri atlanir (cogu bireysel fon YAT oldugundan genelde tek istek yeter;
 * her istek arasi ~9.5 sn hiz siniri beklemesi vardir).
 */
export async function fetchTefasLatestMap(
  heldCodes?: Set<string>,
): Promise<Map<string, { price: number; investors?: number }>> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 10);
  const latestByCode = new Map<string, { date: string; price: number; investors?: number }>();

  // Tüm fon tiplerini (YAT, EMK, BYF) tek seferde PARALEL olarak sorgula
  const results = await Promise.all(
    TEFAS_KINDS.map((kind) => tefasPost(kind, null, from, to))
  );

  for (const rows of results) {
    for (const r of rows) {
      if (r.fiyat == null || !r.tarih) continue;
      const prev = latestByCode.get(r.fonKodu);
      if (!prev || r.tarih > prev.date) {
        latestByCode.set(r.fonKodu, {
          date: r.tarih,
          price: Number(r.fiyat),
          investors: r.kisiSayisi ? Number(r.kisiSayisi) : undefined,
        });
      }
    }
  }

  const map = new Map<string, { price: number; investors?: number }>();
  for (const [code, v] of latestByCode) {
    map.set(code, { price: v.price, investors: v.investors });
  }
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
  preFetchedMap?: Map<string, YahooQuoteData>,
): Promise<CurrentPrice | null> {
  const map = resolvePriceMapping(assetType, symbol);

  if (manualPrice != null && Number.isFinite(manualPrice)) {
    const priceTRY =
      map.currency === "USD" ? manualPrice * usdTry : manualPrice;
    return { price: manualPrice, currency: map.currency, priceTRY };
  }

  if (map.source === "manual") return null;

  if (map.source === "tefas" && map.tefasCode) {
    const detail = await fetchTefasLatestDetail(map.tefasCode);
    if (detail == null) return null;
    return { price: detail.price, currency: "TRY", priceTRY: detail.price, investors: detail.investors };
  }

  if (!map.yahooSymbol) return null;
  const q = preFetchedMap?.get(map.yahooSymbol) ?? (await fetchYahooQuote(map.yahooSymbol));
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
