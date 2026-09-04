import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import readline from "readline";
import dotenv from "dotenv";
import { evaluateAndDraftReply } from "./ai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const userDataDir = path.resolve(rootDir, "user_data");
const configPath = path.resolve(rootDir, "config.json");
const historyPath = path.resolve(rootDir, "history.json");
const mediaDir = path.resolve(rootDir, "media");

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const MAX_REPLIES = parseInt(process.env.MAX_REPLIES_PER_RUN || "3", 10);
const BOT_MODE = process.env.BOT_MODE || "interactive"; // 'interactive' veya 'auto'

// Rastgele bekleme fonksiyonu
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Geçmiş veritabanını yükle/oluştur
function loadHistory() {
  if (fs.existsSync(historyPath)) {
    try {
      return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveHistory(history) {
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf-8");
}

// Konsoldan kullanıcıdan onay alma
function askUserConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// İnsan gibi doğal klavye yazımı
async function humanType(page, selector, text) {
  await page.focus(selector);
  for (const char of text) {
    await page.keyboard.type(char);
    await sleep(randomDelay(25, 75));
  }
}

async function startBot() {
  console.log("====================================================");
  console.log("🚀 PortTrack X (Twitter) Akıllı Büyüme Botu");
  console.log(`Mod: ${BOT_MODE.toUpperCase()} | Maksimum Yanıt: ${MAX_REPLIES}`);
  console.log("====================================================\n");

  if (!fs.existsSync(userDataDir)) {
    console.error("❌ 'user_data' klasörü bulunamadı!");
    console.error("👉 Lütfen önce 'npm run login' komutunu çalıştırıp X hesabınıza giriş yapın.");
    process.exit(1);
  }

  const history = loadHistory();
  const processedUrls = new Set(history.map((h) => h.url));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Tarayıcıyı görünür açıyoruz (istenirse ayarlanabilir)
    viewport: { width: 1280, height: 800 },
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-infobars",
    ],
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  // 1. Oturum kontrolü
  console.log("🔍 Oturum doğrulanıyor...");
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await sleep(3000);

  if (page.url().includes("/login")) {
    console.error("❌ Oturum süresi dolmuş veya giriş yapılmamış.");
    console.error("👉 Lütfen 'npm run login' çalıştırıp tekrar giriş yapın.");
    await context.close();
    process.exit(1);
  }
  console.log("✅ X Oturumu aktif!\n");

  let repliesSent = 0;

  // 2. Anahtar kelimeleri sırayla tara
  for (const query of config.searchQueries) {
    if (repliesSent >= MAX_REPLIES) {
      console.log(`🎯 Günlük hedef (${MAX_REPLIES} yanıt) tamamlandı. Oturum sonlandırılıyor.`);
      break;
    }

    console.log(`\n🔎 Aranıyor: "${query}" (En son sekmesi)`);
    // f=live en güncel tweetleri getirir
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await sleep(randomDelay(4000, 6000));

    // Tweet elemanlarını topla
    const tweetArticles = await page.$$('article[data-testid="tweet"]');
    console.log(`📄 Bulunan tweet sayısı: ${tweetArticles.length}`);

    for (const article of tweetArticles) {
      if (repliesSent >= MAX_REPLIES) break;

      try {
        // Tweet linkini ve metnini çek
        const statusLinkElem = await article.$('a[href*="/status/"]');
        if (!statusLinkElem) continue;

        const href = await statusLinkElem.getAttribute("href");
        if (!href) continue;

        const tweetUrl = href.startsWith("http") ? href : `https://x.com${href}`;

        // Zaten işlem yapılmış mı kontrol et
        if (processedUrls.has(tweetUrl)) {
          continue;
        }

        // Tweet metnini al
        const textElem = await article.$('div[data-testid="tweetText"]');
        const tweetText = textElem ? (await textElem.innerText()).trim() : "";

        // Tweet yazarını al
        const userElem = await article.$('div[data-testid="User-Name"]');
        const userText = userElem ? await userElem.innerText() : "";
        const authorMatch = userText.match(/@(\w+)/);
        const author = authorMatch ? authorMatch[1] : "yatırımcı";

        if (!tweetText || tweetText.length < 15) {
          continue;
        }

        // Yasaklı kelimeleri kontrol et
        const hasBlockedWord = config.blockedWords.some((w) =>
          tweetText.toLowerCase().includes(w.toLowerCase())
        );
        if (hasBlockedWord) {
          processedUrls.add(tweetUrl);
          history.push({ url: tweetUrl, author, status: "blocked_keyword", date: new Date().toISOString() });
          saveHistory(history);
          continue;
        }

        console.log(`\n----------------------------------------------------`);
        console.log(`👤 Yazar: @${author}`);
        console.log(`📝 Tweet: "${tweetText.substring(0, 120)}..."`);
        console.log(`🔗 Link: ${tweetUrl}`);

        // 3. AI ile değerlendir ve taslak üret
        console.log("🤖 GPT-4o mini değerlendiriyor...");
        const aiEvaluation = await evaluateAndDraftReply(tweetText, author, config);

        if (!aiEvaluation.shouldReply || !aiEvaluation.replyText) {
          console.log(`⏭️ Pas geçildi. Neden: ${aiEvaluation.reason}`);
          processedUrls.add(tweetUrl);
          history.push({
            url: tweetUrl,
            author,
            status: "skipped_by_ai",
            reason: aiEvaluation.reason,
            date: new Date().toISOString(),
          });
          saveHistory(history);
          continue;
        }

        console.log(`✨ UYGUN BULUNDU! (${aiEvaluation.reason})`);
        
        // Görsel belirleme (Yapay zeka seçmediyse bile mutlaka 12 görselden birini kullan)
        let chosenImage = aiEvaluation.selectedImage;
        if (!chosenImage || !fs.existsSync(path.resolve(mediaDir, chosenImage))) {
          chosenImage = "x4.png"; // En kapsamlı mockup afişi
        }
        
        const imagePath = path.resolve(mediaDir, chosenImage);
        const hasImage = fs.existsSync(imagePath);
        console.log(`📸 Seçilen Görsel: ${chosenImage} ${hasImage ? "✅ (Eklenecek)" : "⚠️ (Bulunamadı)"}`);
        console.log(`✍️ Önerilen Yanıt:\n"${aiEvaluation.replyText}"`);

        // 4. Onay mekanizması
        let shouldPost = true;
        if (BOT_MODE === "interactive") {
          const ans = await askUserConfirmation("\n❓ Bu yanıtı görseliyle göndermek istiyor musunuz? [E: Evet, H: Hayır, Q: Çık]: ");
          if (ans === "q") {
            console.log("🛑 Kullanıcı tarafından durduruldu.");
            await context.close();
            process.exit(0);
          }
          shouldPost = ans === "e" || ans === "evet";
        }

        if (!shouldPost) {
          console.log("❌ Kullanıcı tarafından reddedildi.");
          processedUrls.add(tweetUrl);
          history.push({
            url: tweetUrl,
            author,
            status: "rejected_by_user",
            date: new Date().toISOString(),
          });
          saveHistory(history);
          continue;
        }

        // 5. Yanıtı Gönder
        console.log("🚀 Tweet sayfasına gidiliyor ve yanıt hazırlanıyor...");
        const tweetPage = await context.newPage();
        await tweetPage.goto(tweetUrl, { waitUntil: "domcontentloaded" });
        await sleep(randomDelay(3000, 5000));

        // Yanıt yazma alanını bul ve tıkla
        const replyInputSelector = 'div[data-testid="tweetTextarea_0"]';
        await tweetPage.waitForSelector(replyInputSelector, { timeout: 15000 });
        await tweetPage.click(replyInputSelector);
        await sleep(1500);

        // Önce Görseli Yükle
        if (hasImage) {
          console.log(`📸 Görsel yükleniyor: ${chosenImage}...`);
          try {
            const fileInputSelector = 'input[data-testid="fileInput"]';
            await tweetPage.waitForSelector(fileInputSelector, { timeout: 8000 });
            const fileInput = await tweetPage.$(fileInputSelector);
            if (fileInput) {
              await fileInput.setInputFiles(imagePath);
              console.log("⏳ Görselin X sunucularına yüklenmesi bekleniyor...");
              // X'in görsel önizleme div'ini (attachments) bekle
              try {
                await tweetPage.waitForSelector('div[data-testid="attachments"]', { timeout: 10000 });
                console.log("✅ Görsel önizlemesi yüklendi!");
              } catch {
                await sleep(5000); // Yedek bekleme süresi
              }
            } else {
              console.warn("⚠️ fileInput elemanı bulunamadı.");
            }
          } catch (err) {
            console.warn("⚠️ Görsel yüklenirken hata oluştu:", err.message);
          }
        }

        // Ardından İnsan Gibi Metni Yaz
        console.log("✍️ Metin yazılıyor...");
        await humanType(tweetPage, replyInputSelector, aiEvaluation.replyText);
        await sleep(randomDelay(1500, 2500));

        // 'Yanıtla' butonunun aktifleşmesini bekle ve tıkla
        const replyButtonSelector = 'button[data-testid="tweetButtonInline"]';
        await tweetPage.waitForSelector(replyButtonSelector, { timeout: 10000 });
        const replyButton = await tweetPage.$(replyButtonSelector);

        if (replyButton) {
          await replyButton.click();
          console.log("🎉 YANIT VE GÖRSEL BAŞARIYLA GÖNDERİLDİ!");
          repliesSent++;

          processedUrls.add(tweetUrl);
          history.push({
            url: tweetUrl,
            author,
            reply: aiEvaluation.replyText,
            image: chosenImage,
            status: "replied",
            date: new Date().toISOString(),
          });
          saveHistory(history);

          await sleep(4000);
        } else {
          console.error("⚠️ Yanıtla butonu bulunamadı.");
        }

        await tweetPage.close();

        // 6. X spam filtresine takılmamak için iki yanıt arasında güvenli bekleme
        if (repliesSent < MAX_REPLIES) {
          const waitTime = randomDelay(
            config.minDelayBetweenRepliesMs || 45000,
            config.maxDelayBetweenRepliesMs || 90000
          );
          console.log(`⏳ Spam koruması: Bir sonraki tweet için ${Math.round(waitTime / 1000)} saniye bekleniyor...`);
          await sleep(waitTime);
        }
      } catch (err) {
        console.error("Tweet işlenirken hata oluştu:", err.message);
      }
    }
  }

  console.log("\n====================================================");
  console.log(`✅ Oturum Tamamlandı. Toplam atılan yanıt: ${repliesSent}`);
  console.log("====================================================");
  await context.close();
}

startBot().catch((err) => {
  console.error("Kritik bot hatası:", err);
});
