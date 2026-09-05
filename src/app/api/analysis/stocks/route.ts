import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { loadAnalysisBundle } from "@/lib/analysisData";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get(AUTH_COOKIE)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : null;
    const token = rawCookie || bearerToken;

    let userId: string | null = req.headers.get("x-user-id");
    if (!userId && token) {
      userId = await getSessionUser(token);
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    const bundle = await loadAnalysisBundle(userId);

    return NextResponse.json({
      ok: true,
      bistAnalysis: bundle.bistAnalysis,
      foreignAnalysis: bundle.foreignAnalysis,
    });
  } catch (err: any) {
    console.error("Stock analysis API error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Hisse analiz verisi alınamadı." },
      { status: 500 }
    );
  }
}
