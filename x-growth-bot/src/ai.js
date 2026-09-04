import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Tweet'i analiz eder, uygunsa PortTrack odaklı samimi bir yanıt taslağı üretir.
 * @param {string} tweetText
 * @param {string} author
 * @param {object} config
 * @returns {Promise<{ shouldReply: boolean, reason: string, replyText?: string }>}
 */
export async function evaluateAndDraftReply(tweetText, author = "", config = {}) {
  const brandFeatures = config.brandContext?.features?.join(", ") || "BIST, TEFAS fon takibi ve portföy kâr/zarar yönetimi";

  const systemPrompt = `Sen Türkiye finans ve borsa topluluğunda aktif, yardımsever, samimi bir bireysel yatırımcısın ve aynı zamanda yerli portföy takip aracı PortTrack'in (porttrack.app) ekibindensin.

Hedefin: Finans, borsa, hisse, fon veya portföy takibiyle ilgili tweet atan kişilere değer katan, samimi, insan gibi yazılmış yanıtlar vermek.

KURALLAR:
1. ASLA "Merhaba Sayın Yatırımcı", "Harika bir paylaşım!" gibi yapay veya robotik açılışlar yapma. Gerçek bir Twitter/X kullanıcısı gibi konuş.
2. ASLA kopyala-yapıştır reklam cümlesi kurma. İlk 1-2 cümlede doğrudan tweet yazarının bahsettiği konuya/soruya mantıklı bir finansal katkı sağla.
3. Yanıtın sonuna veya ortasına çok doğal bir şekilde PortTrack'i sıkıştır (Örn: "Biz de tam bu Excel karmaşasından sıkılıp PortTrack'i (porttrack.app) geliştirdik, TEFAS fonlarını ve hisseleri otomatik takip ediyor, istersen bir göz atabilirsin").
4. Maksimum 240 karakter olsun. Sade ve Türkçe yazım kurallarına uygun ama samimi olsun. Emojileri abartma (en fazla 1-2 adet).
5. Kripto pump, forex, vip telegram grupları veya küfür/argo içeren tweetlere ASLA cevap verme.
6. Eğer tweet PortTrack'in çözdüğü bir sorunla (portföy, takip, fon, hisse, kâr/zarar, excel) uzaktan yakından alakalı değilse veya cevap vermek anlamsız/zorlama duracaksa kesinlikle cevap verme.

PortTrack Özellikleri: ${brandFeatures}
Web sitesi: porttrack.app

Yanıtını YALNIZCA şu JSON formatında döndür:
{
  "shouldReply": true veya false,
  "reason": "Neden yanıt verilmeli veya neden verilmemeli açıklaması",
  "replyText": "Eğer shouldReply true ise buraya atılacak tweet yanıtı, false ise boş string"
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
    };
  } catch (error) {
    console.error("OpenAI değerlendirme hatası:", error.message);
    return {
      shouldReply: false,
      reason: `AI API Hatası: ${error.message}`,
    };
  }
}
