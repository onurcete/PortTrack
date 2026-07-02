import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminClient, type AdminUserDTO, type DbStatsDTO } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.email !== "admin@porttrack.com") {
    redirect("/");
  }

  // Fetch db stats and users in parallel
  const [
    userCount,
    txCount,
    noteCount,
    priceSnapCount,
    fxRateCount,
    techAnalysisCount,
    usersList
  ] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.count(),
    prisma.note.count(),
    prisma.priceSnapshot.count(),
    prisma.fxRate.count(),
    prisma.technicalAnalysis.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            instruments: true,
          },
        },
      },
    }),
  ]);

  const dbStats: DbStatsDTO = {
    users: userCount,
    transactions: txCount,
    notes: noteCount,
    priceSnapshots: priceSnapCount,
    fxRates: fxRateCount,
    technicalAnalyses: techAnalysisCount,
  };

  const users: AdminUserDTO[] = usersList.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    transactionCount: u._count.transactions,
    instrumentCount: u._count.instruments,
  }));

  return <AdminClient initialUsers={users} dbStats={dbStats} />;
}
