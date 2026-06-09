import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePriceMapping, type AssetType } from "@/lib/assets";
import { fetchYahooHistory, currencyToTryRate } from "@/lib/prices";
import { buildFxLookup } from "@/lib/portfolio";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const assetType = req.nextUrl.searchParams.get("assetType") as AssetType;

  if (!symbol || !assetType) {
    return NextResponse.json(
      { ok: false, error: "Sembol ve assetType parametreleri zorunludur." },
      { status: 400 }
    );
  }

  try {
    // 1. İlgili sembole ait tüm işlemleri çek
    const transactions = await prisma.transaction.findMany({
      where: { symbol },
      orderBy: { date: "asc" },
    });

    // 2. Başlangıç tarihini belirle (ilk işlemden 30 gün öncesi veya default 1 yıl)
    const firstTxDate = transactions.length > 0 
      ? new Date(transactions[0].date) 
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const fromDate = new Date(firstTxDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 3. Döviz kuru geçmişini çek ve kur arama motorunu oluştur
    const fxRates = await prisma.fxRate.findMany({
      where: { pair: "USDTRY", date: { gte: fromDate } },
      orderBy: { date: "asc" },
    });
    const hist = fxRates.map((r) => ({ date: r.date, rate: r.rate }));
    const currentUsdTry = hist.length ? hist[hist.length - 1].rate : 40;
    const fx = buildFxLookup(hist, currentUsdTry);

    // 4. Fiyat geçmişini al
    const mapping = resolvePriceMapping(assetType, symbol);
    let history: { date: Date; closeTRY: number; closeUSD: number; closeNative: number }[] = [];

    if (mapping.source === "yahoo" || mapping.source === "yahoo-fx") {
      if (mapping.yahooSymbol) {
        // Canlı Yahoo Geçmişi
        const nativePoints = await fetchYahooHistory(mapping.yahooSymbol, fromDate);

        // Enstrümanın asıl para birimini bul
        const recentSnapshot = await prisma.priceSnapshot.findFirst({
          where: { symbol },
          orderBy: { date: "desc" },
          select: { nativeCurrency: true },
        });
        const nativeCurrency = recentSnapshot?.nativeCurrency || mapping.currency || "USD";

        // Gerekirse çapraz kur
        const isCross = nativeCurrency !== "TRY" && nativeCurrency !== "USD";
        const crossRate = isCross ? await currencyToTryRate(nativeCurrency, currentUsdTry) : 1;

        history = nativePoints.map((p) => {
          const raw = p.close;
          const adj = mapping.perGramDivisor ? raw / mapping.perGramDivisor : raw;
          let priceTRY = 0;

          if (mapping.source === "yahoo-fx") {
            priceTRY = adj;
          } else if (mapping.multiplyByUsdTry) {
            priceTRY = adj * fx(p.date);
          } else if (nativeCurrency === "TRY") {
            priceTRY = adj;
          } else if (nativeCurrency === "USD") {
            priceTRY = adj * fx(p.date);
          } else {
            // SEK, EUR vb. çapraz kur
            priceTRY = adj * crossRate;
          }

          const priceUSD = priceTRY / fx(p.date);
          return {
            date: p.date,
            closeTRY: priceTRY,
            closeUSD: priceUSD,
            closeNative: raw,
          };
        });
      }
    } else {
      // TEFAS / Manual / BES - Veritabanı PriceSnapshot tablosundan çek
      const snaps = await prisma.priceSnapshot.findMany({
        where: { symbol, date: { gte: fromDate } },
        orderBy: { date: "asc" },
      });

      history = snaps.map((s) => {
        const priceTRY = s.close;
        const priceUSD = priceTRY / fx(s.date);
        return {
          date: s.date,
          closeTRY: priceTRY,
          closeUSD: priceUSD,
          closeNative: s.native ?? priceTRY,
        };
      });
    }

    return NextResponse.json({
      ok: true,
      symbol,
      assetType,
      currency: mapping.currency,
      history,
      transactions,
    });
  } catch (err) {
    console.error("Hisse detay geçmişi API hatası:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
