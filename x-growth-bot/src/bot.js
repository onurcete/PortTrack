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
const MAX_TWEET_AGE_HOURS = parseInt(
  process.env.MAX_TWEET_AGE_HOURS || String(config.maxTweetAgeHours || 24),
  10
);

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
  console.log(`Mod: ${BOT_MODE.toUpperCase()} | Maksimum Yanıt: ${MAX_REPLIES} | Maks Tweet Yaşı: ${MAX_TWEET_AGE_HOURS}s`);
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

  // 1. Oturum kontrolü ve Aktif Profil Tespiti
  console.log("🔍 Oturum doğrulanıyor...");
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await sleep(3000);

  if (page.url().includes("/login")) {
    console.error("❌ Oturum süresi dolmuş veya giriş yapılmamış.");
    console.error("👉 Lütfen 'npm run login' çalıştırıp tekrar giriş yapın.");
    await context.close();
    process.exit(1);
  }

  // Profil kullanıcı adını dinamik olarak tespit et (fallback: env veya config)
  let ownUsername = (process.env.TWITTER_USERNAME || config.ownUsername || "porttrackx")
    .toLowerCase()
    .replace("@", "")
    .trim();

  try {
    const profileLink = await page.$('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      const href = await profileLink.getAttribute("href");
      if (href) {
        const detected = href.replace(/^\//, "").split("/")[0].trim().toLowerCase();
        if (detected) {
          ownUsername = detected;
        }
      }
    }
  } catch {
    // Varsayılan ownUsername kullanılır
  }

  console.log(`✅ X Oturumu aktif! (Hesap: @${ownUsername})\n`);

  let repliesSent = 0;

  // 2. Anahtar kelimeleri sırayla tara
  for (const rawQuery of config.searchQueries) {
    if (repliesSent >= MAX_REPLIES) {
      console.log(`🎯 Günlük hedef (${MAX_REPLIES} yanıt) tamamlandı. Oturum sonlandırılıyor.`);
      break;
    }

    // Arama sorgusuna kendi hesabımızı hariç tutma filtresi ekle (-from:username)
    const searchQuery = `${rawQuery} -from:${ownUsername}`;
    console.log(`\n🔎 Aranıyor: "${rawQuery}" (En son sekmesi, @${ownUsername} hariç)`);
    // f=live en güncel tweetleri getirir
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(searchQuery)}&f=live`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await sleep(randomDelay(4000, 6000));

    // Tweet elemanlarını topla
    const tweetArticles = await page.$$('article[data-testid="tweet"]');
    console.log(`📄 Bulunan tweet sayısı: ${tweetArticles.length}`);

    for (const article of tweetArticles) {
      if (repliesSent >= MAX_REPLIES) break;

      try {
        // Tweet linkini ve zamanını çek (a:has(time) en güvenilir seçicidir)
        let statusLinkElem = await article.$('a:has(time)');
        if (!statusLinkElem) {
          statusLinkElem = await article.$('a[href*="/status/"]');
        }
        if (!statusLinkElem) continue;

        const href = await statusLinkElem.getAttribute("href");
        if (!href) continue;

        const tweetUrl = href.startsWith("http") ? href : `https://x.com${href}`;

        // URL'den yazar adı ayıkla (Örn: /porttrackx/status/123456 -> porttrackx)
        const urlAuthorMatch = href.match(/^\/?([^\/]+)\/status\//);
        const urlAuthor = urlAuthorMatch ? urlAuthorMatch[1].toLowerCase() : "";

        // 1. Kendi hesabımıza ait tweet mi kontrolü
        if (
          urlAuthor === ownUsername ||
          tweetUrl.toLowerCase().includes(`/${ownUsername}/status/`)
        ) {
          continue;
        }

        // Zaten işlem yapılmış mı kontrol et
        if (processedUrls.has(tweetUrl)) {
          continue;
        }

        // Tweet yazarını al
        const userElem = await article.$('div[data-testid="User-Name"]');
        const userText = userElem ? await userElem.innerText() : "";
        const authorMatch = userText.match(/@(\w+)/);
        const author = authorMatch ? authorMatch[1] : (urlAuthor || "yatırımcı");

        // İkinci kontrol: Yazar adı kendi kullanıcı adımız mı?
        if (author.toLowerCase() === ownUsername) {
          continue;
        }

        // 2. Tweet Yaşı Kontrolü (Çok eski / 5 gün önceki tweetleri filtrele)
        const timeElem = await article.$('time');
        if (timeElem) {
          const datetime = await timeElem.getAttribute("datetime");
          if (datetime) {
            const tweetDate = new Date(datetime);
            const ageHours = (Date.now() - tweetDate.getTime()) / (1000 * 60 * 60);
            if (ageHours > MAX_TWEET_AGE_HOURS) {
              processedUrls.add(tweetUrl);
              continue;
            }
          }
        }

        // Tweet metnini al
        const textElem = await article.$('div[data-testid="tweetText"]');
        const tweetText = textElem ? (await textElem.innerText()).trim() : "";

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

        // Son kullanılan görselleri tespit et (son 4 görsel)
        const recentImages = history
          .filter((h) => h.status === "replied" && h.image)
          .map((h) => h.image)
          .slice(-4);

        // 3. AI ile değerlendir ve taslak üret
        console.log("🤖 GPT-4o mini değerlendiriyor...");
        const aiEvaluation = await evaluateAndDraftReply(tweetText, author, config, recentImages);

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
        
        // Medya klasöründeki tüm geçerli görselleri listele
        const allMediaFiles = fs.existsSync(mediaDir)
          ? fs.readdirSync(mediaDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
          : [];

        // Dinamik Görsel Seçimi ve Rotasyon (Üst üste aynı görseli engelle)
        let chosenImage = aiEvaluation.selectedImage;
        const lastTwoImages = recentImages.slice(-2);

        // Eğer görsel yoksa, dosya bulunamadıysa veya son 2 paylaşımda aynısı kullanıldıysa rotasyona sok
        if (!chosenImage || !fs.existsSync(path.resolve(mediaDir, chosenImage)) || lastTwoImages.includes(chosenImage)) {
          const freshCandidates = allMediaFiles.filter((f) => !lastTwoImages.includes(f));
          if (freshCandidates.length > 0) {
            chosenImage = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
          } else if (allMediaFiles.length > 0) {
            chosenImage = allMediaFiles[Math.floor(Math.random() * allMediaFiles.length)];
          }
        }
        
        const imagePath = chosenImage ? path.resolve(mediaDir, chosenImage) : null;
        const hasImage = imagePath && fs.existsSync(imagePath);
        console.log(`📸 Seçilen Görsel: ${chosenImage} ${hasImage ? "✅ (Eklenecek)" : "⚠️ (Bulunamadı)"}`);
        console.log(`✍️ Hazırlanan Yanıt:\n"${aiEvaluation.replyText}"`);

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
        } else {
          console.log("⚡ [OTOMATİK MOD] Kullanıcı onayı gerekmeden doğrudan gönderiliyor...");
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
