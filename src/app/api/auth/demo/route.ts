import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession } from "@/lib/auth";

export const runtime = "nodejs";

const DEMO_EMAIL = "demo@porttrack.app";

export async function GET(req: NextRequest) {
  try {
    // Önce email ile bul (isDemo filtresi olmadan), sorun teşhisi için
    const demoUser = await prisma.user.findFirst({
      where: { email: DEMO_EMAIL },
      select: { id: true, email: true, name: true, isDemo: true },
    });

    if (!demoUser) {
      console.error("❌ Demo user bulunamadı:", DEMO_EMAIL);
      return NextResponse.redirect(
        new URL("/login?error=demo_not_found", req.url)
      );
    }

    if (!demoUser.isDemo) {
      console.error("❌ Demo user isDemo=false:", demoUser.id);
      // isDemo flag'i eksikse güncelle ve devam et
      await prisma.user.update({
        where: { id: demoUser.id },
        data: { isDemo: true },
      });
    }

    const token = await createSession(demoUser.id);

    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 saat
    });

    console.log("✅ Demo girişi başarılı:", demoUser.email);
    return res;
  } catch (err: any) {
    console.error("❌ Demo Login Error:", err?.message ?? err);
    return NextResponse.redirect(
      new URL(`/login?error=demo_failed&msg=${encodeURIComponent(err?.message ?? "unknown")}`, req.url)
    );
  }
}
