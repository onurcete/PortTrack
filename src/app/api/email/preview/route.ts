import { NextResponse } from "next/server";
import { generateWeeklyDigestEmailHtml, SAMPLE_WEEKLY_DIGEST_DATA } from "@/lib/weeklyDigestEmail";

export async function GET() {
  const html = generateWeeklyDigestEmailHtml(SAMPLE_WEEKLY_DIGEST_DATA);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
