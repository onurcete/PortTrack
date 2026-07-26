/**
 * Analiz AI briefing — OpenAI + Zod şema.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisContext } from "./analysisContext";

export const briefingPayloadSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(1).max(4000),
  highlights: z.array(z.string().min(1).max(300)).max(8),
  risks: z.array(z.string().min(1).max(300)).max(8),
  tefasNote: z.string().max(800).nullable(),
  perSymbol: z
    .array(
      z.object({
        symbol: z.string(),
        note: z.string().max(240),
      }),
    )
    .max(8),
});

export type BriefingPayload = z.infer<typeof briefingPayloadSchema>;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

const SYSTEM_PROMPT = `Sen PortTrack portföy takip uygulamasının analiz asistanısın.
Kurallar:
- Yalnızca verilen JSON context'teki verilere dayan. Context dışı sembol, rakam veya olay uydurma.
- Türkçe yaz. Yatırım tavsiyesi verme; al/sat/tut emri verme.
- Dil sakin, net ve profesyonel olsun.
- Teknik skorlar kural tabanlıdır; bunları "yapay zekâ skoru" diye sunma.
- TEFAS yatırımcı değişimleri fon talebi göstergesidir; kesin sonuç olarak sunma.
- Çıktıyı yalnızca geçerli JSON olarak ver (markdown yok).`;

function buildUserPrompt(context: AnalysisContext): string {
  return `Aşağıdaki portföy context'ine göre günlük analiz briefing'i üret.

JSON şema:
{
  "headline": "tek cümlelik başlık",
  "summary": "2-4 kısa paragraf (\\n\\n ile ayrılmış)",
  "highlights": ["önemli olumlu veya nötr noktalar"],
  "risks": ["dikkat / risk maddeleri"],
  "tefasNote": "TEFAS yatırımcı özeti yoksa null, varsa kısa paragraf",
  "perSymbol": [{"symbol":"XXX","note":"kısa not"}] // en fazla 8, yalnızca context'teki semboller
}

Context:
${JSON.stringify(context)}`;
}

/** OpenAI ile briefing üretir ve Zod ile doğrular. */
export async function generateAnalysisBriefing(
  context: AnalysisContext,
): Promise<{ payload: BriefingPayload; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY tanımlı değil");
  }

  const model = getOpenAiModel();
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(context) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI boş yanıt döndü");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI yanıtı JSON değil");
  }

  // TEFAS yoksa tefasNote null zorla
  if (!context.tefas && parsed && typeof parsed === "object") {
    (parsed as { tefasNote?: unknown }).tefasNote = null;
  }

  const payload = briefingPayloadSchema.parse(parsed);

  // perSymbol sembollerini context ile sınırla
  const allowed = new Set([
    ...context.stocks.map((s) => s.symbol),
    ...context.alternatives.map((s) => s.symbol),
    ...(context.tefas?.funds.map((f) => f.symbol) ?? []),
    ...context.bes.map((b) => b.symbol),
  ]);
  payload.perSymbol = payload.perSymbol.filter((p) => allowed.has(p.symbol));

  return { payload, model };
}

/** Basit in-memory çift tıklama koruması. */
const inflight = new Map<string, Promise<unknown>>();

export async function withBriefingLock<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}
