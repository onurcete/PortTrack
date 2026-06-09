const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { symbol: { contains: "NVDA" } }
    });
    console.log("--- NVDA Transactions ---");
    console.log(JSON.stringify(transactions, null, 2));

    const instruments = await prisma.instrument.findMany({
      where: { symbol: { contains: "NVDA" } }
    });
    console.log("--- NVDA Instruments ---");
    console.log(JSON.stringify(instruments, null, 2));

    const priceSnapshots = await prisma.priceSnapshot.findMany({
      where: { symbol: { contains: "NVDA" } }
    });
    console.log("--- NVDA Price Snapshots (count: " + priceSnapshots.length + ") ---");
    console.log(JSON.stringify(priceSnapshots.slice(0, 5), null, 2));

    const allPriceSnapsCount = await prisma.priceSnapshot.count();
    console.log("--- Total Price Snapshots in DB ---", allPriceSnapsCount);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
