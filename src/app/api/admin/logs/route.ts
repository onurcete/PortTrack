import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const actionFilter = searchParams.get("action") || undefined;
    const statusFilter = searchParams.get("status") || undefined;
    const search = searchParams.get("search")?.trim().toLowerCase();

    // 1. Sistem Loglarını Getir
    const logs = await prisma.systemLog.findMany({
      where: {
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search
          ? {
              OR: [
                { userEmail: { contains: search, mode: "insensitive" } },
                { details: { contains: search, mode: "insensitive" } },
                { ipAddress: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    });

    // 2. Kullanıcı Giriş, Aktif Ziyaret & İşlem İstatistikleri
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    const activityLogs = await prisma.systemLog.findMany({
      where: { action: { in: ["LOGIN", "ACTIVE_VISIT"] }, status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
    });

    const userStats = allUsers.map((u) => {
      const userLogs = activityLogs.filter(
        (l) => l.userId === u.id || (l.userEmail && l.userEmail.toLowerCase() === u.email.toLowerCase())
      );
      const loginCount = userLogs.filter((l) => l.action === "LOGIN").length;
      const activeVisitCount = userLogs.filter((l) => l.action === "ACTIVE_VISIT").length;
      const lastActive = userLogs.length > 0 ? userLogs[0].createdAt : null;

      return {
        id: u.id,
        email: u.email,
        name: u.name || u.email.split("@")[0],
        role: u.role,
        createdAt: u.createdAt,
        loginCount,
        activeVisitCount,
        transactionCount: u._count.transactions,
        totalSessions: loginCount + activeVisitCount,
        lastActive,
      };
    });

    // 3. Eylem Sayaçları Özetleri
    const totalLogins = await prisma.systemLog.count({ where: { action: "LOGIN", status: "SUCCESS" } });
    const totalActiveVisits = await prisma.systemLog.count({ where: { action: "ACTIVE_VISIT", status: "SUCCESS" } });
    const totalManualRefreshes = await prisma.systemLog.count({ where: { action: "PRICE_REFRESH_MANUAL" } });
    const totalCronRefreshes = await prisma.systemLog.count({ where: { action: "CRON_PRICE_REFRESH" } });
    const totalDailyDigests = await prisma.systemLog.count({ where: { action: "CRON_DAILY_DIGEST" } });

    // 4. Son 14 Günün Giriş & Kullanım Zaman Serisi (Chart verisi)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentActivities = await prisma.systemLog.findMany({
      where: {
        action: { in: ["LOGIN", "ACTIVE_VISIT"] },
        status: "SUCCESS",
        createdAt: { gte: fourteenDaysAgo },
      },
      select: { createdAt: true, userEmail: true },
    });

    const dailyLoginsMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().split("T")[0];
      dailyLoginsMap.set(dayKey, 0);
    }

    for (const l of recentActivities) {
      const dayKey = l.createdAt.toISOString().split("T")[0];
      if (dailyLoginsMap.has(dayKey)) {
        dailyLoginsMap.set(dayKey, (dailyLoginsMap.get(dayKey) || 0) + 1);
      }
    }

    const dailyLoginsSeries = Array.from(dailyLoginsMap.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("tr-TR", { month: "short", day: "numeric" }),
      count,
    }));

    return NextResponse.json({
      ok: true,
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userEmail: l.userEmail,
        action: l.action,
        status: l.status,
        details: l.details,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt.toISOString(),
      })),
      userStats,
      actionCounts: {
        totalLogins,
        totalActiveVisits,
        totalManualRefreshes,
        totalCronRefreshes,
        totalDailyDigests,
      },
      dailyLoginsSeries,
    });
  } catch (err: any) {
    console.error("❌ Admin logs API error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Loglar yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
