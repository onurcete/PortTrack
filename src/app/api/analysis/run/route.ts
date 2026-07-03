import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolvePriceMapping, type AssetType } from "@/lib/assets";
import { fetchYahooHistory } from "@/lib/prices";
import { computeIndicators, type PriceBar } from "@/lib/technical";
import { generateAnalysis, generateDailySummary, type DailySummaryItem } from "@/lib/commentary";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Analiz hesaplamasını tetikler. */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUser();
    const result = await runTechnicalAnalysis(userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}

/** Tüm aktif pozisyonlar için teknik analiz hesaplar. */
export async function runTechnicalAnalysis(userId?: string) {
  // 1. Tüm işlemleri çekip aktif (açık) pozisyonu olan sembolleri bul
  const transactions = await prisma.transaction.findMany({
    where: userId ? { userId } : undefined,
    select: { symbol: true, quantity: true, side: true }
  });

  const quantities = new Map<string, number>();
  for (const tx of transactions) {
    const current = quantities.get(tx.symbol) || 0;
    if (tx.side === "BUY") {
      quantities.set(tx.symbol, current + tx.quantity);
    } else {
      quantities.set(tx.symbol, current - tx.quantity);
    }
  }

  const openSymbols = Array.from(quantities.entries())
    .filter(([_, qty]) => qty > 0.0001)
    .map(([symbol]) => symbol);

  // Sadece açık pozisyonların enstrüman detaylarını çek
  const instruments = await prisma.instrument.findMany({
    where: {
      symbol: { in: openSymbols },
      userId: userId ? userId : undefined,
    }
  });

  if (instruments.length === 0) return { analyzed: 0, skipped: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let analyzed = 0;
  let skipped = 0;
  const summaryItems: DailySummaryItem[] = [];

  // 2. Her enstrüman için analiz çalıştır
  for (const inst of instruments) {
    try {
      const assetType = inst.assetType as AssetType;
      const mapping = resolvePriceMapping(assetType, inst.symbol);

      let bars: PriceBar[] = [];
      let investorAlerts: string[] = [];

      if (mapping.source === "yahoo" || mapping.source === "yahoo-fx") {
        // Yahoo Finance'tan geçmiş çek
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 370);

        const yahooSymbol = mapping.yahooSymbol || inst.symbol;
        const history = await fetchYahooHistory(yahooSymbol, fromDate);

        if (history.length < 30) {
          skipped++;
          continue;
        }

        bars = history.map((h) => ({
          date: h.date,
          close: h.close,
        }));
      } else if (mapping.source === "tefas") {
        // TEFAS: DB'deki PriceSnapshot'lardan
        const snapshots = await prisma.priceSnapshot.findMany({
          where: { symbol: inst.symbol },
          orderBy: { date: "asc" },
        });

        if (snapshots.length < 30) {
          skipped++;
          continue;
        }

        bars = snapshots.map((s) => ({
          date: s.date,
          close: s.native ?? s.close,
        }));

        // Yatırımcı sayısı değişim tespiti (son 1 haftalık değişim)
        const snapsWithInvestors = snapshots.filter((s) => s.investors != null);
        if (snapsWithInvestors.length >= 2) {
          const latest = snapsWithInvestors[snapsWithInvestors.length - 1];
          // Yaklaşık 7 gün önceki (5-10 gün arası) en yakın kaydı bul, yoksa bir öncekini al
          const prior = snapsWithInvestors.find((s) => {
            const diffDays = (latest.date.getTime() - s.date.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays >= 5 && diffDays <= 10;
          }) || snapsWithInvestors[snapsWithInvestors.length - 2];

          if (latest.investors && prior.investors && prior.investors > 0) {
            const diff = latest.investors - prior.investors;
            const pct = (diff / prior.investors) * 100;
            // %0.5 veya daha fazla değişim varsa kullanıcıya bildir
            if (Math.abs(pct) >= 0.5) {
              const direction = pct > 0 ? "artış" : "azalış";
              const emoji = pct > 0 ? "📈" : "📉";
              investorAlerts.push(
                `${emoji} Yatırımcı Sayısı: Son 1 haftada yatırımcı sayısı %${Math.abs(pct).toFixed(1)} ${direction} gösterdi (Son: ${latest.investors.toLocaleString()}, Önceki: ${prior.investors.toLocaleString()}).`
              );
            }
          }
        }
      } else {
        // Manuel (BES vb.) — analiz yapılamaz
        skipped++;
        continue;
      }

      // 3. Göstergeleri hesapla
      const indicators = computeIndicators(bars);
      if (!indicators) {
        skipped++;
        continue;
      }

      // 4. Yorum üret
      const analysis = generateAnalysis(inst.symbol, indicators);
      const combinedAlerts = [...analysis.alerts, ...investorAlerts];

      // 5. DB'ye kaydet (upsert)
      await prisma.technicalAnalysis.upsert({
        where: {
          symbol_date: {
            symbol: inst.symbol,
            date: today,
          },
        },
        create: {
          symbol: inst.symbol,
          assetType: inst.assetType,
          date: today,
          indicators: indicators as any,
          score: analysis.score,
          commentary: analysis.commentary,
          trendSignal: analysis.trendSignal,
          macdSignal: analysis.macdSignal,
          rsiZone: analysis.rsiZone,
          alerts: combinedAlerts,
        },
        update: {
          indicators: indicators as any,
          score: analysis.score,
          commentary: analysis.commentary,
          trendSignal: analysis.trendSignal,
          macdSignal: analysis.macdSignal,
          rsiZone: analysis.rsiZone,
          alerts: combinedAlerts,
        },
      });

      // Günlük özet için veri topla
      summaryItems.push({
        symbol: inst.symbol,
        assetType: inst.assetType,
        dailyChangePct: indicators.dailyChangePct ?? 0,
        consecutiveUpDays: indicators.consecutiveUpDays,
        consecutiveDownDays: indicators.consecutiveDownDays,
        currentPrice: indicators.currentPrice,
      });

      analyzed++;
    } catch (err) {
      console.error(`Analiz hatası (${inst.symbol}):`, (err as Error).message);
      skipped++;
    }
  }

  // 6. Günlük özeti de özel bir kayıt olarak sakla
  const summarySymbol = userId ? `__DAILY_SUMMARY__:${userId}` : "__DAILY_SUMMARY__";
  const summary = generateDailySummary(summaryItems);
  await prisma.technicalAnalysis.upsert({
    where: {
      symbol_date: {
        symbol: summarySymbol,
        date: today,
      },
    },
    create: {
      symbol: summarySymbol,
      assetType: "SUMMARY",
      date: today,
      indicators: summary as any,
      score: 0,
      commentary: "",
      trendSignal: "UP",
      macdSignal: "POSITIVE",
      rsiZone: "NEUTRAL",
      alerts: [],
    },
    update: {
      indicators: summary as any,
    },
  });

  return { analyzed, skipped, summary };
}
