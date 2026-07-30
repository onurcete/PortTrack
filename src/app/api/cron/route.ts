import { NextRequest, NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";
import { backfillYahoo, backfillTefas } from "@/lib/history";
import { runTechnicalAnalysis } from "@/app/api/analysis/run/route";
import { runDailyDigest } from "@/app/api/cron/daily-digest/route";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  // 1. Vercel Cron otomatik tetikleme kontrolü
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");
  if (isVercelCron) return true;

  // 2. Secret / Bearer / Parametre kontrolü
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production" || req.nextUrl.searchParams.get("test") === "1";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret || req.nextUrl.searchParams.get("test") === "1";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }
  try {
    await backfillFxHistory();
    const refresh = await refreshPrices();
    const yahoo = await backfillYahoo();
    // Teknik analiz hesapla (fiyatlar güncellendikten sonra)
    const analysis = await runTechnicalAnalysis();

    // Otomatik E-Posta Özetlerini Gönder (Zaman aşımına takılmamak için öncelikli çalıştırılır)
    let digest = null;
    try {
      digest = await runDailyDigest(req);
    } catch (digestErr: any) {
      console.error("❌ Cron günlük bülten e-posta hatası:", digestErr);
    }

    await logSystemEvent({
      action: "CRON_PRICE_REFRESH",
      status: "SUCCESS",
      details: `Vercel Cron otomatik fiyat güncellemesi tamamlandı (${refresh.updated} enstrüman güncellendi). Bülten gönderimi: ${digest?.sentCount ?? 0}/${digest?.totalTargets ?? 0}`,
      req,
    });

    // Bekleyen TEFAS geçmiş ayları (Zaman aşımı ihtimali yüksek olduğu için en sona alındı)
    const tefas = await backfillTefas(15000);

    return NextResponse.json({ ok: true, refresh, yahoo, tefas, analysis, digest });
  } catch (err: any) {
    await logSystemEvent({
      action: "CRON_PRICE_REFRESH",
      status: "FAILED",
      details: err?.message || "Cron fiyat güncelleme hatası",
      req,
    });

    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const POST = GET;
