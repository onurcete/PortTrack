import { redirect } from "next/navigation";
import { getSessionUserIdOptional } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AdminClient,
  type AdminUserDTO,
  type DbStatsDTO,
  type DbTableDTO,
} from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    redirect("/");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email !== "admin@porttrack.com") {
    redirect("/");
  }

  // Fetch db stats, users, and all base tables in parallel
  const [
    userCount,
    txCount,
    noteCount,
    priceSnapCount,
    fxRateCount,
    techAnalysisCount,
    usersList,
    tablesList,
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
    prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `,
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
    name: u.name ?? "",
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    transactionCount: u._count.transactions,
    instrumentCount: u._count.instruments,
  }));

  // Fetch details (row count, size, columns) for each table
  const dbTables: DbTableDTO[] = [];
  for (const t of tablesList) {
    const tableName = t.table_name;

    // Row count
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: string }>>(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    );
    const rowCount = Number(countResult[0]?.count ?? "0");

    // Sizes
    const sizeResult = await prisma.$queryRawUnsafe<Array<{ total_size: string; table_size: string; index_size: string }>>(
      `SELECT 
         pg_total_relation_size('"' || $1 || '"')::text as total_size,
         pg_relation_size('"' || $1 || '"')::text as table_size,
         pg_indexes_size('"' || $1 || '"')::text as index_size`,
      tableName
    );
    const totalSize = Number(sizeResult[0]?.total_size ?? "0");
    const tableSize = Number(sizeResult[0]?.table_size ?? "0");
    const indexSize = Number(sizeResult[0]?.index_size ?? "0");

    // Columns
    const columnsSchema = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string; is_nullable: string }>>(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 
       ORDER BY ordinal_position`,
      tableName
    );

    dbTables.push({
      name: tableName,
      rowCount,
      totalSize,
      tableSize,
      indexSize,
      columns: columnsSchema.map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
      })),
    });
  }

  return <AdminClient initialUsers={users} dbStats={dbStats} dbTables={dbTables} />;
}
