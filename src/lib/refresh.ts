import "server-only";
import { prisma } from "./prisma";
import {
  getUsdTryRate,
  getUsdTryHistory,
  resolveCurrentPriceTRY,
  fetchTefasLatestMap,
} from "./prices";
import type { AssetType } from "./assets";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Sinirli es zamanlilik ile calistir. */
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

interface HeldSymbol {
  symbol: string;
  assetType: AssetType;
}

/** Islemlerde gecen benzersiz sembolleri getirir. */
async function getHeldSymbols(): Promise<HeldSymbol[]> {
  const rows = await prisma.transaction.findMany({
    select: { symbol: true, assetType: true },
  });
  const map = new Map<string, AssetType>();
  for (const r of rows) {
    if (!map.has(r.symbol)) map.set(r.symbol, r.assetType as AssetType);
  }
  return [...map.entries()].map(([symbol, assetType]) => ({ symbol, assetType }));
}

export interface RefreshResult {
  usdTry: number;
  updated: number;
  failed: string[];
}

/** Tum tutulan sembollerin guncel fiyatini ve USDTRY kurunu yeniler. */
export async function refreshPrices(): Promise<RefreshResult> {
  const today = startOfDay(new Date());
  const usdTry = await getUsdTryRate();

  if (Number.isFinite(usdTry) && usdTry > 0) {
    await prisma.fxRate.upsert({
      where: { pair_date: { pair: "USDTRY", date: today } },
      create: { pair: "USDTRY", date: today, rate: usdTry },
      update: { rate: usdTry },
    });
  }

  const symbols = await getHeldSymbols();
  const instruments = await prisma.instrument.findMany();
  const manualMap = new Map(
    instruments.map((i) => [i.symbol, i.manualPrice] as const),
  );

  // TEFAS fonlarini tek seferde toplu cek
  const hasTefas = symbols.some((s) => s.assetType === "TEFAS");
  const tefasMap = hasTefas ? await fetchTefasLatestMap() : new Map();

  const failed: string[] = [];
  let updated = 0;

  async function writeSnapshot(
    symbol: string,
    priceTRY: number,
    native: number,
    currency: string,
  ) {
    await prisma.priceSnapshot.upsert({
      where: { symbol_date: { symbol, date: today } },
      create: {
        symbol,
        date: today,
        close: priceTRY,
        native,
        nativeCurrency: currency,
        currency: "TRY",
        source: "auto",
      },
      update: { close: priceTRY, native, nativeCurrency: currency },
    });
  }

  await mapLimit(symbols, 6, async ({ symbol, assetType }) => {
    try {
      // TEFAS: once toplu haritadan dene
      if (assetType === "TEFAS" && tefasMap.has(symbol)) {
        const p = tefasMap.get(symbol)!;
        await writeSnapshot(symbol, p, p, "TRY");
        updated++;
        return;
      }

      const cp = await resolveCurrentPriceTRY(
        assetType,
        symbol,
        Number.isFinite(usdTry) ? usdTry : 1,
        manualMap.get(symbol),
      );
      if (!cp || !Number.isFinite(cp.priceTRY)) {
        failed.push(symbol);
        return;
      }
      await writeSnapshot(symbol, cp.priceTRY, cp.price, cp.currency);
      updated++;
    } catch {
      failed.push(symbol);
    }
  });

  return { usdTry, updated, failed };
}

/** USDTRY kur gecmisini en eski islem tarihinden bugune kadar doldurur. */
export async function backfillFxHistory(): Promise<number> {
  const earliest = await prisma.transaction.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  if (!earliest) return 0;

  const existingCount = await prisma.fxRate.count({ where: { pair: "USDTRY" } });
  // Yeterince veri varsa tekrar cekme
  if (existingCount > 200) return existingCount;

  const from = new Date(earliest.date);
  from.setDate(from.getDate() - 5);
  const history = await getUsdTryHistory(from);
  if (history.length === 0) return existingCount;

  // toplu yaz (varsa atla)
  let written = 0;
  for (const p of history) {
    const date = startOfDay(p.date);
    try {
      await prisma.fxRate.upsert({
        where: { pair_date: { pair: "USDTRY", date } },
        create: { pair: "USDTRY", date, rate: p.close },
        update: {},
      });
      written++;
    } catch {
      /* gec */
    }
  }
  return written;
}
