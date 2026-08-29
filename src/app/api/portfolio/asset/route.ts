import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import { computeFundInvestorStats } from "@/lib/tefasInvestors";
import { buildFxLookup } from "@/lib/portfolio";
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

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [portfolio, transactions, technical, snapshots, fxRates] = await Promise.all([
      getPortfolio(userId),
      prisma.transaction.findMany({
        where: { userId, symbol },
        orderBy: { date: "desc" },
      }),
      prisma.technicalAnalysis.findFirst({
        where: { symbol },
        orderBy: { date: "desc" },
      }),
      prisma.priceSnapshot.findMany({
        where: { symbol, date: { gte: oneYearAgo } },
        orderBy: { date: "asc" },
      }),
      prisma.fxRate.findMany({
        where: { pair: "USDTRY", date: { gte: oneYearAgo } },
        orderBy: { date: "asc" },
      }),
    ]);

    const fxHist = fxRates.map((r) => ({ date: r.date, rate: r.rate }));
    const currentUsdTry = fxHist.length ? fxHist[fxHist.length - 1].rate : 40;
    const fx = buildFxLookup(fxHist, currentUsdTry);

    const pos = portfolio.positions.find(
      (p) => p.symbol.toUpperCase() === symbol
    );

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

    // Fiyat geçmişi dizisi
    const history = snapshots.map((s) => {
      const pTRY = s.close;
      const rate = fx(s.date);
      return {
        date: s.date.toISOString(),
        closeTRY: pTRY,
        closeUSD: rate > 0 ? pTRY / rate : 0,
        closeNative: s.native ?? pTRY,
        investors: s.investors ?? null,
      };
    });

    // Son 1 Yıllık Aylık Performans Hesaplaması (Monthly Returns)
    const monthlyMap = new Map<string, { first: number; last: number; firstUSD: number; lastUSD: number }>();
    for (const s of snapshots) {
      const y = trYear(s.date);
      const m = trMonth(s.date);
      const key = `${y}-${String(m).padStart(2, "0")}`;
      const rate = fx(s.date);
      const priceTRY = s.close;
      const priceUSD = rate > 0 ? priceTRY / rate : 0;

      const item = monthlyMap.get(key);
      if (!item) {
        monthlyMap.set(key, { first: priceTRY, last: priceTRY, firstUSD: priceUSD, lastUSD: priceUSD });
      } else {
        item.last = priceTRY;
        item.lastUSD = priceUSD;
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
      const [yStr, mStr] = k.split("-");
      const m = Number(mStr);
      const y = Number(yStr);
      const retTRY = data.first > 0 ? ((data.last - data.first) / data.first) * 100 : 0;
      const retUSD = data.firstUSD > 0 ? ((data.lastUSD - data.firstUSD) / data.firstUSD) * 100 : 0;

      monthlyPerformance.push({
        month: k,
        label: `${monthLabel(m).slice(0, 3)} '${String(y).slice(2)}`,
        returnTRY: retTRY,
        returnUSD: retUSD,
      });
    }

    // TEFAS Fonu Yatırımcı Sayısı ve İstatistikleri
    let tefasStats: any = null;
    const tefasSnapshots = snapshots.filter((s) => s.investors != null);
    if (tefasSnapshots.length > 0) {
      tefasStats = computeFundInvestorStats(symbol, tefasSnapshots);
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
