"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import {
  X,
  Plus,
  Pin,
  PinOff,
  Trash2,
  StickyNote,
  Check,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  type NoteDTO,
} from "@/app/notes/actions";

const NOTE_COLORS: { key: string; label: string; bg: string; border: string; text: string }[] = [
  { key: "default", label: "Varsayılan", bg: "bg-[var(--color-surface-muted)]/40", border: "border-[var(--color-border)]/50", text: "text-[var(--color-foreground)]" },
  { key: "blue", label: "Mavi", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800/50", text: "text-blue-900 dark:text-blue-100" },
  { key: "green", label: "Yeşil", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-900 dark:text-emerald-100" },
  { key: "amber", label: "Sarı", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/50", text: "text-amber-900 dark:text-amber-100" },
  { key: "red", label: "Kırmızı", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800/50", text: "text-red-900 dark:text-red-100" },
  { key: "purple", label: "Mor", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800/50", text: "text-purple-900 dark:text-purple-100" },
];

function getColorClasses(colorKey: string) {
  return NOTE_COLORS.find((c) => c.key === colorKey) ?? NOTE_COLORS[0];
}

const COLOR_DOTS: { key: string; dot: string }[] = [
  { key: "default", dot: "bg-gray-400" },
  { key: "blue", dot: "bg-blue-500" },
  { key: "green", dot: "bg-emerald-500" },
  { key: "amber", dot: "bg-amber-500" },
  { key: "red", dot: "bg-red-500" },
  { key: "purple", dot: "bg-purple-500" },
];

export function NotesDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("default");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Load notes
  useEffect(() => {
    if (open) {
      setLoading(true);
      getNotes().then((n) => {
        setNotes(n);
        setLoading(false);
      });
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus textarea on edit
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editingId]);

  function handleAdd() {
    if (!newContent.trim()) return;
    const content = newContent.trim();
    const color = newColor;
    setNewContent("");
    setNewColor("default");
    startTransition(async () => {
      await createNote(content, color);
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function handleTogglePin(note: NoteDTO) {
    startTransition(async () => {
      await updateNote(note.id, { pinned: !note.pinned });
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteNote(id);
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function handleStartEdit(note: NoteDTO) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  function handleSaveEdit(note: NoteDTO) {
    if (!editContent.trim()) return;
    const content = editContent.trim();
    setEditingId(null);
    startTransition(async () => {
      await updateNote(note.id, { content });
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function handleColorChange(noteId: string, colorKey: string) {
    startTransition(async () => {
      await updateNote(noteId, { color: colorKey });
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] max-w-full bg-[var(--color-surface)] shadow-2xl border-l border-[var(--color-border)] flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-soft)]">
              <StickyNote size={16} className="text-[var(--color-brand-strong)]" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Notlarım</h2>
              <p className="text-[10px] text-[var(--color-muted)]">
                {notes.length} not
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add new note */}
        <div className="px-5 py-4 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/20">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Yeni not yaz..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm resize-none outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all duration-200 min-h-[80px] placeholder:text-[var(--color-muted)]"
              rows={3}
            />
          </div>

          {/* Color picker + submit */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-1.5">
              {COLOR_DOTS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setNewColor(c.key)}
                  className={cn(
                    "h-5 w-5 rounded-full transition-all duration-150 flex items-center justify-center",
                    c.dot,
                    newColor === c.key
                      ? "ring-2 ring-offset-2 ring-[var(--color-brand)] ring-offset-[var(--color-surface)]"
                      : "opacity-50 hover:opacity-80",
                  )}
                  title={NOTE_COLORS.find((nc) => nc.key === c.key)?.label}
                >
                  {newColor === c.key && (
                    <Check size={10} className="text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={!newContent.trim() || isPending}
              className="btn btn-primary py-1.5 px-3 text-xs h-8 gap-1"
            >
              <Plus size={14} />
              Ekle
            </button>
          </div>
          <p className="text-[10px] text-[var(--color-muted)] mt-1.5">
            Ctrl+Enter ile hızlı ekle
          </p>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <StickyNote
                size={36}
                className="text-[var(--color-muted)] mb-3 opacity-40"
              />
              <p className="font-medium text-sm text-[var(--color-muted)]">
                Henüz not yok
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1 max-w-[200px]">
                Portföyünüzle ilgili notlarınızı buraya ekleyebilirsiniz
              </p>
            </div>
          ) : (
            notes.map((note) => {
              const colors = getColorClasses(note.color);
              const isEditing = editingId === note.id;
              return (
                <div
                  key={note.id}
                  className={cn(
                    "group rounded-xl border p-3.5 transition-all duration-200",
                    colors.bg,
                    colors.border,
                    note.pinned && "ring-1 ring-[var(--color-brand)]/20",
                  )}
                >
                  {/* Note header */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-[var(--color-muted)]">
                      {formatDate(note.createdAt)}
                      {note.pinned && (
                        <span className="ml-1.5 text-[var(--color-brand-strong)] font-bold">
                          📌
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {/* Color dots */}
                      {COLOR_DOTS.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => handleColorChange(note.id, c.key)}
                          className={cn(
                            "h-3 w-3 rounded-full transition-all",
                            c.dot,
                            note.color === c.key ? "ring-1 ring-offset-1 ring-[var(--color-border)]" : "opacity-40 hover:opacity-70",
                          )}
                        />
                      ))}
                      <div className="w-px h-3 bg-[var(--color-border)]/40 mx-1" />
                      <button
                        onClick={() => handleTogglePin(note)}
                        className="p-1 rounded-md hover:bg-[var(--color-surface-muted)] text-[var(--color-muted)] hover:text-[var(--color-brand-strong)] transition-colors"
                        title={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                      >
                        {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </button>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="p-1 rounded-md hover:bg-[var(--color-surface-muted)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950/30 text-[var(--color-muted)] hover:text-red-600 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Note content */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleSaveEdit(note);
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        className="w-full rounded-lg border border-[var(--color-brand)]/40 bg-[var(--color-surface)] px-3 py-2 text-sm resize-none outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 min-h-[60px]"
                        rows={3}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] px-2 py-1"
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => handleSaveEdit(note)}
                          disabled={!editContent.trim()}
                          className="btn btn-primary py-1 px-2.5 text-xs h-7 gap-1"
                        >
                          <Check size={12} />
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap break-words",
                        colors.text,
                      )}
                    >
                      {note.content}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
