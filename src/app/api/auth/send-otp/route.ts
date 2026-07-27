import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { generateOtpCode, setPendingUser } from "@/lib/otpStore";
import { sendEmail, generateOtpEmailHtml } from "@/lib/sendEmail";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

  const normalizedEmail = email.trim().toLowerCase();

  // 1. Strict Email Format Validation
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json(
      { ok: false, error: "Lütfen geçerli bir e-posta adresi girin (Örn: ad@domain.com)." },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Şifre en az 6 karakter olmalıdır." },
      { status: 400 },
    );
  }

  // 2. Check if email already exists in DB
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
    const code = generateOtpCode();
    const passwordHash = await hashPassword(password);
    const userName = name?.trim() || "Yatırımcı";

    // Depoya kaydet
    setPendingUser(normalizedEmail, {
      name: userName,
      email: normalizedEmail,
      passwordHash,
      code,
    });

    // Resend ile Canlı E-posta Gönder
    const emailHtml = generateOtpEmailHtml(userName, code);
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `PortTrack Doğrulama Kodunuz: ${code}`,
      html: emailHtml,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        { ok: false, error: `E-posta gönderilemedi: ${emailResult.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, email: normalizedEmail });
  } catch (err: any) {
    console.error("❌ Send OTP Error:", err);
    return NextResponse.json(
      { ok: false, error: "Doğrulama kodu oluşturulurken bir hata oluştu." },
      { status: 500 },
    );
  }
}
