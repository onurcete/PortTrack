"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

type Theme = "light" | "dark" | "solarized" | "harbor";

const THEMES: Array<{
  id: Theme;
  label: string;
  description: string;
  colors: [string, string, string];
  dark: boolean;
}> = [
  {
    id: "light",
    label: "Açık",
    description: "Modern indigo",
    colors: ["#f7f8fc", "#6366f1", "#16a34a"],
    dark: false,
  },
  {
    id: "dark",
    label: "Koyu",
    description: "Gece indigoso",
    colors: ["#090d16", "#6366f1", "#22c55e"],
    dark: true,
  },
  {
    id: "solarized",
    label: "Solarized Light",
    description: "Sıcak ve göz dostu",
    colors: ["#eee8d5", "#268bd2", "#859900"],
    dark: false,
  },
  {
    id: "harbor",
    label: "Harbor",
    description: "Lacivert ve altın",
    colors: ["#1A3263", "#FFC570", "#EFD2B0"],
    dark: true,
  },
];

function resolveTheme(value: string | null): Theme {
  if (value === "dracula" || value === "nord") return "harbor";
  if (THEMES.some((item) => item.id === value)) return value as Theme;
  return "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark" || theme === "harbor");
  root.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial = resolveTheme(localStorage.getItem("theme"));
    applyTheme(initial);
    localStorage.setItem("theme", initial);
    setTheme(initial);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectTheme = (nextTheme: Theme) => {
    applyTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
    setOpen(false);
  };

  const activeTheme = THEMES.find((item) => item.id === theme) ?? THEMES[1];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-ghost p-2 h-9 w-9 rounded-xl flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
        title={`Tema seç: ${activeTheme.label}`}
      >
        {activeTheme.dark ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-2xl"
        >
          <div className="flex items-center gap-2 px-2.5 pb-2 pt-1 text-xs font-bold text-[var(--color-foreground)]">
            <Palette size={15} className="text-[var(--color-brand)]" />
            Renk Teması
          </div>
          <div className="grid gap-1">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={theme === item.id}
                onClick={() => selectTheme(item.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                <span
                  className="flex h-8 w-12 shrink-0 overflow-hidden rounded-lg border border-black/10 shadow-sm"
                  aria-hidden="true"
                >
                  {item.colors.map((color) => (
                    <span
                      key={color}
                      className="h-full flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-[var(--color-foreground)]">
                    {item.label}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--color-muted)]">
                    {item.description}
                  </span>
                </span>
                {theme === item.id && (
                  <Check
                    size={16}
                    className="shrink-0 text-[var(--color-brand)]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
