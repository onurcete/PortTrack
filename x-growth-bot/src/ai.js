import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const knowledgeBasePath = path.resolve(rootDir, "PROJE_BILGISI.md");
const mediaDir = path.resolve(rootDir, "media");
const mediaManifestPath = path.resolve(mediaDir, "media_manifest.json");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Mevcut görselleri ve açıklamalarını döner
 */
function getAvailableMedia() {
  if (!fs.existsSync(mediaDir)) return [];

  const filesInDir = fs.readdirSync(mediaDir).filter((file) =>
    /\.(png|jpe?g|webp)$/i.test(file)
  );

  if (filesInDir.length === 0) return [];

  let manifestGorseller = [];
  if (fs.existsSync(mediaManifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(mediaManifestPath, "utf-8"));
      manifestGorseller = manifest.gorseller || [];
    } catch {
      manifestGorseller = [];
    }
  }

  return filesInDir.map((fileName) => {
    const matched = manifestGorseller.find((g) => g.dosya === fileName);
    return {
      fileName,
      description: matched?.aciklama || `PortTrack ${fileName} ekran görüntüsü`,
    };
  });
}

/**
 * Tweet'i analiz eder, uygunsa PortTrack odaklı samimi bir yanıt ve uygun görsel seçer.
 * @param {string} tweetText
 * @param {string} author
 * @param {object} config
 * @returns {Promise<{ shouldReply: boolean, reason: string, replyText?: string, selectedImage?: string | null }>}
 */
export async function evaluateAndDraftReply(tweetText, author = "", config = {}) {
  // Proje bilgi bankasını oku
  let projectKnowledge = "";
  if (fs.existsSync(knowledgeBasePath)) {
    projectKnowledge = fs.readFileSync(knowledgeBasePath, "utf-8");
  } else {
    projectKnowledge = config.brandContext?.features?.join(", ") || "BIST, TEFAS fon takibi ve portföy kâr/zarar yönetimi";
  }

  // Medya klasöründeki mevcut resimleri al
  const availableMedia = getAvailableMedia();
  const mediaPrompt = availableMedia.length > 0
    ? `Elimizdeki Mevcut Ekran Görüntüleri ve Post Resimleri:
${availableMedia.map((m) => `- "${m.fileName}": ${m.description}`).join("\n")}

Eğer tweetin konusu bu resimlerden biriyle doğrudan uyuşuyorsa (örneğin fonlardan bahsediliyorsa fon ekranı, kâr zarardan bahsediliyorsa portföy özeti), "selectedImage" alanına dosya adını yaz. Görsel eklemek yanıtın etkileşimini çok artırır! Zorlama olacaksa null bırak.`
    : "Şu anda ekli görsel dosyası bulunmuyor (selectedImage: null).";

  const systemPrompt = `Sen Türkiye finans ve borsa topluluğunda aktif, yardımsever, finansal okuryazarlığı yüksek bir yatırımcısın ve aynı zamanda yerli portföy takip platformu PortTrack'in (www.porttrack.com.tr) ekibindensin.

=== PORTTRACK BİLGİ BANKASI VE KURALLAR ===
${projectKnowledge}

=== GÖRSEL SEÇENEKLERİ ===
${mediaPrompt}

=== TWEET YANITLAMA TALİMATLARI ===
1. ASLA "Merhaba Sayın Yatırımcı", "Harika bir paylaşım!" gibi yapay, kurumsal veya robotik açılışlar yapma. Gerçek ve doğal bir Twitter/X kullanıcısı gibi konuş.
2. ASLA kopyala-yapıştır reklam cümlesi kurma. İlk 1-2 cümlede doğrudan tweet sahibinin bahsettiği konuya, soruya veya piyasa durumuna faydalı bir yorum/katkı yap.
3. Yanıtın sonuna veya ortasına PortTrack'i çok doğal, organik ve samimi bir tavsiye olarak iliştir (Örn: "Biz de tam bu Excel karmaşasından ve fon takibi zorluğundan bunalıp PortTrack'i (www.porttrack.com.tr) geliştirdik, TEFAS fonlarını ve BIST hisselerini otomatik güncelliyor, istersen ücretsiz bir göz atabilirsin").
4. Maksimum 240 karakter civarında olsun. Emojileri abartma (en fazla 1-2 adet).
5. Kripto pump, forex, vip telegram grupları veya küfür/argo içeren tweetlere ASLA cevap verme.
6. Eğer tweet PortTrack'in çözdüğü konularla (hisse, borsa, fon, tefas, portföy, excel, kâr/zarar, yatırımcı sayısı) uzaktan yakından alakalı değilse kesinlikle cevap verme (shouldReply: false).

Yanıtını YALNIZCA şu JSON formatında döndür:
{
  "shouldReply": true veya false,
  "reason": "Neden yanıt verilmeli veya neden verilmemeli açıklaması",
  "replyText": "Eğer shouldReply true ise buraya atılacak tweet yanıtı, false ise boş string",
  "selectedImage": "Uygun görselin dosya adı (örn: portfoy-ozet.png) veya uygun görsel yoksa null"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Yazar: @${author}\nTweet: "${tweetText}"`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    return {
      shouldReply: Boolean(parsed.shouldReply),
      reason: parsed.reason || "",
      replyText: parsed.replyText || "",
      selectedImage: parsed.selectedImage || null,
    };
  } catch (error) {
    console.error("OpenAI değerlendirme hatası:", error.message);
    return {
      shouldReply: false,
      reason: `AI API Hatası: ${error.message}`,
      selectedImage: null,
    };
  }
}
