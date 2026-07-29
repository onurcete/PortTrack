import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  const gmailUser = process.env.GMAIL_USER?.trim() || "";
  const gmailPass = process.env.GMAIL_APP_PASS?.trim() || "";
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  return NextResponse.json({
    ok: true,
    hasGmailConfig: Boolean(gmailUser && gmailPass),
    gmailUser,
    hasOpenAiKey: Boolean(openAiKey),
    openAiKeyPrefix: openAiKey ? `${openAiKey.slice(0, 7)}...` : "YOK",
    nodeEnv: process.env.NODE_ENV,
  });
}
