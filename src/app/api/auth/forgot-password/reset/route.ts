import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession, hashPassword } from "@/lib/auth";
import { getResetPasswordOtp, removeResetPasswordOtp } from "@/lib/otpStore";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = (await req.json().catch(() => ({}))) as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "E-posta, doğrulama kodu ve yeni şifre zorunludur." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Yeni şifre en az 6 karakter olmalıdır." },
        { status: 400 },
      );
    }

    // OTP kontrolü
    const storedOtp = getResetPasswordOtp(normalizedEmail);
    if (!storedOtp) {
      return NextResponse.json(
        {
          ok: false,
          error: "Doğrulama kodunun süresi dolmuş veya kod talep edilmemiş. Lütfen tekrar kod isteyin.",
        },
        { status: 400 },
      );
    }

    if (storedOtp.code !== cleanCode) {
      return NextResponse.json(
        { ok: false, error: "Girilen doğrulama kodu hatalı. Lütfen kontrol edip tekrar deneyin." },
        { status: 400 },
      );
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 },
      );
    }

    // Şifreyi güncelle
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // OTP'yi depodan temizle
    removeResetPasswordOtp(normalizedEmail);

    // Oturumu başlat
    const token = await createSession(user.id);

    // Sistem günlüğüne kaydet
    await logSystemEvent({
      userId: user.id,
      userEmail: user.email,
      action: "PASSWORD_RESET",
      status: "SUCCESS",
      details: `${user.name || user.email} şifresini başarıyla sıfırladı ve giriş yaptı.`,
      req,
    }).catch(() => null);

    const res = NextResponse.json({
      ok: true,
      message: "Şifreniz başarıyla güncellendi. Yönlendiriliyorsunuz...",
    });

    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 gün
    });

    return res;
  } catch (err: any) {
    console.error("❌ Password Reset Error:", err);
    return NextResponse.json(
      { ok: false, error: "Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
