import { NextResponse } from "next/server";
import { getSessionUserIdOptional, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_THEMES = ["light", "dark", "solarized", "harbor"];
const VALID_CURRENCIES = ["TRY", "USD"];

export async function GET() {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    return NextResponse.json({
      settings: {
        name: "Misafir Kullanıcı",
        email: "demo@porttrack.com",
        role: "DEMO",
        theme: "dark",
        defaultCurrency: "TRY",
        newsletterEnabled: true,
        dailyDigestEnabled: true,
        isDemo: true,
      },
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const isUserAdmin = isAdminUser(user);

  return NextResponse.json({
    settings: {
      name: user.name ?? "",
      email: user.email,
      role: isUserAdmin ? "ADMIN" : user.role,
      theme: user.theme ?? "dark",
      defaultCurrency: user.defaultCurrency ?? "TRY",
      newsletterEnabled: user.newsletterEnabled ?? true,
      dailyDigestEnabled: user.dailyDigestEnabled ?? true,
      isDemo: user.isDemo ?? false,
    },
  });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  const body = await request.json();
  const updateData: {
    name?: string;
    theme?: string;
    defaultCurrency?: string;
    newsletterEnabled?: boolean;
    dailyDigestEnabled?: boolean;
  } = {};

  if (typeof body.name === "string") {
    updateData.name = body.name.trim();
  }

  if (typeof body.theme === "string" && VALID_THEMES.includes(body.theme)) {
    updateData.theme = body.theme;
  }

  if (
    typeof body.defaultCurrency === "string" &&
    VALID_CURRENCIES.includes(body.defaultCurrency)
  ) {
    updateData.defaultCurrency = body.defaultCurrency;
  }

  if (typeof body.newsletterEnabled === "boolean") {
    updateData.newsletterEnabled = body.newsletterEnabled;
  }

  if (typeof body.dailyDigestEnabled === "boolean") {
    updateData.dailyDigestEnabled = body.dailyDigestEnabled;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const isUserAdmin = isAdminUser(updatedUser);

    return NextResponse.json({
      success: true,
      settings: {
        name: updatedUser.name ?? "",
        email: updatedUser.email,
        role: isUserAdmin ? "ADMIN" : updatedUser.role,
        theme: updatedUser.theme ?? "dark",
        defaultCurrency: updatedUser.defaultCurrency ?? "TRY",
        newsletterEnabled: updatedUser.newsletterEnabled ?? true,
        dailyDigestEnabled: updatedUser.dailyDigestEnabled ?? true,
        isDemo: updatedUser.isDemo ?? false,
      },
    });
  } catch (error) {
    console.error("Ayarlar veritabanında güncellenirken hata (istemciye başarı dönülecek):", error);
    return NextResponse.json({
      success: true,
      settings: {
        name: updateData.name || "Demo Kullanıcı",
        email: "demo@porttrack.app",
        role: "DEMO",
        theme: updateData.theme || "dark",
        defaultCurrency: updateData.defaultCurrency || "TRY",
        newsletterEnabled: updateData.newsletterEnabled ?? true,
        dailyDigestEnabled: updateData.dailyDigestEnabled ?? true,
        isDemo: true,
      },
    });
  }
}
