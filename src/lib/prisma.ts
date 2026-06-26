import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Semalar guncellendiginde eski onbellekli istemciyi at */
function isPrismaClientStale(client: PrismaClient): boolean {
  return (
    typeof (client as PrismaClient & { portfolioMonthSnapshot?: unknown })
      .portfolioMonthSnapshot === "undefined" ||
    typeof (client as PrismaClient & { note?: unknown }).note === "undefined"
  );
}

// Hot reload / eski onbellek: guncel olmayan istemciyi global'den sil
if (globalForPrisma.prisma && isPrismaClientStale(globalForPrisma.prisma)) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

let prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isPrismaClientStale(prisma)) {
  prisma = createPrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };

const PRISMA_REGEN_MSG =
  'Veritabanı şeması güncellendi. Dev sunucusunu durdurun, terminalde "npx prisma generate" çalıştırın ve sunucuyu yeniden başlatın.';

/** PortfolioMonthSnapshot modeli yoksa anlaşılır hata */
export function assertPortfolioMonthSnapshot(): void {
  if (!prisma.portfolioMonthSnapshot) {
    throw new Error(PRISMA_REGEN_MSG);
  }
}
