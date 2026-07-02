"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserIdOptional } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AdminUserDTO } from "@/components/AdminClient";

/** Yetki kontrolü yardımcısı */
async function checkAdminAuth() {
  const userId = await getSessionUserIdOptional();
  if (!userId) {
    throw new Error("Bu işlemi yapmaya yetkiniz yok.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email !== "admin@porttrack.com") {
    throw new Error("Bu işlemi yapmaya yetkiniz yok.");
  }
}

/** Bir kullanıcıyı veritabanından tamamen siler (cascade ilişkileriyle birlikte). */
export async function deleteUser(userIdToDelete: string): Promise<AdminUserDTO[]> {
  await checkAdminAuth();

  if (userIdToDelete === "default-user-id") {
    throw new Error("Varsayılan yönetici (admin) kullanıcısı silinemez.");
  }

  // Delete the user record (prisma onDelete: Cascade handles the children: Transaction, Note, etc.)
  await prisma.user.delete({
    where: { id: userIdToDelete },
  });

  // Revalidate the admin page path to clear cache
  revalidatePath("/admin");

  // Return the updated users list
  const usersList = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          instruments: true,
        },
      },
    },
  });

  return usersList.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    transactionCount: u._count.transactions,
    instrumentCount: u._count.instruments,
  }));
}
