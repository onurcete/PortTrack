import { NextRequest, NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUser();
  } catch (authErr) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  try {
    const tStart = performance.now();
    console.log("⏱️ [REFRESH API] Başlatıldı...");

    // Dolar kuru geçmişini arka planda asenkron çalıştır (bekletme yapma)
    backfillFxHistory().catch(() => null);

    const tPricesStart = performance.now();
    const result = await refreshPrices({ force: true });
    const tPricesEnd = performance.now();
    console.log(`⏱️ [REFRESH API] refreshPrices tamamlandı: ${(tPricesEnd - tPricesStart).toFixed(0)} ms`);

    console.log(`⏱️ [REFRESH API] TOPLAM SÜRE: ${(tPricesEnd - tStart).toFixed(0)} ms`);

    await logSystemEvent({
      userId,
      userEmail: user?.email || null,
      action: "PRICE_REFRESH_MANUAL",
      status: "SUCCESS",
      details: `${user?.name || user?.email || "Kullanıcı"} 'Fiyatları Güncelle' butonuna bastı (${result.updated} enstrüman güncellendi - ${(tPricesEnd - tStart).toFixed(0)} ms).`,
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
  }
}
