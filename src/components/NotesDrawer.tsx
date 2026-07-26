"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import {
  X,
  Plus,
  Pin,
  PinOff,
  Trash2,
  StickyNote,
  Check,
  Pencil,
  Search,
  Copy,
  Sparkles,
  Tag,
  CheckSquare,
  Square,
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
  { key: "default", dot: "bg-[var(--color-muted)]" },
  { key: "blue", dot: "bg-blue-500" },
  { key: "green", dot: "bg-emerald-500" },
  { key: "amber", dot: "bg-amber-500" },
  { key: "red", dot: "bg-red-500" },
  { key: "purple", dot: "bg-purple-500" },
];

const PREDEFINED_TAGS = ["TEFAS", "Kripto", "Y.Borsa", "BIST", "Metal", "Döviz", "BES", "Hedef Fiyat", "Bilanço"];

const QUICK_TEMPLATES = [
  { label: "🎯 Hedef Fiyat", text: "🎯 [SEMBOL] Hedef Fiyat: ___ ₺ | Stop-loss: ___ ₺", tag: "Hedef Fiyat" },
  { label: "📥 Alım Planı", text: "📥 [SEMBOL] Kademeli alım planı:\n[ ] ___ ₺ seviyesinden ilk parça\n[ ] ___ ₺ seviyesinden 2. parça", tag: "BIST" },
  { label: "📅 Bilanço / Temettü", text: "📅 [SEMBOL] Bilanço / Temettü tarihi: DD.MM.YYYY", tag: "Bilanço" },
  { label: "💡 Strateji", text: "💡 Portföy Stratejisi:\n[ ] Düşüşlerde kademeli alım yapılmalı\n[ ] %10 nakit rezervi korunmalı", tag: "TEFAS" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("default");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCustomTagInput, setEditCustomTagInput] = useState("");
  const [showEditCustomInput, setShowEditCustomInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    const tags = newTags;
    setNewContent("");
    setNewColor("default");
    setNewTags([]);
    setShowTemplates(false);
    startTransition(async () => {
      await createNote(content, color, tags);
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function handleApplyTemplate(tmpl: typeof QUICK_TEMPLATES[0]) {
    setNewContent((prev) => (prev ? `${prev}\n${tmpl.text}` : tmpl.text));
    if (tmpl.tag && !newTags.includes(tmpl.tag)) {
      setNewTags((prev) => [...prev, tmpl.tag]);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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
    setEditTags(note.tags || []);
  }

  function handleSaveEdit(note: NoteDTO) {
    if (!editContent.trim()) return;
    const content = editContent.trim();
    const tags = editTags;
    setEditingId(null);
    startTransition(async () => {
      await updateNote(note.id, { content, tags });
      const updated = await getNotes();
      setNotes(updated);
    });
  }

  function handleToggleCheckboxInNote(note: NoteDTO, lineIndex: number) {
    const lines = note.content.split("\n");
    if (lines[lineIndex] != null) {
      if (lines[lineIndex].startsWith("[ ] ")) {
        lines[lineIndex] = lines[lineIndex].replace("[ ] ", "[x] ");
      } else if (lines[lineIndex].startsWith("[x] ")) {
        lines[lineIndex] = lines[lineIndex].replace("[x] ", "[ ] ");
      }
      const updatedContent = lines.join("\n");
      startTransition(async () => {
        await updateNote(note.id, { content: updatedContent });
        const updated = await getNotes();
        setNotes(updated);
      });
    }
  }

  function handleCopyNote(note: NoteDTO) {
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function toggleNewTag(tag: string) {
    setNewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleAddCustomTag() {
    const tag = customTagInput.trim();
    if (tag && !newTags.includes(tag)) {
      setNewTags((prev) => [...prev, tag]);
    }
    setCustomTagInput("");
    setShowCustomInput(false);
  }

  function toggleEditTag(tag: string) {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleAddEditCustomTag() {
    const tag = editCustomTagInput.trim();
    if (tag && !editTags.includes(tag)) {
      setEditTags((prev) => [...prev, tag]);
    }
    setEditCustomTagInput("");
    setShowEditCustomInput(false);
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

  // Filtered & Searched Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = n.content.toLowerCase().includes(q);
        const matchesTag = n.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesContent && !matchesTag) return false;
      }

      // Filter tag / pinned filter
      if (selectedFilter === "pinned") {
        return n.pinned;
      }
      if (selectedFilter != null) {
        return n.tags?.includes(selectedFilter);
      }

      return true;
    });
  }, [notes, searchQuery, selectedFilter]);

  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);

  const allUniqueTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((n) => n.tags || [])));
  }, [notes]);

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[450px] max-w-full bg-[var(--color-surface)] shadow-2xl border-l border-[var(--color-border)] flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]/70 bg-[var(--color-surface)] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] font-bold shadow-2xs">
              <StickyNote size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base text-[var(--color-foreground)]">Notlarım</h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] text-[10px] font-black">
                  {notes.length}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] font-medium">
                Yatırım notları, hedefler ve hatırlatmalar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Search Bar */}
        <div className="px-5 py-3 border-b border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/30">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Notlarda ara (sembol, içerik, etiket)..."
              className="w-full rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)] pl-9 pr-8 py-2 text-xs font-semibold outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all placeholder:text-[var(--color-muted)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Add Note Composer */}
        <div className="px-5 py-4 border-b border-[var(--color-border)]/60 bg-[var(--color-surface-muted)]/20 space-y-3">
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
              placeholder="Yeni yatırım notu yazın veya hızlı şablon seçin..."
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs font-medium leading-relaxed resize-none outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 transition-all min-h-[90px] placeholder:text-[var(--color-muted)]"
              rows={3}
            />

            {/* Quick Templates Toggle */}
            <div className="flex items-center justify-between mt-1">
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[var(--color-brand-strong)] hover:underline"
              >
                <Sparkles size={11} />
                <span>{showTemplates ? "Şablonları Gizle" : "⚡ Hızlı Şablonlar"}</span>
              </button>
              <span className="text-[10px] text-[var(--color-muted)] font-medium">
                Ctrl+Enter ile ekle
              </span>
            </div>

            {/* Quick Templates Bar */}
            {showTemplates && (
              <div className="grid grid-cols-2 gap-1.5 mt-2 p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/60 shadow-xs">
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-left px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-[var(--color-surface-muted)] hover:bg-[var(--color-brand-soft)] text-[var(--color-foreground)] hover:text-[var(--color-brand-strong)] border border-[var(--color-border)]/30 transition-all truncate"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags Picker */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-[var(--color-muted)] font-extrabold uppercase tracking-wider">Etiketler:</span>
            {PREDEFINED_TAGS.map((tag) => {
              const isSelected = newTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleNewTag(tag)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border transition-all",
                    isSelected
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border-[var(--color-brand)]/40 shadow-2xs"
                      : "bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
                  )}
                >
                  #{tag}
                </button>
              );
            })}

            {newTags
              .filter((tag) => !PREDEFINED_TAGS.includes(tag))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleNewTag(tag)}
                  className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border-[var(--color-brand)]/40 shadow-2xs transition-all"
                >
                  #{tag}
                </button>
              ))}

            {showCustomInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomTag();
                    }
                    if (e.key === "Escape") {
                      setShowCustomInput(false);
                      setCustomTagInput("");
                    }
                  }}
                  placeholder="Etiket adı..."
                  className="px-2 py-0.5 text-[10px] font-bold rounded-md border border-[var(--color-brand)] outline-none bg-[var(--color-surface)] w-20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="text-[10px] text-[var(--color-brand-strong)] font-black px-1"
                >
                  Ekle
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-[var(--color-muted)] transition-all"
              >
                + Özel
              </button>
            )}
          </div>

          {/* Color Picker & Submit Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--color-muted)] font-extrabold mr-1">Renk:</span>
              {COLOR_DOTS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setNewColor(c.key)}
                  className={cn(
                    "h-5 w-5 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer",
                    c.dot,
                    newColor === c.key
                      ? "ring-2 ring-offset-2 ring-[var(--color-brand)] ring-offset-[var(--color-surface)] scale-110"
                      : "opacity-40 hover:opacity-80",
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
              type="button"
              onClick={handleAdd}
              disabled={!newContent.trim() || isPending}
              className="btn btn-primary py-1.5 px-4 text-xs font-extrabold h-8 gap-1.5 rounded-xl shadow-xs"
            >
              <Plus size={15} />
              Notu Kaydet
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        {notes.length > 0 && (
          <div className="px-5 py-2.5 border-b border-[var(--color-border)]/50 bg-[var(--color-surface-muted)]/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setSelectedFilter(null)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-extrabold transition-all shrink-0",
                selectedFilter === null
                  ? "bg-[var(--color-brand)] text-white shadow-2xs"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-muted)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)]/30"
              )}
            >
              Tümü ({notes.length})
            </button>

            {pinnedCount > 0 && (
              <button
                onClick={() => setSelectedFilter(selectedFilter === "pinned" ? null : "pinned")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1",
                  selectedFilter === "pinned"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "bg-[var(--color-surface-muted)] text-amber-600 dark:text-amber-400 hover:bg-[var(--color-border)]/50 border border-amber-500/30"
                )}
              >
                📌 Sabitlenenler ({pinnedCount})
              </button>
            )}

            {allUniqueTags.map((tag) => {
              const count = notes.filter((n) => n.tags?.includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedFilter(selectedFilter === tag ? null : tag)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-extrabold transition-all shrink-0 flex items-center gap-1",
                    selectedFilter === tag
                      ? "bg-[var(--color-brand)] text-white shadow-2xs"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-muted)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)]/30"
                  )}
                >
                  #{tag} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 rounded-full border-2 border-[var(--color-brand)] border-t-transparent animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <StickyNote
                size={40}
                className="text-[var(--color-muted)] mb-3 opacity-30"
              />
              <p className="font-extrabold text-sm text-[var(--color-foreground)]">
                {searchQuery ? "Arama sonucu bulunamadı" : "Henüz not bulunmuyor"}
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-1 max-w-[240px]">
                {searchQuery
                  ? `"${searchQuery}" ile eşleşen not yok.`
                  : "Yatırım kararlarınızı ve hatırlatmalarınızı yukarıdan ekleyebilirsiniz."}
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => {
              const colors = getColorClasses(note.color);
              const isEditing = editingId === note.id;

              return (
                <div
                  key={note.id}
                  className={cn(
                    "group rounded-2xl border p-4 transition-all duration-200 shadow-xs hover:shadow-md",
                    colors.bg,
                    colors.border,
                    note.pinned && "ring-2 ring-amber-500/40 border-amber-500/50",
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {note.pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">
                          📌 Sabitlendi
                        </span>
                      )}
                      <span className="text-[10px] font-extrabold text-[var(--color-muted)]">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      {/* Color Picker Dots */}
                      <div className="hidden group-hover:flex items-center gap-0.5 mr-1">
                        {COLOR_DOTS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => handleColorChange(note.id, c.key)}
                            className={cn(
                              "h-2.5 w-2.5 rounded-full transition-all",
                              c.dot,
                              note.color === c.key ? "ring-1 ring-offset-1 ring-[var(--color-border)] scale-110" : "opacity-40 hover:opacity-80",
                            )}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyNote(note)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                        title="Notu Kopyala"
                      >
                        {copiedId === note.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(note)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-amber-500 transition-colors"
                        title={note.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                      >
                        {note.pinned ? <PinOff size={13} className="text-amber-500" /> : <Pin size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(note)}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-brand-strong)] transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--color-muted)] hover:text-rose-500 transition-colors"
                        title="Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Card Content & Interactive Checkbox Renderer */}
                  {isEditing ? (
                    <div className="space-y-3 pt-1">
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
                        className="w-full rounded-xl border border-[var(--color-brand)]/40 bg-[var(--color-surface)] px-3.5 py-2.5 text-xs font-medium leading-relaxed resize-none outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand)]/20 min-h-[75px]"
                        rows={3}
                      />

                      {/* Editing Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 py-1">
                        <span className="text-[10px] text-[var(--color-muted)] font-extrabold">Etiketler:</span>
                        {PREDEFINED_TAGS.map((tag) => {
                          const isSelected = editTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleEditTag(tag)}
                              className={cn(
                                "px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border transition-all",
                                isSelected
                                  ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border-[var(--color-brand)]/40"
                                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                              )}
                            >
                              #{tag}
                            </button>
                          );
                        })}

                        {editTags
                          .filter((tag) => !PREDEFINED_TAGS.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleEditTag(tag)}
                              className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] border-[var(--color-brand)]/40 transition-all"
                            >
                              #{tag}
                            </button>
                          ))}

                        {showEditCustomInput ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editCustomTagInput}
                              onChange={(e) => setEditCustomTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddEditCustomTag();
                                }
                                if (e.key === "Escape") {
                                  setShowEditCustomInput(false);
                                  setEditCustomTagInput("");
                                }
                              }}
                              placeholder="Etiket..."
                              className="px-2 py-0.5 text-[10px] font-bold rounded-md border border-[var(--color-brand)] outline-none bg-[var(--color-surface)] w-20"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleAddEditCustomTag}
                              className="text-[10px] text-[var(--color-brand-strong)] font-black px-1"
                            >
                              Ekle
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowEditCustomInput(true)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-all"
                          >
                            + Özel
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] px-2 py-1"
                        >
                          İptal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note)}
                          disabled={!editContent.trim()}
                          className="btn btn-primary py-1 px-3 text-xs font-extrabold h-7 gap-1 rounded-lg"
                        >
                          <Check size={13} />
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      {/* Note Content lines + Checkboxes */}
                      <div className={cn("text-xs font-medium leading-relaxed space-y-1", colors.text)}>
                        {note.content.split("\n").map((line, idx) => {
                          const isUnchecked = line.startsWith("[ ] ");
                          const isChecked = line.startsWith("[x] ");

                          if (isUnchecked || isChecked) {
                            const text = line.replace(/^\[[ x]\]\s*/, "");
                            return (
                              <div
                                key={idx}
                                onClick={() => handleToggleCheckboxInNote(note, idx)}
                                className="flex items-start gap-2 cursor-pointer hover:opacity-80 transition-opacity group/check py-0.5"
                              >
                                {isChecked ? (
                                  <CheckSquare size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                ) : (
                                  <Square size={15} className="text-[var(--color-muted)] shrink-0 mt-0.5 group-hover/check:text-[var(--color-brand-strong)]" />
                                )}
                                <span className={cn("flex-1", isChecked && "line-through opacity-60")}>
                                  {text}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <p key={idx} className="whitespace-pre-wrap break-words">
                              {line}
                            </p>
                          );
                        })}
                      </div>

                      {/* Note Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {note.tags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSelectedFilter(selectedFilter === tag ? null : tag)}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-brand-strong)] border border-[var(--color-border)]/40 transition-colors"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
