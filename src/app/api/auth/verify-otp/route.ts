import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession } from "@/lib/auth";
import { getPendingUser, removePendingUser } from "@/lib/otpStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, code } = (await req.json().catch(() => ({}))) as {
    email?: string;
    code?: string;
  };

  if (!email || !code) {
    return NextResponse.json(
      { ok: false, error: "E-posta ve 6 haneli doğrulama kodu zorunludur." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const pending = getPendingUser(normalizedEmail);

  if (!pending) {
    return NextResponse.json(
      { ok: false, error: "Doğrulama kodunun süresi dolmuş veya istek bulunamadı. Lütfen tekrar kod isteyin." },
      { status: 400 },
    );
  }

  if (pending.code !== code.trim()) {
    return NextResponse.json(
      { ok: false, error: "Girdiğiniz 6 haneli doğrulama kodu hatalı. Lütfen kontrol edip tekrar deneyin." },
      { status: 400 },
    );
  }

  try {
    // 1. Veritabanında Kullanıcı Oluştur
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.passwordHash,
      },
    });

    // 2. Geçici veriyi sil
    removePendingUser(normalizedEmail);

    // 3. Oturum Çerezi Oluştur ve Giriş Yaptır
    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 gün
    });

    return res;
  } catch (err: any) {
    console.error("❌ Verify OTP Error:", err);
    return NextResponse.json(
      { ok: false, error: "Hesap oluşturulurken veritabanı hatası oluştu." },
      { status: 500 },
    );
  }
}
