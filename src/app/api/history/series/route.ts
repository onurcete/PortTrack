import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePriceMapping, type AssetType } from "@/lib/assets";
import { fetchYahooHistory, fetchTefasHistory, currencyToTryRate } from "@/lib/prices";
import { buildFxLookup } from "@/lib/portfolio";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { computeIndicators, type TechnicalIndicators } from "@/lib/technical";
import { generateAnalysis } from "@/lib/commentary";

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
    const rawCookie = req.cookies.get(AUTH_COOKIE)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : null;
    const token = rawCookie || bearerToken;

    let userId: string | null = req.headers.get("x-user-id");
    if (!userId && token) {
      userId = await getSessionUser(token);
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    // 1. İlgili sembole ait tüm işlemleri çek
    const transactions = await prisma.transaction.findMany({
      where: { symbol, userId },
      orderBy: { date: "asc" },
    });

    // 2. Başlangıç tarihini belirle (en az son 13 ayı veya ilk işlemden 30 gün öncesini kapsayacak şekilde)
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);
    const firstTxDate = transactions.length > 0 ? new Date(transactions[0].date) : new Date();
    const fromDate = new Date(Math.min(
      firstTxDate.getTime() - 30 * 24 * 60 * 60 * 1000,
      thirteenMonthsAgo.getTime()
    ));

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
    let history: { date: Date; closeTRY: number; closeUSD: number; closeNative: number; investors?: number }[] = [];

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
          const adj = (mapping.perGramDivisor ? raw / mapping.perGramDivisor : raw) * (mapping.multiplier || 1);
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
      let snaps = await prisma.priceSnapshot.findMany({
        where: { symbol, date: { gte: fromDate } },
        orderBy: { date: "asc" },
      });

      // TEFAS fonu veritabanında az veri içeriyorsa canlı TEFAS geçmişinden çek ve önbelleğe yaz
      if (mapping.source === "tefas" && snaps.length < 5) {
        const tefasHistory = await fetchTefasHistory(symbol, fromDate, new Date());
        if (tefasHistory.length > 0) {
          for (const item of tefasHistory) {
            await prisma.priceSnapshot.upsert({
              where: { symbol_date: { symbol, date: item.date } },
              create: {
                symbol,
                date: item.date,
                close: item.close,
                native: item.close,
                nativeCurrency: "TRY",
                currency: "TRY",
                source: "hist",
                investors: item.investors,
              },
              update: { close: item.close, native: item.close, investors: item.investors },
            }).catch(() => null);
          }
          snaps = await prisma.priceSnapshot.findMany({
            where: { symbol, date: { gte: fromDate } },
            orderBy: { date: "asc" },
          });
        }
      }

      history = snaps.map((s) => {
        const priceTRY = s.close;
        const priceUSD = priceTRY / fx(s.date);
        return {
          date: s.date,
          closeTRY: priceTRY,
          closeUSD: priceUSD,
          closeNative: s.native ?? priceTRY,
          investors: s.investors ?? undefined,
        };
      });
    }

    // 5. Teknik Analiz verisi (Varsa DB'den al, yoksa history'den canlı hesapla)
    let analysis: any = null;
    try {
      const dbAnalysis = await prisma.technicalAnalysis.findFirst({
        where: {
          symbol,
        },
        orderBy: { date: "desc" },
      });

      if (dbAnalysis) {
        analysis = {
          symbol: dbAnalysis.symbol,
          assetType: dbAnalysis.assetType as AssetType,
          date: dbAnalysis.date.toISOString(),
          indicators: dbAnalysis.indicators as unknown as TechnicalIndicators,
          score: dbAnalysis.score,
          commentary: dbAnalysis.commentary,
          trendSignal: dbAnalysis.trendSignal,
          macdSignal: dbAnalysis.macdSignal,
          rsiZone: dbAnalysis.rsiZone,
          alerts: dbAnalysis.alerts as string[],
        };
      } else if (history.length >= 14) {
        const bars = history.map((h) => ({
          date: new Date(h.date),
          close: h.closeNative ?? h.closeTRY,
        }));
        const ind = computeIndicators(bars);
        if (ind) {
          const gen = generateAnalysis(symbol, ind);
          analysis = {
            symbol,
            assetType,
            date: new Date().toISOString(),
            indicators: ind,
            score: gen.score,
            commentary: gen.commentary,
            trendSignal: gen.trendSignal,
            macdSignal: gen.macdSignal,
            rsiZone: gen.rsiZone,
            alerts: gen.alerts,
          };
        }
      }
    } catch (techErr) {
      console.warn("Teknik analiz hesabı opsiyonel hatası:", techErr);
    }

    return NextResponse.json({
      ok: true,
      symbol,
      assetType,
      currency: mapping.currency,
      history,
      transactions,
      analysis,
    });
  } catch (err) {
    console.error("Hisse detay geçmişi API hatası:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
