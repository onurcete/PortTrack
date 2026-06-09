import { getGrowthSeries, getPeriodReturns } from "@/lib/history";
import { GrowthClient } from "@/components/GrowthClient";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  const series = await getGrowthSeries();
  const periodReturns = await getPeriodReturns();
  return <GrowthClient series={series} periodReturns={periodReturns} />;
}
