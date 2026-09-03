// import "server-only";
import { prisma } from "./prisma";
import {
  fetchYahooHistory,
  fetchTefasHistory,
  fetchTefasAll,
  currencyToTryRate,
  ALL_TEFAS_KINDS,
  type PricePoint,
} from "./prices";
import { backfillFxHistory } from "./refresh";
import {
  resolvePriceMapping,
  ASSET_TYPES,
  type AssetType,
  type GrowthByType,
} from "./assets";
import {
  loadManualSnapshots,
  growthPointFromSnapshot,
  usesFullBacklog,
  applyBesOverride,
} from "./backlog";
import {
  GROWTH_BASELINE_YEAR,
  GROWTH_DISPLAY_FROM_YEAR,
} from "./backlog.constants";
import {
  computePositions,
  buildFxLookup,
  type TxInput,
  type FxLookup,
} from "./portfolio";
import { startOfDay, trYear, trMonth } from "./utils";
/** Turkey-time day of month */
function trDateOfMonth(d: Date): number {
  const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return trDate.getUTCDate();
}

function isBeforeOrEqualDay(d1: Date, d2: Date): boolean {
  const y1 = d1.getFullYear();
  const m1 = d1.getMonth();
  const r1 = d1.getDate();
  
  const y2 = d2.getFullYear();
  const m2 = d2.getMonth();
  const r2 = d2.getDate();
  
  if (y1 !== y2) return y1 < y2;
  if (m1 !== m2) return m1 < m2;
  return r1 <= r2;
}

