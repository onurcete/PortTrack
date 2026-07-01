import { getProductPerformance } from "@/lib/history";
import { PerformanceClient } from "@/components/PerformanceClient";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const userId = await requireUser();
  const data = await getProductPerformance(userId, 12);
  return <PerformanceClient data={data} />;
}
