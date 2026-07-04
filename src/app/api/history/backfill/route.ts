import { NextRequest, NextResponse } from "next/server";
import { backfillYahoo, backfillTefas } from "@/lib/history";
import { backfillFxHistory } from "@/lib/refresh";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (authErr) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
  }

  const phase = req.nextUrl.searchParams.get("phase") ?? "yahoo";
  try {
    if (phase === "tefas") {
      const progress = await backfillTefas(45000);
      return NextResponse.json({ ok: true, phase, ...progress });
    }
    // phase === "yahoo": kur + yahoo gecmisi
    await backfillFxHistory();
    const yahoo = await backfillYahoo();
    return NextResponse.json({ ok: true, phase: "yahoo", yahoo });
  } catch (err) {
    return NextResponse.json(
      { ok: false, phase, error: (err as Error).message },
      { status: 500 },
    );
  }
}
