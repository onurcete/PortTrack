import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, createSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const state = req.nextUrl.searchParams.get("state");
  const origin = req.nextUrl.origin;

  if (error || !code) {
    if (state === "mobile") {
      return NextResponse.redirect(`porttrack://auth-callback?error=google_cancelled`);
    }
    return NextResponse.redirect(`${origin}/login?error=google_cancelled`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    if (state === "mobile") {
      return NextResponse.redirect(`porttrack://auth-callback?error=google_config_missing`);
    }
    return NextResponse.redirect(`${origin}/login?error=google_config_missing`);
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 1. Exchange code for Google Access Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      if (state === "mobile") {
        return NextResponse.redirect(`porttrack://auth-callback?error=google_token_failed`);
      }
      return NextResponse.redirect(`${origin}/login?error=google_token_failed`);
    }

    // 2. Fetch User Info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();

    if (!userRes.ok || !googleUser.email) {
      console.error("Google userinfo failed:", googleUser);
      if (state === "mobile") {
        return NextResponse.redirect(`porttrack://auth-callback?error=google_user_failed`);
      }
      return NextResponse.redirect(`${origin}/login?error=google_user_failed`);
    }

    const email = googleUser.email.trim().toLowerCase();
    const googleId = googleUser.id;
    const name = googleUser.name || googleUser.given_name || email.split("@")[0];

    // 3. Find or Create User in Database
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { googleId }],
      },
    });

    let isNewUser = false;
    if (user) {
      // Update googleId or name if missing
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, name: user.name || name },
        });
      }
    } else {
      // Create new user registered via Google
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          role: "USER",
        },
      });
      isNewUser = true;
    }

    // 4. Create Session and Set Cookie
    const token = await createSession(user.id);

    // Mobil Yönlendirmesi (Deep Link)
    if (state === "mobile") {
      return NextResponse.redirect(`porttrack://auth-callback?token=${encodeURIComponent(token)}`);
    }

    const redirectUrl = isNewUser ? `${origin}/?registered=true` : `${origin}/`;
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 24 * 60 * 60, // 60 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google Auth Callback Error:", err);
    if (state === "mobile") {
      return NextResponse.redirect(`porttrack://auth-callback?error=google_auth_error`);
    }
    return NextResponse.redirect(`${origin}/login?error=google_auth_error`);
  }
}
