"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateInput, parseDateInput } from "@/lib/format";

interface MonthCursor {
  year: number;
  month: number;
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toIsoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthFromDate(value?: string) {
  const parsed = value ? parseDateInput(value) : null;
  if (!parsed) return null;
  const [year, month] = parsed.split("-").map(Number);
  return { year, month: month - 1 };
}

function moveMonth(cursor: MonthCursor, offset: number): MonthCursor {
  const next = new Date(cursor.year, cursor.month + offset, 1);
  return { year: next.getFullYear(), month: next.getMonth() };
}

export function DatePicker({ value, onChange, disabled = false, id, ariaLabel = "Tanggal" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [cursor, setCursor] = useState<MonthCursor>(() => monthFromDate(value) ?? { year: new Date().getFullYear(), month: new Date().getMonth() });
  const selectedIso = parseDateInput(value);
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(cursor.year, cursor.month, 1));
  const today = new Date();
  const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const days = useMemo(() => {
    const firstWeekday = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7;
    const dayCount = new Date(cursor.year, cursor.month + 1, 0).getDate();
    return Array.from({ length: firstWeekday + dayCount }, (_, index) => index < firstWeekday ? null : index - firstWeekday + 1);
  }, [cursor]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(max-width: 768px)");
    const syncViewport = () => setIsMobile(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
  }, []);

  function openCalendar() {
    const selectedMonth = monthFromDate(value);
    if (selectedMonth) setCursor(selectedMonth);
    setIsOpen(true);
  }

  const calendar = isOpen ? <section className="trip-calendar-popover single-date-calendar" role="dialog" aria-modal={isMobile} aria-label="Pilih tanggal talangan">
    <div className="trip-calendar-selection" aria-live="polite"><span>Pilih tanggal</span><strong>{selectedIso ? formatDateInput(selectedIso) : ""}</strong></div>
    <div className="trip-calendar-month"><button type="button" onClick={() => setCursor((current) => moveMonth(current, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={17} aria-hidden="true" /></button><strong>{monthLabel}</strong><button type="button" onClick={() => setCursor((current) => moveMonth(current, 1))} aria-label="Bulan berikutnya"><ChevronRight size={17} aria-hidden="true" /></button></div>
    <div className="trip-calendar-grid" aria-label={monthLabel}>{weekdays.map((day) => <span className="trip-calendar-weekday" key={day}>{day}</span>)}{days.map((day, index) => {
      if (!day) return <span className="trip-calendar-empty" key={`empty-${index}`} />;
      const iso = toIsoDate(cursor.year, cursor.month, day);
      const selected = iso === selectedIso;
      const label = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(cursor.year, cursor.month, day));
      return <button className={`trip-calendar-day ${selected ? "is-selected" : ""} ${iso === todayIso ? "is-today" : ""}`} type="button" aria-label={label} aria-pressed={selected} key={iso} onClick={() => { onChange(formatDateInput(iso)); setIsOpen(false); }}>{day}</button>;
    })}</div>
    <div className="trip-calendar-footer"><button type="button" onClick={() => onChange("")} disabled={!selectedIso}>Hapus tanggal</button><button type="button" onClick={() => setIsOpen(false)}>Tutup</button></div>
  </section> : null;

  return <div className={`single-date-picker trip-date-picker ${isOpen ? "is-open" : ""}`}>
    <button id={id} className={`single-date-trigger ${selectedIso ? "has-value" : ""}`} type="button" aria-label={ariaLabel} onClick={openCalendar} disabled={disabled}>
      <strong>{selectedIso ? formatDateInput(selectedIso) : "Pilih tanggal"}</strong><CalendarDays size={18} aria-hidden="true" />
    </button>
    {!isMobile ? calendar : null}
    {isMobile && calendar && typeof document !== "undefined" ? createPortal(<div className="trip-calendar-mobile-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>{calendar}</div>, document.body) : null}
  </div>;
}
