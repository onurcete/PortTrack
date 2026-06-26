"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface NoteDTO {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotes(): Promise<NoteDTO[]> {
  const notes = await prisma.note.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });
  return notes.map((n) => ({
    id: n.id,
    content: n.content,
    color: n.color,
    pinned: n.pinned,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));
}

export async function createNote(content: string, color: string = "default") {
  await prisma.note.create({
    data: { content, color },
  });
  revalidatePath("/");
}

export async function updateNote(
  id: string,
  data: { content?: string; color?: string; pinned?: boolean },
) {
  await prisma.note.update({
    where: { id },
    data,
  });
  revalidatePath("/");
}

export async function deleteNote(id: string) {
  await prisma.note.delete({ where: { id } });
  revalidatePath("/");
}
