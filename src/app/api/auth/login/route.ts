import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, sessionToken, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  if (!password || !(await verifyPassword(password))) {
    return NextResponse.json(
      { ok: false, error: "Şifre hatalı." },
      { status: 401 },
    );
  }
  const token = await sessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 gun
  });
  return res;
}
