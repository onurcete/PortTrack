import { prisma } from "./prisma";
import type { NextRequest } from "next/server";

export type SystemAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "PRICE_REFRESH_MANUAL"
  | "CRON_PRICE_REFRESH"
  | "CRON_DAILY_DIGEST"
  | "TRANSACTION_ADD"
  | "TRANSACTION_DELETE"
  | "NOTE_ADD";

export interface LogEventOptions {
  userId?: string | null;
  userEmail?: string | null;
  action: SystemAction;
  status: "SUCCESS" | "FAILED";
  details?: string | Record<string, any> | null;
  req?: NextRequest | Request | null;
}

/**
 * Sistem ve kullanıcı eylemlerini güvenli, asenkron şekilde veritabanına loglar.
 */
export async function logSystemEvent(options: LogEventOptions): Promise<void> {
  try {
    const { userId, userEmail, action, status, details, req } = options;

    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (req) {
      ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        null;
      userAgent = req.headers.get("user-agent") || null;
    }

    const detailsStr =
      typeof details === "object" && details !== null
        ? JSON.stringify(details)
        : details || null;

    await prisma.systemLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        status,
        details: detailsStr,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("⚠️ Failed to write system log:", err);
  }
}
