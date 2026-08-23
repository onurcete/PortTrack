"use server";

import { revalidatePath } from "next/cache";
import { upsertBesMonth } from "@/lib/backlog";
import { BES_MANUAL_FROM_YEAR } from "@/lib/backlog.constants";
import { requireUser } from "@/lib/auth";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function updateBesBalance(
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUser();
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
      message: `${BES_MANUAL_FROM_YEAR} öncesi BES bakiyesi düzenlenemez.`,
    };
  }
  if (!Number.isFinite(besTRY) || besTRY < 0) {
    return { ok: false, message: "Geçersiz BES tutarı." };
  }
  try {
    await upsertBesMonth(month, besTRY, userId);
    revalidatePath("/");
    revalidatePath("/transactions");
    revalidatePath("/growth");
    revalidatePath("/performance");
    return { ok: true, message: `${month} BES güncellendi.` };
  } catch (err) {
    return {
      ok: false,
      message: (err as Error).message,
    };
  }
}
