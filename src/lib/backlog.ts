// import "server-only";
import { prisma, assertPortfolioMonthSnapshot } from "./prisma";
import type { GrowthByType } from "./assets";
import { ASSET_TYPES } from "./assets";

import {
  BACKLOG_FULL_UNTIL_YEAR,
  BES_MANUAL_FROM_YEAR,
} from "./backlog.constants";
export { BACKLOG_FULL_UNTIL_YEAR, BES_MANUAL_FROM_YEAR };

export interface MonthSnapshotRow {
  month: Date;
  monthKey: string;
  besTRY: number;
  bistTRY: number;
  tefasTRY: number;
  foreignTRY: number;
  fxTRY: number;
  metalTRY: number;
  cryptoTRY: number;
  totalTRY: number;
  totalUSD: number;
  usdTryRate: number;
}

function monthKey(d: Date): string {
  const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${trDate.getUTCFullYear()}-${String(trDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function snapshotToByType(
  row: MonthSnapshotRow,
): GrowthByType {
  const rate =
    row.usdTryRate > 0
      ? row.usdTryRate
      : row.totalUSD > 0
        ? row.totalTRY / row.totalUSD
        : 1;
  const usd = (tryVal: number) =>
    rate > 0 ? tryVal / rate : 0;

  const map: Partial<GrowthByType> = {
    BES: { valueTRY: row.besTRY, valueUSD: usd(row.besTRY) },
    BIST: { valueTRY: row.bistTRY, valueUSD: usd(row.bistTRY) },
    TEFAS: { valueTRY: row.tefasTRY, valueUSD: usd(row.tefasTRY) },
    FOREIGN: { valueTRY: row.foreignTRY, valueUSD: usd(row.foreignTRY) },
    FX: { valueTRY: row.fxTRY, valueUSD: usd(row.fxTRY) },
    METAL: { valueTRY: row.metalTRY, valueUSD: usd(row.metalTRY) },
    CRYPTO: { valueTRY: row.cryptoTRY, valueUSD: usd(row.cryptoTRY) },
  };

  return Object.fromEntries(
    ASSET_TYPES.map((t) => [t, map[t] ?? { valueTRY: 0, valueUSD: 0 }]),
  ) as GrowthByType;
}

export function growthPointFromSnapshot(
  row: MonthSnapshotRow,
): {
  month: string;
  valueTRY: number;
  valueUSD: number;
  costTRY: number;
  costUSD: number;
  byType: GrowthByType;
} {
  const byType = snapshotToByType(row);
  const rate =
    row.usdTryRate > 0
      ? row.usdTryRate
      : row.totalUSD > 0
        ? row.totalTRY / row.totalUSD
        : 40;
  const valueTRY = row.totalTRY;
  const valueUSD =
    row.totalUSD > 0 ? row.totalUSD : rate > 0 ? valueTRY / rate : 0;

  return {
    month: row.monthKey,
    valueTRY,
    valueUSD,
    costTRY: 0,
    costUSD: 0,
    byType,
  };
}

export async function upsertBesMonth(
  monthKey: string,
  besTRY: number,
  userId: string,
): Promise<void> {
  assertPortfolioMonthSnapshot();
  const [y, m] = monthKey.split("-").map(Number);
  if (y < BES_MANUAL_FROM_YEAR) {
    throw new Error(
      `${BES_MANUAL_FROM_YEAR} öncesi BES bakiyesi düzenlenemez.`,
    );
  }
  const month = new Date(y, m - 1, 1);
  const isFullBacklogYear = y <= BACKLOG_FULL_UNTIL_YEAR;

  const existing = await prisma.portfolioMonthSnapshot.findUnique({
    where: { userId_month: { userId, month } },
  });

  if (existing) {
    if (isFullBacklogYear) {
      const delta = besTRY - existing.besTRY;
      await prisma.portfolioMonthSnapshot.update({
        where: { userId_month: { userId, month } },
        data: {
          besTRY,
          totalTRY: Math.max(0, existing.totalTRY + delta),
          source: "manual",
        },
      });
    } else {
      await prisma.portfolioMonthSnapshot.update({
        where: { userId_month: { userId, month } },
        data: { besTRY, source: "manual" },
      });
    }
  } else {
    await prisma.portfolioMonthSnapshot.create({
      data: {
        userId,
        month,
        besTRY,
        source: "manual",
      },
    });
  }

  // BES sembollü işlemin toplam fiyatını da güncelleyelim
  await prisma.transaction.updateMany({
    where: { symbol: "BES", userId },
    data: { total: besTRY },
  });
}

export type ManualSnapshotMap = Map<string, MonthSnapshotRow>;

export async function loadManualSnapshots(userId: string): Promise<ManualSnapshotMap> {
  assertPortfolioMonthSnapshot();
  const rows = await prisma.portfolioMonthSnapshot.findMany({
    where: { userId },
    orderBy: { month: "asc" },
  });
  const map: ManualSnapshotMap = new Map();
  for (const r of rows) {
    const month = new Date(r.month);
    map.set(monthKey(month), {
      month,
      monthKey: monthKey(month),
      besTRY: r.besTRY,
      bistTRY: r.bistTRY,
      tefasTRY: r.tefasTRY,
      foreignTRY: r.foreignTRY,
      fxTRY: r.fxTRY,
      metalTRY: r.metalTRY,
      cryptoTRY: r.cryptoTRY,
      totalTRY: r.totalTRY,
      totalUSD: r.totalUSD ?? 0,
      usdTryRate: r.usdTryRate ?? 0,
    });
  }
  return map;
}

export function usesFullBacklog(year: number): boolean {
  return year <= BACKLOG_FULL_UNTIL_YEAR;
}

export function applyBesOverride(
  point: {
    month: string;
    valueTRY: number;
    valueUSD: number;
    costTRY: number;
    costUSD: number;
    byType: GrowthByType;
  },
  besTRY: number,
  usdAt: number,
) {
  const oldBes = point.byType.BES.valueTRY;
  const delta = besTRY - oldBes;
  const byType = { ...point.byType };
  byType.BES = {
    valueTRY: besTRY,
    valueUSD: usdAt > 0 ? besTRY / usdAt : 0,
  };
  return {
    ...point,
    byType,
    valueTRY: point.valueTRY + delta,
    valueUSD: point.valueUSD + (usdAt > 0 ? delta / usdAt : 0),
  };
}
