import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import {
  computeFundInvestorStats,
  buildTefasInvestorSummary,
  type TefasInvestorSummary,
} from "@/lib/tefasInvestors";

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

    const portfolio = await getPortfolio(userId);
    const openPositions = portfolio.positions.filter((p) => p.quantity > 1e-6);

    const tefasSymbols = openPositions
      .filter((p) => p.assetType === "TEFAS" || p.assetType === "BES_FUND")
      .map((p) => p.symbol);

    if (tefasSymbols.length === 0) {
      return NextResponse.json({
        ok: true,
        tefasInvestors: null,
        totalFunds: 0,
      });
    }

    const tefasSnaps = await prisma.priceSnapshot.findMany({
      where: { symbol: { in: tefasSymbols } },
      orderBy: { date: "asc" },
      select: { symbol: true, date: true, investors: true },
    });

    const snapsBySymbol = new Map<string, { date: Date; investors: number | null }[]>();
    for (const s of tefasSnaps) {
      const list = snapsBySymbol.get(s.symbol) ?? [];
      list.push({ date: s.date, investors: s.investors });
      snapsBySymbol.set(s.symbol, list);
    }

    const fundStats = tefasSymbols.map((symbol) =>
      computeFundInvestorStats(symbol, snapsBySymbol.get(symbol) ?? [])
    );

    const tefasInvestors: TefasInvestorSummary | null =
      fundStats.length > 0 ? buildTefasInvestorSummary(fundStats) : null;

    return NextResponse.json({
      ok: true,
      tefasInvestors,
      totalFunds: tefasSymbols.length,
    });
  } catch (err: any) {
    console.error("❌ Fund Analysis API Error:", err);
    return NextResponse.json(
      { ok: false, error: "Fon analiz verileri yüklenemedi." },
      { status: 500 }
    );
  }
}
