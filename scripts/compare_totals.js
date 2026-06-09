// Mock server-only before any other imports
require('module')._cache['server-only'] = {
  id: 'server-only',
  exports: {},
  loaded: true
};

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getPortfolio } = require("../src/lib/data");
const { getGrowthSeries } = require("../src/lib/history");

async function check() {
  try {
    const portfolio = await getPortfolio();
    const growth = await getGrowthSeries();

    const tsmTxs = await prisma.transaction.findMany({ where: { symbol: "TSM" } });
    const tsmSnaps = await prisma.priceSnapshot.findMany({ where: { symbol: "TSM" }, orderBy: { date: "asc" } });
    console.log("=== TSM SNAPSHOTS ===");
    console.log(JSON.stringify(tsmSnaps, null, 2));

    console.log("=== TSM TRANSACTIONS ===");
    console.log(JSON.stringify(tsmTxs, null, 2));

    console.log("=== OVERVIEW PORTFOLIO ===");
    console.log("valueTRY:", portfolio.totals.valueTRY);
    console.log("valueUSD:", portfolio.totals.valueUSD);
    console.log("usdRate:", portfolio.currentUsdTry);
    console.log("Positions count:", portfolio.positions.length);

    console.log("\n=== GROWTH SERIES (LAST POINT) ===");
    const lastPoint = growth[growth.length - 1];
    console.log("monthKey:", lastPoint.month);
    console.log("valueTRY:", lastPoint.valueTRY);
    console.log("valueUSD:", lastPoint.valueUSD);
    
    console.log("\n=== BY TYPE OVERVIEW ===");
    for (const alloc of portfolio.allocation) {
      console.log(`${alloc.assetType}: TRY ${alloc.valueTRY.toFixed(2)} | USD ${alloc.valueUSD.toFixed(2)}`);
    }

    console.log("\n=== BY TYPE GROWTH (LAST POINT) ===");
    for (const [type, val] of Object.entries(lastPoint.byType)) {
      console.log(`${type}: TRY ${val.valueTRY.toFixed(2)} | USD ${val.valueUSD.toFixed(2)}`);
    }

    // Let's compare position-level values for both calculations
    console.log("\n=== DETAILED POSITION VALUES IN OVERVIEW ===");
    portfolio.positions.forEach(p => {
      if (p.quantity > 0) {
        console.log(`${p.symbol} (${p.assetType}): Qty ${p.quantity.toFixed(4)} | CostTRY ${p.costTRY.toFixed(2)} | ValTRY ${p.valueTRY.toFixed(2)} | PriceTRY ${p.currentPriceTRY}`);
      }
    });

  } catch (e) {
    console.error("Error in check script:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
