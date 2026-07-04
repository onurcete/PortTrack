import { NextRequest, NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";
import { backfillYahoo, backfillTefas } from "@/lib/history";
import { runTechnicalAnalysis } from "@/app/api/analysis/run/route";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Yerel geliştirme ortamında secret olmasa da serbest, production'da zorunlu
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }
  try {
    await backfillFxHistory();
    const refresh = await refreshPrices();
    const yahoo = await backfillYahoo();
    // Bekleyen TEFAS gecmis aylari varsa bir parca isle
    const tefas = await backfillTefas(30000);
    // Teknik analiz hesapla (fiyatlar güncellendikten sonra)
    const analysis = await runTechnicalAnalysis();
    return NextResponse.json({ ok: true, refresh, yahoo, tefas, analysis });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

