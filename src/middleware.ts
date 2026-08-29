import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getSessionUser } from "@/lib/auth";

const PUBLIC = [
  "/sitemap.xml",
  "/robots.txt",
  "/welcome",
  "/login",
  "/register",
  "/kullanim-kosullari",
  "/gizlilik-politikasi",
  "/showcase",
  "/api/showcase",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/demo",
  "/api/auth/google",
  "/api/auth/forgot-password",
  "/api/cron",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Statik dosyalar, kök sayfa (/) ve public yollar serbest
  if (
    pathname === "/" ||
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const rawCookie = req.cookies.get(AUTH_COOKIE)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "").trim()
    : null;
  const token = rawCookie || bearerToken;

  let userId: string | null = null;
  if (token) {
    userId = await getSessionUser(token);
  }

  if (userId) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", userId);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // API için 401
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  // Next.js RSC / prefetch isteklerinde arka plan ön yüklemesinin tüm ekranı yönlendirmesini engelle
  const isPrefetch =
    req.headers.get("next-router-prefetch") ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("x-middleware-prefetch");

  if (isPrefetch) {
    return new NextResponse(null, { status: 401 });
  }

  // Normal sayfa istekleri için /login yönlendirmesi
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|showcase|.*\\.(?:png|jpg|jpeg|gif|svg|ico)).*)",
  ],
};
