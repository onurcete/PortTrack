import { NextRequest, NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logSystemEvent } from "@/lib/logger";

import { setBackfillActive, setBackfillDone } from "@/lib/backfillState";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUser();
  } catch (authErr) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  setBackfillActive(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  try {
    await backfillFxHistory();
    const result = await refreshPrices();

    await logSystemEvent({
      userId,
      userEmail: user?.email || null,
      action: "PRICE_REFRESH_MANUAL",
      status: "SUCCESS",
      details: `${user?.name || user?.email || "Kullanıcı"} 'Fiyatları Güncelle' butonuna bastı (${result.updated} enstrüman güncellendi).`,
      req,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    await logSystemEvent({
      userId,
      userEmail: user?.email || null,
      action: "PRICE_REFRESH_MANUAL",
      status: "FAILED",
      details: err?.message || "Fiyat güncelleme hatası",
      req,
    });

    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  } finally {
    setBackfillDone(userId);
  }
}
