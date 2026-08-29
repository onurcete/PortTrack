import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import { resolvePriceMapping, type AssetType } from "@/lib/assets";
import { fetchYahooHistory, fetchTefasHistory, currencyToTryRate } from "@/lib/prices";
import { buildFxLookup } from "@/lib/portfolio";
import { computeFundInvestorStats } from "@/lib/tefasInvestors";
import { trYear, trMonth, monthLabel } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
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

    const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase()?.trim();
    if (!symbol) {
      return NextResponse.json({ ok: false, error: "Sembol belirtilmedi." }, { status: 400 });
    }

    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    const [portfolio, transactions, technical, fxRates] = await Promise.all([
      getPortfolio(userId),
      prisma.transaction.findMany({
        where: { userId, symbol },
        orderBy: { date: "desc" },
      }),
      prisma.technicalAnalysis.findFirst({
        where: { symbol },
        orderBy: { date: "desc" },
      }),
      prisma.fxRate.findMany({
        where: { pair: "USDTRY", date: { gte: thirteenMonthsAgo } },
        orderBy: { date: "asc" },
      }),
    ]);

    const pos = portfolio.positions.find((p) => p.symbol.toUpperCase() === symbol);
    const assetType = (pos?.assetType || "BIST") as AssetType;

    const fxHist = fxRates.map((r) => ({ date: r.date, rate: r.rate }));
    const currentUsdTry = fxHist.length ? fxHist[fxHist.length - 1].rate : 40;
    const fx = buildFxLookup(fxHist, currentUsdTry);

    const totalValueTRY = portfolio.totals.valueTRY || 0;

    const formattedPosition = pos
      ? {
          symbol: pos.symbol,
          name: pos.name || pos.symbol,
          assetType: pos.assetType,
          quantity: pos.quantity,
          avgCostTRY: pos.avgCostTRY,
          avgCostNative: pos.avgCostNative,
          currentPriceTRY: pos.currentPriceTRY || 0,
          currentPriceNative: pos.currentPriceNative || 0,
          totalCostTRY: pos.costTRY,
          currentValueTRY: pos.valueTRY,
          profitTRY: pos.unrealizedTRY,
          profitRate: pos.unrealizedPctTRY,
          dailyChangePct: pos.dailyChangePct ?? 0,
          currency: pos.nativeCurrency || "TRY",
          weightPercent: totalValueTRY > 0 ? (pos.valueTRY / totalValueTRY) * 100 : 0,
          firstBuyDate: pos.firstBuyDate ? pos.firstBuyDate.toISOString() : null,
        }
      : null;

    // Fiyat ve Yatırımcı Geçmişini Çek
    const mapping = resolvePriceMapping(assetType, symbol);
    let history: {
      date: string;
      closeTRY: number;
      closeUSD: number;
      closeNative: number;
      investors?: number | null;
    }[] = [];

    if (mapping.source === "yahoo" || mapping.source === "yahoo-fx") {
      if (mapping.yahooSymbol) {
        const nativePoints = await fetchYahooHistory(mapping.yahooSymbol, thirteenMonthsAgo);
        const nativeCurrency = mapping.currency || "USD";
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
            priceTRY = adj * crossRate;
          }

          const priceUSD = priceTRY / fx(p.date);
          return {
            date: p.date.toISOString(),
            closeTRY: priceTRY,
            closeUSD: priceUSD,
            closeNative: raw,
            investors: null,
          };
        });
      }
    } else {
      // TEFAS / DB
      let snaps = await prisma.priceSnapshot.findMany({
        where: { symbol, date: { gte: thirteenMonthsAgo } },
        orderBy: { date: "asc" },
      });

      if (mapping.source === "tefas" && snaps.length < 10) {
        const tefasHistory = await fetchTefasHistory(symbol, thirteenMonthsAgo, new Date());
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
            where: { symbol, date: { gte: thirteenMonthsAgo } },
            orderBy: { date: "asc" },
          });
        }
      }

      history = snaps.map((s) => {
        const priceTRY = s.close;
        const priceUSD = priceTRY / fx(s.date);
        return {
          date: s.date.toISOString(),
          closeTRY: priceTRY,
          closeUSD: priceUSD,
          closeNative: s.native ?? priceTRY,
          investors: s.investors ?? null,
        };
      });
    }

    // Son 1 Yıllık Aylık Performans Hesaplaması (12 Ayın % Getirisi)
    const monthlyMap = new Map<string, { first: number; last: number; firstUSD: number; lastUSD: number }>();
    for (const h of history) {
      const d = new Date(h.date);
      const y = trYear(d);
      const m = trMonth(d);
      const key = `${y}-${String(m).padStart(2, "0")}`;

      const item = monthlyMap.get(key);
      if (!item) {
        monthlyMap.set(key, { first: h.closeTRY, last: h.closeTRY, firstUSD: h.closeUSD, lastUSD: h.closeUSD });
      } else {
        item.last = h.closeTRY;
        item.lastUSD = h.closeUSD;
      }
    }

    const monthlyPerformance: {
      month: string;
      label: string;
      returnTRY: number;
      returnUSD: number;
    }[] = [];

    const monthKeys = Array.from(monthlyMap.keys()).sort().slice(-12);
    for (const k of monthKeys) {
      const data = monthlyMap.get(k)!;
      const retTRY = data.first > 0 ? ((data.last - data.first) / data.first) * 100 : 0;
      const retUSD = data.firstUSD > 0 ? ((data.lastUSD - data.firstUSD) / data.firstUSD) * 100 : 0;

      monthlyPerformance.push({
        month: k,
        label: monthLabel(k),
        returnTRY: retTRY,
        returnUSD: retUSD,
      });
    }

    // TEFAS Yatırımcı Metrikleri
    let tefasStats: any = null;
    const tefasSnapshots = history.filter((h) => h.investors != null).map((h) => ({
      date: new Date(h.date),
      investors: h.investors!,
    }));
    if (tefasSnapshots.length > 0) {
      tefasStats = computeFundInvestorStats(symbol, tefasSnapshots as any);
    }

    return NextResponse.json({
      ok: true,
      position: formattedPosition,
      transactions,
      technical: technical
        ? {
            score: technical.score,
            trendSignal: technical.trendSignal,
            macdSignal: technical.macdSignal,
            rsiZone: technical.rsiZone,
            commentary: technical.commentary,
            alerts: technical.alerts as string[],
          }
        : null,
      history,
      monthlyPerformance,
      tefasStats,
    });
  } catch (err: any) {
    console.error("❌ Asset Detail API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Varlık detayı yüklenemedi." },
      { status: 500 }
    );
  }
}
