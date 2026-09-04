import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { evaluateAndDraftReply } from "./ai.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, "../config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

async function test() {
  console.log("====================================================");
  console.log("🤖 OpenAI Entegrasyon & Prompt Testi");
  console.log("====================================================");

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes("your-key-here")) {
    console.error("❌ HATA: Lütfen önce .env dosyasına geçerli OPENAI_API_KEY bilginizi girin!");
    process.exit(1);
  }

  const sampleTweets = [
    {
      author: "borsayatirimcisi",
      text: "TEFAS fonlarımı ve hisselerimi excelde takip etmekten usandım. Kurlar güncellenmiyor, kâr zarar birbirine giriyor. Tavsiye edeceğiniz pratik bir uygulama var mı?",
    },
    {
      author: "kriptoturk",
      text: "Yarın patlayacak coinler telegram VIP kanalımızda paylaşıldı! Hemen katılın!",
    },
    {
      author: "ahmet_finans",
      text: "BIST100 haftayı sert düşüşle kapattı. Portföyümde hisse ve fon ağırlıklarını nasıl dengelemeliyim kararsızım.",
    },
  ];

  for (const tweet of sampleTweets) {
    console.log(`\n🔍 Test Tweet: @${tweet.author}`);
    console.log(`💬 "${tweet.text}"`);
    console.log("⏳ AI analiz ediyor...");

    const result = await evaluateAndDraftReply(tweet.text, tweet.author, config);

    console.log(`👉 Cevap Verilsin mi?: ${result.shouldReply ? "EVET ✅" : "HAYIR ❌"}`);
    console.log(`💡 Sebep: ${result.reason}`);
    if (result.shouldReply) {
      console.log(`📸 Seçilen Görsel: ${result.selectedImage || "Yok (Sadece Metin)"}`);
      console.log(`✍️ Hazırlanan Yanıt: "${result.replyText}"`);
    }
    console.log("----------------------------------------------------");
  }

  console.log("\n✅ Test tamamlandı!");
}

test();
