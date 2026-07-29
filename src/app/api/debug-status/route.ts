import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gmailUser = process.env.GMAIL_USER?.trim() || "ceteonur@gmail.com";
  const gmailPass = process.env.GMAIL_APP_PASS?.trim() || "fliztpghqolxsmvu";
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
