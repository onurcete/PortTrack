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
2. Kullanıcının sorusuna göre en uygun 1 veya birden fazla aracı çalıştır (örneğin BIST100 karşılaştırması için 'compare_with_benchmark' ve 'get_portfolio_contributors'; genel durum için 'get_portfolio_summary' veya 'get_asset_allocation').
3. Yatırım tavsiyesi verme (kesin al/sat/tut emri verme). Bunun yerine portföyün dengesini, yoğunlaşma risklerini, getiri farklarını ve öne çıkan varlıkları rasyonel bir yönetici özeti gibi sun.
4. Türkçe, son derece akıcı, profesyonel ve finansal terminolojiye hakim bir üslup kullan.
5. Sayısal verileri TL ve USD olarak belirtirken net ve okunaklı yaz.
6. Yanıtı temiz ve okunaklı başlıklar, maddeler ve net paragraflarla yapılandır.
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

  // 1. Aşama: Modelin hangi tool'ları çağıracağını belirlemesi
  const firstResponse = await client.chat.completions.create({
    model,
    messages,
    tools: PORTFOLIO_MCP_TOOLS,
    tool_choice: "auto",
    temperature: 0.2,
  });

  const responseMessage = firstResponse.choices[0]?.message;
  const toolCalls = responseMessage?.tool_calls || [];
  const usedTools: string[] = [];

  // Eğer model doğrudan araç çağırmadan yanıt verdiyse veya soru genel bir tanımsa:
  if (toolCalls.length === 0) {
    return {
      answer:
        responseMessage?.content ||
        "Portföyünüzle ilgili spesifik bir analiz yapmak için lütfen yukarıdaki hızlı analiz butonlarını deneyin veya net bir soru sorun.",
      usedTools: [],
      model,
      durationMs: Date.now() - startTime,
    };
  }

  // 2. Aşama: Seçilen tool'ları sunucu tarafında paralel olarak çalıştır
  messages.push(responseMessage);

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

  // 3. Aşama: Tool sonuçlarını sentezleyip nihai finansal raporu oluştur
  const secondResponse = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
  });

  const finalAnswer =
    secondResponse.choices[0]?.message?.content ||
    "Portföy analiz verileri işlendi fakat özet üretilemedi.";

  return {
    answer: finalAnswer,
    usedTools,
    model,
    durationMs: Date.now() - startTime,
  };
}
