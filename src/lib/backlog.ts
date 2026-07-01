// import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import { prisma, assertPortfolioMonthSnapshot } from "./prisma";
import type { AssetType, GrowthByType } from "./assets";
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

/** Turkce binlik ayiricili sayi: 1.027.045 veya 18,846 */
export function parseTrAmount(raw: unknown): number {
  if (raw == null || raw === "" || raw === "-") return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (!s || s === "-") return 0;
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseTrDate(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return new Date(raw.getFullYear(), raw.getMonth(), 1);
  }
  const s = String(raw).trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]) - 1;
  const year = Number(m[3]);
  return new Date(year, mon, day);
}

function monthKey(d: Date): string {
  const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${trDate.getUTCFullYear()}-${String(trDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function colIndex(headers: string[], ...names: string[]): number {
  const norm = (h: string) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[₺$%()]/g, "")
      .trim();
  const normalized = headers.map(norm);
  for (const name of names) {
    const target = norm(name);
    const idx = normalized.findIndex((h) => h.includes(target) || target.includes(h));
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Excel/CSV satirlarini ay sonu snapshot listesine cevirir. */
export function parseBacklogRows(rows: unknown[][]): MonthSnapshotRow[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map((c) => String(c ?? ""));
  const iDate = colIndex(headers, "tarih");
  const iBes = colIndex(headers, "bes");
  const iBist = colIndex(headers, "bist");
  const iFon = colIndex(headers, "fon");
  const iNasdaq = colIndex(headers, "nasdaq");
  const iDoviz = colIndex(headers, "doviz");
  const iTotalTry = headers.findIndex((h) => {
    const n = String(h).toLowerCase();
    return n.includes("toplam") && (n.includes("₺") || n.includes("try"));
  });
  const iTotalUsd = headers.findIndex((h) => {
    const n = String(h).toLowerCase();
    return n.includes("toplam") && (n.includes("$") || n.includes("usd"));
  });
  const iKur = colIndex(headers, "kur");

  const out: MonthSnapshotRow[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;
    const month = parseTrDate(row[iDate >= 0 ? iDate : 0]);
    if (!month) continue;

    const besTRY = parseTrAmount(iBes >= 0 ? row[iBes] : 0);
    const bistTRY = parseTrAmount(iBist >= 0 ? row[iBist] : 0);
    const tefasTRY = parseTrAmount(iFon >= 0 ? row[iFon] : 0);
    const foreignTRY = parseTrAmount(iNasdaq >= 0 ? row[iNasdaq] : 0);
    const fxTRY = parseTrAmount(iDoviz >= 0 ? row[iDoviz] : 0);
    const totalTRY = parseTrAmount(iTotalTry >= 0 ? row[iTotalTry] : 0);
    const totalUSD = parseTrAmount(iTotalUsd >= 0 ? row[iTotalUsd] : 0);
    const usdTryRate = parseTrAmount(iKur >= 0 ? row[iKur] : 0);

    const sumParts = besTRY + bistTRY + tefasTRY + foreignTRY + fxTRY;
    const total =
      totalTRY > 0 ? totalTRY : sumParts > 0 ? sumParts : 0;

    out.push({
      month,
      monthKey: monthKey(month),
      besTRY,
      bistTRY,
      tefasTRY,
      foreignTRY,
      fxTRY,
      metalTRY: 0,
      cryptoTRY: 0,
      totalTRY: total,
      totalUSD,
      usdTryRate: usdTryRate > 0 ? usdTryRate : totalUSD > 0 ? total / totalUSD : 0,
    });
  }

  return out;
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

/** backlog.xlsx dosyasini okur ve parse eder. */
export async function readBacklogFile(
  filePath?: string,
): Promise<MonthSnapshotRow[]> {
  const p = filePath ?? path.join(process.cwd(), "backlog.xlsx");
  const buf = await readFile(p);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
  return parseBacklogRows(rows);
}

/** Veritabanina backlog satirlarini yazar (upsert). */
export async function importBacklogToDb(
  rows: MonthSnapshotRow[],
  userId: string,
): Promise<number> {
  assertPortfolioMonthSnapshot();
  let n = 0;
  for (const row of rows) {
    const year = row.month.getFullYear();

    if (year <= BACKLOG_FULL_UNTIL_YEAR) {
      await prisma.portfolioMonthSnapshot.upsert({
        where: { userId_month: { userId, month: row.month } },
        create: {
          userId,
          month: row.month,
          besTRY: row.besTRY,
          bistTRY: row.bistTRY,
          tefasTRY: row.tefasTRY,
          foreignTRY: row.foreignTRY,
          fxTRY: row.fxTRY,
          metalTRY: row.metalTRY,
          cryptoTRY: row.cryptoTRY,
          totalTRY: row.totalTRY,
          totalUSD: row.totalUSD > 0 ? row.totalUSD : null,
          usdTryRate: row.usdTryRate > 0 ? row.usdTryRate : null,
          source: "backlog",
        },
        update: {
          besTRY: row.besTRY,
          bistTRY: row.bistTRY,
          tefasTRY: row.tefasTRY,
          foreignTRY: row.foreignTRY,
          fxTRY: row.fxTRY,
          metalTRY: row.metalTRY,
          cryptoTRY: row.cryptoTRY,
          totalTRY: row.totalTRY,
          totalUSD: row.totalUSD > 0 ? row.totalUSD : null,
          usdTryRate: row.usdTryRate > 0 ? row.usdTryRate : null,
          source: "backlog",
        },
      });
    } else {
      // 2025+: yalnizca BES kolonu excel'den; diger kolonlar hesaplanir
      await prisma.portfolioMonthSnapshot.upsert({
        where: { userId_month: { userId, month: row.month } },
        create: {
          userId,
          month: row.month,
          besTRY: row.besTRY,
          source: "backlog",
        },
        update: { besTRY: row.besTRY, source: "backlog" },
      });
    }
    n++;
  }
  return n;
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
      `${BES_MANUAL_FROM_YEAR} oncesi BES degerleri backlog import ile gelir.`,
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
