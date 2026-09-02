import { NextRequest, NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";
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
    // 1. Kur geçmişini arka planda asenkron çalıştır (bekletme yapma)
    backfillFxHistory().catch(() => null);

    // 2. Fiyatları ve Kurları Hızlıca Güncelle (~2-3 saniye)
    const refresh = await refreshPrices();

    // 3. E-Posta Bülteni ve Teknik Analiz: Yalnızca sabah Vercel Cron tetiklediğinde veya parametre ile istendiğinde çalıştır
    const now = new Date();
    const trHour = (now.getUTCHours() + 3) % 24;
    const isVercelCron =
      req.headers.get("x-vercel-cron") === "1" ||
      req.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");
    const forceDigest = req.nextUrl.searchParams.get("digest") === "true";
    const forceAnalysis = req.nextUrl.searchParams.get("analysis") === "true";
    const shouldSendDigest = forceDigest || (isVercelCron && trHour >= 8 && trHour <= 10);
    const shouldRunAnalysis = forceAnalysis || shouldSendDigest;

    // Ağır teknik analiz sadece bültende veya açıkça istendiğinde çalışır (30 dk'lık cronları yavaşlatmaz)
    let analysis: any = null;
    if (shouldRunAnalysis) {
      analysis = await runTechnicalAnalysis();
    }

    let digest: any = null;
    if (shouldSendDigest) {
      digest = await runDailyDigest(req);
    }

    await logSystemEvent({
      action: "CRON_PRICE_REFRESH",
      status: "SUCCESS",
      details: `Otomatik fiyat güncellemesi tamamlandı (${refresh.updated} enstrüman güncellendi). Bülten gönderimi: ${digest ? `${digest.sentCount ?? 0}/${digest.totalTargets ?? 0} mail iletildi.` : 'Atlandı (yalnızca sabah bülteninde gönderilir).' }`,
      req,
    });

    return NextResponse.json({ ok: true, refresh, analysis, digest });
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
