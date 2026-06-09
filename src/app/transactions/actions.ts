"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseTransactionsCsv } from "@/lib/csv";
import { resolveAssetType, ASSET_TYPES, type AssetType } from "@/lib/assets";

const txSchema = z.object({
  date: z.string().min(1),
  assetType: z.enum(ASSET_TYPES as [AssetType, ...AssetType[]]),
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  unitPrice: z.coerce.number(),
  quantity: z.coerce.number(),
  total: z.coerce.number().optional(),
  currency: z.enum(["TRY", "USD"]),
  note: z.string().optional(),
});

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/growth");
  revalidatePath("/performance");
}

export async function createTransaction(
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = txSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Geçersiz veri." };
  }
  const d = parsed.data;
  const total =
    d.total && Number.isFinite(d.total) && d.total > 0
      ? d.total
      : d.unitPrice * d.quantity;

  await prisma.transaction.create({
    data: {
      date: new Date(d.date),
      assetType: d.assetType,
      symbol: d.symbol.trim().toUpperCase(),
      side: d.side,
      unitPrice: d.unitPrice,
      quantity: d.quantity,
      total,
      currency: d.currency,
      note: d.note || null,
    },
  });
  revalidateAll();
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = txSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Geçersiz veri." };
  const d = parsed.data;
  const total =
    d.total && Number.isFinite(d.total) && d.total > 0
      ? d.total
      : d.unitPrice * d.quantity;

  await prisma.transaction.update({
    where: { id },
    data: {
      date: new Date(d.date),
      assetType: d.assetType,
      symbol: d.symbol.trim().toUpperCase(),
      side: d.side,
      unitPrice: d.unitPrice,
      quantity: d.quantity,
      total,
      currency: d.currency,
      note: d.note || null,
    },
  });
  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  await prisma.transaction.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

/** Proje kokundeki transactions.csv dosyasini iceri aktarir. */
export async function importBundledCsv(): Promise<ActionResult> {
  try {
    const filePath = path.join(process.cwd(), "transactions.csv");
    const content = await fs.readFile(filePath, "utf-8");
    return await importCsvContent(content);
  } catch (err) {
    return { ok: false, message: `Dosya okunamadı: ${(err as Error).message}` };
  }
}

/** Verilen CSV metnini iceri aktarir (mevcut kayitlari silip yeniden yukler). */
export async function importCsvContent(content: string): Promise<ActionResult> {
  const { rows, errors } = parseTransactionsCsv(content);
  if (rows.length === 0) {
    return {
      ok: false,
      message: `Hiç satır okunamadı. ${errors.slice(0, 2).join(" ")}`,
    };
  }

  await prisma.$transaction([
    prisma.transaction.deleteMany({}),
    prisma.transaction.createMany({
      data: rows.map((r) => ({
        date: r.date,
        assetType: r.assetType,
        symbol: r.symbol,
        side: r.side,
        unitPrice: r.unitPrice,
        quantity: r.quantity,
        total: r.total,
        currency: r.currency,
      })),
    }),
  ]);

  // Enstruman kayitlarini olustur/guncelle
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.symbol)) continue;
    seen.add(r.symbol);
    await prisma.instrument.upsert({
      where: { symbol: r.symbol },
      create: {
        symbol: r.symbol,
        assetType: r.assetType,
        currency: r.currency,
        priceSource: r.assetType === "TEFAS" ? "tefas" : "yahoo",
      },
      update: { assetType: r.assetType },
    });
  }

  revalidateAll();
  const note = errors.length
    ? ` (${errors.length} satır atlandı)`
    : "";
  return {
    ok: true,
    message: `${rows.length} işlem içeri aktarıldı${note}.`,
  };
}

export async function importFromText(formData: FormData): Promise<ActionResult> {
  const text = String(formData.get("csv") || "");
  if (!text.trim()) return { ok: false, message: "Boş içerik." };
  return importCsvContent(text);
}
