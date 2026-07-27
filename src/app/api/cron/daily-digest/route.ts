import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadAnalysisBundle } from "@/lib/analysisData";
import { generateDailyDigestEmailHtml } from "@/lib/dailyDigestEmail";
import { sendEmail } from "@/lib/sendEmail";
import { getPortfolio } from "@/lib/data";
import { getPeriodReturns } from "@/lib/history";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("key") === secret || req.nextUrl.searchParams.get("test") === "1";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz" }, { status: 401 });
  }

  try {
    // 1. Hedef Kullanıcıları Bul (ceteonur@gmail.com ve denizbag@gmail.com)
    let users = await prisma.user.findMany({
      where: {
        email: {
          in: ["ceteonur@gmail.com", "denizbag@gmail.com"],
        },
      },
    });

    if (users.length === 0) {
      users = await prisma.user.findMany({ take: 5 });
    }

    if (users.length === 0) {
      return NextResponse.json({ ok: false, error: "Gönderilecek kullanıcı bulunamadı." }, { status: 404 });
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
        const dailyPctTRY = periodReturns.dailyTRY ?? 0;

        // Tüm varlıkların son 1 gündeki günlük performans verisi
        const mappedHoldings = holdings.map((h) => ({
          symbol: h.symbol,
          assetType: h.assetType,
          changePercent: h.dailyChangePct ?? 0,
          valueTRY: h.valueTRY,
        }));

        // Günün En Çok Kazandıran İlk 3 Varlığı
        const sortedDesc = [...mappedHoldings].sort((a, b) => b.changePercent - a.changePercent);
        const topGainers = sortedDesc.slice(0, 3);

        // Günün En Çok Kaybettiren İlk 3 Varlığı
        const sortedAsc = [...mappedHoldings].sort((a, b) => a.changePercent - b.changePercent);
        const topLosers = sortedAsc.slice(0, 3);

        // Kişiselleştirilmiş E-Posta HTML
        const html = generateDailyDigestEmailHtml({
          userName: user.name || "Yatırımcı",
          userEmail: user.email,
          dateStr,
          totalTRY,
          totalUSD,
          dailyAmtTRY,
          dailyPctTRY,
          weeklyPctTRY: periodReturns.weeklyTRY,
          mtdPctTRY: periodReturns.mtdTRY,
          ytdPctTRY: periodReturns.ytdTRY,
          topGainers,
          topLosers,
        });

        // Resend API ile Gönderim
        const emailRes = await sendEmail({
          to: user.email,
          subject: `📊 Günlük Portföy Özetiniz (${dateStr}) | PortTrack`,
          html,
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

    return NextResponse.json({
      ok: true,
      sentCount: results.filter((r) => r.ok).length,
      totalTargets: users.length,
      details: results,
    });
  } catch (err: any) {
    console.error("❌ Daily Digest Cron Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Günlük özet oluşturulurken hata oluştu." },
      { status: 500 }
    );
  }
}

export const POST = GET;
