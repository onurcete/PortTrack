import { getPortfolio } from "@/lib/data";
import {
  getPeriodReturns,
  getBenchmarkComparisonData,
  getGrowthSeries,
  getProductPerformance,
} from "@/lib/history";
import { prisma } from "@/lib/prisma";

export interface ToolExecutionResult {
  toolName: string;
  result: Record<string, any>;
}

/**
 * 1. get_portfolio_summary
 */
export async function executeGetPortfolioSummary(userId: string) {
  const p = await getPortfolio(userId);
  return {
    totalValueTRY: Math.round(p.totals.valueTRY),
    totalValueUSD: Math.round(p.totals.valueUSD),
    totalCostTRY: Math.round(p.totals.costTRY),
    totalCostUSD: Math.round(p.totals.costUSD),
    unrealizedProfitTRY: Math.round(p.totals.unrealizedTRY),
    unrealizedProfitUSD: Math.round(p.totals.unrealizedUSD),
    unrealizedProfitPctTRY: Number(p.totals.unrealizedPctTRY.toFixed(2)),
    unrealizedProfitPctUSD: Number(p.totals.unrealizedPctUSD.toFixed(2)),
    realizedProfitTRY: Math.round(p.totals.realizedTRY),
    realizedProfitUSD: Math.round(p.totals.realizedUSD),
    xirrTRY: p.portfolioXirrTRY !== null ? Number((p.portfolioXirrTRY * 100).toFixed(2)) : null,
    xirrUSD: p.portfolioXirrUSD !== null ? Number((p.portfolioXirrUSD * 100).toFixed(2)) : null,
    openPositionCount: p.positions.filter((x) => x.quantity > 1e-9).length,
    totalTransactionCount: p.transactionCount,
  };
}

/**
 * 2. get_holdings
 */
