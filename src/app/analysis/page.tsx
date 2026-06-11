import { prisma } from "@/lib/prisma";
import { AnalysisClient } from "@/components/AnalysisClient";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Tüm işlemleri çekip aktif (açık) pozisyonu olan sembolleri bul
  const transactions = await prisma.transaction.findMany({
    select: { symbol: true, quantity: true, side: true }
  });

  const quantities = new Map<string, number>();
  for (const tx of transactions) {
    const current = quantities.get(tx.symbol) || 0;
    if (tx.side === "BUY") {
      quantities.set(tx.symbol, current + tx.quantity);
    } else {
      quantities.set(tx.symbol, current - tx.quantity);
    }
  }

  const openSymbols = Array.from(quantities.entries())
    .filter(([_, qty]) => qty > 0.0001)
    .map(([symbol]) => symbol);

  // En son analiz sonuçlarını çek (sadece açık pozisyonu olanlar)
  const analyses = await prisma.technicalAnalysis.findMany({
    where: {
      symbol: {
        in: openSymbols,
        not: "__DAILY_SUMMARY__",
      },
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
