"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DAY_NAMES = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];

export function ModernDatePicker({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const parsedDate = useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [value]);

  const [viewDate, setViewDate] = useState<Date>(parsedDate);

  // Sync viewDate when value changes
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) {
        setViewDate(new Date(y, m - 1, d));
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Days matrix generation
  const daysGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDay = firstDayOfMonth.getDay(); // 0 is Sunday
    const totalDays = lastDayOfMonth.getDate();

    const grid: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const pDate = new Date(year, month - 1, prevMonthLastDay - i);
      const str = pDate.toISOString().slice(0, 10);
      grid.push({ dateStr: str, dayNum: prevMonthLastDay - i, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const cDate = new Date(year, month, d);
      // Format YYYY-MM-DD manually to prevent timezone shifts
      const yyyy = cDate.getFullYear();
      const mm = String(cDate.getMonth() + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      grid.push({ dateStr: `${yyyy}-${mm}-${dd}`, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 cells
    const remaining = 35 - grid.length > 0 ? 35 - grid.length : (42 - grid.length % 42) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nDate = new Date(year, month + 1, n);
      const str = nDate.toISOString().slice(0, 10);
      grid.push({ dateStr: str, dayNum: n, isCurrentMonth: false });
    }

    return grid;
  }, [year, month]);

  function handlePrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function handleNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function selectDate(dateStr: string) {
    onChange(dateStr);
    setIsOpen(false);
  }

  function handleToday() {
    const todayStr = new Date().toISOString().slice(0, 10);
    onChange(todayStr);
    setViewDate(new Date());
    setIsOpen(false);
  }

  function handleYesterday() {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().slice(0, 10);
    onChange(yestStr);
    setViewDate(yest);
    setIsOpen(false);
  }

  // Format display label
  const formattedDisplay = useMemo(() => {
    if (!value) return "Tarih Seç";
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return value;
    return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  }, [value]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for forms */}
      <input type="hidden" name="date" value={value} />

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-[var(--color-foreground)] outline-none focus:border-[var(--color-brand)] cursor-pointer transition-all hover:bg-[var(--color-surface-hover)]",
          compact && "px-2 py-1.5 rounded-lg text-xs font-semibold",
          className
        )}
      >
        <span className="truncate tabular-nums">{formattedDisplay}</span>
        <Calendar size={compact ? 13 : 15} className="text-[var(--color-brand-strong)] shrink-0" />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-border)]/50">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-extrabold text-[var(--color-foreground)]">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((day) => (
              <span key={day} className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((item) => {
              const isSelected = item.dateStr === value;
              const isToday = item.dateStr === todayStr;

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => selectDate(item.dateStr)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center mx-auto",
                    isSelected
                      ? "bg-[var(--color-brand)] text-white shadow-sm ring-2 ring-[var(--color-brand)]/30 font-black"
                      : isToday
                      ? "border border-[var(--color-brand)] text-[var(--color-brand-strong)] font-extrabold bg-[var(--color-brand-soft)]/20"
                      : item.isCurrentMonth
                      ? "text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)]"
                      : "text-[var(--color-muted)]/40 hover:text-[var(--color-muted)]"
                  )}
                >
                  {item.dayNum}
                </button>
              );
            })}
          </div>

          {/* Presets Footer */}
          <div className="mt-3 pt-2 border-t border-[var(--color-border)]/50 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleToday}
              className="font-bold text-[var(--color-brand-strong)] hover:underline cursor-pointer"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={handleYesterday}
              className="font-semibold text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
            >
              Dün
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
