import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isBackfillActive } from "@/lib/backfillState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUser();
    const active = isBackfillActive(userId);
    return NextResponse.json({ ok: true, active });
  } catch {
    return NextResponse.json({ ok: false, active: false }, { status: 401 });
  }
}
