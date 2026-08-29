import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import { getPeriodReturns } from "@/lib/history";

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

    const [portfolio, periodReturns] = await Promise.all([
      getPortfolio(userId),
      getPeriodReturns(userId).catch(() => null),
    ]);

    // Günlük değişim hesaplaması
    let dailyChangeTRY = 0;
    for (const pos of portfolio.positions) {
      if (pos.dailyChangePct && pos.valueTRY) {
        dailyChangeTRY += (pos.valueTRY * pos.dailyChangePct) / 100;
      }
    }
    const dailyChangePercent =
      portfolio.totals.valueTRY > 0
        ? (dailyChangeTRY / (portfolio.totals.valueTRY - dailyChangeTRY)) * 100
        : 0;

    const totalValueTRY = portfolio.totals.valueTRY || 0;

    const formattedPositions = portfolio.positions.map((pos) => ({
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
      currency: pos.nativeCurrency || "TRY",
      weightPercent: totalValueTRY > 0 ? pos.valueTRY / totalValueTRY : 0,
    }));

    const assetBreakdown = portfolio.allocation.map((slice) => ({
      type: slice.assetType,
      label: slice.assetType,
      valueTRY: slice.valueTRY,
      percent: slice.pct,
      color: "#10b981",
    }));

    return NextResponse.json({
      ok: true,
      totalValueTRY: portfolio.totals.valueTRY,
      totalCostTRY: portfolio.totals.costTRY,
      totalProfitTRY: portfolio.totals.unrealizedTRY,
      totalProfitPercent: portfolio.totals.unrealizedPctTRY,
      dailyChangeTRY,
      dailyChangePercent,
      periodReturns,
      positions: formattedPositions,
      assetBreakdown,
      lastUpdated: portfolio.lastUpdated,
    });
  } catch (err: any) {
    console.error("❌ Portfolio API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Portföy verileri yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