/** Ilk islemden bugune kadar ay sonu tarihleri. */
function monthEnds(from: Date, to: Date): Date[] {
  const ends: Date[] = [];
  let y = trYear(from);
  let m = trMonth(from);
  const today = startOfDay(to);
  const toY = trYear(to);
  const toM = trMonth(to);
  while (true) {
    const end = new Date(Date.UTC(y, m + 1, 0)); // ayin son gunu (UTC)
    const clamped = end > today ? today : end;
    ends.push(startOfDay(clamped));
    if (y === toY && m === toM) break;
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return ends;
}

/** Tarihe gore (forward-fill) fiyat arama; oncesinde veri yoksa null. */
function lookupOnOrBefore(points: PricePoint[], date: Date): number | null {
  const t = date.getTime();
  let val: number | null = null;
  for (const p of points) {
    if (p.date.getTime() <= t) val = p.close;
    else break;
  }
  return val;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function getFxLookupAndCurrent(): Promise<{
  fx: FxLookup;
  current: number;
}> {
  const fxRows = await prisma.fxRate.findMany({
    where: { pair: "USDTRY" },
    orderBy: { date: "asc" },
  });
  const hist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
  const current = hist.length ? hist[hist.length - 1].rate : 40;
  return { fx: buildFxLookup(hist, current), current };
}

interface HeldSymbol {
  symbol: string;
  assetType: AssetType;
}

async function getHeldSymbols(): Promise<HeldSymbol[]> {
  const rows = await prisma.transaction.findMany({
    select: { symbol: true, assetType: true },
  });
  const map = new Map<string, AssetType>();
  for (const r of rows) if (!map.has(r.symbol)) map.set(r.symbol, r.assetType as AssetType);
  return [...map.entries()].map(([symbol, assetType]) => ({ symbol, assetType }));
}

export interface BackfillResult {
  months: number;
  symbols: number;
  snapshots: number;
}

function monthKeyOf(d: Date): string {
  const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${trDate.getUTCFullYear()}-${String(trDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Yeni TEFAS API'si yaklasik bu tarihten itibaren veri donuyor
const TEFAS_HISTORY_FROM = new Date(2022, 0, 1);
// Islenen aylari isaretlemek icin sentinel sembol
const TEFAS_MARK = "__TEFAS_HIST__";

/**
 * Yahoo tabanli sembollerin ay-sonu TL fiyatlarini gecmise donuk yazar.
 * Hizlidir (sembol basina tek istek).
 */
export async function backfillYahoo(): Promise<BackfillResult> {
  const first = await prisma.transaction.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  if (!first) return { months: 0, symbols: 0, snapshots: 0 };

  const ends = monthEnds(new Date(first.date), new Date());
  const { fx, current: usdNow } = await getFxLookupAndCurrent();
  const symbols = await getHeldSymbols();

  const crossRates = new Map<string, number>();
  async function crossRate(cur: string): Promise<number> {
    if (crossRates.has(cur)) return crossRates.get(cur)!;
    const r = await currencyToTryRate(cur, usdNow);
    crossRates.set(cur, r);
    return r;
  }

  const recent = await prisma.priceSnapshot.findMany({ orderBy: { date: "desc" } });
  const currencyOf = new Map<string, string>();
  for (const s of recent) {
    if (!currencyOf.has(s.symbol) && s.nativeCurrency)
      currencyOf.set(s.symbol, s.nativeCurrency);
  }

  let snapshots = 0;
  let count = 0;
  const fromDate = new Date(first.date);
  fromDate.setDate(fromDate.getDate() - 7);

  for (const { symbol, assetType } of symbols) {
    const map = resolvePriceMapping(assetType, symbol);
    if (map.source === "tefas" || map.source === "manual" || !map.yahooSymbol)
      continue;

    const native = await fetchYahooHistory(map.yahooSymbol, fromDate);
    if (native.length === 0) continue;
    count++;
    const cur = (currencyOf.get(symbol) || map.currency || "USD").toUpperCase();

    for (const end of ends) {
      const raw = lookupOnOrBefore(native, end);
      if (raw == null) continue;
      const adj = (map.perGramDivisor ? raw / map.perGramDivisor : raw) * (map.multiplier || 1);
      let priceTRY: number;
      if (map.source === "yahoo-fx") priceTRY = adj;
      else if (map.multiplyByUsdTry) priceTRY = adj * fx(end);
      else if (cur === "TRY") priceTRY = adj;
      else if (cur === "USD") priceTRY = adj * fx(end);
      else priceTRY = adj * (await crossRate(cur));

      await prisma.priceSnapshot.upsert({
        where: { symbol_date: { symbol, date: end } },
        create: {
          symbol,
          date: end,
          close: priceTRY,
          native: raw,
          nativeCurrency: cur,
          currency: "TRY",
          source: "hist",
        },
        update: { close: priceTRY, native: raw, nativeCurrency: cur },
      });
      snapshots++;
    }
  }

  return { months: ends.length, symbols: count, snapshots };
}

import { setBackfillActive, setBackfillDone } from "./backfillState";

/**
 * Yalnızca veri eksikliği olan sembollerin geçmiş fiyatlarını ultra-hızlı ve akıllı şekilde doldurur.
 * Zaten geçmiş verisi eksiksiz toplanmış semboller ANINDA (0 ms) atlanır.
 */
export async function smartBackfillUserSymbols(userId?: string): Promise<{ processedSymbols: number; snapshotsAdded: number }> {
  if (userId) setBackfillActive(userId);

  try {
    const txWhere = userId ? { userId } : {};
    const earliestTx = await prisma.transaction.findFirst({
      where: txWhere,
      orderBy: { date: "asc" },
      select: { date: true },
    });

  if (!earliestTx) return { processedSymbols: 0, snapshotsAdded: 0 };

  const fifteenMonthsAgo = new Date();
  fifteenMonthsAgo.setMonth(fifteenMonthsAgo.getMonth() - 15);
  const firstDate = fifteenMonthsAgo;
  const ends = monthEnds(firstDate, new Date());
  if (ends.length === 0) return { processedSymbols: 0, snapshotsAdded: 0 };

  const txRows = await prisma.transaction.findMany({
    where: txWhere,
    select: { symbol: true, assetType: true },
  });

  const symbolMap = new Map<string, AssetType>();
  for (const r of txRows) {
    if (!symbolMap.has(r.symbol)) {
      symbolMap.set(r.symbol, r.assetType as AssetType);
    }
  }

  const { fx } = await getFxLookupAndCurrent();
  let processedSymbols = 0;
  let snapshotsAdded = 0;

  const entries = [...symbolMap.entries()];
  await mapLimit(entries, 4, async ([symbol, assetType]) => {
    const existingSnaps = await prisma.priceSnapshot.findMany({
      where: {
        symbol,
        date: { in: ends },
      },
      select: { date: true },
    });

    const existingDates = new Set(existingSnaps.map((s) => s.date.toISOString().slice(0, 7)));
    const missingEnds = ends.filter((e) => !existingDates.has(e.toISOString().slice(0, 7)));

    // Eğer bu sembol için tüm aylar zaten mevcutsa HIÇBIR ŞEY YAPMA (0ms)!
    if (missingEnds.length === 0) return;

    processedSymbols++;
    const mapping = resolvePriceMapping(assetType, symbol);

    if (mapping.source === "tefas") {
      // TEFAS fonu için tüm geçmişi hızlıca çek
      const tefasHistory = await fetchTefasHistory(symbol, firstDate, new Date());
      if (tefasHistory.length === 0) return;

      for (const end of missingEnds) {
        const p = lookupOnOrBefore(tefasHistory, end);
        if (p == null || p <= 0) continue;

        await prisma.priceSnapshot.upsert({
          where: { symbol_date: { symbol, date: end } },
          create: {
            symbol,
            date: end,
            close: p,
            native: p,
            nativeCurrency: "TRY",
            currency: "TRY",
            source: "hist",
          },
          update: { close: p, native: p, nativeCurrency: "TRY" },
        });
        snapshotsAdded++;
      }
    } else if (mapping.source === "yahoo" || mapping.source === "yahoo-fx") {
      if (!mapping.yahooSymbol) return;
      const yahooHistory = await fetchYahooHistory(mapping.yahooSymbol, firstDate);
      if (yahooHistory.length === 0) return;

      for (const end of missingEnds) {
        const raw = lookupOnOrBefore(yahooHistory, end);
        if (raw == null || raw <= 0) continue;

        const adj = (mapping.perGramDivisor ? raw / mapping.perGramDivisor : raw) * (mapping.multiplier || 1);
        let priceTRY: number;
        if (mapping.source === "yahoo-fx") priceTRY = adj;
        else if (mapping.multiplyByUsdTry) priceTRY = adj * fx(end);
        else if (mapping.currency === "TRY") priceTRY = adj;
        else priceTRY = adj * fx(end);

        await prisma.priceSnapshot.upsert({
          where: { symbol_date: { symbol, date: end } },
          create: {
            symbol,
            date: end,
            close: priceTRY,
            native: raw,
            nativeCurrency: mapping.currency || "USD",
            currency: "TRY",
            source: "hist",
          },
          update: { close: priceTRY, native: raw, nativeCurrency: mapping.currency || "USD" },
        });
        snapshotsAdded++;
      }
    }
  });

    // USD/TRY kur geçmişini de doldur
    await backfillFxHistory().catch(() => 0);

    return { processedSymbols, snapshotsAdded };
  } finally {
    if (userId) setBackfillDone(userId);
  }
}

export interface TefasProgress {
  done: boolean;
  total: number;
  remaining: number;
  processed: number;
  snapshots: number;
}

// Fon tipi siniflandirma onbellegi (process omru boyunca)
let cachedNeededKinds: { key: string; kinds: typeof ALL_TEFAS_KINDS } | null =
  null;

/** Tutulan TEFAS fonlarinin hangi tiplerde (YAT/EMK/BYF) oldugunu belirler. */
async function resolveNeededKinds(
  heldSet: Set<string>,
): Promise<typeof ALL_TEFAS_KINDS> {
  const key = [...heldSet].sort().join(",");
  if (cachedNeededKinds && cachedNeededKinds.key === key)
    return cachedNeededKinds.kinds;

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 10);
  const remaining = new Set(heldSet);
  const needed: string[] = [];

  for (const kind of ALL_TEFAS_KINDS) {
    if (remaining.size === 0) break;
    const rows = await fetchTefasAll(kind, from, to);
    let any = false;
    for (const r of rows)
      if (remaining.has(r.code)) {
        remaining.delete(r.code);
        any = true;
      }
    if (any) needed.push(kind);
  }
  const kinds = (needed.length > 0 ? needed : ["YAT"]) as typeof ALL_TEFAS_KINDS;
  cachedNeededKinds = { key, kinds };
  return kinds;
}

/**
 * TEFAS fonlarinin ay-sonu fiyatlarini gecmise donuk, hiz-sinirina uygun
 * sekilde parca parca cekip yazar. Her cagri `budgetMs` icinde isleyebildigi
 * aylari isler; tamamlanana kadar tekrar cagrilabilir (resumable).
 */
export async function backfillTefas(budgetMs = 45000): Promise<TefasProgress> {
  const startedAt = Date.now();
  const first = await prisma.transaction.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  if (!first)
    return { done: true, total: 0, remaining: 0, processed: 0, snapshots: 0 };

  const symbols = await getHeldSymbols();
  const tefasCodes = symbols
    .filter((s) => resolvePriceMapping(s.assetType, s.symbol).source === "tefas")
    .map((s) => s.symbol);
  if (tefasCodes.length === 0)
    return { done: true, total: 0, remaining: 0, processed: 0, snapshots: 0 };
  const heldSet = new Set(tefasCodes);

  const startMonth =
    new Date(first.date) > TEFAS_HISTORY_FROM
      ? new Date(first.date)
      : TEFAS_HISTORY_FROM;
  const ends = monthEnds(startMonth, new Date());
  const total = ends.length;

  // Gerekli fon tiplerini belirle (cogu YAT) - ay basina istek sayisini azaltir
  const neededKinds = await resolveNeededKinds(heldSet);

  // Find which months have been processed for each fund
  const marks = await prisma.priceSnapshot.findMany({
    where: { symbol: { startsWith: "__TEFAS_MARK__:" } },
    select: { symbol: true, date: true },
  });

  const processedMonths = new Map<string, Set<string>>();
  for (const m of marks) {
    const code = m.symbol.substring("__TEFAS_MARK__:".length);
    if (!processedMonths.has(code)) processedMonths.set(code, new Set());
    processedMonths.get(code)!.add(monthKeyOf(m.date));
  }

  const pending = ends.filter((e) => {
    const key = monthKeyOf(e);
    return tefasCodes.some((code) => !processedMonths.get(code)?.has(key));
  });

  let processed = 0;
  let snapshots = 0;

  for (const end of pending) {
    if (Date.now() - startedAt > budgetMs) break;
    const key = monthKeyOf(end);
    const pendingCodes = tefasCodes.filter((code) => !processedMonths.get(code)?.has(key));
    if (pendingCodes.length === 0) continue;

    const pendingSet = new Set(pendingCodes);
    const winStart = new Date(end);
    winStart.setDate(winStart.getDate() - 6);

    const found = new Map<string, { price: number; investors?: number }>();
    for (const kind of neededKinds) {
      const rows = await fetchTefasAll(kind, winStart, end);
      const latest = new Map<string, { date: string; price: number; investors?: number }>();
      for (const r of rows) {
        if (!pendingSet.has(r.code)) continue;
        const prev = latest.get(r.code);
        if (!prev || r.date > prev.date)
          latest.set(r.code, { date: r.date, price: r.price, investors: r.investors });
      }
      for (const [code, v] of latest) if (!found.has(code)) found.set(code, v);
      if (found.size >= pendingSet.size) break;
    }

    for (const [code, item] of found) {
      await prisma.priceSnapshot.upsert({
        where: { symbol_date: { symbol: code, date: end } },
        create: {
          symbol: code,
          date: end,
          close: item.price,
          native: item.price,
          nativeCurrency: "TRY",
          currency: "TRY",
          source: "hist",
          investors: item.investors,
        },
        update: { close: item.price, native: item.price, nativeCurrency: "TRY", investors: item.investors },
      });
      snapshots++;
    }

    // Mark these pending codes as processed for this month
    for (const code of pendingCodes) {
      await prisma.priceSnapshot.upsert({
        where: { symbol_date: { symbol: `__TEFAS_MARK__:${code}`, date: end } },
        create: {
          symbol: `__TEFAS_MARK__:${code}`,
          date: end,
          close: 0,
          currency: "TRY",
          source: "mark",
        },
        update: {},
      });
    }
    processed++;
  }

  const remaining = pending.length - processed;
  return { done: remaining <= 0, total, remaining, processed, snapshots };
}

export interface GrowthPoint {
  month: string; // YYYY-MM
  valueTRY: number;
  valueUSD: number;
  costTRY: number;
  costUSD: number;
  byType: GrowthByType;
  /**
   * Backlog (manuel snapshot) kapsami baslamadan onceki ay: yalnizca
   * islemlerden hesaplanir, BES gibi kalemler eksik olabilir. Yil
   * karsilastirmalarinda bu sinir asilmamalidir.
   */
  partialData?: boolean;
  /** Yuzde hesabi icin eklenen sentetik baz ayi (grafikte gosterilmez). */
  isSyntheticBaseline?: boolean;
}

function emptyByType(): GrowthByType {
  return Object.fromEntries(
    ASSET_TYPES.map((t) => [t, { valueTRY: 0, valueUSD: 0 }]),
  ) as GrowthByType;
}

/** Yil sonu noktasi (YYYY-12 veya o yilin son kaydi). */
function yearEndPoint(
  series: GrowthPoint[],
  year: number,
): GrowthPoint | undefined {
  const prefix = `${year}-`;
  const months = series
    .filter((p) => p.month.startsWith(prefix))
    .sort((a, b) => a.month.localeCompare(b.month));
  return months[months.length - 1];
}

/**
 * Backlog'da 2022 yoksa 2023-01 acilis bakiyesini 2022-12 baz ayi yapar
 * (ay basi bakiye = onceki yil sonu).
 */
function ensureBaselineYearEnd(series: GrowthPoint[]): GrowthPoint[] {
  const baselineKey = `${GROWTH_BASELINE_YEAR}-12`;
  if (series.some((p) => p.month === baselineKey)) return series;

  const anchor =
    yearEndPoint(series, GROWTH_BASELINE_YEAR) ??
    series.find((p) => p.month === `${GROWTH_DISPLAY_FROM_YEAR}-01`);
  if (!anchor) return series;

  const baseline: GrowthPoint = {
    ...anchor,
    month: baselineKey,
    isSyntheticBaseline: true,
  };
  return [...series, baseline].sort((a, b) => a.month.localeCompare(b.month));
}

/** Ay-sonu portfoy degeri ve maliyet serisi (TL & USD). */
export async function getGrowthSeries(userId: string): Promise<GrowthPoint[]> {
  const [txRows, snaps, fxRows, manualSnaps] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.priceSnapshot.findMany({ orderBy: { date: "asc" } }),
    prisma.fxRate.findMany({ where: { pair: "USDTRY" }, orderBy: { date: "asc" } }),
    loadManualSnapshots(userId),
  ]);
  if (txRows.length === 0 && manualSnaps.size === 0) return [];

  const tx: TxInput[] = txRows.map((t) => ({
    date: t.date,
    assetType: t.assetType as AssetType,
    symbol: t.symbol,
    side: t.side as "BUY" | "SELL",
    unitPrice: t.unitPrice,
    quantity: t.quantity,
    total: t.total,
    currency: t.currency as "TRY" | "USD",
  }));

  // sembol -> sirali fiyat noktalari
  const bySymbol = new Map<string, PricePoint[]>();
  for (const s of snaps) {
    const arr = bySymbol.get(s.symbol) ?? [];
    arr.push({ date: s.date, close: s.close });
    bySymbol.set(s.symbol, arr);
  }

  const fxHist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
  const current = fxHist.length ? fxHist[fxHist.length - 1].rate : 40;
  const fx = buildFxLookup(fxHist, current);

  let rangeStart = txRows.length
    ? new Date(txRows[0].date)
    : new Date();
  for (const row of manualSnaps.values()) {
    if (row.month < rangeStart) rangeStart = new Date(row.month);
  }

  const ends = monthEnds(rangeStart, new Date());
  const series: GrowthPoint[] = [];

  for (const end of ends) {
    const monthKey = monthKeyOf(end);
    const snap = manualSnaps.get(monthKey);

    if (usesFullBacklog(trYear(end)) && snap) {
      series.push(growthPointFromSnapshot(snap));
      continue;
    }

    const priceMap = new Map<string, { priceTRY: number }>();
    for (const [symbol, points] of bySymbol) {
      const v = lookupOnOrBefore(points, end);
      if (v != null) priceMap.set(symbol, { priceTRY: v });
    }
    const txUpTo = tx.filter((t) => isBeforeOrEqualDay(t.date, end));
    const usdAt = fx(end);
    const { totals, allocation } = computePositions(txUpTo, priceMap, fx, usdAt);
    const byType = emptyByType();
    for (const a of allocation) {
      byType[a.assetType] = { valueTRY: a.valueTRY, valueUSD: a.valueUSD };
    }

    let point: GrowthPoint = {
      month: monthKey,
      valueTRY: totals.valueTRY,
      valueUSD: totals.valueUSD,
      costTRY: totals.costTRY,
      costUSD: totals.costUSD,
      byType,
    };

    // 2025+: diger kolonlar hesap; BES her zaman snapshot (excel veya form)
    if (!usesFullBacklog(trYear(end)) && snap) {
      point = applyBesOverride(point, snap.besTRY, usdAt);
    }

    series.push(point);
  }

  // Manuel snapshot kapsami baslamadan onceki aylar eksik veri icerebilir;
  // kaynak sinirini asan yil kiyaslarini engellemek icin isaretlenir.
  const snapMonths = [...manualSnaps.keys()].sort();
  const firstSnapMonth = snapMonths[0];
  const tagged = firstSnapMonth
    ? series.map((p) =>
        p.month < firstSnapMonth ? { ...p, partialData: true } : p,
      )
    : series;

  return ensureBaselineYearEnd(tagged);
}

export interface ChartTimelinePoint {
  date: string;
  label: string;
  valueTRY: number;
  valueUSD: number;
}

export interface PeriodReturnsDTO {
  dailyTRY: number | null;
  dailyUSD: number | null;
  dailyAmtTRY: number | null;
  dailyAmtUSD: number | null;
  weeklyTRY: number | null;
  weeklyUSD: number | null;
  weeklyAmtTRY: number | null;
  weeklyAmtUSD: number | null;
  mtdTRY: number | null;
  mtdUSD: number | null;
  mtdAmtTRY: number | null;
  mtdAmtUSD: number | null;
  monthlyTRY: number | null;
  monthlyUSD: number | null;
  monthlyAmtTRY: number | null;
  monthlyAmtUSD: number | null;
  ytdTRY: number | null;
  ytdUSD: number | null;
  ytdAmtTRY: number | null;
  ytdAmtUSD: number | null;
  oneYearTRY: number | null;
  oneYearUSD: number | null;
  oneYearAmtTRY: number | null;
  oneYearAmtUSD: number | null;
  allTimeTRY: number | null;
  allTimeUSD: number | null;
  allTimeAmtTRY: number | null;
  allTimeAmtUSD: number | null;
  timelines?: Record<string, ChartTimelinePoint[]>;
  assetTypeReturns?: {
    weekly: Record<string, { TRY: number | null; USD: number | null }>;
    mtd: Record<string, { TRY: number | null; USD: number | null }>;
    ytd: Record<string, { TRY: number | null; USD: number | null }>;
    oneYear?: Record<string, { TRY: number | null; USD: number | null }>;
  };
}

export async function getPeriodReturns(userId: string): Promise<PeriodReturnsDTO> {
  const [txRows, snaps, fxRows, manualSnaps] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.priceSnapshot.findMany({ orderBy: { date: "asc" } }),
    prisma.fxRate.findMany({ where: { pair: "USDTRY" }, orderBy: { date: "asc" } }),
    loadManualSnapshots(userId),
  ]);

  if (txRows.length === 0 && manualSnaps.size === 0) {
    return {
      dailyTRY: null, dailyUSD: null, dailyAmtTRY: null, dailyAmtUSD: null,
      weeklyTRY: null, weeklyUSD: null, weeklyAmtTRY: null, weeklyAmtUSD: null,
      mtdTRY: null, mtdUSD: null, mtdAmtTRY: null, mtdAmtUSD: null,
      monthlyTRY: null, monthlyUSD: null, monthlyAmtTRY: null, monthlyAmtUSD: null,
      ytdTRY: null, ytdUSD: null, ytdAmtTRY: null, ytdAmtUSD: null,
      oneYearTRY: null, oneYearUSD: null, oneYearAmtTRY: null, oneYearAmtUSD: null,
      allTimeTRY: null, allTimeUSD: null, allTimeAmtTRY: null, allTimeAmtUSD: null,
    };
  }

  const tx: TxInput[] = txRows.map((t) => ({
    date: t.date,
    assetType: t.assetType as AssetType,
    symbol: t.symbol,
    side: t.side as "BUY" | "SELL",
    unitPrice: t.unitPrice,
    quantity: t.quantity,
    total: t.total,
    currency: t.currency as "TRY" | "USD",
  }));

  const bySymbol = new Map<string, PricePoint[]>();
  for (const s of snaps) {
    const arr = bySymbol.get(s.symbol) ?? [];
    arr.push({ date: s.date, close: s.close });
    bySymbol.set(s.symbol, arr);
  }

  const fxHist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
  const current = fxHist.length ? fxHist[fxHist.length - 1].rate : 40;
  const fx = buildFxLookup(fxHist, current);

  const today = new Date();

  function getValAt(date: Date) {
    const monthKey = monthKeyOf(date);
    const snap = manualSnaps.get(monthKey);

    if (usesFullBacklog(trYear(date)) && snap) {
      const p = growthPointFromSnapshot(snap);
      return { valueTRY: p.valueTRY, valueUSD: p.valueUSD };
    }

    const priceMap = new Map<string, { priceTRY: number }>();
    for (const [symbol, points] of bySymbol) {
      const v = lookupOnOrBefore(points, date);
      if (v != null) priceMap.set(symbol, { priceTRY: v });
    }
    const txUpTo = tx.filter((t) => isBeforeOrEqualDay(t.date, date));
    const usdAt = fx(date);
    const { totals, allocation } = computePositions(txUpTo, priceMap, fx, usdAt);

    let valTRY = totals.valueTRY;
    let valUSD = totals.valueUSD;

    if (!usesFullBacklog(trYear(date)) && snap) {
      const byType = emptyByType();
      for (const a of allocation) {
        byType[a.assetType] = { valueTRY: a.valueTRY, valueUSD: a.valueUSD };
      }
      const point = applyBesOverride({
        month: monthKey,
        valueTRY: totals.valueTRY,
        valueUSD: totals.valueUSD,
        costTRY: totals.costTRY,
        costUSD: totals.costUSD,
        byType,
      }, snap.besTRY, usdAt);
      valTRY = point.valueTRY;
      valUSD = point.valueUSD;
    }

    return { valueTRY: valTRY, valueUSD: valUSD };
  }

  const d0 = today;
  const d1 = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const d7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dMtd = new Date(Date.UTC(trYear(today), trMonth(today), 0, 12, 0, 0));
  const d30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dYtd = new Date(Date.UTC(trYear(today) - 1, 11, 31, 12, 0, 0));
  const d1Y = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  const t0 = getValAt(d0);
  const t1 = getValAt(d1);
  const t7 = getValAt(d7);
  const tMtd = getValAt(dMtd);
  const t30 = getValAt(d30);
  const tYtd = getValAt(dYtd);
  const t1Y = getValAt(d1Y);

  function calcPct(cur: number, prev: number) {
    if (cur == null || prev == null || prev <= 0) return null;
    return ((cur / prev) - 1) * 100;
  }

  function calcAmt(cur: number, prev: number) {
    if (cur == null || prev == null) return null;
    return cur - prev;
  }

  // Calculate asset type value-weighted returns
  const priceMapToday = new Map<string, { priceTRY: number }>();
  for (const [symbol, points] of bySymbol) {
    const v = lookupOnOrBefore(points, today);
    if (v != null) priceMapToday.set(symbol, { priceTRY: v });
  }
  const { positions: currentPositions } = computePositions(tx, priceMapToday, fx, current);
  const openPositions = currentPositions.filter((p) => p.quantity > 1e-6);

  // Inception (Portföy başlangıç) baseline tespiti
  const sortedTx = tx.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstTxDate = sortedTx.length > 0 ? new Date(sortedTx[0].date) : null;
  const totalCostTRY = currentPositions.reduce((s, p) => s + (p.costTRY || 0), 0);
  const totalCostUSD = currentPositions.reduce((s, p) => s + (p.costUSD || 0), 0);
  const firstPointValTRY = firstTxDate ? getValAt(firstTxDate).valueTRY : 0;
  const firstPointValUSD = firstTxDate ? getValAt(firstTxDate).valueUSD : 0;
  const inceptionValTRY = totalCostTRY > 0 ? totalCostTRY : (firstPointValTRY > 0 ? firstPointValTRY : t0.valueTRY);
  const inceptionValUSD = totalCostUSD > 0 ? totalCostUSD : (firstPointValUSD > 0 ? firstPointValUSD : t0.valueUSD);

  function getEffectiveBaseline(tTarget: { valueTRY: number; valueUSD: number }, dTarget: Date) {
    const isTargetBeforeInception = firstTxDate ? isBeforeOrEqualDay(dTarget, firstTxDate) : false;
    const baseTRY = (tTarget.valueTRY > 0 && !isTargetBeforeInception) ? tTarget.valueTRY : inceptionValTRY;
    const baseUSD = (tTarget.valueUSD > 0 && !isTargetBeforeInception) ? tTarget.valueUSD : inceptionValUSD;
    return { valueTRY: baseTRY, valueUSD: baseUSD };
  }

  const base1 = t1.valueTRY > 0 ? t1 : getEffectiveBaseline(t1, d1);
  const base7 = getEffectiveBaseline(t7, d7);
  const baseMtd = getEffectiveBaseline(tMtd, dMtd);
  const base30 = getEffectiveBaseline(t30, d30);
  const baseYtd = getEffectiveBaseline(tYtd, dYtd);
  const base1Y = getEffectiveBaseline(t1Y, d1Y);

  function getAssetReturns(dStart: Date, dEnd: Date) {
    const typeTotals = new Map<string, {
      valTRY: number;
      valUSD: number;
      sumTRY: number;
      sumUSD: number;
    }>();

    for (const p of openPositions) {
      const points = bySymbol.get(p.symbol) || [];
      let pStartTRY = lookupOnOrBefore(points, dStart);
      if (pStartTRY == null || pStartTRY <= 0) {
        pStartTRY = (p.avgCostTRY > 0 ? p.avgCostTRY : lookupOnOrBefore(points, today)) ?? p.currentPriceTRY;
      }
      const pEndTRY = lookupOnOrBefore(points, dEnd) ?? p.currentPriceTRY;
      
      if (pStartTRY == null || pEndTRY == null || pStartTRY <= 0) continue;

      const rTRY = ((pEndTRY / pStartTRY) - 1) * 100;

      const rateStart = fx(dStart);
      const rateEnd = fx(dEnd);
      const pStartUSD = pStartTRY / (rateStart > 0 ? rateStart : current);
      const pEndUSD = pEndTRY / (rateEnd > 0 ? rateEnd : current);
      const rUSD = pStartUSD > 0 ? ((pEndUSD / pStartUSD) - 1) * 100 : 0;

      const t = p.assetType;
      const cur = typeTotals.get(t) ?? { valTRY: 0, valUSD: 0, sumTRY: 0, sumUSD: 0 };
      
      cur.valTRY += p.valueTRY;
      cur.valUSD += p.valueUSD;
      cur.sumTRY += p.valueTRY * rTRY;
      cur.sumUSD += p.valueUSD * rUSD;

      typeTotals.set(t, cur);
    }

    const result: Record<string, { TRY: number | null; USD: number | null }> = {};
    for (const [t, data] of typeTotals.entries()) {
      result[t] = {
        TRY: data.valTRY > 0 ? data.sumTRY / data.valTRY : null,
        USD: data.valUSD > 0 ? data.sumUSD / data.valUSD : null,
      };
    }
    return result;
  }

  const series = await getGrowthSeries(userId);
  const firstPoint =
    series.find((p) => !p.partialData) ?? (series.length > 0 ? series[0] : null);

  const MONTH_NAMES_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  function formatPointLabel(d: Date): string {
    return `${d.getDate()} ${MONTH_NAMES_TR[d.getMonth()]}`;
  }

  function makePoint(d: Date): ChartTimelinePoint {
    const val = getValAt(d);
    const eff = getEffectiveBaseline(val, d);
    return {
      date: d.toISOString().slice(0, 10),
      label: formatPointLabel(d),
      valueTRY: eff.valueTRY > 0 ? eff.valueTRY : t0.valueTRY,
      valueUSD: eff.valueUSD > 0 ? eff.valueUSD : t0.valueUSD,
    };
  }

  // 1. 1G (Bugün İçi Akış: Başlangıçtan güncel ana kadar 12 nokta)
  const timeline1G: ChartTimelinePoint[] = [];
  const startDayVal = base1.valueTRY > 0 ? base1 : t0;
  const intradaySteps = 12;
  const intradayHours = [
    '09:30', '10:15', '11:00', '11:45', '12:30', '13:30',
    '14:15', '15:00', '15:45', '16:30', '17:15', '18:15'
  ];
  for (let i = 0; i < intradaySteps; i++) {
    const progress = i / (intradaySteps - 1);
    const ratio = i === 0 ? 0 : (i === intradaySteps - 1 ? 1 : progress);
    const vTRY = startDayVal.valueTRY + (t0.valueTRY - startDayVal.valueTRY) * ratio;
    const vUSD = startDayVal.valueUSD + (t0.valueUSD - startDayVal.valueUSD) * ratio;
    timeline1G.push({
      date: today.toISOString().slice(0, 10),
      label: intradayHours[i] || `${i + 9}:00`,
      valueTRY: Math.round(vTRY),
      valueUSD: Math.round(vUSD),
    });
  }

  // 2. 1H (Son 7 Günlük Gerçek Kapanış Noktaları)
  const timeline1H: ChartTimelinePoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    timeline1H.push(makePoint(d));
  }

  // 3. MTD (Cari Ayın 1'inden Bugüne)
  const timelineMTD: ChartTimelinePoint[] = [];
  const mtdStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const diffDaysMtd = Math.max(1, Math.floor((today.getTime() - mtdStart.getTime()) / 86400000));
  if (diffDaysMtd < 4) {
    for (let i = 3; i >= 1; i--) {
      const d = new Date(mtdStart.getTime() - i * 86400000);
      timelineMTD.push(makePoint(d));
    }
  }
  for (let d = new Date(mtdStart); d <= today; d = new Date(d.getTime() + 86400000)) {
    timelineMTD.push(makePoint(d));
  }

  // 4. 1A (Son 30 Gün)
  const timeline1A: ChartTimelinePoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    timeline1A.push(makePoint(d));
  }

  // 5. 3A (Son 90 Gün - 3'er günlük aralıklar)
  const timeline3A: ChartTimelinePoint[] = [];
  for (let i = 90; i >= 0; i -= 3) {
    const d = new Date(today.getTime() - i * 86400000);
    timeline3A.push(makePoint(d));
  }

  // 6. YTD (1 Ocak'tan Bugüne - 5'er günlük aralıklar)
  const timelineYTD: ChartTimelinePoint[] = [];
  const ytdStart = new Date(today.getFullYear(), 0, 1);
  for (let d = new Date(ytdStart); d <= today; d = new Date(d.getTime() + 5 * 86400000)) {
    timelineYTD.push(makePoint(d));
  }
  if (timelineYTD.length > 0 && timelineYTD[timelineYTD.length - 1].date !== today.toISOString().slice(0, 10)) {
    timelineYTD.push(makePoint(today));
  }

  // 7. 1Y (Son 1 Yıl - 14'er günlük aralıklar)
  const timeline1Y: ChartTimelinePoint[] = [];
  for (let i = 364; i >= 0; i -= 14) {
    const d = new Date(today.getTime() - i * 86400000);
    timeline1Y.push(makePoint(d));
  }
  if (timeline1Y.length > 0 && timeline1Y[timeline1Y.length - 1].date !== today.toISOString().slice(0, 10)) {
    timeline1Y.push(makePoint(today));
  }

  const timelines: Record<string, ChartTimelinePoint[]> = {
    '1G': timeline1G,
    '1H': timeline1H,
    'MTD': timelineMTD,
    '1A': timeline1A,
    '3A': timeline3A,
    'YTD': timelineYTD,
    '1Y': timeline1Y,
  };

  return {
    dailyTRY: calcPct(t0.valueTRY, base1.valueTRY),
    dailyUSD: calcPct(t0.valueUSD, base1.valueUSD),
    dailyAmtTRY: calcAmt(t0.valueTRY, base1.valueTRY),
    dailyAmtUSD: calcAmt(t0.valueUSD, base1.valueUSD),
    weeklyTRY: calcPct(t0.valueTRY, base7.valueTRY),
    weeklyUSD: calcPct(t0.valueUSD, base7.valueUSD),
    weeklyAmtTRY: calcAmt(t0.valueTRY, base7.valueTRY),
    weeklyAmtUSD: calcAmt(t0.valueUSD, base7.valueUSD),
    mtdTRY: calcPct(t0.valueTRY, baseMtd.valueTRY),
    mtdUSD: calcPct(t0.valueUSD, baseMtd.valueUSD),
    mtdAmtTRY: calcAmt(t0.valueTRY, baseMtd.valueTRY),
    mtdAmtUSD: calcAmt(t0.valueUSD, baseMtd.valueUSD),
    monthlyTRY: calcPct(t0.valueTRY, base30.valueTRY),
    monthlyUSD: calcPct(t0.valueUSD, base30.valueUSD),
    monthlyAmtTRY: calcAmt(t0.valueTRY, base30.valueTRY),
    monthlyAmtUSD: calcAmt(t0.valueUSD, base30.valueUSD),
    ytdTRY: calcPct(t0.valueTRY, baseYtd.valueTRY),
    ytdUSD: calcPct(t0.valueUSD, baseYtd.valueUSD),
    ytdAmtTRY: calcAmt(t0.valueTRY, baseYtd.valueTRY),
    ytdAmtUSD: calcAmt(t0.valueUSD, baseYtd.valueUSD),
    oneYearTRY: base1Y.valueTRY > 0 ? calcPct(t0.valueTRY, base1Y.valueTRY) : null,
    oneYearUSD: base1Y.valueUSD > 0 ? calcPct(t0.valueUSD, base1Y.valueUSD) : null,
    oneYearAmtTRY: base1Y.valueTRY > 0 ? calcAmt(t0.valueTRY, base1Y.valueTRY) : null,
    oneYearAmtUSD: base1Y.valueUSD > 0 ? calcAmt(t0.valueUSD, base1Y.valueUSD) : null,
    allTimeTRY: firstPoint ? calcPct(t0.valueTRY, firstPoint.valueTRY) : (inceptionValTRY > 0 ? calcPct(t0.valueTRY, inceptionValTRY) : null),
    allTimeUSD: firstPoint ? calcPct(t0.valueUSD, firstPoint.valueUSD) : (inceptionValUSD > 0 ? calcPct(t0.valueUSD, inceptionValUSD) : null),
    allTimeAmtTRY: firstPoint ? calcAmt(t0.valueTRY, firstPoint.valueTRY) : (inceptionValTRY > 0 ? calcAmt(t0.valueTRY, inceptionValTRY) : null),
    allTimeAmtUSD: firstPoint ? calcAmt(t0.valueUSD, firstPoint.valueUSD) : (inceptionValUSD > 0 ? calcAmt(t0.valueUSD, inceptionValUSD) : null),
    timelines,
    assetTypeReturns: {
      weekly: getAssetReturns(d7, d0),
      mtd: getAssetReturns(dMtd, d0),
      ytd: getAssetReturns(dYtd, d0),
      oneYear: getAssetReturns(d1Y, d0),
    },
  };
}

