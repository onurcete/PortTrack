"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { CookieBanner } from "@/components/CookieBanner";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setIsAuth(Boolean(data.user)))
      .catch(() => setIsAuth(false));
  }, [pathname]);

  // Public/Karşılama sayfalarında veya giriş yapılmamış ana sayfada App Topbar'ı gösterme
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/welcome" ||
    (pathname === "/" && isAuth === false);

  if (isPublicPage) {
    return (
      <>
        {children}
        <CookieBanner />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <Topbar />
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-5 py-7 md:px-10 md:py-9">
        {children}
      </main>
      <CookieBanner />
    </div>
  );
}
