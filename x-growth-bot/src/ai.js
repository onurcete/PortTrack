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

ÖNEMLİ GÖRSEL KURALI:
X paylaşımlarında görsel eklemek etkileşimi 5 katına çıkarır. Bu nedenle "shouldReply": true olduğunda "selectedImage" alanını ASLA boş veya null bırakma!
- Eğer fon/tefas konuşuluyorsa: "21ed93f8-2cf5-4e90-9b1b-7b79fba28f34.png" (TEFAS analizi)
- Eğer excel veya aylık getiri konuşuluyorsa: "2f0e5ea2-dd90-412a-945a-6c184b9ba845.png" (Laptop arayüzü)
- Eğer mobil uygulama veya telefondan takip konuşuluyorsa: "a31ac981-ba68-459a-a5d7-97e0a556edfc.png" veya "x5.png"
- Eğer genel borsa, portföy dağılımı veya borsa düşüşü konuşuluyorsa: "x4.png", "x3.png" veya "d3751bb0-5058-46e0-8dc3-9efce02107c2.png"
- Eğer yatırım planı/stratejisi konuşuluyorsa: "x6.png" veya "7.png"
Mutlaka yukarıdaki listeden en uygun bir görselin dosya adını "selectedImage" alanına yaz.`
    : "Şu anda ekli görsel dosyası bulunmuyor.";

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
7. Eğer cevap veriyorsan (shouldReply: true), "selectedImage" alanına yukarıdaki listeden MUTLAKA en uygun görselin dosya adını yaz.

Yanıtını YALNIZCA şu JSON formatında döndür:
{
  "shouldReply": true veya false,
  "reason": "Neden yanıt verilmeli veya neden verilmemeli açıklaması",
  "replyText": "Eğer shouldReply true ise buraya atılacak tweet yanıtı, false ise boş string",
  "selectedImage": "Listedeki görsellerden birinin tam dosya adı (Örn: x4.png)"
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
