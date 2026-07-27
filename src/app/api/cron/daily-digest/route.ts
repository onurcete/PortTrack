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
    // 1. Hedef Kullanıcıyı Bul (Test için ceteonur@gmail.com)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: "ceteonur@gmail.com" },
          { id: "default-user-id" },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Hedef kullanıcı bulunamadı." }, { status: 404 });
    }

    // 2. Kullanıcı Portföy ve Dönemsel Getiri Verilerini Yükle
    const [portfolio, bundle, periodReturns] = await Promise.all([
      getPortfolio(user.id),
      loadAnalysisBundle(user.id),
      getPeriodReturns(user.id),
    ]);

    const { holdings } = bundle;

    // Kâr/Zarar ve Değer Hesaplamaları
    const totalTRY = portfolio.totals.valueTRY || 0;
    const totalUSD = portfolio.totals.valueUSD || 0;

    // Bugün Değişimi (Tam Doğru Hesaplama)
    const dailyAmtTRY = periodReturns.dailyAmtTRY ?? 0;
    const dailyPctTRY = periodReturns.dailyTRY ?? 0;

    // Tüm varlıkların performans verisi
    const mappedHoldings = holdings.map((h) => ({
      symbol: h.symbol,
      assetType: h.assetType,
      changePercent: h.unrealizedPctTRY || h.dailyChangePct || 0,
      valueTRY: h.valueTRY,
    }));

    // Günün En Çok Kazandıran İlk 3 Varlığı
    const sortedDesc = [...mappedHoldings].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sortedDesc.slice(0, 3);

    // Günün En Çok Kaybettiren İlk 3 Varlığı
    const sortedAsc = [...mappedHoldings].sort((a, b) => a.changePercent - b.changePercent);
    const topLosers = sortedAsc.slice(0, 3);

    const dateStr = new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // 3. Mobil Uyumlu E-Posta HTML İçeriğini Üret
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

    // 4. Canlı E-Postayı Gönder (Resend API)
    const recipientEmail = "ceteonur@gmail.com";
    const emailRes = await sendEmail({
      to: recipientEmail,
      subject: `📊 Günlük Portföy Özetiniz (${dateStr}) | PortTrack`,
      html,
    });

    if (!emailRes.ok) {
      return NextResponse.json(
        { ok: false, error: `E-posta gönderilemedi: ${emailRes.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      recipient: recipientEmail,
      message: `Günlük portföy özeti ${recipientEmail} adresine başarıyla gönderildi.`,
      emailId: emailRes.id,
      stats: {
        totalTRY,
        totalUSD,
        topGainersCount: topGainers.length,
        topLosersCount: topLosers.length,
      },
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
