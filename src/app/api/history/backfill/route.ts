import { NextRequest, NextResponse } from "next/server";
import { smartBackfillUserSymbols, backfillYahoo, backfillTefas } from "@/lib/history";
import { backfillFxHistory } from "@/lib/refresh";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "smart";

  try {
    if (mode === "smart") {
      // Ultra-hızlı akıllı geçmiş doldurma (sadece eksik semboller için, ~1.5 sn)
      const res = await smartBackfillUserSymbols(userId);
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
  }
}
