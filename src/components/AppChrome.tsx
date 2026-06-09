"use client";

import { usePathname } from "next/navigation";
import { Topbar } from "@/components/Topbar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Giris ekraninda chrome gosterme
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <Topbar />
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-5 py-7 md:px-10 md:py-9">
        {children}
      </main>
    </div>
  );
}