export interface ProductPerfRow {
  symbol: string;
  assetType: AssetType;
  returnsTRY: (number | null)[];
  returnsUSD: (number | null)[];
  totalTRY: number | null;
  totalUSD: number | null;
}

export interface ProductPerformance {
  months: string[]; // YYYY-MM (getiri aylari)
  rows: ProductPerfRow[];
}

/**
 * Hala tutulan urunlerin son `monthsBack` ay icin ay-ay getirisi (TL & USD).
 */
export async function getProductPerformance(
  userId: string,
  monthsBack = 12,
): Promise<ProductPerformance> {
  const [txRows, snaps, fxRows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.priceSnapshot.findMany({
      where: { source: { in: ["hist", "auto"] } },
      orderBy: { date: "asc" },
    }),
    prisma.fxRate.findMany({ where: { pair: "USDTRY" }, orderBy: { date: "asc" } }),
  ]);
  if (txRows.length === 0) return { months: [], rows: [] };

  // Halen tutulan (net adet > 0) semboller ve tipleri
  const netQty = new Map<string, number>();
  const typeOf = new Map<string, AssetType>();
  for (const t of txRows) {
    const sign = t.side === "SELL" ? -1 : 1;
    netQty.set(t.symbol, (netQty.get(t.symbol) ?? 0) + sign * t.quantity);
    if (!typeOf.has(t.symbol)) typeOf.set(t.symbol, t.assetType as AssetType);
  }
  const held = [...netQty.entries()]
    .filter(([, q]) => q > 1e-6)
    .map(([s]) => s);

  const fxHist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
  const current = fxHist.length ? fxHist[fxHist.length - 1].rate : 40;
  const fx = buildFxLookup(fxHist, current);

  const bySymbol = new Map<string, PricePoint[]>();
  for (const s of snaps) {
    if (s.symbol === TEFAS_MARK) continue;
    const arr = bySymbol.get(s.symbol) ?? [];
    arr.push({ date: s.date, close: s.close });
    bySymbol.set(s.symbol, arr);
  }

  const allEnds = monthEnds(new Date(txRows[0].date), new Date());
  // Getiri icin (monthsBack + 1) ay sonu noktasi gerekir
  const ends = allEnds.slice(Math.max(0, allEnds.length - (monthsBack + 1)));
  const months = ends
    .slice(1)
    .map((e) => monthKeyOf(e));

  const rows: ProductPerfRow[] = [];
  for (const symbol of held) {
    const points = bySymbol.get(symbol);
    if (!points || points.length === 0) continue;

    const closesTRY = ends.map((e) => lookupOnOrBefore(points, e));
    const closesUSD = ends.map((e, i) => {
      const c = closesTRY[i];
      return c != null ? c / fx(e) : null;
    });

    const returnsTRY: (number | null)[] = [];
    const returnsUSD: (number | null)[] = [];
    for (let i = 1; i < ends.length; i++) {
      const pT = closesTRY[i - 1];
      const cT = closesTRY[i];
      returnsTRY.push(pT && cT && pT > 0 ? (cT / pT - 1) * 100 : null);
      const pU = closesUSD[i - 1];
      const cU = closesUSD[i];
      returnsUSD.push(pU && cU && pU > 0 ? (cU / pU - 1) * 100 : null);
    }

    const firstT = closesTRY.find((c) => c != null) ?? null;
    const lastT = [...closesTRY].reverse().find((c) => c != null) ?? null;
    const firstU = closesUSD.find((c) => c != null) ?? null;
    const lastU = [...closesUSD].reverse().find((c) => c != null) ?? null;

    rows.push({
      symbol,
      assetType: typeOf.get(symbol) ?? "FOREIGN",
      returnsTRY,
      returnsUSD,
      totalTRY: firstT && lastT && firstT > 0 ? (lastT / firstT - 1) * 100 : null,
      totalUSD: firstU && lastU && firstU > 0 ? (lastU / firstU - 1) * 100 : null,
    });
  }

  // Toplam getiriye gore sirala (TL)
  rows.sort((a, b) => (b.totalTRY ?? -999) - (a.totalTRY ?? -999));

  return { months, rows };
}

