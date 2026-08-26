import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdOptional } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    return NextResponse.json({ ok: false, prompt: null }, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    const targetUserId = user ? user.id : userId;

    const prompt = await (prisma as any).feedbackPrompt.findFirst({
      where: {
        userId: targetUserId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!prompt) {
      return NextResponse.json({ ok: true, prompt: null }, {
        headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
      });
    }

    return NextResponse.json({
      ok: true,
      prompt: {
        id: prompt.id,
        title: prompt.title || "PortTrack'i Birlikte Geliştirelim! 💡",
        message: prompt.message || "Görüş, öneri ve isteklerinizle platformu mükemmelleştirmemize yardımcı olun.",
        createdAt: prompt.createdAt,
      },
    }, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch (err: any) {
    console.error("Error fetching user feedback prompt:", err);
    return NextResponse.json({ ok: false, prompt: null }, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  }
}
