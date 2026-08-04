const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const result = await p.instrument.updateMany({
    where: {
      symbol: { in: ["BES", "bes"] },
      manualPrice: { lte: 1 },
    },
    data: { manualPrice: null },
  });
  console.log("✅ Veritabanında dummy BES fiyatları temizlendi. Etkilenen kayıt:", result.count);
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
