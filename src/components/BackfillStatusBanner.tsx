"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackfillStatusBanner({ className }: { className?: string }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  // Kaç art arda "active: false" cevabı alındığını say — geç pozitif'e karşı bariyer
  const falseCountRef = useRef(0);
  // Polling timer referansı
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

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
          activeRef.current = true;
          setActive(true);
          // İşlem devam ediyor, 3 sn sonra tekrar sorgula
          timerRef.current = setTimeout(poll, 3000);
        } else {
          falseCountRef.current += 1;
          if (activeRef.current) {
            // İşlem yeni bitti: 2. doğrulamada durdur ve sayfayı yenile
            if (falseCountRef.current >= 2) {
              activeRef.current = false;
              setActive(false);
              router.refresh();
              return; // Polling durdur
            }
            // 1. false cevabı: emin olmak için 1.5 sn sonra bir kez daha sorgula
            timerRef.current = setTimeout(poll, 1500);
          }
          // Zaten aktif bir güncelleme yoksa polling yapma (lüzumsuz HTTP sorgularını engelle)
        }
      } catch {
        if (!cancelledRef.current && activeRef.current) {
          timerRef.current = setTimeout(poll, 5000);
        }
      }
    }

    // Anlık event: işlem kaydedildi ya da buton tıklandı
    function handleBackfillStarted() {
      falseCountRef.current = 0;
      activeRef.current = true;
      setActive(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(poll, 1500);
    }

    window.addEventListener("backfill-started", handleBackfillStarted);
    // İlk yükleme: hemen kontrol et
    poll();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("backfill-started", handleBackfillStarted);
    };
  }, [router]);

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
