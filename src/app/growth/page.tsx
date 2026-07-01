import { getGrowthSeries, getPeriodReturns } from "@/lib/history";
import { GrowthClient } from "@/components/GrowthClient";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  const userId = await requireUser();
  const series = await getGrowthSeries(userId);
  const periodReturns = await getPeriodReturns(userId);
  return <GrowthClient series={series} periodReturns={periodReturns} />;
}
