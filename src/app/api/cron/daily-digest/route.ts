import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadAnalysisBundle } from "@/lib/analysisData";
import { generateDailyDigestEmailHtml, type TefasInvestorItem } from "@/lib/dailyDigestEmail";
import { sendEmail } from "@/lib/sendEmail";
import { getPortfolio } from "@/lib/data";
import { getPeriodReturns } from "@/lib/history";
import { logSystemEvent } from "@/lib/logger";
import { computeFundInvestorStats } from "@/lib/tefasInvestors";

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
  const url = new URL(req.url);
  const isTest = url.searchParams.get("test") === "1" || url.searchParams.has("test");

  // Canlı test modunda sadece admin kullanıcısı (ceteonur@gmail.com) ile çalış
  let users = await prisma.user.findMany(
    isTest
      ? { where: { email: "ceteonur@gmail.com" } }
      : undefined
  );

  if (users.length === 0) {
    users = await prisma.user.findMany({ take: 1 });
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

      // 1 günlük değişime göre en çok kazanan 5 ve en çok kaybeden 5 enstrüman
      const sorted = [...holdingsWith1DayChange].sort(
        (a, b) => b.changePercent - a.changePercent
      );
      const topGainers = sorted.slice(0, 5);
      const topLosers = sorted.slice(-5).reverse();

      // Kullanıcının elindeki TEFAS fonları için yatırımcı sayısı değişimi hesapla
      const tefasHoldings = holdings.filter((h) => h.assetType === "TEFAS");
      let topTefasInvestorGainers: TefasInvestorItem[] = [];
      let topTefasInvestorLosers: TefasInvestorItem[] = [];

      if (tefasHoldings.length > 0) {
        const tefasSymbols = tefasHoldings.map((h) => h.symbol);
        const tefasSnaps = await prisma.priceSnapshot.findMany({
          where: {
            symbol: { in: tefasSymbols },
            investors: { not: null },
          },
          orderBy: { date: "desc" },
        });

        const tefasStats = tefasSymbols.map((sym) => {
          const fundSnaps = tefasSnaps.filter((s) => s.symbol === sym);
          return computeFundInvestorStats(sym, fundSnaps);
        });

        const validStats = tefasStats.filter(
          (s) => s.latest != null && s.weekDelta != null && s.weekDeltaPct != null && s.weekDelta !== 0
        );

        // Yatırımcı sayısı en çok artan ilk 3
        topTefasInvestorGainers = [...validStats]
          .filter((s) => (s.weekDelta ?? 0) > 0)
          .sort((a, b) => (b.weekDeltaPct ?? 0) - (a.weekDeltaPct ?? 0))
          .slice(0, 3)
          .map((s) => ({
            symbol: s.symbol,
            latestInvestors: s.latest!,
            weekDelta: s.weekDelta!,
            weekDeltaPct: s.weekDeltaPct!,
          }));

        // Yatırımcı sayısı en çok azalan ilk 3
        topTefasInvestorLosers = [...validStats]
          .filter((s) => (s.weekDelta ?? 0) < 0)
          .sort((a, b) => (a.weekDeltaPct ?? 0) - (b.weekDeltaPct ?? 0))
          .slice(0, 3)
          .map((s) => ({
            symbol: s.symbol,
            latestInvestors: s.latest!,
            weekDelta: Math.abs(s.weekDelta!),
            weekDeltaPct: Math.abs(s.weekDeltaPct!),
          }));
      }

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
        topTefasInvestorGainers,
        topTefasInvestorLosers,
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
        stats: { totalTRY, totalUSD, dailyAmtTRY },
      });
    } catch (err: any) {
      console.error(`❌ ${user.email} için bülten oluşturma hatası:`, err);
      results.push({
        email: user.email,
        userName: user.name,
        ok: false,
        error: err?.message || "Bülten oluşturulamadı.",
      });
    }
  }

  const sentCount = results.filter((r) => r.ok).length;
  return {
    ok: true,
    sentCount,
    totalTargets: users.length,
    details: results,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  const res = await runDailyDigest(req);
  return NextResponse.json(res);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  const res = await runDailyDigest(req);
  return NextResponse.json(res);
}
