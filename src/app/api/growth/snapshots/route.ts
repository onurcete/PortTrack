import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getGrowthSeries, getPeriodReturns } from "@/lib/history";

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

    const [series, periodReturns, snapshots] = await Promise.all([
      getGrowthSeries(userId),
      getPeriodReturns(userId),
      prisma.portfolioMonthSnapshot.findMany({
        where: { userId },
        orderBy: { month: "desc" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      series,
      periodReturns,
      snapshots,
    });
  } catch (err: any) {
    console.error("❌ Growth Snapshots API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Büyüme verileri yüklenemedi." },
      { status: 500 }
    );
  }
}
