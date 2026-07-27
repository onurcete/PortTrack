import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  return NextResponse.json({
    ok: true,
    hasResendKey: Boolean(resendKey),
    resendKeyPrefix: resendKey ? `${resendKey.slice(0, 5)}...` : "YOK",
    hasOpenAiKey: Boolean(openAiKey),
    openAiKeyPrefix: openAiKey ? `${openAiKey.slice(0, 7)}...` : "YOK",
    nodeEnv: process.env.NODE_ENV,
  });
}
