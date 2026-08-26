import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdOptional } from "@/lib/auth";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  try {
    const body = await req.json();
    const { promptId, action, type, message, rating } = body;

    if (!promptId) {
      return NextResponse.json({ ok: false, error: "Geçersiz istek parametresi." }, { status: 400 });
    }

    // Prompt'un bu kullanıcıya ait olduğunu doğrula
    const prompt = await (prisma as any).feedbackPrompt.findFirst({
      where: { id: promptId, userId },
    });

    if (!prompt) {
      return NextResponse.json({ ok: false, error: "Geri bildirim isteği bulunamadı." }, { status: 404 });
    }

    const now = new Date();

    if (action === "DISMISS") {
      await (prisma as any).feedbackPrompt.update({
        where: { id: promptId },
        data: {
          status: "DISMISSED",
          completedAt: now,
        },
      });

      return NextResponse.json({ ok: true, message: "Kapatıldı." });
    }

    // SUBMIT Eylemi
    const feedbackType = (type && ["SUGGESTION", "BUG", "REQUEST", "OTHER"].includes(type))
      ? type
      : "SUGGESTION";

    const feedbackText = (message && typeof message === "string") ? message.trim() : "";
    if (!feedbackText) {
      return NextResponse.json({ ok: false, error: "Lütfen bir mesaj veya öneri yazınız." }, { status: 400 });
    }

    const formattedMessage = rating && Number.isFinite(rating) && rating >= 1 && rating <= 5
      ? `⭐ Puan: ${rating}/5\n\n${feedbackText}`
      : feedbackText;

    const feedbackSubject = feedbackType === "REQUEST"
      ? "İstek & Yeni Özellik Talebi"
      : feedbackType === "BUG"
        ? "Hata Bildirimi"
        : feedbackType === "SUGGESTION"
          ? "Öneri & İyileştirme"
          : "Genel Yorum / Geri Bildirim";

    // 1. Feedback tablosuna kaydet
    await prisma.feedback.create({
      data: {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        type: feedbackType,
        subject: feedbackSubject,
        message: formattedMessage,
        status: "OPEN",
      },
    });

    // 2. FeedbackPrompt'u COMPLETED olarak güncelle (bir daha ASLA çıkmaz)
    await (prisma as any).feedbackPrompt.update({
      where: { id: promptId },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
    });

    // 3. Sistem logu kaydı
    await logSystemEvent({
      userId,
      userEmail: user?.email || null,
      action: "FEEDBACK_SUBMITTED",
      status: "SUCCESS",
      details: `${user?.name || user?.email} pop-up üzerinden geri bildirim gönderdi (${feedbackType}): ${feedbackText.slice(0, 100)}...`,
      req,
    });

    return NextResponse.json({
      ok: true,
      message: "Değerli geri bildiriminiz için çok teşekkür ederiz! Başarıyla iletildi.",
    });
  } catch (err: any) {
    console.error("Error processing feedback prompt response:", err);
    return NextResponse.json({ ok: false, error: err?.message || "İşlem sırasında hata oluştu." }, { status: 500 });
  }
}
