"use client";

import { useEffect, type ReactNode } from "react";
import { X, Layers } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  header,
  hideHeader = false,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  hideHeader?: boolean;
  children: ReactNode;
  size?: "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    "2xl": "sm:max-w-5xl",
    "3xl": "sm:max-w-[1400px]",
    full: "sm:max-w-[96vw]",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative z-10 w-full ${sizeClasses[size]} max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto`}
      >
        {/* Header */}
        {!hideHeader && (
          header ? (
            header
          ) : (
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 px-6 py-4.5 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-muted)]/30 to-[var(--color-surface)]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)] flex items-center justify-center font-bold">
                  <Layers size={16} />
                </div>
                <h2 className="font-extrabold text-base tracking-tight text-[var(--color-foreground)]">
                  {title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          )
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
