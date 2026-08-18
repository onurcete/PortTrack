import { SettingsClient } from "@/components/SettingsClient";
import { requireUser } from "@/lib/auth";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ayarlar | PortTrack",
  description: "PortTrack kullanıcı görünüm, tema, para birimi ve bildirim tercihleri ayarları.",
};

export default async function SettingsPage() {
  await requireUser();
  return <SettingsClient />;
}
