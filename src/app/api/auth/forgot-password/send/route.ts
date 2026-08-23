import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, setResetPasswordOtp } from "@/lib/otpStore";
import { sendEmail, generatePasswordResetEmailHtml } from "@/lib/sendEmail";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json().catch(() => ({}))) as {
      email?: string;
    };

    if (!email || !email.trim()) {
      return NextResponse.json(
        { ok: false, error: "Lütfen e-posta adresinizi girin." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { ok: false, error: "Geçerli bir e-posta adresi giriniz." },
        { status: 400 },
      );
    }

    // Kullanıcıyı veritabanında ara
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        googleId: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bu e-posta adresine kayıtlı bir PortTrack hesabı bulunamadı.",
        },
        { status: 404 },
      );
    }

    const code = generateOtpCode();
    const hasGoogle = !!user.googleId;
    const hasPassword = !!user.password;
    const userName = user.name || "Yatırımcı";

    // 10 dakika geçerli OTP kaydet
    setResetPasswordOtp(normalizedEmail, code);

    // E-posta gönder
    const emailHtml = generatePasswordResetEmailHtml(userName, code, hasGoogle);
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `PortTrack Şifre Sıfırlama Kodunuz: ${code}`,
      html: emailHtml,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `E-posta gönderilemedi: ${emailResult.error}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      email: normalizedEmail,
      hasGoogle,
      hasPassword,
      message: "Doğrulama kodu e-posta adresinize gönderildi.",
    });
  } catch (err: any) {
    console.error("❌ Forgot Password Send Error:", err);
    return NextResponse.json(
      { ok: false, error: "Şifre sıfırlama kodu gönderilirken bir hata oluştu." },
      { status: 500 },
    );
  }
}
