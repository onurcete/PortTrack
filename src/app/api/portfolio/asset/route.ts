import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import { resolvePriceMapping, type AssetType } from "@/lib/assets";
import { fetchYahooHistory, fetchTefasHistory, currencyToTryRate } from "@/lib/prices";
import { buildFxLookup } from "@/lib/portfolio";
import { computeFundInvestorStats } from "@/lib/tefasInvestors";
import { monthLabel } from "@/lib/utils";

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

    const fourteenMonthsAgo = new Date();
    fourteenMonthsAgo.setMonth(fourteenMonthsAgo.getMonth() - 14);

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
        where: { pair: "USDTRY", date: { gte: fourteenMonthsAgo } },
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
        const nativePoints = await fetchYahooHistory(mapping.yahooSymbol, fourteenMonthsAgo);
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
        where: { symbol, date: { gte: fourteenMonthsAgo } },
        orderBy: { date: "asc" },
      });

      if (mapping.source === "tefas" && snaps.length < 10) {
        const tefasHistory = await fetchTefasHistory(symbol, fourteenMonthsAgo, new Date());
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
            where: { symbol, date: { gte: fourteenMonthsAgo } },
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

    // Son 1 Yıllık Aylık Performans Hesaplaması (Web İle %100 Birebir Mantık)
    const targetMonths: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      targetMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const byMonth = new Map<string, { closeTRY: number; closeUSD: number; date: string }>();
    for (const h of history) {
      const mKey = h.date.slice(0, 7);
      const existing = byMonth.get(mKey);
      if (!existing || h.date > existing.date) {
        byMonth.set(mKey, { closeTRY: h.closeTRY, closeUSD: h.closeUSD, date: h.date });
      }
    }

    const monthlyPerformance = targetMonths.map((mCurr) => {
      const [yearNum, monthNum] = mCurr.split("-").map(Number);
      let prevMonthNum = monthNum - 1;
      let prevYearNum = yearNum;
      if (prevMonthNum < 1) {
        prevMonthNum = 12;
        prevYearNum--;
      }
      const mPrev = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}`;

      const pPrev = byMonth.get(mPrev);
      const pCurr = byMonth.get(mCurr);

      let returnTRY: number | null = null;
      let returnUSD: number | null = null;

      if (pPrev && pCurr && pPrev.closeTRY > 0) {
        returnTRY = ((pCurr.closeTRY / pPrev.closeTRY) - 1) * 100;
      }
      if (pPrev && pCurr && pPrev.closeUSD > 0) {
        returnUSD = ((pCurr.closeUSD / pPrev.closeUSD) - 1) * 100;
      }

      return {
        month: mCurr,
        label: monthLabel(mCurr),
        returnTRY: returnTRY ?? 0,
        returnUSD: returnUSD ?? 0,
      };
    });

    // TEFAS Yatırımcı Metrikleri ve Son 7 Gün Bar Chart Verisi
    let tefasStats: any = null;
    let lastWeekInvestors: { date: string; investors: number; label: string }[] = [];

    const tefasSnapshots = history
      .filter((h) => h.investors != null && h.investors > 0)
      .map((h) => ({
        date: new Date(h.date),
        investors: h.investors!,
      }));

    if (tefasSnapshots.length > 0) {
      tefasStats = computeFundInvestorStats(symbol, tefasSnapshots as any);

      // Son 7 günün günlük bar chart verisi
      const sortedInv = [...tefasSnapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
      lastWeekInvestors = sortedInv.slice(-7).map((item) => ({
        date: item.date.toISOString(),
        investors: item.investors,
        label: item.date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      }));
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
      lastWeekInvestors,
    });
  } catch (err: any) {
    console.error("❌ Asset Detail API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Varlık detayı yüklenemedi." },
      { status: 500 }
    );
  }
}
