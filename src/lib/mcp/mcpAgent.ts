import OpenAI from "openai";
import { PORTFOLIO_MCP_TOOLS } from "./schemas";
import { dispatchMcpTool } from "./portfolioTools";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface PortfolioAgentResponse {
  answer: string;
  usedTools: string[];
  model: string;
  durationMs: number;
}

const SYSTEM_PROMPT = `Sen PortTrack platformunun analitik "Portföy Zekâsı" (Portfolio Intelligence) motorusun.

Temel Kuralların:
1. Kesinlikle kendi kafandan finansal matematik, XIRR veya getiri yüzdesi hesaplama. Sana sağlanan analiz araçlarını (tools) çağırarak PortTrack sunucusunun hesapladığı kesin rakamlara dayan.
2. Kullanıcının sorusuna göre en uygun 1 veya birden fazla aracı çalıştır (örneğin belirli bir ayın neden düşük/yüksek olduğunu anlamak için 'get_monthly_growth_history', 'get_holding_monthly_performance' ve 'compare_with_benchmark' araçlarını birlikte kullan).
3. "Neden düşük performans oldu?" veya "Neden zarar ettim?" sorularında ASLA genel geçer, belirsiz cümleler ("piyasa koşulları kötüydü", "küresel gelişmeler etkiledi" vb.) yazma. Bunun yerine 'get_holding_monthly_performance' aracını çağırarak o ay portföyü en çok aşağı çeken (veya yukarı taşıyan) somut varlıkları (örn: "Mart 2026'da X hissesi %-8.4, Y fonu %-4.2 değer kaybederek ana kaybı oluşturdu...") net isim ve yüzdeleriyle açıkla.
4. Yatırım tavsiyesi verme (kesin al/sat/tut emri verme). Bunun yerine portföyün dengesini, yoğunlaşma risklerini, getiri farklarını ve öne çıkan varlıkları rasyonel bir yönetici özeti gibi sun.
5. Türkçe, son derece akıcı, profesyonel ve finansal terminolojiye hakim bir üslup kullan.
6. Sayısal verileri TL ve USD olarak belirtirken net ve okunaklı yaz. Tablolar ürettiğinde temiz standart Markdown tablo formatı kullan.
7. Yanıtının en sonuna mutlaka "💡 **Portföy Notu:**" başlığı altında yatırımcıya yönelik 1-2 cümlelik kilit bir özet çıkarım ekle.`;

export async function askPortfolioAgent(
  userId: string,
  question: string,
): Promise<PortfolioAgentResponse> {
  const startTime = Date.now();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ortam değişkeni tanımlı değil.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  const usedTools: string[] = [];
  let turn = 0;
  const maxTurns = 3;

  while (turn < maxTurns) {
    turn++;
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: PORTFOLIO_MCP_TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
    });

    const responseMessage = response.choices[0]?.message;
    if (!responseMessage) break;

    const toolCalls = responseMessage.tool_calls || [];
    if (toolCalls.length === 0) {
      // Model düşünmeyi tamamlayıp nihai analizi üretti
      return {
        answer:
          responseMessage.content ||
          "Portföyünüzle ilgili spesifik bir analiz yapmak için lütfen yukarıdaki hızlı analiz butonlarını deneyin veya net bir soru sorun.",
        usedTools: Array.from(new Set(usedTools)),
        model,
        durationMs: Date.now() - startTime,
      };
    }

    messages.push(responseMessage);

    // Bu turdaki tool çağrılarını çalıştır
    for (const call of toolCalls) {
      if (call.type === "function") {
        const toolName = call.function.name;
        usedTools.push(toolName);

        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }

        try {
          const { result } = await dispatchMcpTool(userId, toolName, parsedArgs);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        } catch (err: any) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: err?.message || "Araç çalıştırılamadı" }),
          });
        }
      }
    }
  }

  // Maksimum tur dolduysa nihai sentezi al
  const finalResponse = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.3,
  });

  return {
    answer:
      finalResponse.choices[0]?.message?.content ||
      "Portföy analiz verileri işlendi fakat özet üretilemedi.",
    usedTools: Array.from(new Set(usedTools)),
    model,
    durationMs: Date.now() - startTime,
  };
}
