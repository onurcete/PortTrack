import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdOptional } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    return NextResponse.json({ ok: false, prompt: null });
  }

  try {
    const prompt = await (prisma as any).feedbackPrompt.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!prompt) {
      return NextResponse.json({ ok: true, prompt: null });
    }

    // İlk kez gösteriliyorsa shownAt tarihini kaydet
    if (!prompt.shownAt) {
      await (prisma as any).feedbackPrompt.update({
        where: { id: prompt.id },
        data: { shownAt: new Date() },
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
    });
  } catch (err: any) {
    console.error("Error fetching user feedback prompt:", err);
    return NextResponse.json({ ok: false, prompt: null });
  }
}
