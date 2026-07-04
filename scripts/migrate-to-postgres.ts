/**
 * SQLite → PostgreSQL (Neon) tek seferlik veri taşıma scripti.
 *
 * Kullanım:
 *   npx tsx scripts/migrate-to-postgres.ts
 *
 * .env dosyasındaki DATABASE_URL Neon bağlantı dizesini göstermelidir.
 * SQLite veritabanı prisma/dev.db dosyasından okunur.
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import path from "path";

const SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");
const BATCH_SIZE = 500;

async function main() {
  console.log("🔌 SQLite açılıyor:", SQLITE_PATH);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  console.log("🔌 PostgreSQL'e bağlanılıyor...");
  const prisma = new PrismaClient();
  await prisma.$connect();

  // ────────── Transaction ──────────
  {
    const rows = sqlite.prepare('SELECT * FROM "Transaction"').all() as any[];
    console.log(`📦 Transaction: ${rows.length} kayıt taşınacak`);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.transaction.createMany({
        data: batch.map((r: any) => ({
          id: r.id,
          date: new Date(r.date),
          assetType: r.assetType,
          symbol: r.symbol,
          side: r.side,
          unitPrice: r.unitPrice,
          quantity: r.quantity,
          total: r.total,
          currency: r.currency,
          note: r.note ?? null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Transaction ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }

  // ────────── Instrument ──────────
  {
    const rows = sqlite.prepare("SELECT * FROM Instrument").all() as any[];
    console.log(`📦 Instrument: ${rows.length} kayıt taşınacak`);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.instrument.createMany({
        data: batch.map((r: any) => ({
          symbol: r.symbol,
          assetType: r.assetType,
          name: r.name ?? null,
          yahooSymbol: r.yahooSymbol ?? null,
          currency: r.currency ?? "TRY",
          priceSource: r.priceSource ?? "yahoo",
          manualPrice: r.manualPrice ?? null,
          updatedAt: new Date(r.updatedAt),
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ Instrument ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }

  // ────────── PriceSnapshot ──────────
  {
    const rows = sqlite.prepare("SELECT * FROM PriceSnapshot").all() as any[];
    console.log(`📦 PriceSnapshot: ${rows.length} kayıt taşınacak`);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.priceSnapshot.createMany({
        data: batch.map((r: any) => ({
          id: r.id,
          symbol: r.symbol,
          date: new Date(r.date),
          close: r.close,
          native: r.native ?? null,
          nativeCurrency: r.nativeCurrency ?? null,
          currency: r.currency,
          source: r.source ?? null,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ PriceSnapshot ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }

  // ────────── FxRate ──────────
  {
    const rows = sqlite.prepare("SELECT * FROM FxRate").all() as any[];
    console.log(`📦 FxRate: ${rows.length} kayıt taşınacak`);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.fxRate.createMany({
        data: batch.map((r: any) => ({
          id: r.id,
          date: new Date(r.date),
          pair: r.pair,
          rate: r.rate,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ FxRate ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }

  // ────────── PortfolioSnapshot ──────────
  // {
  //   const rows = sqlite.prepare("SELECT * FROM PortfolioSnapshot").all() as any[];
  //   console.log(`📦 PortfolioSnapshot: ${rows.length} kayıt taşınacak`);
  //   for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  //     const batch = rows.slice(i, i + BATCH_SIZE);
  //     await prisma.portfolioSnapshot.createMany({
  //       data: batch.map((r: any) => ({
  //         id: r.id,
  //         date: new Date(r.date),
  //         totalValueTRY: r.totalValueTRY,
  //         totalCostTRY: r.totalCostTRY,
  //         totalValueUSD: r.totalValueUSD,
  //         totalCostUSD: r.totalCostUSD,
  //       })),
  //       skipDuplicates: true,
  //     });
  //     console.log(`  ✓ PortfolioSnapshot ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  //   }
  // }

  // ────────── PortfolioMonthSnapshot ──────────
  {
    const rows = sqlite.prepare("SELECT * FROM PortfolioMonthSnapshot").all() as any[];
    console.log(`📦 PortfolioMonthSnapshot: ${rows.length} kayıt taşınacak`);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await prisma.portfolioMonthSnapshot.createMany({
        data: batch.map((r: any) => ({
          id: r.id,
          month: new Date(r.month),
          besTRY: r.besTRY ?? 0,
          bistTRY: r.bistTRY ?? 0,
          tefasTRY: r.tefasTRY ?? 0,
          foreignTRY: r.foreignTRY ?? 0,
          fxTRY: r.fxTRY ?? 0,
          metalTRY: r.metalTRY ?? 0,
          cryptoTRY: r.cryptoTRY ?? 0,
          totalTRY: r.totalTRY ?? 0,
          totalUSD: r.totalUSD ?? null,
          usdTryRate: r.usdTryRate ?? null,
          source: r.source ?? "backlog",
        })),
        skipDuplicates: true,
      });
      console.log(`  ✓ PortfolioMonthSnapshot ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }

  await prisma.$disconnect();
  sqlite.close();
  console.log("\n✅ Veri taşıma tamamlandı!");
}

main().catch((err) => {
  console.error("❌ Hata:", err);
  process.exit(1);
});
