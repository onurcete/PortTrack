"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RegisterConversionTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const isRegistered =
      searchParams.get("registered") === "true" ||
      searchParams.get("registered") === "1";

    if (isRegistered && typeof window !== "undefined") {
      const alreadyFired = sessionStorage.getItem("pt_registered_conversion_fired");
      if (!alreadyFired && typeof (window as any).gtag === "function") {
        // Event snippet for Porttrack'e Kayıt olma conversion page
        (window as any).gtag("event", "conversion", {
          send_to: "AW-987323960/KnsxCKCZqukcELi85dYD",
        });
        sessionStorage.setItem("pt_registered_conversion_fired", "true");
      }

      // Remove registered parameter from URL cleanly without page reload
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("registered");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : "") + url.hash
        );
      } catch (_) {}
    }
  }, [searchParams]);

  return null;
}

export function GoogleAdsRegisterTracker() {
  return (
    <Suspense fallback={null}>
      <RegisterConversionTracker />
    </Suspense>
  );
}
