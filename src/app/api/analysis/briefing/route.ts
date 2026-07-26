import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { loadAnalysisBundle } from "@/lib/analysisData";
import {
  briefingDay,
} from "@/lib/analysisContext";
import {
  generateAnalysisBriefing,
  isOpenAiConfigured,
  withBriefingLock,
  briefingPayloadSchema,
  type BriefingPayload,
} from "@/lib/analysisAi";

export const runtime = "nodejs";
export const maxDuration = 60;

/** AI briefing üretir veya cache'den döner. ?force=1 ile yeniden üretir. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const force =
      req.nextUrl.searchParams.get("force") === "1" ||
      req.nextUrl.searchParams.get("force") === "true";

    if (!isOpenAiConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY tanımlı değil",
          configured: false,
        },
        { status: 503 },
      );
    }

    const result = await withBriefingLock(`briefing:${userId}`, async () => {
      const bundle = await loadAnalysisBundle(userId);
      const day = briefingDay();

      if (!force) {
        const existing = await prisma.analysisBriefing.findUnique({
          where: {
            userId_date: { userId, date: day },
          },
        });
        if (
          existing &&
          existing.contextHash === bundle.contextHash
        ) {
          const payload = briefingPayloadSchema.parse(existing.payload);
          return {
            ok: true as const,
            cached: true,
            configured: true,
            contextHash: existing.contextHash,
            model: existing.model,
            createdAt: existing.createdAt.toISOString(),
            payload,
          };
        }
      }

      const { payload, model } = await generateAnalysisBriefing(bundle.context);

      const saved = await prisma.analysisBriefing.upsert({
        where: {
          userId_date: { userId, date: day },
        },
        create: {
          userId,
          date: day,
          contextHash: bundle.contextHash,
          payload: payload as object,
          model,
        },
        update: {
          contextHash: bundle.contextHash,
          payload: payload as object,
          model,
        },
      });

      return {
        ok: true as const,
        cached: false,
        configured: true,
        contextHash: saved.contextHash,
        model: saved.model,
        createdAt: saved.createdAt.toISOString(),
        payload: payload as BriefingPayload,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Briefing hatası:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
