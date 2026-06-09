const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { computePositions, buildFxLookup } = require("../src/lib/portfolio");

async function check() {
  try {
    const [txRows, snaps, fxRows] = await Promise.all([
      prisma.transaction.findMany({ orderBy: { date: "asc" } }),
      prisma.priceSnapshot.findMany({ orderBy: { date: "desc" } }),
      prisma.fxRate.findMany({
        where: { pair: "USDTRY" },
        orderBy: { date: "asc" },
      }),
    ]);

    const tx = txRows.map((t) => ({
      date: t.date,
      assetType: t.assetType,
      symbol: t.symbol,
      side: t.side,
      unitPrice: t.unitPrice,
      quantity: t.quantity,
      total: t.total,
      currency: t.currency,
    }));

    const priceMap = new Map();
    const seenCount = new Map();
    for (const s of snaps) {
      const count = seenCount.get(s.symbol) ?? 0;
      if (count === 0) {
        priceMap.set(s.symbol, {
          priceTRY: s.close,
          native: s.native,
          nativeCurrency: s.nativeCurrency,
        });
        seenCount.set(s.symbol, 1);
      } else if (count === 1) {
        const current = priceMap.get(s.symbol);
        current.prevPriceTRY = s.close;
        current.prevPriceNative = s.native;
        seenCount.set(s.symbol, 2);
      }
    }

    const fxHist = fxRows.map((r) => ({ date: r.date, rate: r.rate }));
    const currentUsdTry = fxHist.length > 0 ? fxHist[fxHist.length - 1].rate : 40;
    const fx = buildFxLookup(fxHist, currentUsdTry);

    const { positions, totals } = computePositions(
      tx,
      priceMap,
      fx,
      currentUsdTry,
    );

    const nvdaPos = positions.find(p => p.symbol === "NVDA");
    console.log("--- NVDA computed position ---");
    console.log(JSON.stringify(nvdaPos, null, 2));

    console.log("--- totals ---");
    console.log(JSON.stringify(totals, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
