import { prisma } from "@/lib/prisma";
import { AnalysisClient } from "@/components/AnalysisClient";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // En son analiz sonuçlarını çek (bugün veya en yakın tarih)
  const analyses = await prisma.technicalAnalysis.findMany({
    where: {
      symbol: { not: "__DAILY_SUMMARY__" },
    },
    orderBy: { date: "desc" },
    distinct: ["symbol"],
  });

  // Günlük özet
  const summaryRecord = await prisma.technicalAnalysis.findFirst({
    where: { symbol: "__DAILY_SUMMARY__" },
    orderBy: { date: "desc" },
  });

  const lastAnalysisDate = analyses.length > 0 ? analyses[0].date.toISOString() : null;

  return (
    <AnalysisClient
      analyses={analyses.map((a) => ({
        symbol: a.symbol,
        assetType: a.assetType,
        date: a.date.toISOString(),
        indicators: a.indicators as any,
        score: a.score,
        commentary: a.commentary,
        trendSignal: a.trendSignal,
        macdSignal: a.macdSignal,
        rsiZone: a.rsiZone,
        alerts: a.alerts as string[],
      }))}
      dailySummary={summaryRecord ? (summaryRecord.indicators as any) : null}
      lastAnalysisDate={lastAnalysisDate}
    />
  );
}
