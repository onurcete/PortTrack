import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, sessionToken } from "@/lib/auth";

const PUBLIC = ["/login", "/api/auth/login", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Statik dosyalar ve public yollar serbest
  if (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = await sessionToken();

  if (cookie === expected) return NextResponse.next();

  // API icin 401, sayfalar icin /login yonlendirme
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
