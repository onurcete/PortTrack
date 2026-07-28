import { prisma } from "./prisma";
import type { NextRequest } from "next/server";

export type SystemAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "ACTIVE_VISIT"
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

// 15 dakikalık zaman aşımı haritası (veritabanını gereksiz şişirmemek için)
const userActivityThrottleMap = new Map<string, number>();
const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Kullanıcı şifre yazmadan çerezle (session) siteyi açtığında veya aktif kullandığında sayar.
 */
export async function trackUserActivity(userId: string, req?: Request): Promise<void> {
  const now = Date.now();
  const lastTime = userActivityThrottleMap.get(userId) || 0;

  if (now - lastTime < FIFTEEN_MINUTES) {
    return;
  }

  userActivityThrottleMap.set(userId, now);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (user) {
      await logSystemEvent({
        userId,
        userEmail: user.email,
        action: "ACTIVE_VISIT",
        status: "SUCCESS",
        details: `${user.name || user.email} uygulamayı aktif olarak kullandı (Oturum Açık).`,
        req,
      });
    }
  } catch (err) {
    console.error("Failed to track user activity:", err);
  }
}
