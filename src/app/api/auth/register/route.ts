import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, email, password } = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "E-posta ve şifre zorunludur." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Şifre en az 6 karakter olmalıdır." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already exists
  const existingUser = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return NextResponse.json(
      { ok: false, error: "Bu e-posta adresi zaten kullanımda." },
      { status: 400 },
    );
  }

  try {
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: name?.trim() || null,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

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
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Kayıt işlemi sırasında bir hata oluştu." },
      { status: 500 },
    );
  }
}
