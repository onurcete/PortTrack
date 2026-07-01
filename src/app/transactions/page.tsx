import { prisma } from "@/lib/prisma";
import {
  TransactionsClient,
  type TxDTO,
} from "@/components/TransactionsClient";
import type { AssetType } from "@/lib/assets";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const userId = await requireUser();
  const rows = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const transactions: TxDTO[] = rows.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    assetType: t.assetType as AssetType,
    symbol: t.symbol,
    side: t.side as "BUY" | "SELL",
    unitPrice: t.unitPrice,
    quantity: t.quantity,
    total: t.total,
    currency: t.currency as "TRY" | "USD",
    note: t.note,
  }));

  return <TransactionsClient transactions={transactions} />;
}
