import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { askPortfolioAgent } from "@/lib/mcp/mcpAgent";
import { isOpenAiConfigured } from "@/lib/analysisAi";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json(
        { ok: false, error: "Lütfen geçerli bir soru yazın" },
        { status: 400 },
      );
    }

    if (!isOpenAiConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY ortam değişkeni tanımlı değil",
          configured: false,
        },
        { status: 503 },
      );
    }

    const { answer, usedTools, model, durationMs } = await askPortfolioAgent(
      userId,
      question,
    );

    return NextResponse.json({
      ok: true,
      answer,
      usedTools,
      model,
      durationMs,
    });
  } catch (err) {
    console.error("Ask AI error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "Sunucu hatası" },
      { status: 500 },
    );
  }
}
