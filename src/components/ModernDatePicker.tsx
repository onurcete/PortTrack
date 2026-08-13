"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const DAY_NAMES = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - 15 + i);

export function ModernDatePicker({
  value,
  onChange,
  className,
  compact = false,
  maxDate,
}: {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
  compact?: boolean;
  maxDate?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const localTodayStr = useMemo(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const effectiveMaxDate = maxDate === null ? null : (maxDate || localTodayStr);

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

    const formatLocal = (y: number, m: number, d: number) => {
      const mm = String(m + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    };

    // Previous month padding
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevY = prevMonthDate.getFullYear();
    const prevM = prevMonthDate.getMonth();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const str = formatLocal(prevY, prevM, dayNum);
      grid.push({ dateStr: str, dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const str = formatLocal(year, month, d);
      grid.push({ dateStr: str, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 cells
    const nextMonthDate = new Date(year, month + 1, 1);
    const nextY = nextMonthDate.getFullYear();
    const nextM = nextMonthDate.getMonth();
    const remaining = grid.length <= 35 ? 35 - grid.length : 42 - grid.length;

    for (let n = 1; n <= remaining; n++) {
      const str = formatLocal(nextY, nextM, n);
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
    if (effectiveMaxDate && dateStr > effectiveMaxDate) return;
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
          "w-full flex items-center justify-between gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-bold text-[var(--color-foreground)] outline-none focus:border-[var(--color-brand)] cursor-pointer transition-all hover:bg-[var(--color-surface-hover)]",
          compact && "px-2 py-1.5 rounded-lg text-xs font-semibold",
          className
        )}
      >
        <span className="truncate tabular-nums">{formattedDisplay}</span>
        <Calendar size={compact ? 13 : 15} className="text-[var(--color-brand-strong)] shrink-0" />
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 z-[999] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header with Easy Month and Year Dropdowns */}
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[var(--color-border)]/60">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Önceki Ay"
              className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Quick Month & Year Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={month}
                onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
                className="bg-[var(--color-surface-muted)] text-[var(--color-foreground)] font-extrabold text-xs rounded-lg px-2 py-1 border border-[var(--color-border)]/80 cursor-pointer outline-none focus:border-[var(--color-brand)]"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
                className="bg-[var(--color-surface-muted)] text-[var(--color-foreground)] font-extrabold text-xs rounded-lg px-2 py-1 border border-[var(--color-border)]/80 cursor-pointer outline-none focus:border-[var(--color-brand)]"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Sonraki Ay"
              className="p-1 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {DAY_NAMES.map((day) => (
              <span key={day} className="text-[10px] font-extrabold text-[var(--color-muted)] uppercase">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((item, idx) => {
              const isSelected = item.dateStr === value;
              const isToday = item.dateStr === localTodayStr;
              const isFuture = effectiveMaxDate ? item.dateStr > effectiveMaxDate : false;

              return (
                <button
                  key={`${item.dateStr}-${idx}`}
                  type="button"
                  disabled={isFuture}
                  onClick={() => selectDate(item.dateStr)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center mx-auto",
                    isFuture
                      ? "opacity-25 text-[var(--color-muted)] cursor-not-allowed pointer-events-none"
                      : "cursor-pointer",
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
          <div className="mt-3 pt-2.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleToday}
              className="font-extrabold text-[var(--color-brand-strong)] hover:underline cursor-pointer"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={handleYesterday}
              className="font-bold text-[var(--color-muted)] hover:text-[var(--color-foreground)] cursor-pointer"
            >
              Dün
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
