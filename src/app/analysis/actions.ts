"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadAnalysisBundle } from "@/lib/analysisData";
import { getPortfolio } from "@/lib/data";
import { getPeriodReturns } from "@/lib/history";
import { generateDailyDigestEmailHtml, type TefasInvestorItem } from "@/lib/dailyDigestEmail";
import { sendEmail } from "@/lib/sendEmail";
import { computeFundInvestorStats } from "@/lib/tefasInvestors";
import { logSystemEvent } from "@/lib/logger";

export async function sendUserDigestEmailAction(): Promise<{ ok: boolean; message?: string }> {
  const userId = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.email) {
    return { ok: false, message: "Kullanıcı e-posta adresi bulunamadı." };
  }

  try {
    const [portfolio, bundle, periodReturns] = await Promise.all([
      getPortfolio(userId),
      loadAnalysisBundle(userId),
      getPeriodReturns(userId),
    ]);

    const { holdings } = bundle;
    const totalTRY = portfolio.totals.valueTRY || 0;
    const totalUSD = portfolio.totals.valueUSD || 0;
    const dailyAmtTRY = periodReturns.dailyAmtTRY ?? 0;

    const holdingsWith1DayChange = holdings.map((h) => {
      const pos = portfolio.positions.find((p) => p.symbol === h.symbol);
      return {
        ...h,
        changePercent: pos?.dailyChangePct ?? 0,
      };
    });

    const sorted = [...holdingsWith1DayChange].sort(
      (a, b) => b.changePercent - a.changePercent
    );
    const topGainers = sorted.slice(0, 5);
    const topLosers = sorted.slice(-5).reverse();

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

    const dateStr = new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

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

    const emailRes = await sendEmail({
      to: user.email,
      subject: dailySubject,
      html,
    });

    await logSystemEvent({
      userId: user.id,
      userEmail: user.email,
      action: "MANUAL_DAILY_DIGEST_EMAIL",
      status: emailRes.ok ? "SUCCESS" : "FAILED",
      details: emailRes.ok
        ? `Kullanıcı manuel olarak özet e-posta gönderdi (${emailRes.id}).`
        : `E-posta gönderim hatası: ${emailRes.error}`,
    });

    if (!emailRes.ok) {
      return { ok: false, message: emailRes.error || "E-posta gönderilemedi." };
    }

    return { ok: true, message: `Günlük portföy özeti ${user.email} adresine başarıyla gönderildi!` };
  } catch (err: any) {
    console.error("❌ Manuel e-posta gönderim hatası:", err);
    return { ok: false, message: err?.message || "E-posta oluşturulurken hata oluştu." };
  }
}
