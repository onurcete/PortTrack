import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession } from "@/lib/auth";

export const runtime = "nodejs";

const DEMO_EMAIL = "demo@porttrack.app";

export async function GET(req: NextRequest) {
  try {
    const demoUser = await prisma.user.findFirst({
      where: { email: DEMO_EMAIL, isDemo: true },
      select: { id: true, email: true, name: true },
    });

    if (!demoUser) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Demo hesabı henüz oluşturulmamış. Lütfen yönetici ile iletişime geçin.",
        },
        { status: 404 }
      );
    }

    const token = await createSession(demoUser.id);

    // Demo session için 2 saatlik kısa ömür yeterli
    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 saat
    });

    return res;
  } catch (err: any) {
    console.error("❌ Demo Login Error:", err);
    return NextResponse.redirect(
      new URL("/login?error=demo_failed", req.url)
    );
  }
}
