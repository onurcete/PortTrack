import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, requireUser } from "@/lib/auth";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUser();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isDemo: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    // Demo hesabı silinmeye karşı koru
    const cleanEmail = user.email.toLowerCase().trim();
    if (user.isDemo || cleanEmail === "demo@porttrack.app" || cleanEmail === "demo@porttrack.com") {
      return NextResponse.json(
        { ok: false, error: "Demo hesabı silinemez." },
        { status: 403 }
      );
    }

    // Kullanıcıyı sil (onDelete: Cascade ile ilişkili tüm veriler otomatik silinir)
    await prisma.user.delete({
      where: { id: user.id },
    });

    await logSystemEvent({
      userId: user.id,
      userEmail: user.email,
      action: "ACCOUNT_DELETED",
      status: "SUCCESS",
      details: `${user.name || user.email} hesabını ve tüm portföy verilerini kalıcı olarak sildi.`,
      req,
    });

    // Oturum çerezini temizle
    const res = NextResponse.json({
      ok: true,
      message: "Hesabınız ve tüm ilişkili verileriniz kalıcı olarak silindi.",
    });

    res.cookies.set(AUTH_COOKIE, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res;
  } catch (err: any) {
    console.error("Account deletion error:", err);
    if (err?.message === "Unauthorized") {
      return NextResponse.json(
        { ok: false, error: "Oturum açmanız gerekiyor." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Hesap silinirken bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
