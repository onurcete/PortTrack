import { NextResponse } from "next/server";
import { refreshPrices, backfillFxHistory } from "@/lib/refresh";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  try {
    await backfillFxHistory();
    const result = await refreshPrices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
