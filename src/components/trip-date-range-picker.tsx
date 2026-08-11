"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateInput, parseDateInput } from "@/lib/format";

interface MonthCursor {
  year: number;
  month: number;
}

interface TripDateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  initialMonth?: MonthCursor;
}

const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function toIsoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIsoDate() {
  const today = new Date();
  return toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
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

export function TripDateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, initialMonth }: TripDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [cursor, setCursor] = useState<MonthCursor>(() => initialMonth ?? monthFromDate(startDate) ?? { year: new Date().getFullYear(), month: new Date().getMonth() });
  const startIso = parseDateInput(startDate);
  const endIso = parseDateInput(endDate);
  const today = todayIsoDate();
  const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(cursor.year, cursor.month, 1));

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

  function openCalendar(target: "start" | "end") {
    const nextSelecting = target === "end" && startIso ? "end" : "start";
    const targetMonth = target === "end" ? monthFromDate(endDate) ?? monthFromDate(startDate) : monthFromDate(startDate);
    if (targetMonth) setCursor(targetMonth);
    setSelecting(nextSelecting);
    setIsOpen(true);
  }

  function selectDay(day: number) {
    const selectedIso = toIsoDate(cursor.year, cursor.month, day);
    if (selecting === "start" || !startIso) {
      onStartDateChange(formatDateInput(selectedIso));
      onEndDateChange("");
      setSelecting("end");
      return;
    }

    if (selectedIso < startIso) {
      onStartDateChange(formatDateInput(selectedIso));
      onEndDateChange("");
      setSelecting("end");
      return;
    }

    onEndDateChange(formatDateInput(selectedIso));
    setIsOpen(false);
  }

  function resetDates() {
    onStartDateChange("");
    onEndDateChange("");
    setSelecting("start");
  }

  const calendar = isOpen ? <section className="trip-calendar-popover" role="dialog" aria-modal={isMobile} aria-label="Pilih tanggal trip">
    <div className="trip-calendar-selection" aria-live="polite"><span>{selecting === "start" ? "Pilih tanggal mulai" : "Pilih tanggal selesai"}</span><strong>{startIso && selecting === "end" ? `${formatDateInput(startIso)} →` : ""}</strong></div>
    <div className="trip-calendar-month"><button type="button" onClick={() => setCursor((current) => moveMonth(current, -1))} aria-label="Bulan sebelumnya"><ChevronLeft size={17} aria-hidden="true" /></button><strong>{monthLabel}</strong><button type="button" onClick={() => setCursor((current) => moveMonth(current, 1))} aria-label="Bulan berikutnya"><ChevronRight size={17} aria-hidden="true" /></button></div>
    <div className="trip-calendar-grid" aria-label={monthLabel}>{weekdays.map((day) => <span className="trip-calendar-weekday" key={day}>{day}</span>)}{days.map((day, index) => {
      if (!day) return <span className="trip-calendar-empty" key={`empty-${index}`} />;
      const iso = toIsoDate(cursor.year, cursor.month, day);
      const inRange = Boolean(startIso && endIso && iso > startIso && iso < endIso);
      const selected = iso === startIso || iso === endIso;
      const ariaLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(cursor.year, cursor.month, day));
      return <button className={`trip-calendar-day ${selected ? "is-selected" : ""} ${inRange ? "is-in-range" : ""} ${iso === today ? "is-today" : ""}`} type="button" aria-label={ariaLabel} aria-pressed={selected} key={iso} onClick={() => selectDay(day)}>{day}</button>;
    })}</div>
    <div className="trip-calendar-footer"><button type="button" onClick={resetDates} disabled={!startIso && !endIso}>Hapus tanggal</button><button type="button" onClick={() => setIsOpen(false)}>Tutup</button></div>
  </section> : null;

  return <div className={`trip-date-picker ${isOpen ? "is-open" : ""}`}>
    <div className="trip-date-range" aria-label="Rentang tanggal trip">
      <button className={`trip-date-trigger ${startIso ? "has-value" : ""}`} type="button" aria-label="Tanggal mulai" onClick={() => openCalendar("start")}>
        <span>Mulai</span><strong>{startIso ? formatDateInput(startIso) : "Pilih tanggal"}</strong>
      </button>
      <span className="trip-date-divider" aria-hidden="true" />
      <button className={`trip-date-trigger ${endIso ? "has-value" : ""}`} type="button" aria-label="Tanggal selesai" onClick={() => openCalendar("end")}>
        <span>Selesai</span><strong>{endIso ? formatDateInput(endIso) : "Pilih tanggal"}</strong>
      </button>
      <CalendarDays className="trip-date-range-icon" size={18} aria-hidden="true" />
    </div>
    {!isMobile ? calendar : null}
    {isMobile && calendar && typeof document !== "undefined" ? createPortal(<div className="trip-calendar-mobile-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>{calendar}</div>, document.body) : null}
  </div>;
}
