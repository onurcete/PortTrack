import { NextResponse } from "next/server";
import { getSessionUserIdOptional, isAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    return NextResponse.json({ user: null });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const isUserAdmin = isAdminUser(user);
  return NextResponse.json({
    user: {
      name: user.name ?? "",
      email: user.email,
      role: isUserAdmin ? "ADMIN" : user.role,
      isDemo: Boolean(user.isDemo || user.role === "DEMO" || user.email === "demo@porttrack.app" || user.email === "demo@porttrack.com"),
    },
  });
}