const benchmarkCache = new Map<string, { data: PricePoint[]; expiry: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchYahooHistoryCached(symbol: string, fromDate: Date): Promise<PricePoint[]> {
  const now = Date.now();
  const cached = benchmarkCache.get(symbol);
  if (cached && cached.expiry > now) {
    return cached.data;
  }
  
  try {
    const data = await fetchYahooHistory(symbol, fromDate);
    if (data && data.length > 0) {
      benchmarkCache.set(symbol, {
        data,
        expiry: now + CACHE_TTL_MS,
      });
    }
    return data;
  } catch (err) {
    console.error(`Error fetching history for ${symbol}:`, err);
    return cached ? cached.data : [];
  }
}

// TÜİK Resmi TÜFE Endeks Sayıları (2003=100) - Aylık Veriler
const TURKISH_CPI_HISTORY = [
  { date: new Date(Date.UTC(2022, 11, 31)), value: 1128.45 }, // Aralık 2022
  { date: new Date(Date.UTC(2023, 0, 31)), value: 1203.48 },  // Ocak 2023
  { date: new Date(Date.UTC(2023, 1, 28)), value: 1241.33 },  // Şubat 2023
  { date: new Date(Date.UTC(2023, 2, 31)), value: 1269.75 },  // Mart 2023
  { date: new Date(Date.UTC(2023, 3, 30)), value: 1300.04 },  // Nisan 2023
  { date: new Date(Date.UTC(2023, 4, 31)), value: 1300.60 },  // Mayıs 2023
  { date: new Date(Date.UTC(2023, 5, 30)), value: 1351.59 },  // Haziran 2023
  { date: new Date(Date.UTC(2023, 6, 31)), value: 1479.84 },  // Temmuz 2023
  { date: new Date(Date.UTC(2023, 7, 31)), value: 1614.31 },  // Ağustos 2023
  { date: new Date(Date.UTC(2023, 8, 30)), value: 1691.04 },  // Eylül 2023
  { date: new Date(Date.UTC(2023, 9, 31)), value: 1749.11 },  // Ekim 2023
  { date: new Date(Date.UTC(2023, 10, 30)), value: 1806.50 }, // Kasım 2023
  { date: new Date(Date.UTC(2023, 11, 31)), value: 1859.38 }, // Aralık 2023
  { date: new Date(Date.UTC(2024, 0, 31)), value: 1984.02 },  // Ocak 2024
  { date: new Date(Date.UTC(2024, 1, 29)), value: 2073.88 },  // Şubat 2024
  { date: new Date(Date.UTC(2024, 2, 31)), value: 2139.47 },  // Mart 2024
  { date: new Date(Date.UTC(2024, 3, 30)), value: 2207.50 },  // Nisan 2024
  { date: new Date(Date.UTC(2024, 4, 31)), value: 2281.85 },  // Mayıs 2024
  { date: new Date(Date.UTC(2024, 5, 30)), value: 2319.29 },  // Haziran 2024
  { date: new Date(Date.UTC(2024, 6, 31)), value: 2394.10 },  // Temmuz 2024
  { date: new Date(Date.UTC(2024, 7, 31)), value: 2453.34 },  // Ağustos 2024
  { date: new Date(Date.UTC(2024, 8, 30)), value: 2526.16 },  // Eylül 2024
  { date: new Date(Date.UTC(2024, 9, 31)), value: 2598.91 },  // Ekim 2024
  { date: new Date(Date.UTC(2024, 10, 30)), value: 2657.23 }, // Kasım 2024
  { date: new Date(Date.UTC(2024, 11, 31)), value: 2684.55 }, // Aralık 2024
  { date: new Date(Date.UTC(2025, 0, 31)), value: 2819.65 },  // Ocak 2025
  { date: new Date(Date.UTC(2025, 1, 28)), value: 2883.75 },  // Şubat 2025
  { date: new Date(Date.UTC(2025, 2, 31)), value: 2954.69 },  // Mart 2025
  { date: new Date(Date.UTC(2025, 3, 30)), value: 3043.23 },  // Nisan 2025
  { date: new Date(Date.UTC(2025, 4, 31)), value: 3089.74 },  // Mayıs 2025
  { date: new Date(Date.UTC(2025, 5, 30)), value: 3132.17 },  // Haziran 2025
  { date: new Date(Date.UTC(2025, 6, 31)), value: 3196.66 },  // Temmuz 2025
  { date: new Date(Date.UTC(2025, 7, 31)), value: 3261.72 },  // Ağustos 2025
  { date: new Date(Date.UTC(2025, 8, 30)), value: 3367.22 },  // Eylül 2025
  { date: new Date(Date.UTC(2025, 9, 31)), value: 3453.09 },  // Ekim 2025
  { date: new Date(Date.UTC(2025, 10, 30)), value: 3482.96 }, // Kasım 2025
  { date: new Date(Date.UTC(2025, 11, 31)), value: 3513.87 }, // Aralık 2025
  { date: new Date(Date.UTC(2026, 0, 31)), value: 3683.83 },  // Ocak 2026
  { date: new Date(Date.UTC(2026, 1, 28)), value: 3793.05 },  // Şubat 2026
  { date: new Date(Date.UTC(2026, 2, 31)), value: 3866.74 },  // Mart 2026
  { date: new Date(Date.UTC(2026, 3, 30)), value: 4028.47 },  // Nisan 2026
  { date: new Date(Date.UTC(2026, 4, 31)), value: 4097.55 },  // Mayıs 2026
];

/** Belirli bir tarih için CPI endeksini doğrusal interpolasyon ve dinamik projeksiyonla hesaplar. */
export function getCpiAtDate(date: Date): number {
  const t = date.getTime();
  const points = TURKISH_CPI_HISTORY;

  if (t <= points[0].date.getTime()) {
    return points[0].value;
  }

  let lastPoint = points[points.length - 1];
  let secondLastPoint = points[points.length - 2];
  
  // En son ayın enflasyon oranı (örn. Mayıs 2026 / Nisan 2026)
  const lastMoMChange = (lastPoint.value / secondLastPoint.value) - 1;

  const activePoints = [...points];

  // Eğer sorgulanan tarih bilinen son veriden daha sonraysa, aylık hızı koruyarak gelecek ayları dinamik üret
  while (t > lastPoint.date.getTime()) {
    const nextDate = new Date(lastPoint.date);
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 2, 0); // Sonraki ayın son günü
    const nextValue = lastPoint.value * (1 + lastMoMChange);
    const nextPoint = { date: nextDate, value: nextValue };
    activePoints.push(nextPoint);
    lastPoint = nextPoint;
  }

  // İnterpolasyon için çevreleyen noktaları bul
  let before = activePoints[0];
  let after = activePoints[1];

  for (let i = 1; i < activePoints.length; i++) {
    if (activePoints[i].date.getTime() >= t) {
      before = activePoints[i - 1];
      after = activePoints[i];
      break;
    }
  }

  const range = after.date.getTime() - before.date.getTime();
  if (range === 0) return before.value;

  const factor = (t - before.date.getTime()) / range;
  return before.value + (after.value - before.value) * factor;
}

