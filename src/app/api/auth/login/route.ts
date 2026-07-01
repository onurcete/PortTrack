import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Lütfen e-posta ve şifre girin." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim().toLowerCase() } },
  });

  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { ok: false, error: "E-posta veya şifre hatalı." },
      { status: 401 },
    );
  }

  const token = await createSession(user.id);
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
