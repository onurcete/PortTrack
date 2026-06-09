"use server";

import { revalidatePath } from "next/cache";
import {
  readBacklogFile,
  importBacklogToDb,
  upsertBesMonth,
} from "@/lib/backlog";
import { BES_MANUAL_FROM_YEAR } from "@/lib/backlog.constants";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function importBacklogXlsx(): Promise<ActionResult> {
  try {
    const rows = await readBacklogFile();
    if (rows.length === 0) {
      return { ok: false, message: "backlog.xlsx okunamadı veya boş." };
    }
    const n = await importBacklogToDb(rows);
    revalidatePath("/growth");
    return {
      ok: true,
      message: `${n} ay içe aktarıldı: 2023–2024 tam satır, 2025+ yalnızca BES (Excel).`,
    };
  } catch (err) {
    return {
      ok: false,
      message: `İçe aktarma hatası: ${(err as Error).message}`,
    };
  }
}

export async function updateBesBalance(
  formData: FormData,
): Promise<ActionResult> {
  let month = String(formData.get("month") || "").trim();
  // input type=month -> YYYY-MM
  if (month.length === 7) {
    /* ok */
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(month)) {
    month = month.slice(0, 7);
  }
  const besTRY = Number(formData.get("besTRY"));
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, message: "Geçersiz ay (YYYY-MM)." };
  }
  if (Number(month.slice(0, 4)) < BES_MANUAL_FROM_YEAR) {
    return {
      ok: false,
      message: `${BES_MANUAL_FROM_YEAR} öncesi BES için Backlog İçe Aktar kullanın.`,
    };
  }
  if (!Number.isFinite(besTRY) || besTRY < 0) {
    return { ok: false, message: "Geçersiz BES tutarı." };
  }
  try {
    await upsertBesMonth(month, besTRY);
    revalidatePath("/growth");
    return { ok: true, message: `${month} BES güncellendi.` };
  } catch (err) {
    return {
      ok: false,
      message: (err as Error).message,
    };
  }
}
