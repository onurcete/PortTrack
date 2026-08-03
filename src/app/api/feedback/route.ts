import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, getSessionUser, isAdminUser, ADMIN_EMAILS } from "@/lib/auth";
import { sendEmail } from "@/lib/sendEmail";
import { logSystemEvent } from "@/lib/logger";

export const runtime = "nodejs";

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  SUGGESTION: { label: "İstek & Öneri", icon: "💡" },
  BUG: { label: "Hata Bildirimi", icon: "🐛" },
  COMPLAINT: { label: "Şikayet / Sorun", icon: "🔴" },
  OTHER: { label: "Diğer", icon: "💬" },
};

async function isUserAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  const userId = await getSessionUser(token);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  return isAdminUser(user);
}

/** Kullanıcıdan Yeni Geri Bildirim / Öneri / Şikayet Gönderimi */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type = "SUGGESTION", subject, message } = body as {
      type?: string;
      subject?: string;
      message?: string;
    };

    if (!message || message.trim().length < 3) {
      return NextResponse.json(
        { ok: false, error: "Lütfen geçerli bir açıklama yazınız (en az 3 karakter)." },
        { status: 400 }
      );
    }

    // Kullanıcı oturumu tespiti
    let userId: string | undefined;
    let userEmail: string | undefined;
    let userName: string | undefined;

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    if (token) {
      const sid = await getSessionUser(token);
      if (sid) {
        const u = await prisma.user.findUnique({
          where: { id: sid },
          select: { id: true, email: true, name: true },
        });
        if (u) {
          userId = u.id;
          userEmail = u.email;
          userName = u.name || undefined;
        }
      }
    }

    // Veritabanına kaydet
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        userEmail: userEmail || body.email || "Ziyaretçi",
        userName: userName || body.name || "Kullanıcı",
        type: type.toUpperCase(),
        subject: subject?.trim() || null,
        message: message.trim(),
        status: "OPEN",
      },
    });

    const typeInfo = TYPE_LABELS[type.toUpperCase()] || { label: type, icon: "💬" };
    const dateStr = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    // Admin'e E-posta Bildirimi Gönder
    const emailSubject = `${typeInfo.icon} PortTrack [Geri Bildirim]: ${typeInfo.label} — ${feedback.userEmail}`;
    const emailHtml = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 24px;">${typeInfo.icon}</span>
          <h2 style="color: #38bdf8; margin: 8px 0;">Yeni Geri Bildirim Alındı</h2>
          <span style="background: #1e293b; color: #94a3b8; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">${typeInfo.label}</span>
        </div>

        <div style="background: #1e293b; padding: 16px; border-radius: 12px; margin-bottom: 20px; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;"><strong>Gönderen:</strong> ${feedback.userName} (${feedback.userEmail})</p>
          <p style="margin: 0 0 8px 0;"><strong>Tarih:</strong> ${dateStr}</p>
          ${feedback.subject ? `<p style="margin: 0 0 8px 0;"><strong>Konu:</strong> ${feedback.subject}</p>` : ""}
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
            <strong>Mesaj:</strong>
            <p style="white-space: pre-wrap; background: #0f172a; padding: 12px; border-radius: 8px; font-size: 14px; margin-top: 6px; color: #e2e8f0;">${feedback.message}</p>
          </div>
        </div>

        <div style="text-align: center; font-size: 11px; color: #64748b;">
          PortTrack Yönetici Bildirim Sistemi — <a href="https://porttrack.app/admin" style="color: #38bdf8; text-decoration: none;">Admin Paneline Git</a>
        </div>
      </div>
    `;

    // Asenkron bildirim mailleri gönder (Hata oluşsa bile yanıtı engelleme)
    Promise.allSettled(
      ADMIN_EMAILS.map((adminMail) =>
        sendEmail({
          to: adminMail,
          subject: emailSubject,
          html: emailHtml,
        })
      )
    ).catch(() => null);

    await logSystemEvent({
      userId,
      userEmail: userEmail || "Ziyaretçi",
      action: "FEEDBACK_SUBMITTED",
      status: "SUCCESS",
      details: `${typeInfo.label} alındı (${feedback.id}).`,
      req,
    });

    return NextResponse.json({
      ok: true,
      message: "Geri bildiriminiz başarıyla iletildi. Teşekkür ederiz!",
      id: feedback.id,
    });
  } catch (err: any) {
    console.error("Geri bildirim kaydetme hatası:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Geri bildirim gönderilemedi." },
      { status: 500 }
    );
  }
}

/** Admin için Geri Bildirimleri Listeleme */
export async function GET(req: NextRequest) {
  if (!(await isUserAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ ok: true, feedbacks });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

/** Admin için Durum Güncelleme */
export async function PATCH(req: NextRequest) {
  if (!(await isUserAdmin(req))) {
    return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 401 });
  }

  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ ok: false, error: "ID ve Durum zorunludur." }, { status: 400 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ ok: true, feedback: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
