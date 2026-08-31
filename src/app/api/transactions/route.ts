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

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ ok: false, error: "İşlem ID belirtilmedi." }, { status: 400 });
    }

    const tx = await prisma.transaction.update({
      where: { id: body.id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        assetType: body.assetType,
        symbol: body.symbol ? body.symbol.toUpperCase().trim() : undefined,
        side: body.side,
        unitPrice: body.unitPrice != null ? Number(body.unitPrice) : undefined,
        quantity: body.quantity != null ? Number(body.quantity) : undefined,
        total:
          body.total != null
            ? Number(body.total)
            : body.unitPrice != null && body.quantity != null
            ? Number(body.unitPrice) * Number(body.quantity)
            : undefined,
        currency: body.currency,
        note: body.note !== undefined ? (body.note?.trim() || null) : undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      transaction: tx,
    });
  } catch (err: any) {
    console.error("❌ Transactions API PUT Error:", err);
    return NextResponse.json(
      { ok: false, error: "İşlem güncellenemedi." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "İşlem ID belirtilmedi." }, { status: 400 });
    }

    await prisma.transaction.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Transactions API DELETE Error:", err);
    return NextResponse.json(
      { ok: false, error: "İşlem silinemedi." },
      { status: 500 }
    );
  }
}
