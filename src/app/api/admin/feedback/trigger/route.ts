import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logSystemEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const [pendingCount, completedCount, dismissedCount, recentPrompts] = await Promise.all([
      (prisma as any).feedbackPrompt.count({ where: { status: "PENDING" } }),
      (prisma as any).feedbackPrompt.count({ where: { status: "COMPLETED" } }),
      (prisma as any).feedbackPrompt.count({ where: { status: "DISMISSED" } }),
      (prisma as any).feedbackPrompt.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      stats: {
        pending: pendingCount,
        completed: completedCount,
        dismissed: dismissedCount,
        total: pendingCount + completedCount + dismissedCount,
      },
      prompts: recentPrompts.map((p: any) => ({
        id: p.id,
        userId: p.userId,
        userName: p.user?.name || p.user?.email?.split("@")[0] || "Bilinmiyor",
        userEmail: p.user?.email || "",
        title: p.title || "Geri Bildirim & İstek-Öneri",
        message: p.message || "",
        status: p.status,
        shownAt: p.shownAt,
        completedAt: p.completedAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("Error fetching feedback prompt status:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let adminId: string;
  try {
    adminId = await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { email: true, name: true },
  });

  try {
    const body = await req.json();
    const { targetType, userIds, title, message } = body;

    const popupTitle = (title && typeof title === "string" && title.trim())
      ? title.trim()
      : "PortTrack'i Birlikte Geliştirelim! 💡";

    const popupMessage = (message && typeof message === "string" && message.trim())
      ? message.trim()
      : "Görüşleriniz bizim için çok değerli. Sitede görmek istediğiniz yeni özellikler, öneri veya karşılaştığınız sorunları bizimle paylaşabilirsiniz.";

    let targetUserList: Array<{ id: string; email: string; name: string | null }> = [];

    if (targetType === "SELECTED" && Array.isArray(userIds) && userIds.length > 0) {
      targetUserList = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      });
    } else {
      // Tüm gerçek kullanıcılar (demo kullanıcıları hariç)
      targetUserList = await prisma.user.findMany({
        where: { isDemo: false },
        select: { id: true, email: true, name: true },
      });
    }

    if (targetUserList.length === 0) {
      return NextResponse.json({ ok: false, error: "Hedef kullanıcı bulunamadı." }, { status: 400 });
    }

    let createdCount = 0;
    const now = new Date();

    for (const u of targetUserList) {
      // Eğer kullanıcının zaten bekleyen bir prompt'u varsa güncelle, yoksa yeni oluştur
      const existing = await (prisma as any).feedbackPrompt.findFirst({
        where: { userId: u.id, status: "PENDING" },
      });

      if (existing) {
        await (prisma as any).feedbackPrompt.update({
          where: { id: existing.id },
          data: {
            title: popupTitle,
            message: popupMessage,
            updatedAt: now,
          },
        });
        createdCount++;
      } else {
        await (prisma as any).feedbackPrompt.create({
          data: {
            userId: u.id,
            title: popupTitle,
            message: popupMessage,
            status: "PENDING",
          },
        });
        createdCount++;
      }
    }

    await logSystemEvent({
      userId: adminId,
      userEmail: admin?.email || null,
      action: "FEEDBACK_PROMPT_TRIGGERED",
      status: "SUCCESS",
      details: `${admin?.name || admin?.email} tarafından ${createdCount} kullanıcıya geri bildirim pop-up'ı tetiklendi (${targetType === "SELECTED" ? "Seçili Kullanıcılar" : "Tüm Kullanıcılar"}).`,
      req,
    });

    return NextResponse.json({
      ok: true,
      count: createdCount,
      message: `${createdCount} kullanıcı için bir sonraki girişlerinde gösterilmek üzere geri bildirim pop-up'ı başarıyla tetiklendi.`,
    });
  } catch (err: any) {
    console.error("Error triggering feedback prompt:", err);
    return NextResponse.json({ ok: false, error: err?.message || "İşlem gerçekleştirilemedi." }, { status: 500 });
  }
}
