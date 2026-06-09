import { getProductPerformance } from "@/lib/history";
import { PerformanceClient } from "@/components/PerformanceClient";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const data = await getProductPerformance(12);
  return <PerformanceClient data={data} />;
}
