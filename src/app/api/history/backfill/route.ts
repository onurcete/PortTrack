import { NextRequest, NextResponse } from "next/server";
import { smartBackfillUserSymbols, backfillYahoo, backfillTefas } from "@/lib/history";
import { backfillFxHistory, refreshPrices } from "@/lib/refresh";
import { requireUser } from "@/lib/auth";

import { setBackfillActive, setBackfillDone } from "@/lib/backfillState";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  setBackfillActive(userId);
  const mode = req.nextUrl.searchParams.get("mode") ?? "smart";

  try {
    if (mode === "smart") {
      // Anlık fiyatları ve geçmiş verileri arka planda eşzamanlı yenile
      const [res] = await Promise.all([
        smartBackfillUserSymbols(userId),
        refreshPrices({ userId, force: true }).catch((err) => console.error("Auto refreshPrices in backfill error:", err)),
      ]);

      return NextResponse.json({
        ok: true,
        mode: "smart",
        message: res.processedSymbols > 0
          ? `${res.processedSymbols} sembolün eksik geçmiş verileri güncellendi (${res.snapshotsAdded} fiyat noktası eklendi).`
          : "Tüm sembollerin geçmiş verileri zaten güncel!",
        ...res,
      });
    }

    // Tam geçmiş yenileme
    await backfillFxHistory();
    const yahoo = await backfillYahoo();
    const tefas = await backfillTefas(45000);

    return NextResponse.json({ ok: true, mode: "full", yahoo, tefas });
  } catch (err: any) {
    console.error("❌ History backfill error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Geçmiş güncellenirken hata oluştu." },
      { status: 500 },
    );
  } finally {
    setBackfillDone(userId);
  }
}