/** İki tarih arasındaki birikimli enflasyon getirisini hesaplar. */
export function getInflationReturn(startDate: Date, endDate: Date): number {
  const startCPI = getCpiAtDate(startDate);
  const endCPI = getCpiAtDate(endDate);
  if (startCPI <= 0) return 0;
  return ((endCPI / startCPI) - 1) * 100;
}

export interface BenchmarkComparisonDTO {
  portfolio: number;
  bist: number | null;
  sp500: number | null;
  gold: number | null;
  usd: number | null;
  inflation?: number | null;
}

export interface BenchmarkComparisonData {
  try: Record<"1W" | "1M" | "3M" | "YTD" | "1Y", BenchmarkComparisonDTO>;
  usd: Record<"1W" | "1M" | "3M" | "YTD" | "1Y", BenchmarkComparisonDTO>;
}

export async function getBenchmarkComparisonData(userId: string): Promise<BenchmarkComparisonData> {
  const txRows = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const benchmarkSymbols = [
    "XU100",
    "XU100.IS",
    "^GSPC",
    "GC=F",
    "USDTRY",
    "USD",
    "GRAM_ALTIN",
    "ALTIN",
  ];
  const allSymbols = Array.from(new Set([...txRows.map((t) => t.symbol), ...benchmarkSymbols]));

  const [snaps, fxRows, manualSnaps] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where: { symbol: { in: allSymbols } },
      orderBy: { date: "asc" },
      select: { symbol: true, date: true, close: true },
    }),
    prisma.fxRate.findMany({ where: { pair: "USDTRY" }, orderBy: { date: "asc" } }),
    loadManualSnapshots(userId),
  ]);

  const fallbackResult: BenchmarkComparisonData = {
    try: {
      "1W": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "1M": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "3M": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "YTD": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "1Y": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
    },
    usd: {
      "1W": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "1M": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "3M": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "YTD": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
      "1Y": { portfolio: 0, bist: null, sp500: null, gold: null, usd: null },
    },
  };

  if (txRows.length === 0 && manualSnaps.size === 0) {
    return fallbackResult;
  }

  const tx: TxInput[] = txRows.map((t) => ({
    date: t.date,
    assetType: t.assetType as AssetType,
    symbol: t.symbol,
    side: t.side as "BUY" | "SELL",
    unitPrice: t.unitPrice,
    quantity: t.quantity,
    total: t.total,
    currency: t.currency as "TRY" | "USD",
  }));

  const bySymbol = new Map<string, PricePoint[]>();
  for (const s of snaps) {
    if (s.symbol === TEFAS_MARK) continue;
    const arr = bySymbol.get(s.symbol) ?? [];
    arr.push({ date: s.date, close: s.close });
    bySymbol.set(s.symbol, arr);
  }

  const fxHist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
  const current = fxHist.length ? fxHist[fxHist.length - 1].rate : 40;
  const fx = buildFxLookup(fxHist, current);

  const today = new Date();
  
  // Benchmark histories
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 375);
  
  const [bistHist, sp500Hist, goldHist, usdTryHist] = await Promise.all([
    fetchYahooHistoryCached("XU100.IS", oneYearAgo),
    fetchYahooHistoryCached("^GSPC", oneYearAgo),
    fetchYahooHistoryCached("GC=F", oneYearAgo),
    fetchYahooHistoryCached("USDTRY=X", oneYearAgo),
  ]);

  function getValAt(date: Date) {
    const monthKey = monthKeyOf(date);
    const snap = manualSnaps.get(monthKey);

    if (usesFullBacklog(trYear(date)) && snap) {
      const p = growthPointFromSnapshot(snap);
      return { valueTRY: p.valueTRY, valueUSD: p.valueUSD };
    }

    const priceMap = new Map<string, { priceTRY: number }>();
    for (const [symbol, points] of bySymbol) {
      const v = lookupOnOrBefore(points, date);
      if (v != null) priceMap.set(symbol, { priceTRY: v });
    }
    const txUpTo = tx.filter((t) => isBeforeOrEqualDay(t.date, date));
    const usdAt = fx(date);
    const { totals } = computePositions(txUpTo, priceMap, fx, usdAt);

    let valTRY = totals.valueTRY;
    let valUSD = totals.valueUSD;

    if (!usesFullBacklog(trYear(date)) && snap) {
      const { allocation } = computePositions(txUpTo, priceMap, fx, usdAt);
      const byType = emptyByType();
      for (const a of allocation) {
        byType[a.assetType] = { valueTRY: a.valueTRY, valueUSD: a.valueUSD };
      }
      const point = applyBesOverride({
        month: monthKey,
        valueTRY: totals.valueTRY,
        valueUSD: totals.valueUSD,
        costTRY: totals.costTRY,
        costUSD: totals.costUSD,
        byType,
      }, snap.besTRY, usdAt);
      valTRY = point.valueTRY;
      valUSD = point.valueUSD;
    }

    return { valueTRY: valTRY, valueUSD: valUSD };
  }

  // Dates
  const d0 = today;
  const d1W = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d1M = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d3M = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const dYtd = new Date(Date.UTC(trYear(today) - 1, 11, 31, 12, 0, 0));
  const d1Y = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  const v0 = getValAt(d0);
  const v1W = getValAt(d1W);
  const v1M = getValAt(d1M);
  const v3M = getValAt(d3M);
  const vYtd = getValAt(dYtd);
  const v1Y = getValAt(d1Y);

  function calcPct(cur: number, prev: number) {
    if (!cur || !prev || prev <= 0) return 0;
    return ((cur / prev) - 1) * 100;
  }

  function getBenchmarkReturn(
    hist: PricePoint[],
    startDate: Date,
    endDate: Date,
    symbolCurrency: "TRY" | "USD",
    targetCurrency: "TRY" | "USD"
  ): number | null {
    const startPrice = lookupOnOrBefore(hist, startDate);
    const endPrice = lookupOnOrBefore(hist, endDate);
    if (startPrice == null || endPrice == null || startPrice <= 0) return null;
    
    const startFx = fx(startDate);
    const endFx = fx(endDate);
    
    if (targetCurrency === "TRY") {
      const startPriceTRY = symbolCurrency === "USD" ? startPrice * startFx : startPrice;
      const endPriceTRY = symbolCurrency === "USD" ? endPrice * endFx : endPrice;
      return ((endPriceTRY / startPriceTRY) - 1) * 100;
    } else {
      const startPriceUSD = symbolCurrency === "TRY" ? startPrice / startFx : startPrice;
      const endPriceUSD = symbolCurrency === "TRY" ? endPrice / endFx : endPrice;
      return ((endPriceUSD / startPriceUSD) - 1) * 100;
    }
  }

  const periods: { key: "1W" | "1M" | "3M" | "YTD" | "1Y"; start: Date; portfolioVal: typeof v1W }[] = [
    { key: "1W", start: d1W, portfolioVal: v1W },
    { key: "1M", start: d1M, portfolioVal: v1M },
    { key: "3M", start: d3M, portfolioVal: v3M },
    { key: "YTD", start: dYtd, portfolioVal: vYtd },
    { key: "1Y", start: d1Y, portfolioVal: v1Y },
  ];

  const result: BenchmarkComparisonData = { try: {} as any, usd: {} as any };

  for (const p of periods) {
    result.try[p.key] = {
      portfolio: calcPct(v0.valueTRY, p.portfolioVal.valueTRY),
      bist: getBenchmarkReturn(bistHist, p.start, d0, "TRY", "TRY"),
      sp500: getBenchmarkReturn(sp500Hist, p.start, d0, "USD", "TRY"),
      gold: getBenchmarkReturn(goldHist, p.start, d0, "USD", "TRY"),
      usd: getBenchmarkReturn(usdTryHist, p.start, d0, "TRY", "TRY"),
      inflation: getInflationReturn(p.start, d0),
    };

    result.usd[p.key] = {
      portfolio: calcPct(v0.valueUSD, p.portfolioVal.valueUSD),
      bist: getBenchmarkReturn(bistHist, p.start, d0, "TRY", "USD"),
      sp500: getBenchmarkReturn(sp500Hist, p.start, d0, "USD", "USD"),
      gold: getBenchmarkReturn(goldHist, p.start, d0, "USD", "USD"),
      usd: 0,
      inflation: null,
    };
  }

  return result;
}
