import { prisma } from "@/lib/prisma";
import { AnalysisBriefingClient } from "@/components/AnalysisBriefingClient";
import { requireUser } from "@/lib/auth";
import { loadAnalysisBundle } from "@/lib/analysisData";
import { briefingDay } from "@/lib/analysisContext";
import {
  briefingPayloadSchema,
  isOpenAiConfigured,
} from "@/lib/analysisAi";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const userId = await requireUser();
  const bundle = await loadAnalysisBundle(userId);
  const day = briefingDay();

  const briefingRow = await prisma.analysisBriefing.findUnique({
    where: { userId_date: { userId, date: day } },
  });

  let initialBriefing: {
    payload: ReturnType<typeof briefingPayloadSchema.parse>;
    model: string;
    createdAt: string;
    contextHash: string;
  } | null = null;

  if (briefingRow) {
    try {
      initialBriefing = {
        payload: briefingPayloadSchema.parse(briefingRow.payload),
        model: briefingRow.model,
        createdAt: briefingRow.createdAt.toISOString(),
        contextHash: briefingRow.contextHash,
      };
    } catch {
      initialBriefing = null;
    }
  }

  return (
    <AnalysisBriefingClient
      pulse={bundle.pulse}
      holdings={bundle.holdings}
      tefasInvestors={bundle.tefasInvestors}
      lastTechnicalDate={bundle.lastTechnicalDate}
      initialBriefing={initialBriefing}
      aiConfigured={isOpenAiConfigured()}
      contextHash={bundle.contextHash}
    />
  );
}