export async function executeGetHoldings(
  userId: string,
  args?: { assetType?: string; sortBy?: string; limit?: number },
) {
  const p = await getPortfolio(userId);
  let positions = p.positions.filter((x) => x.quantity > 1e-9 && x.valueTRY > 0);

  if (args?.assetType && args.assetType !== "ALL") {
    positions = positions.filter((x) => x.assetType === args.assetType);
  }

  const sortBy = args?.sortBy || "value";
  if (sortBy === "profitPct") {
    positions.sort((a, b) => b.unrealizedPctTRY - a.unrealizedPctTRY);
  } else if (sortBy === "dailyChangePct") {
    positions.sort((a, b) => (b.dailyChangePct ?? 0) - (a.dailyChangePct ?? 0));
  } else {
    positions.sort((a, b) => b.valueTRY - a.valueTRY);
  }

  const limit = Math.min(args?.limit || 15, 30);
  const now = Date.now();

  return {
    totalPositions: positions.length,
    holdings: positions.slice(0, limit).map((pos) => {
      const daysHeld = pos.firstBuyDate
        ? Math.max(0, Math.floor((now - new Date(pos.firstBuyDate).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const portfolioWeightPct =
        p.totals.valueTRY > 0 ? Number(((pos.valueTRY / p.totals.valueTRY) * 100).toFixed(2)) : 0;

      return {
        symbol: pos.symbol,
        assetType: pos.assetType,
        quantity: pos.quantity,
        currentPriceTRY: pos.currentPriceTRY !== null ? Number(pos.currentPriceTRY.toFixed(2)) : null,
        currentPriceNative: pos.currentPriceNative !== null ? Number(pos.currentPriceNative.toFixed(2)) : null,
        nativeCurrency: pos.nativeCurrency,
        valueTRY: Math.round(pos.valueTRY),
        valueUSD: Math.round(pos.valueUSD),
        unrealizedProfitTRY: Math.round(pos.unrealizedTRY),
        unrealizedProfitPctTRY: Number(pos.unrealizedPctTRY.toFixed(2)),
        dailyChangePct: pos.dailyChangePct !== null ? Number(pos.dailyChangePct.toFixed(2)) : null,
        daysHeld,
        portfolioWeightPct,
      };
    }),
  };
}

/**
 * 3. get_asset_allocation
 */
export async function executeGetAssetAllocation(userId: string) {
  const p = await getPortfolio(userId);
  const totalVal = p.totals.valueTRY;

  const allocation = p.allocation
    .filter((a) => a.valueTRY > 0)
    .map((a) => ({
      assetType: a.assetType,
      valueTRY: Math.round(a.valueTRY),
      valueUSD: Math.round(a.valueUSD),
      weightPct: Number(a.pct.toFixed(2)),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // En yüksek ağırlıklı tek varlık (konsantrasyon)
  const openPos = p.positions.filter((x) => x.quantity > 1e-9);
  openPos.sort((a, b) => b.valueTRY - a.valueTRY);
  const topAsset = openPos[0]
    ? {
        symbol: topAssetSymbol(openPos[0].symbol),
        assetType: openPos[0].assetType,
        valueTRY: Math.round(openPos[0].valueTRY),
        weightPct: totalVal > 0 ? Number(((openPos[0].valueTRY / totalVal) * 100).toFixed(2)) : 0,
      }
    : null;

  return {
    allocation,
    topHoldingConcentration: topAsset,
    diversificationScore: allocation.length >= 4 ? "Yüksek" : allocation.length >= 2 ? "Dengeli" : "Düşük",
  };
}

function topAssetSymbol(sym: string) {
  return sym;
}

/**
 * 4. get_portfolio_performance
 */
export async function executeGetPortfolioPerformance(userId: string, args?: { period?: string }) {
  const periodReturns = await getPeriodReturns(userId);
  const period = args?.period || "1M";

  if (period === "1W") {
    return {
      period: "1W (Son 1 Hafta)",
      returnPctTRY: periodReturns.weeklyTRY !== null ? Number(periodReturns.weeklyTRY.toFixed(2)) : null,
      returnPctUSD: periodReturns.weeklyUSD !== null ? Number(periodReturns.weeklyUSD.toFixed(2)) : null,
      returnAmtTRY: periodReturns.weeklyAmtTRY !== null ? Math.round(periodReturns.weeklyAmtTRY) : null,
      returnAmtUSD: periodReturns.weeklyAmtUSD !== null ? Math.round(periodReturns.weeklyAmtUSD) : null,
    };
  }

  if (period === "YTD") {
    return {
      period: "YTD (Yılbaşından Beri)",
      returnPctTRY: periodReturns.ytdTRY !== null ? Number(periodReturns.ytdTRY.toFixed(2)) : null,
      returnPctUSD: periodReturns.ytdUSD !== null ? Number(periodReturns.ytdUSD.toFixed(2)) : null,
      returnAmtTRY: periodReturns.ytdAmtTRY !== null ? Math.round(periodReturns.ytdAmtTRY) : null,
      returnAmtUSD: periodReturns.ytdAmtUSD !== null ? Math.round(periodReturns.ytdAmtUSD) : null,
    };
  }

  if (period === "ALL") {
    return {
      period: "ALL (Tüm Zamanlar)",
      returnPctTRY: periodReturns.allTimeTRY !== null ? Number(periodReturns.allTimeTRY.toFixed(2)) : null,
      returnPctUSD: periodReturns.allTimeUSD !== null ? Number(periodReturns.allTimeUSD.toFixed(2)) : null,
      returnAmtTRY: periodReturns.allTimeAmtTRY !== null ? Math.round(periodReturns.allTimeAmtTRY) : null,
      returnAmtUSD: periodReturns.allTimeAmtUSD !== null ? Math.round(periodReturns.allTimeAmtUSD) : null,
    };
  }

  // Varsayılan: 1M (MTD)
  return {
    period: "1M (Cari Ay - MTD)",
    returnPctTRY: periodReturns.mtdTRY !== null ? Number(periodReturns.mtdTRY.toFixed(2)) : null,
    returnPctUSD: periodReturns.mtdUSD !== null ? Number(periodReturns.mtdUSD.toFixed(2)) : null,
    returnAmtTRY: periodReturns.mtdAmtTRY !== null ? Math.round(periodReturns.mtdAmtTRY) : null,
    returnAmtUSD: periodReturns.mtdAmtUSD !== null ? Math.round(periodReturns.mtdAmtUSD) : null,
  };
}

/**
 * 5. get_portfolio_contributors
 */
export async function executeGetPortfolioContributors(
  userId: string,
  args?: { period?: string; limit?: number },
) {
  const p = await getPortfolio(userId);
  const openPos = p.positions.filter((x) => x.quantity > 1e-9 && x.valueTRY > 0);
  const limit = args?.limit || 3;
  const period = args?.period || "MTD";

  if (period === "DAILY") {
    const valid = openPos.filter((x) => x.dailyChangePct !== null && x.dailyChangePct !== undefined);
    const sorted = [...valid].sort((a, b) => (b.dailyChangePct ?? 0) - (a.dailyChangePct ?? 0));
    return {
      period: "DAILY (Günlük)",
      topGainers: sorted.slice(0, limit).map((x) => ({
        symbol: x.symbol,
        assetType: x.assetType,
        changePct: Number((x.dailyChangePct ?? 0).toFixed(2)),
        valueTRY: Math.round(x.valueTRY),
      })),
      topLosers: sorted.slice(-limit).reverse().map((x) => ({
        symbol: x.symbol,
        assetType: x.assetType,
        changePct: Number((x.dailyChangePct ?? 0).toFixed(2)),
        valueTRY: Math.round(x.valueTRY),
      })),
    };
  }

  // Varsayılan: MTD veya All-time profit
  const sorted = [...openPos].sort((a, b) => b.unrealizedPctTRY - a.unrealizedPctTRY);
  return {
    period: "ALL_TIME (Toplam Kâr/Zarar Katkısı)",
    topGainers: sorted.slice(0, limit).map((x) => ({
      symbol: x.symbol,
      assetType: x.assetType,
      profitPct: Number(x.unrealizedPctTRY.toFixed(2)),
      profitTRY: Math.round(x.unrealizedTRY),
      valueTRY: Math.round(x.valueTRY),
    })),
    topLosers: sorted.slice(-limit).reverse().map((x) => ({
      symbol: x.symbol,
      assetType: x.assetType,
      profitPct: Number(x.unrealizedPctTRY.toFixed(2)),
      profitTRY: Math.round(x.unrealizedTRY),
      valueTRY: Math.round(x.valueTRY),
    })),
  };
}

/**
 * 6. compare_with_benchmark
 */
export async function executeCompareWithBenchmark(userId: string, args?: { period?: string }) {
  const data = await getBenchmarkComparisonData(userId);
  const periodKey = args?.period === "YTD" ? "YTD" : args?.period === "1W" ? "1W" : "1M";
  const row = data.try[periodKey] || data.try["1M"];

  const portfolioReturn = Number(row.portfolio.toFixed(2));
  const benchmarks = [
    { name: "BIST 100", returnPct: row.bist !== null ? Number(row.bist.toFixed(2)) : null },
    { name: "S&P 500 (TL)", returnPct: row.sp500 !== null ? Number(row.sp500.toFixed(2)) : null },
    { name: "Gram Altın", returnPct: row.gold !== null ? Number(row.gold.toFixed(2)) : null },
    { name: "USD/TRY", returnPct: row.usd !== null ? Number(row.usd.toFixed(2)) : null },
  ];

  const bist100 = benchmarks.find((b) => b.name === "BIST 100");
  const alphaVsBist =
    bist100?.returnPct !== null && bist100?.returnPct !== undefined
      ? Number((portfolioReturn - bist100.returnPct).toFixed(2))
      : null;

  return {
    period: `${periodKey} (TRY Bazlı)`,
    portfolioReturnPct: portfolioReturn,
    benchmarks,
    alphaVsBist,
    relativePerformance:
      alphaVsBist !== null
        ? alphaVsBist > 0
          ? `BIST 100 endeksinin %${alphaVsBist} üzerinde performans gösterdi.`
          : `BIST 100 endeksinin %${Math.abs(alphaVsBist)} gerisinde kaldı.`
        : null,
  };
}

/**
 * 7. get_portfolio_risk
 */
export async function executeGetPortfolioRisk(userId: string) {
  const p = await getPortfolio(userId);
  const totalVal = p.totals.valueTRY;
  const openPos = p.positions.filter((x) => x.quantity > 1e-9 && x.valueTRY > 0);

  // Konsantrasyon analizi
  const sortedByVal = [...openPos].sort((a, b) => b.valueTRY - a.valueTRY);
  const top1Weight = totalVal > 0 && sortedByVal[0] ? (sortedByVal[0].valueTRY / totalVal) * 100 : 0;
  const top3Weight =
    totalVal > 0
      ? (sortedByVal.slice(0, 3).reduce((sum, x) => sum + x.valueTRY, 0) / totalVal) * 100
      : 0;

  // Döviz / TL dengesi
  const fxOrCryptoOrForeignVal = openPos
    .filter((x) => ["FOREIGN", "CRYPTO", "FX", "METAL"].includes(x.assetType) || x.nativeCurrency !== "TRY")
    .reduce((sum, x) => sum + x.valueTRY, 0);

  const fxHedgePct = totalVal > 0 ? (fxOrCryptoOrForeignVal / totalVal) * 100 : 0;

  // Ciddi zararda olan pozisyonlar (drawdown > %15)
  const highLossPositions = openPos
    .filter((x) => x.unrealizedPctTRY < -15)
    .map((x) => ({
      symbol: x.symbol,
      assetType: x.assetType,
      lossPct: Number(x.unrealizedPctTRY.toFixed(2)),
      lossTRY: Math.round(x.unrealizedTRY),
    }));

  return {
    totalPositions: openPos.length,
    top1AssetWeightPct: Number(top1Weight.toFixed(2)),
    top1AssetSymbol: sortedByVal[0]?.symbol || null,
    top3AssetsTotalWeightPct: Number(top3Weight.toFixed(2)),
    isOverConcentrated: top1Weight > 30 || top3Weight > 65,
    currencyHedgePct: Number(fxHedgePct.toFixed(2)),
    highLossPositions,
    overallRiskRating:
      top1Weight > 40 || highLossPositions.length >= 3
        ? "Yüksek Risk"
        : top1Weight > 25 || fxHedgePct < 15
        ? "Orta Risk"
        : "Dengeli / Düşük Risk",
  };
}

/**
 * 8. get_tefas_insights
 */
export async function executeGetTefasInsights(userId: string) {
  const p = await getPortfolio(userId);
  const tefasPositions = p.positions.filter((x) => x.assetType === "TEFAS" && x.quantity > 1e-9);

  if (tefasPositions.length === 0) {
    return {
      hasTefasFunds: false,
      message: "Portföyde aktif TEFAS fonu bulunmuyor.",
      funds: [],
    };
  }

  const symbols = tefasPositions.map((x) => x.symbol);

  // PriceSnapshot'lardan son 2 kayıt ile yatırımcı sayısı dinamiklerini çek
  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      symbol: { in: symbols },
      investors: { not: null },
    },
    orderBy: { date: "desc" },
    take: symbols.length * 5,
  });

  const fundInsights = tefasPositions.map((pos) => {
    const fundSnaps = snapshots.filter((s) => s.symbol === pos.symbol);
    const latest = fundSnaps[0]?.investors ?? null;
    const prev = fundSnaps[1]?.investors ?? null;
    const delta = latest && prev ? latest - prev : null;

    return {
      symbol: pos.symbol,
      valueTRY: Math.round(pos.valueTRY),
      latestInvestors: latest,
      weeklyInvestorDelta: delta,
      sentiment: delta ? (delta > 0 ? "Talep Artıyor 📈" : "Talep Azalıyor 📉") : "Stabil",
    };
  });

  return {
    hasTefasFunds: true,
    fundCount: tefasPositions.length,
    funds: fundInsights,
  };
}

/**
 * 9. get_monthly_growth_history
 */
export async function executeGetMonthlyGrowthHistory(
  userId: string,
  args?: { year?: number },
) {
  const [series, prodPerf] = await Promise.all([
    getGrowthSeries(userId),
    getProductPerformance(userId, 36).catch(() => ({ months: [], rows: [] })),
  ]);

  if (!series || series.length === 0) {
    return {
      message: "Portföy için henüz geçmiş büyüme verisi bulunmuyor.",
      years: [],
    };
  }

  const validPoints = series.filter((p) => !p.isSyntheticBaseline);
  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  const monthlyData = validPoints.map((p, idx) => {
    const prev = idx > 0 ? validPoints[idx - 1] : null;
    const changeTRY = prev ? p.valueTRY - prev.valueTRY : 0;
    const returnPctTRY = prev && prev.valueTRY > 0 ? ((p.valueTRY / prev.valueTRY) - 1) * 100 : 0;

    const changeUSD = prev ? p.valueUSD - prev.valueUSD : 0;
    const returnPctUSD = prev && prev.valueUSD > 0 ? ((p.valueUSD / prev.valueUSD) - 1) * 100 : 0;

    const [y, m] = p.month.split("-");
    const mNum = parseInt(m);
    const yNum = parseInt(y);

    // O ayın varlık bazlı getirileri
    const mIdx = (prodPerf.months as string[]).indexOf(p.month);
    let topGainers: Array<{ symbol: string; assetType: string; returnPctTRY: number }> = [];
    let topLosers: Array<{ symbol: string; assetType: string; returnPctTRY: number }> = [];

    if (mIdx !== -1) {
      const assetList: Array<{ symbol: string; assetType: string; returnPctTRY: number }> = [];
      for (const r of prodPerf.rows) {
        const ret = r.returnsTRY[mIdx];
        if (ret !== null && ret !== undefined && typeof ret === "number") {
          assetList.push({
            symbol: r.symbol,
            assetType: r.assetType,
            returnPctTRY: ret,
          });
        }
      }

      topGainers = [...assetList]
        .filter((a) => a.returnPctTRY > 0)
        .sort((a, b) => b.returnPctTRY - a.returnPctTRY)
        .slice(0, 3)
        .map((a) => ({ symbol: a.symbol, assetType: a.assetType, returnPctTRY: Number(a.returnPctTRY.toFixed(2)) }));

      topLosers = [...assetList]
        .filter((a) => a.returnPctTRY < 0)
        .sort((a, b) => a.returnPctTRY - b.returnPctTRY)
        .slice(0, 3)
        .map((a) => ({ symbol: a.symbol, assetType: a.assetType, returnPctTRY: Number(a.returnPctTRY.toFixed(2)) }));
    }

    // Varlık sınıflarına göre değişimler (TEFAS, BIST, Altın, BES vb.)
    const assetClassPerformance: Array<{
      assetType: string;
      label: string;
      currentValueTRY: number;
      changeTRY: number;
      returnPctTRY: number | null;
    }> = [];

    if (prev && p.byType && prev.byType) {
      const typeLabels: Record<string, string> = {
        TEFAS: "TEFAS Yatırım Fonları",
        BIST: "BIST Hisse Senetleri",
        METAL: "Kıymetli Madenler (Altın/Gümüş)",
        FOREIGN: "Yabancı Hisse Senetleri",
        CRYPTO: "Kripto Varlıklar",
        FX: "Döviz / Nakit",
        BES: "Bireysel Emeklilik (BES)",
      };

      for (const [typeKey, label] of Object.entries(typeLabels)) {
        const currVal = (p.byType as any)?.[typeKey]?.valueTRY ?? 0;
        const prevVal = (prev.byType as any)?.[typeKey]?.valueTRY ?? 0;
        if (currVal > 0 || prevVal > 0) {
          const diffTRY = currVal - prevVal;
          const retPct = prevVal > 0 ? Number(((currVal / prevVal - 1) * 100).toFixed(2)) : null;
          assetClassPerformance.push({
            assetType: typeKey,
            label,
            currentValueTRY: Math.round(currVal),
            changeTRY: Math.round(diffTRY),
            returnPctTRY: retPct,
          });
        }
      }
      assetClassPerformance.sort((a, b) => a.changeTRY - b.changeTRY);
    }

    return {
      year: yNum,
      month: p.month,
      monthName: monthNames[mNum - 1] || `${mNum}. Ay`,
      monthEndValueTRY: Math.round(p.valueTRY),
      monthEndValueUSD: Math.round(p.valueUSD),
      monthlyGainTRY: Math.round(changeTRY),
      monthlyReturnPctTRY: Number(returnPctTRY.toFixed(2)),
      monthlyGainUSD: Math.round(changeUSD),
      monthlyReturnPctUSD: Number(returnPctUSD.toFixed(2)),
      assetClassPerformance,
      keyMoversThisMonth: {
        topGainers,
        topLosers,
      },
    };
  });

  if (args?.year) {
    const filtered = monthlyData.filter((d) => d.year === args.year);
    const totalGainTRY = filtered.reduce((sum, d) => sum + d.monthlyGainTRY, 0);
    const totalGainUSD = filtered.reduce((sum, d) => sum + d.monthlyGainUSD, 0);

    return {
      requestedYear: args.year,
      availableMonthsCount: filtered.length,
      yearTotalGainTRY: Math.round(totalGainTRY),
      yearTotalGainUSD: Math.round(totalGainUSD),
      monthlyBreakdown: filtered,
    };
  }

  return {
    totalMonthsAvailable: monthlyData.length,
    monthlyBreakdown: monthlyData,
  };
}

/**
 * 10. get_holding_monthly_performance
 */
export async function executeGetHoldingMonthlyPerformance(
  userId: string,
  args?: { month?: string },
) {
  const prodPerf = await getProductPerformance(userId, 24);
  if (!prodPerf || prodPerf.months.length === 0) {
    return {
      message: "Varlık bazlı getiri geçmişi bulunamadı.",
      months: [],
    };
  }

  // Belirli bir ay veya en son ay
  const targetMonth =
    args?.month && prodPerf.months.includes(args.month)
      ? args.month
      : prodPerf.months[prodPerf.months.length - 1];

  const monthIdx = prodPerf.months.indexOf(targetMonth);
  if (monthIdx === -1) {
    return {
      message: `Belirtilen ${args?.month} ayı için getiri verisi bulunamadı. Mevcut aylar: ${prodPerf.months.join(", ")}`,
      availableMonths: prodPerf.months,
    };
  }

  const assetResults = prodPerf.rows
    .map((row) => {
      const retTRY = row.returnsTRY[monthIdx];
      const retUSD = row.returnsUSD[monthIdx];
      return {
        symbol: row.symbol,
        assetType: row.assetType,
        returnTRY: retTRY !== null ? Number(retTRY.toFixed(2)) : null,
        returnUSD: retUSD !== null ? Number(retUSD.toFixed(2)) : null,
        totalTRY: row.totalTRY !== null ? Math.round(row.totalTRY) : null,
      };
    })
    .filter((a) => a.returnTRY !== null);

  const gainers = [...assetResults]
    .filter((a) => (a.returnTRY ?? 0) > 0)
    .sort((a, b) => (b.returnTRY ?? 0) - (a.returnTRY ?? 0));

  const losers = [...assetResults]
    .filter((a) => (a.returnTRY ?? 0) < 0)
    .sort((a, b) => (a.returnTRY ?? 0) - (b.returnTRY ?? 0));

  return {
    month: targetMonth,
    totalAssetsTracked: assetResults.length,
    topGainersOfThisMonth: gainers.slice(0, 5),
    topLosersOfThisMonth: losers.slice(0, 5),
    allAssetReturns: assetResults,
  };
}

/**
 * Ana Tool Router Yönlendiricisi
 */
export async function dispatchMcpTool(
  userId: string,
  toolName: string,
  args: any,
): Promise<ToolExecutionResult> {
  let result: Record<string, any> = {};

  switch (toolName) {
    case "get_portfolio_summary":
      result = await executeGetPortfolioSummary(userId);
      break;
    case "get_holdings":
      result = await executeGetHoldings(userId, args);
      break;
    case "get_asset_allocation":
      result = await executeGetAssetAllocation(userId);
      break;
    case "get_portfolio_performance":
      result = await executeGetPortfolioPerformance(userId, args);
      break;
    case "get_monthly_growth_history":
      result = await executeGetMonthlyGrowthHistory(userId, args);
      break;
    case "get_holding_monthly_performance":
      result = await executeGetHoldingMonthlyPerformance(userId, args);
      break;
    case "get_portfolio_contributors":
      result = await executeGetPortfolioContributors(userId, args);
      break;
    case "compare_with_benchmark":
      result = await executeCompareWithBenchmark(userId, args);
      break;
    case "get_portfolio_risk":
      result = await executeGetPortfolioRisk(userId);
      break;
    case "get_tefas_insights":
      result = await executeGetTefasInsights(userId);
      break;
    default:
      result = { error: `Bilinmeyen analiz aracı: ${toolName}` };
  }

  return { toolName, result };
}
