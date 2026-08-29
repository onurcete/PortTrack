import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, AUTH_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

async function getUserId(req: NextRequest): Promise<string | null> {
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
  return userId;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      ok: true,
      transactions,
    });
  } catch (err: any) {
    console.error("❌ Transactions API GET Error:", err);
    return NextResponse.json(
      { ok: false, error: "İşlemler yüklenemedi." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.symbol || !body.side || !body.quantity || !body.unitPrice) {
      return NextResponse.json(
        { ok: false, error: "Lütfen gerekli tüm alanları doldurun." },
        { status: 400 }
      );
    }

    const tx = await prisma.transaction.create({
      data: {
        userId,
        date: body.date ? new Date(body.date) : new Date(),
        assetType: body.assetType || "BIST",
        symbol: body.symbol.toUpperCase().trim(),
        side: body.side,
        unitPrice: Number(body.unitPrice),
        quantity: Number(body.quantity),
        total: Number(body.total) || Number(body.unitPrice) * Number(body.quantity),
        currency: body.currency || "TRY",
        note: body.note?.trim() || null,
      },
    });

    return NextResponse.json({
      ok: true,
      transaction: tx,
    });
  } catch (err: any) {
    console.error("❌ Transactions API POST Error:", err);
    return NextResponse.json(
      { ok: false, error: "İşlem kaydedilemedi." },
      { status: 500 }
    );
  }
}
