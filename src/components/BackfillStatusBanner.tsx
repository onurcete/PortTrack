"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackfillStatusBanner({ className }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch("/api/history/status", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;

        if (data.active) {
          setActive(true);
        } else {
          if (active) {
            // Güncelleme henüz bitti, sayfayı yenile
            setActive(false);
            router.refresh();
          }
        }
      } catch {
        /* yoksay */
      } finally {
        if (!cancelled) {
          // Her 3 saniyede bir düzenli sorgula
          timer = setTimeout(checkStatus, 3000);
        }
      }
    }

    // Anlık event dinleyici (İşlem ekleme veya buton tıklamalarında anında gösterir)
    function handleBackfillStarted() {
      setActive(true);
      checkStatus();
    }

    window.addEventListener("backfill-started", handleBackfillStarted);
    checkStatus();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("backfill-started", handleBackfillStarted);
    };
  }, [active, router]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-xs animate-pulse my-3",
        className
      )}
    >
      <Clock size={16} className="animate-spin text-amber-500 shrink-0" />
      <span>Yeni eklenen işlemlerinizin geçmiş fiyatları ve performans verileri güncelleniyor...</span>
    </div>
  );
}

export function triggerBackfillBanner() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("backfill-started"));
  }
}
