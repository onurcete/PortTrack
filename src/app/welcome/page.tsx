import { Metadata } from "next";
import { getSessionUserIdOptional } from "@/lib/auth";
import { LandingClient } from "@/components/LandingClient";

export const metadata: Metadata = {
  title: "PortTrack — Türkiye'nin Akıllı Portföy & Yapay Zekâ Takip Platformu",
  description:
    "BIST Hisseleri, TEFAS Fonları, Yabancı Borsalar (Nasdaq), Kripto, Döviz ve BES yatırımlarınızı yapay zekâ briefing'leri ve 0-100 teknik sağlık skorlarıyla anlık takip edin.",
};

export default async function WelcomePage() {
  const userId = await getSessionUserIdOptional();
  return <LandingClient isLoggedIn={Boolean(userId)} />;
}
