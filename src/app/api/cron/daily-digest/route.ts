import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadAnalysisBundle } from "@/lib/analysisData";
import { generateDailyDigestEmailHtml } from "@/lib/dailyDigestEmail";
import { sendEmail } from "@/lib/sendEmail";
import { getPortfolio } from "@/lib/data";
import { getPeriodReturns } from "@/lib/history";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  // 1. Vercel Cron otomatik tetikleme kontrolü
  const isVercelCron =
    req.headers.get("x-vercel-cron") === "1" ||
    req.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");
  if (isVercelCron) return true;

  // 2. Secret / Bearer / Parametre kontrolü
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production" || req.nextUrl.searchParams.get("test") === "1";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret || req.nextUrl.searchParams.get("test") === "1";
}

export async function runDailyDigest(req: NextRequest) {
  // 1. Hedef Kullanıcıları Bul (ceteonur@gmail.com ve denizbag@gmail.com)
  let users = await prisma.user.findMany({
    where: {
      email: {
        in: ["ceteonur@gmail.com", "denizbag@gmail.com", "seay34@gmail.com"],
      },
    },
  });

  if (users.length === 0) {
    users = await prisma.user.findMany({ take: 5 });
  }

  if (users.length === 0) {
    return { ok: false, error: "Gönderilecek kullanıcı bulunamadı." };
  }

  const dateStr = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const results = [];

  // 2. Her kullanıcı için kişiselleştirilmiş bülten üret ve gönder
  for (const user of users) {
    if (!user.email) continue;

    try {
      const [portfolio, bundle, periodReturns] = await Promise.all([
        getPortfolio(user.id),
        loadAnalysisBundle(user.id),
        getPeriodReturns(user.id),
      ]);

      const { holdings } = bundle;

      // Kâr/Zarar ve Değer Hesaplamaları
      const totalTRY = portfolio.totals.valueTRY || 0;
      const totalUSD = portfolio.totals.valueUSD || 0;

      // Bugün Değişimi
      const dailyAmtTRY = periodReturns.dailyAmtTRY ?? 0;

      // Son 1 günlük değişim yüzdelerini eşle
      const holdingsWith1DayChange = holdings.map((h) => {
        const pos = portfolio.positions.find((p) => p.symbol === h.symbol);
        return {
          ...h,
          changePercent: pos?.dailyChangePct ?? 0,
        };
      });

      // 1 günlük değişime göre en çok kazanan 3 ve en çok kaybeden 3 enstrüman
      const sorted = [...holdingsWith1DayChange].sort(
        (a, b) => b.changePercent - a.changePercent
      );
      const topGainers = sorted.slice(0, 3);
      const topLosers = sorted.slice(-3).reverse();

      // HTML Şablonunu Üret
      const html = generateDailyDigestEmailHtml({
        userName: user.name || user.email.split("@")[0],
        userEmail: user.email,
        dateStr,
        totalTRY,
        totalUSD,
        dailyAmtTRY,
        dailyPctTRY: periodReturns.dailyTRY ?? 0,
        weeklyPctTRY: periodReturns.weeklyTRY ?? null,
        mtdPctTRY: periodReturns.mtdTRY ?? null,
        ytdPctTRY: periodReturns.ytdTRY ?? null,
        topGainers,
        topLosers,
      });

      const sign = dailyAmtTRY >= 0 ? "+" : "";
      const formattedAmt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.abs(dailyAmtTRY));
      const dailySubject = `📊 Portföy Özetiniz · ${dateStr} (Günlük: ${sign}${formattedAmt} ₺) | PortTrack`;

      // E-posta Gönderimi
      const emailRes = await sendEmail({
        to: user.email,
        subject: dailySubject,
        html,
      });

      await logSystemEvent({
        userId: user.id,
        userEmail: user.email,
        action: "CRON_DAILY_DIGEST",
        status: emailRes.ok ? "SUCCESS" : "FAILED",
        details: emailRes.ok
          ? `${user.email} adresine günlük bülten e-postası iletildi (${emailRes.id}).`
          : `${user.email} e-posta gönderim hatası: ${emailRes.error}`,
        req,
      });

      results.push({
        email: user.email,
        userName: user.name,
        ok: emailRes.ok,
        emailId: emailRes.id,
        error: emailRes.error,
        stats: {
          totalTRY,
          totalUSD,
          dailyAmtTRY,
        },
      });
    } catch (userErr: any) {
      console.error(`❌ ${user.email} için bülten oluşturma hatası:`, userErr);
      results.push({
        email: user.email,
        ok: false,
        error: userErr.message,
      });
    }
  }

  return {
    ok: true,
    sentCount: results.filter((r) => r.ok).length,
    totalTargets: users.length,
    details: results,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const res = await runDailyDigest(req);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("❌ Daily Digest Cron Error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export const POST = GET;
