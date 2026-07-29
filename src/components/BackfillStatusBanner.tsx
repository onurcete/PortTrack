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
          // 3 saniyede bir kontrol et
          timer = setTimeout(checkStatus, 3000);
        } else {
          if (active) {
            // Güncelleme yeni bitti, sayfayı otomatik tazele
            setActive(false);
            router.refresh();
          }
        }
      } catch {
        if (!cancelled && active) {
          timer = setTimeout(checkStatus, 4000);
        }
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active, router]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-xs animate-pulse",
        className
      )}
    >
      <Clock size={16} className="animate-spin text-amber-500 shrink-0" />
      <span>Yeni eklenen işlemlerinizin geçmiş fiyatları ve performans verileri güncelleniyor...</span>
    </div>
  );
}
