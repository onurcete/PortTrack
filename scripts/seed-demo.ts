/**
 * Demo kullanıcısı oluşturma ve örnek verilerle doldurma scripti
 * Çalıştırmak için: npx ts-node --project tsconfig.json scripts/seed-demo.ts
 * VEYA: npx tsx scripts/seed-demo.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { hashPassword } from "../src/lib/auth";

const DEMO_EMAIL = "demo@porttrack.app";

async function main() {
  console.log("🚀 Demo kullanıcısı oluşturuluyor...");
  const hashedPassword = await hashPassword("Demo1234!");

  // 1. Demo user oluştur ya da güncelle
  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { isDemo: true, name: "Demo Kullanıcı", password: hashedPassword },
    create: {
      email: DEMO_EMAIL,
      password: hashedPassword,
      name: "Demo Kullanıcı",
      role: "USER",
      isDemo: true,
    },
  });

  console.log("✅ Demo kullanıcı:", demo.id, demo.email);

  // 2. Mevcut işlemleri temizle
  await prisma.transaction.deleteMany({ where: { userId: demo.id } });
  await prisma.portfolioMonthSnapshot.deleteMany({ where: { userId: demo.id } });

  // 3. Örnek işlemler — gerçekçi bir portföy
  const txns = [
    // BIST
    { assetType: "BIST", symbol: "THYAO", side: "BUY", unitPrice: 285, quantity: 100, total: 28500, currency: "TRY", date: new Date("2024-01-15") },
    { assetType: "BIST", symbol: "THYAO", side: "BUY", unitPrice: 310, quantity: 50, total: 15500, currency: "TRY", date: new Date("2024-04-10") },
    { assetType: "BIST", symbol: "ASELS", side: "BUY", unitPrice: 75, quantity: 200, total: 15000, currency: "TRY", date: new Date("2024-02-01") },
    { assetType: "BIST", symbol: "SASA", side: "BUY", unitPrice: 48, quantity: 300, total: 14400, currency: "TRY", date: new Date("2024-03-20") },
    { assetType: "BIST", symbol: "EREGL", side: "BUY", unitPrice: 50, quantity: 400, total: 20000, currency: "TRY", date: new Date("2024-01-28") },
    { assetType: "BIST", symbol: "EREGL", side: "SELL", unitPrice: 58, quantity: 100, total: 5800, currency: "TRY", date: new Date("2024-06-15") },
    { assetType: "BIST", symbol: "KOZAL", side: "BUY", unitPrice: 1350, quantity: 20, total: 27000, currency: "TRY", date: new Date("2024-05-10") },

    // TEFAS
    { assetType: "TEFAS", symbol: "TI2", side: "BUY", unitPrice: 2.84, quantity: 8000, total: 22720, currency: "TRY", date: new Date("2024-01-10") },
    { assetType: "TEFAS", symbol: "TI2", side: "BUY", unitPrice: 3.12, quantity: 5000, total: 15600, currency: "TRY", date: new Date("2024-06-01") },
    { assetType: "TEFAS", symbol: "MAC", side: "BUY", unitPrice: 1.24, quantity: 15000, total: 18600, currency: "TRY", date: new Date("2024-02-15") },
    { assetType: "TEFAS", symbol: "GAF", side: "BUY", unitPrice: 4.5, quantity: 3000, total: 13500, currency: "TRY", date: new Date("2024-04-01") },

    // FOREIGN (Yabancı Borsa)
    { assetType: "FOREIGN", symbol: "AAPL", side: "BUY", unitPrice: 182, quantity: 5, total: 910, currency: "USD", date: new Date("2024-01-20") },
    { assetType: "FOREIGN", symbol: "MSFT", side: "BUY", unitPrice: 375, quantity: 3, total: 1125, currency: "USD", date: new Date("2024-02-12") },
    { assetType: "FOREIGN", symbol: "NVDA", side: "BUY", unitPrice: 495, quantity: 2, total: 990, currency: "USD", date: new Date("2024-03-05") },

    // FX (Döviz)
    { assetType: "FX", symbol: "USD", side: "BUY", unitPrice: 32.5, quantity: 500, total: 16250, currency: "TRY", date: new Date("2024-01-05") },
    { assetType: "FX", symbol: "EUR", side: "BUY", unitPrice: 35.2, quantity: 300, total: 10560, currency: "TRY", date: new Date("2024-03-01") },

    // METAL (Kıymetli Maden)
    { assetType: "METAL", symbol: "ALTIN", side: "BUY", unitPrice: 1850, quantity: 10, total: 18500, currency: "TRY", date: new Date("2024-01-08") },
    { assetType: "METAL", symbol: "GUMUS", side: "BUY", unitPrice: 23, quantity: 100, total: 2300, currency: "TRY", date: new Date("2024-04-15") },

    // CRYPTO
    { assetType: "CRYPTO", symbol: "BTC", side: "BUY", unitPrice: 42000, quantity: 0.05, total: 2100, currency: "USD", date: new Date("2024-01-12") },
    { assetType: "CRYPTO", symbol: "ETH", side: "BUY", unitPrice: 2200, quantity: 0.5, total: 1100, currency: "USD", date: new Date("2024-02-20") },

    // BES
    { assetType: "BES", symbol: "BES", side: "BUY", unitPrice: 1, quantity: 5000, total: 5000, currency: "TRY", date: new Date("2024-01-01") },
    { assetType: "BES", symbol: "BES", side: "BUY", unitPrice: 1, quantity: 5000, total: 5000, currency: "TRY", date: new Date("2024-04-01") },
  ];

  for (const t of txns) {
    await prisma.transaction.create({
      data: {
        userId: demo.id,
        date: t.date,
        assetType: t.assetType,
        symbol: t.symbol,
        side: t.side,
        unitPrice: t.unitPrice,
        quantity: t.quantity,
        total: t.total,
        currency: t.currency,
      },
    });
  }

  console.log(`✅ ${txns.length} örnek işlem eklendi.`);

  // 4. Instruments (fiyat kaynakları)
  const instruments = [
    { symbol: "THYAO", assetType: "BIST", priceSource: "yahoo", yahooSymbol: "THYAO.IS", currency: "TRY" },
    { symbol: "ASELS", assetType: "BIST", priceSource: "yahoo", yahooSymbol: "ASELS.IS", currency: "TRY" },
    { symbol: "SASA", assetType: "BIST", priceSource: "yahoo", yahooSymbol: "SASA.IS", currency: "TRY" },
    { symbol: "EREGL", assetType: "BIST", priceSource: "yahoo", yahooSymbol: "EREGL.IS", currency: "TRY" },
    { symbol: "KOZAL", assetType: "BIST", priceSource: "yahoo", yahooSymbol: "KOZAL.IS", currency: "TRY" },
    { symbol: "TI2", assetType: "TEFAS", priceSource: "tefas", currency: "TRY" },
    { symbol: "MAC", assetType: "TEFAS", priceSource: "tefas", currency: "TRY" },
    { symbol: "GAF", assetType: "TEFAS", priceSource: "tefas", currency: "TRY" },
    { symbol: "AAPL", assetType: "FOREIGN", priceSource: "yahoo", yahooSymbol: "AAPL", currency: "USD" },
    { symbol: "MSFT", assetType: "FOREIGN", priceSource: "yahoo", yahooSymbol: "MSFT", currency: "USD" },
    { symbol: "NVDA", assetType: "FOREIGN", priceSource: "yahoo", yahooSymbol: "NVDA", currency: "USD" },
    { symbol: "USD", assetType: "FX", priceSource: "yahoo", yahooSymbol: "USDTRY=X", currency: "TRY" },
    { symbol: "EUR", assetType: "FX", priceSource: "yahoo", yahooSymbol: "EURTRY=X", currency: "TRY" },
    { symbol: "ALTIN", assetType: "METAL", priceSource: "yahoo", yahooSymbol: "GC=F", currency: "TRY" },
    { symbol: "GUMUS", assetType: "METAL", priceSource: "yahoo", yahooSymbol: "SI=F", currency: "TRY" },
    { symbol: "BTC", assetType: "CRYPTO", priceSource: "yahoo", yahooSymbol: "BTC-USD", currency: "USD" },
    { symbol: "ETH", assetType: "CRYPTO", priceSource: "yahoo", yahooSymbol: "ETH-USD", currency: "USD" },
    { symbol: "BES", assetType: "BES", priceSource: "manual", manualPrice: null, currency: "TRY" },
  ];

  // Mevcut instruments temizle
  await prisma.instrument.deleteMany({ where: { userId: demo.id } });

  for (const inst of instruments) {
    await prisma.instrument.create({
      data: {
        userId: demo.id,
        symbol: inst.symbol,
        assetType: inst.assetType,
        priceSource: inst.priceSource,
        yahooSymbol: inst.yahooSymbol ?? null,
        manualPrice: inst.manualPrice ?? null,
        currency: inst.currency,
      },
    });
  }

  console.log(`✅ ${instruments.length} instrument kaydı eklendi.`);
  console.log("\n🎉 Demo kullanıcısı hazır!");
  console.log(`   Email : ${DEMO_EMAIL}`);
  console.log(`   ID    : ${demo.id}`);
  console.log("   Demo oturum: /api/auth/demo\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
