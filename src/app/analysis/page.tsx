import { AnalysisBriefingClient } from "@/components/AnalysisBriefingClient";
import { requireUser } from "@/lib/auth";
import { loadAnalysisBundle } from "@/lib/analysisData";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const userId = await requireUser();
  const bundle = await loadAnalysisBundle(userId);

  return (
    <AnalysisBriefingClient
      pulse={bundle.pulse}
      holdings={bundle.holdings}
      tefasInvestors={bundle.tefasInvestors}
      lastTechnicalDate={bundle.lastTechnicalDate}
    />
  );
}
