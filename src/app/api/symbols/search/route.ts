import { NextRequest, NextResponse } from "next/server";
import { searchSymbols } from "@/app/transactions/actions";
import { type AssetType } from "@/lib/assets";
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

    const query = req.nextUrl.searchParams.get("query")?.trim() || "";
    const assetType = (req.nextUrl.searchParams.get("assetType") || "BIST") as AssetType;

    if (!query) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const results = await searchSymbols(query, assetType);
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error("❌ Search symbols API error:", err);
    return NextResponse.json({ ok: false, error: "Arama başarısız." }, { status: 500 });
  }
}
