// import "server-only";
import { prisma } from "./prisma";
import {
  getUsdTryRate,
  getUsdTryHistory,
  resolveCurrentPriceTRY,
  fetchTefasLatestMap,
  fetchYahooQuoteMap,
  type YahooQuoteData,
} from "./prices";
import { resolvePriceMapping, type AssetType } from "./assets";
import { startOfDay } from "./utils";

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
async function getHeldSymbols(userId?: string): Promise<HeldSymbol[]> {
  const rows = await prisma.transaction.findMany({
    where: userId ? { userId } : undefined,
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
export async function refreshPrices(options?: {
  userId?: string;
  force?: boolean;
}): Promise<RefreshResult> {
  const force = options?.force ?? false;
  const userId = options?.userId;
  const today = startOfDay(new Date());
  const usdTry = await getUsdTryRate();

  if (Number.isFinite(usdTry) && usdTry > 0) {
    await prisma.fxRate.upsert({
      where: { pair_date: { pair: "USDTRY", date: today } },
      create: { pair: "USDTRY", date: today, rate: usdTry },
      update: { rate: usdTry },
    });
  }

  const symbols = await getHeldSymbols(userId);
  const instruments = await prisma.instrument.findMany(
    userId ? { where: { userId } } : undefined
  );
  const manualMap = new Map(
    instruments.map((i) => [i.symbol, i.manualPrice] as const),
  );

  const failed: string[] = [];
  let updated = 0;

  const tefasSymbols = symbols.filter((s) => s.assetType === "TEFAS");
  const otherSymbols = symbols.filter((s) => s.assetType !== "TEFAS");

  // SADECE TEFAS İÇİN AKILLI KONTROL:
  // 1. Bugünün TEFAS fiyatı veritabanında eksikse (geç giriş / günün ilk yenilemesi) -> ÇEK
  // 2. Saat 07:00 - 10:00 arasındaysa (aktif açıklanma penceresi) -> ÇEK
  // 3. Saat 10:00 sonrası ve bugün zaten çekilmişse -> ATLA (0 ms)
  // (Diğer tüm varlıklar BİST, Yabancı Borsa, Kripto her basışta CANLI çekilir)
  let shouldFetchTefas = false;

  if (tefasSymbols.length > 0) {
    const todays = await prisma.priceSnapshot.findMany({
      where: {
        date: today,
        symbol: { in: tefasSymbols.map((s) => s.symbol) },
      },
      select: { symbol: true },
    });
    const doneTodayCount = todays.length;
    const isMissingToday = doneTodayCount < tefasSymbols.length;

    // Türkiye saati (UTC+3) kontrolü
    const now = new Date();
    const trHour = (now.getUTCHours() + 3) % 24;
    const isTefasWindow = trHour >= 7 && trHour < 10;

    shouldFetchTefas = isMissingToday || isTefasWindow;

    if (!shouldFetchTefas) {
      console.log(
        "⚡ [REFRESH] TEFAS fiyatları bugün için zaten veritabanında var ve saat 10:00 sonrası. TEFAS istekleri atlandı."
      );
      updated += tefasSymbols.length;
    }
  }

  // TEFAS toplu çekimini sadece gerekliyse başlat
  const tefasMapPromise =
    tefasSymbols.length > 0 && shouldFetchTefas
      ? fetchTefasLatestMap(new Set(tefasSymbols.map((s) => s.symbol))).catch(
          () => new Map<string, { price: number; investors?: number }>(),
        )
      : null;

  function isPriceSameEnough(p1: number | null | undefined, p2: number | null | undefined): boolean {
    if (p1 === p2) return true;
    if (p1 == null || p2 == null) return false;
    return Math.abs(p1 - p2) < 1e-5;
  }

  async function writeSnapshot(
    symbol: string,
    priceTRY: number,
    native: number,
    currency: string,
    assetType: AssetType,
    prevPrice?: number | null,
    prevPriceTRY?: number | null,
    prevDate?: Date | null,
    investors?: number | null,
  ) {
    // 0 veya negatif fiyatli snapshot yazmayi engelle (hafta sonu veri bozulmasi)
    if (!Number.isFinite(priceTRY) || priceTRY <= 0) return;
    if (!Number.isFinite(native) || native <= 0) return;

    if (prevPrice !== undefined && prevPrice !== null && prevDate) {
      const prevDay = startOfDay(prevDate);

      await prisma.priceSnapshot.upsert({
        where: { symbol_date: { symbol, date: prevDay } },
        create: {
          symbol,
          date: prevDay,
          close: prevPriceTRY ?? prevPrice,
          native: prevPrice,
          nativeCurrency: currency,
          currency: "TRY",
          source: "auto",
          investors: investors,
        },
        update: { close: prevPriceTRY ?? prevPrice, native: prevPrice, nativeCurrency: currency, investors: investors },
      });
    }



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
        investors: investors,
      },
      update: { close: priceTRY, native, nativeCurrency: currency, investors: investors },
    });
  }


  async function updateViaResolver(
    symbol: string,
    assetType: AssetType,
    preFetchedMap?: Map<string, YahooQuoteData>,
  ) {
    const cp = await resolveCurrentPriceTRY(
      assetType,
      symbol,
      Number.isFinite(usdTry) ? usdTry : 1,
      manualMap.get(symbol),
      preFetchedMap,
    );
    if (!cp || !Number.isFinite(cp.priceTRY)) {
      failed.push(symbol);
      return;
    }
    await writeSnapshot(
      symbol,
      cp.priceTRY,
      cp.price,
      cp.currency,
      assetType,
      cp.prevPrice,
      cp.prevPriceTRY,
      cp.prevDate,
      cp.investors,
    );
    updated++;
  }

  // Yahoo tabanlı tüm sembollerin fiyatlarını tek seferde toplu (batch) çek
  const tYahooStart = performance.now();
  const yahooSymbolsToFetch: string[] = [];
  for (const { symbol, assetType } of otherSymbols) {
    const m = resolvePriceMapping(assetType, symbol);
    if (m.yahooSymbol) yahooSymbolsToFetch.push(m.yahooSymbol);
  }
  const preFetchedYahooMap = await fetchYahooQuoteMap(yahooSymbolsToFetch);
  const tYahooMap = performance.now();
  console.log(`⏱️ [REFRESH] Yahoo toplu fiyat çekimi: ${(tYahooMap - tYahooStart).toFixed(0)} ms (${yahooSymbolsToFetch.length} sembol)`);

  // Yahoo tabanli semboller — TEFAS'i beklemeden hemen guncelle
  await mapLimit(otherSymbols, 10, async ({ symbol, assetType }) => {
    try {
      await updateViaResolver(symbol, assetType, preFetchedYahooMap);
    } catch {
      failed.push(symbol);
    }
  });
  const tYahooDone = performance.now();
  console.log(`⏱️ [REFRESH] Yahoo sembollerin DB kaydı: ${(tYahooDone - tYahooMap).toFixed(0)} ms (${otherSymbols.length} sembol)`);

  // TEFAS fonlari — toplu harita hazir olunca
  const tTefasStart = performance.now();
  if (tefasMapPromise) {
    const tefasMap = await tefasMapPromise;
    const tTefasMap = performance.now();
    console.log(`⏱️ [REFRESH] TEFAS toplu harita çekimi: ${(tTefasMap - tTefasStart).toFixed(0)} ms`);

    await mapLimit(tefasSymbols, 6, async ({ symbol, assetType }) => {
      try {
        const tInfo = tefasMap.get(symbol);
        if (tInfo) {
          if (tInfo.price > 0) {
            await writeSnapshot(symbol, tInfo.price, tInfo.price, "TRY", assetType, undefined, undefined, undefined, tInfo.investors);
            updated++;
          } else {
            failed.push(symbol);
          }
          return;
        }
        // Haritada yoksa tek fon sorgusuna dus
        await updateViaResolver(symbol, assetType);
      } catch {
        failed.push(symbol);
      }
    });
    const tTefasDone = performance.now();
    console.log(`⏱️ [REFRESH] TEFAS sembollerin DB kaydı: ${(tTefasDone - tTefasMap).toFixed(0)} ms (${tefasSymbols.length} sembol)`);
  }

  // Guncelleme zaman damgasini kaydet
  const now = new Date();
  await prisma.priceSnapshot
    .upsert({
      where: { symbol_date: { symbol: "__LAST_REFRESH_TIME__", date: today } },
      create: {
        symbol: "__LAST_REFRESH_TIME__",
        date: today,
        close: now.getTime(),
        currency: "TRY",
        source: "system",
      },
      update: { close: now.getTime() },
    })
    .catch(() => null);

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
