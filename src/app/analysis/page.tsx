import { AnalysisBriefingClient } from "@/components/AnalysisBriefingClient";
import { requireUser } from "@/lib/auth";
import { loadAnalysisBundle } from "@/lib/analysisData";
import { getProductPerformance } from "@/lib/history";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const userId = await requireUser();
  const [bundle, productPerformance] = await Promise.all([
    loadAnalysisBundle(userId),
    getProductPerformance(userId, 12),
  ]);

  return (
    <AnalysisBriefingClient
      holdings={bundle.holdings}
      tefasInvestors={bundle.tefasInvestors}
      tefasAnalysis={bundle.tefasAnalysis}
      bistAnalysis={bundle.bistAnalysis}
      foreignAnalysis={bundle.foreignAnalysis}
      lastTechnicalDate={bundle.lastTechnicalDate}
      productPerformance={productPerformance}
    />
  );
}
