"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

export interface NoteDTO {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getNotes(): Promise<NoteDTO[]> {
  const userId = await requireUser();
  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return notes.map((n) => ({
    id: n.id,
    content: n.content,
    color: n.color,
    pinned: n.pinned,
    tags: n.tags || [],
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));
}

export async function createNote(
  content: string,
  color: string = "default",
  tags: string[] = [],
) {
  const userId = await requireUser();
  await prisma.note.create({
    data: { content, color, tags, userId },
  });
  revalidatePath("/");
}

export async function updateNote(
  id: string,
  data: { content?: string; color?: string; pinned?: boolean; tags?: string[] },
) {
  const userId = await requireUser();
  await prisma.note.updateMany({
    where: { id, userId },
    data,
  });
  revalidatePath("/");
}

export async function deleteNote(id: string) {
  const userId = await requireUser();
  await prisma.note.deleteMany({
    where: { id, userId },
  });
  revalidatePath("/");
}
