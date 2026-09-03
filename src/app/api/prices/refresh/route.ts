import { NextRequest, NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logSystemEvent } from "@/lib/logger";
import { getPortfolio } from "@/lib/data";
import { getPeriodReturns } from "@/lib/history";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUser();
  } catch (authErr) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  try {
    const tStart = performance.now();
    console.log("⏱️ [REFRESH API] Başlatıldı...");

    // Dolar kuru geçmişini arka planda asenkron çalıştır (bekletme yapma)
    backfillFxHistory().catch(() => null);

    const tPricesStart = performance.now();
    const result = await refreshPrices({ userId, force: true });
    const tPricesEnd = performance.now();
    console.log(`⏱️ [REFRESH API] refreshPrices tamamlandı: ${(tPricesEnd - tPricesStart).toFixed(0)} ms`);

    // Güncellenmiş portföyü anında tek pakette hazırla
    const [portfolio, periodReturns] = await Promise.all([
      getPortfolio(userId),
      getPeriodReturns(userId).catch(() => null),
    ]);

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
    const currentUsdTry = portfolio.currentUsdTry || 1;

    const formattedPositions = portfolio.positions.map((pos) => {
      const isOpen = pos.quantity > 1e-9;
      const totalCostTRY = isOpen ? pos.costTRY : (pos.totalBuyTRY || 0);
      const totalCostUSD = isOpen
        ? (pos.costUSD ?? (pos.costTRY / currentUsdTry))
        : (pos.totalBuyUSD ?? ((pos.totalBuyTRY || 0) / currentUsdTry));
      const profitTRY = isOpen ? pos.unrealizedTRY : (pos.realizedTRY || 0);
      const profitUSD = isOpen
        ? (pos.unrealizedUSD ?? (pos.unrealizedTRY / currentUsdTry))
        : (pos.realizedUSD ?? ((pos.realizedTRY || 0) / currentUsdTry));
      const profitRate = isOpen
        ? pos.unrealizedPctTRY
        : (pos.totalBuyTRY > 1e-9 ? (pos.realizedTRY / pos.totalBuyTRY) * 100 : 0);

      return {
        symbol: pos.symbol,
        name: pos.name || pos.symbol,
        assetType: pos.assetType,
        quantity: pos.quantity,
        avgCostTRY: pos.avgCostTRY,
        avgCostUSD: pos.avgCostTRY ? pos.avgCostTRY / currentUsdTry : 0,
        avgCostNative: pos.avgCostNative,
        currentPriceTRY: pos.currentPriceTRY || 0,
        currentPriceUSD: pos.currentPriceTRY ? pos.currentPriceTRY / currentUsdTry : 0,
        currentPriceNative: pos.currentPriceNative || 0,
        totalCostTRY,
        totalCostUSD,
        currentValueTRY: pos.valueTRY,
        currentValueUSD: pos.valueUSD ?? (pos.valueTRY / currentUsdTry),
        profitTRY,
        profitUSD,
        profitRate,
        profitRateTRY: profitRate,
        profitRateUSD: profitRate,
        dailyChangePct: pos.dailyChangePct ?? 0,
        currency: pos.nativeCurrency || "TRY",
        weightPercent: totalValueTRY > 0 ? pos.valueTRY / totalValueTRY : 0,
        realizedTRY: pos.realizedTRY,
        realizedUSD: pos.realizedUSD,
        totalBuyTRY: pos.totalBuyTRY,
        totalBuyUSD: pos.totalBuyUSD,
        totalSellTRY: pos.totalSellTRY,
        totalSellUSD: pos.totalSellUSD,
      };
    });

    const ASSET_COLOR_MAP: Record<string, string> = {
      TEFAS: "#a855f7",
      BES: "#3b82f6",
      FOREIGN: "#10b981",
      BIST: "#06b6d4",
      METAL: "#eab308",
      CRYPTO: "#f97316",
      FX: "#6366f1",
    };

    const assetBreakdown = portfolio.allocation.map((slice) => ({
      type: slice.assetType,
      label: slice.assetType,
      valueTRY: slice.valueTRY,
      valueUSD: slice.valueUSD ?? (slice.valueTRY / currentUsdTry),
      percent: slice.pct,
      color: ASSET_COLOR_MAP[slice.assetType] || "#8b5cf6",
    }));

    const portfolioSummary = {
      totalValueTRY: portfolio.totals.valueTRY,
      totalValueUSD: portfolio.totals.valueUSD ?? (portfolio.totals.valueTRY / currentUsdTry),
      totalCostTRY: portfolio.totals.costTRY,
      totalCostUSD: portfolio.totals.costUSD ?? (portfolio.totals.costTRY / currentUsdTry),
      totalProfitTRY: portfolio.totals.unrealizedTRY,
      totalProfitUSD: portfolio.totals.unrealizedUSD ?? (portfolio.totals.unrealizedTRY / currentUsdTry),
      totalProfitPercent: portfolio.totals.unrealizedPctTRY,
      dailyChangeTRY,
      dailyChangeUSD: dailyChangeTRY / currentUsdTry,
      dailyChangePercent,
      currentUsdTry,
      periodReturns,
      timelines: periodReturns?.timelines ?? null,
      positions: formattedPositions,
      assetBreakdown,
      lastUpdated: portfolio.lastUpdated,
    };

    console.log(`⏱️ [REFRESH API] TOPLAM SÜRE: ${(performance.now() - tStart).toFixed(0)} ms`);

    await logSystemEvent({
      userId,
      userEmail: user?.email || null,
      action: "PRICE_REFRESH_MANUAL",
      status: "SUCCESS",
      details: `${user?.name || user?.email || "Kullanıcı"} 'Fiyatları Güncelle' butonuna bastı (${result.updated} enstrüman güncellendi - ${(performance.now() - tStart).toFixed(0)} ms).`,
      req,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      portfolio: portfolioSummary,
    });
  } catch (err: any) {
    await logSystemEvent({
      userId,
      userEmail: user?.email || null,
      action: "PRICE_REFRESH_MANUAL",
      status: "FAILED",
      details: err?.message || "Fiyat güncelleme hatası",
      req,
    });

    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
