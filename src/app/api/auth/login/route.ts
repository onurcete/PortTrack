import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession, verifyPassword } from "@/lib/auth";
import { logSystemEvent } from "@/lib/logger";

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

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail } },
    });

    if (!user || !user.password || !(await verifyPassword(password, user.password))) {
      await logSystemEvent({
        userEmail: cleanEmail,
        action: "LOGIN_FAILED",
        status: "FAILED",
        details: "Hatalı e-posta veya şifre girildi.",
        req,
      });

      return NextResponse.json(
        { ok: false, error: "E-posta veya şifre hatalı." },
        { status: 401 },
      );
    }

    // Giriş Başarılı Logu
    await logSystemEvent({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN",
      status: "SUCCESS",
      details: `${user.name || user.email} sisteme giriş yaptı.`,
      req,
    });

    const token = await createSession(user.id);
    const res = NextResponse.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
        theme: user.theme || "dark",
        defaultCurrency: user.defaultCurrency || "TRY",
        dailyDigestEnabled: user.dailyDigestEnabled || false,
      },
    });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 gun
    });
    return res;
  } catch (err: any) {
    console.error("❌ Login API Error:", err);
    if (err?.message?.includes("exceeded the data transfer quota")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Veritabanı (Neon PostgreSQL) veri transfer kotasına ulaştı. Lütfen Neon konsolundan (neon.tech) kotaları kontrol edin.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Sunucu/Veritabanı bağlantı hatası oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
