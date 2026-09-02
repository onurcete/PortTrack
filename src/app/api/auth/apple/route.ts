import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession } from "@/lib/auth";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";

interface AppleAuthBody {
  identityToken?: string;
  user?: string; // Apple unique identifier
  email?: string | null;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AppleAuthBody;
    const { identityToken, user: rawAppleId, email: rawEmail, fullName } = body;

    let appleId = rawAppleId?.trim();
    let email = rawEmail?.toLowerCase().trim() || null;

    // identityToken varsa içindeki JWT claims'den appleId (sub) ve email al
    if (identityToken && typeof identityToken === "string") {
      try {
        const parts = identityToken.split(".");
        if (parts.length >= 2) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
          const claims = JSON.parse(payloadJson);
          if (claims.sub) {
            appleId = claims.sub;
          }
          if (claims.email && !email) {
            email = String(claims.email).toLowerCase().trim();
          }
        }
      } catch (e) {
        console.warn("Apple identityToken parse warning:", e);
      }
    }

    if (!appleId) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz Apple kimlik bilgisi (appleId bulunamadı)." },
        { status: 400 }
      );
    }

    // İsim oluştur
    let displayName = "Apple Kullanıcısı";
    if (fullName) {
      if (typeof fullName === "string" && fullName.trim()) {
        displayName = fullName.trim();
      } else if (typeof fullName === "object") {
        const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
        if (parts.length > 0) {
          displayName = parts.join(" ");
        }
      }
    }

    // 1. AppleId ile ara
    let user = await prisma.user.findFirst({
      where: { appleId },
    });

    // 2. Bulunamadıysa ve e-posta varsa, e-posta ile ara
    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email },
      });
      if (user) {
        // Mevcut kullanıcıyı appleId ile eşleştir
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appleId },
        });
      }
    }

    // 3. Kullanıcı hiç yoksa yeni kayıt oluştur
    if (!user) {
      const fallbackEmail = email || `${appleId}@privaterelay.appleid.com`;
      user = await prisma.user.create({
        data: {
          email: fallbackEmail,
          appleId,
          name: displayName,
          role: "USER",
        },
      });

      await logSystemEvent({
        userId: user.id,
        userEmail: user.email,
        action: "REGISTER_APPLE",
        status: "SUCCESS",
        details: `${user.name || user.email} Apple ile ilk kez kayıt oldu.`,
        req,
      });
    }

    // Oturum oluştur
    const token = await createSession(user.id);

    await logSystemEvent({
      userId: user.id,
      userEmail: user.email,
      action: "LOGIN_APPLE",
      status: "SUCCESS",
      details: `${user.name || user.email} Apple ile giriş yaptı.`,
      req,
    });

    const res = NextResponse.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isDemo: user.isDemo,
      },
    });

    // Web tarayıcıları için çerezi ayarla
    res.cookies.set(AUTH_COOKIE, token, {
      path: "/",
      maxAge: 60 * 24 * 60 * 60, // 60 gün
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res;
  } catch (err: any) {
    console.error("Apple auth error:", err);
    return NextResponse.json(
      { ok: false, error: "Apple ile giriş yapılırken bir sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
