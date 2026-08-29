import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";

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

    const [portfolio, transactions, technical] = await Promise.all([
      getPortfolio(userId),
      prisma.transaction.findMany({
        where: { userId, symbol },
        orderBy: { date: "desc" },
      }),
      prisma.technicalAnalysis.findFirst({
        where: { symbol },
        orderBy: { date: "desc" },
      }),
    ]);

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
    });
  } catch (err: any) {
    console.error("❌ Asset Detail API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Varlık detayı yüklenemedi." },
      { status: 500 }
    );
  }
}
