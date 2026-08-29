import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";

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

    // Kullanıcının işlemlerindeki hisseleri al
    const userTxs = await prisma.transaction.findMany({
      where: { userId },
      select: { symbol: true },
      distinct: ["symbol"],
    });

    const symbols = userTxs.map((t) => t.symbol);

    const signals = await prisma.technicalAnalysis.findMany({
      where: symbols.length > 0 ? { symbol: { in: symbols } } : {},
      orderBy: { date: "desc" },
      take: 20,
    });

    return NextResponse.json({
      ok: true,
      signals: signals.map((s) => ({
        symbol: s.symbol,
        assetType: s.assetType,
        score: s.score,
        trendSignal: s.trendSignal,
        macdSignal: s.macdSignal,
        rsiZone: s.rsiZone,
        commentary: s.commentary,
        alerts: s.alerts as string[],
      })),
    });
  } catch (err: any) {
    console.error("❌ Signals API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Teknik sinyaller yüklenemedi." },
      { status: 500 }
    );
  }
}
