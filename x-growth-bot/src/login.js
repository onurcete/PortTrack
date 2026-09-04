import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userDataDir = path.resolve(__dirname, "../user_data");

async function runLogin() {
  console.log("====================================================");
  console.log("🔐 X (Twitter) Oturum Başlatıcı");
  console.log("====================================================");
  console.log(`Profil dizini: ${userDataDir}`);
  console.log("Tarayıcı açılıyor... Lütfen X hesabınıza giriş yapın.");

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-infobars",
    ],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  await page.goto("https://x.com/login", { waitUntil: "domcontentloaded" });

  console.log("\n👉 Lütfen açılan tarayıcıda kullanıcı adı ve şifrenizle giriş yapın.");
  console.log("⏳ Ana sayfa (x.com/home) açıldığında oturumunuz otomatik olarak kaydedilecek...\n");

  try {
    // Ana sayfaya yönlendirilmeyi bekle (giriş tamamlandığında URL x.com/home olur)
    await page.waitForURL(/x\.com\/home/, { timeout: 300000 }); // 5 dakika bekleme

    console.log("🎉 Giriş başarıyla algılandı!");
    console.log("💾 Oturum bilgileri 'user_data' klasörüne kaydedildi.");
    console.log("Tarayıcı 5 saniye içinde kapatılacak...");

    await page.waitForTimeout(5000);
    await context.close();

    console.log("\n✅ İŞLEM TAMAMLANDI!");
    console.log("Artık botu başlatmak için şu komutu çalıştırabilirsiniz:");
    console.log("👉 npm start\n");
  } catch (error) {
    console.error("❌ Zaman aşımı veya oturum tamamlama hatası:", error.message);
    await context.close();
  }
}

runLogin();
