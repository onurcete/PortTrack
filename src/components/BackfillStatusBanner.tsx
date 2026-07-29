"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackfillStatusBanner({ className }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  // Kaç art arda "active: false" cevabı alındığını say — geç pozitif'e karşı bariyer
  const falseCountRef = useRef(0);
  // Polling timer referansı
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function poll() {
      if (cancelledRef.current) return;
      try {
        const res = await fetch("/api/history/status", { cache: "no-store" });
        const data = await res.json();
        if (cancelledRef.current) return;

        if (data.active) {
          falseCountRef.current = 0;
          setActive(true);
        } else {
          falseCountRef.current += 1;
          // Eğer zaten aktifse ve 2 art arda false geldiyse: güncelleme bitti
          if (active && falseCountRef.current >= 2) {
            setActive(false);
            router.refresh();
            return; // polling durdur
          }
          // Aktif değilse sıfırla
          if (!active) {
            falseCountRef.current = 0;
          }
        }
      } catch {
        /* bağlantı hatası - polling sürsün */
      }

      if (!cancelledRef.current) {
        timerRef.current = setTimeout(poll, 3000);
      }
    }

    // Anlık event: işlem kaydedildi ya da buton tıklandı
    function handleBackfillStarted() {
      falseCountRef.current = 0;
      setActive(true);
      // 2 sn bekle sonra ilk kontrol yap (sunucu tarafı setBackfillActive'e zaman tanı)
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(poll, 2000);
    }

    window.addEventListener("backfill-started", handleBackfillStarted);
    // İlk yükleme: hemen kontrol et
    poll();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("backfill-started", handleBackfillStarted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-xs my-3",
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
