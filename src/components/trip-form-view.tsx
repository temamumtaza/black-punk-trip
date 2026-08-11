"use client";

import { ArrowLeft, ArrowUpRight, CalendarDays, KeyRound } from "lucide-react";
import { useState } from "react";
import { TripDateRangePicker } from "@/components/trip-date-range-picker";
import { Button, Field, TextArea, TextInput } from "@/components/ui";
import { parseDateInput } from "@/lib/format";

interface TripFormViewProps {
  mode: "create" | "join";
  initialCode?: string;
  onBack: () => void;
  onCreate: (input: { name: string; description: string; startDate: string; endDate: string }) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  error?: string;
}

export function TripFormView({ mode, initialCode = "", onBack, onCreate, onJoin, error = "" }: TripFormViewProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const isJoin = mode === "join";

  async function submit() {
    setFormError("");
    if (isJoin && code.length < 4) {
      setFormError("Masukkan kode gabung yang valid.");
      return;
    }
    if (!isJoin && name.trim().length < 2) {
      setFormError("Nama trip minimal dua karakter.");
      return;
    }
    const startDateIso = startDate ? parseDateInput(startDate) : null;
    const endDateIso = endDate ? parseDateInput(endDate) : null;
    if (!isJoin && ((startDate && !startDateIso) || (endDate && !endDateIso))) {
      setFormError("Tanggal gunakan format dd/mm/aaaa yang valid.");
      return;
    }
    if (!isJoin && startDateIso && endDateIso && endDateIso < startDateIso) {
      setFormError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }
    setIsSaving(true);
    try {
      if (isJoin) await onJoin(code);
      else await onCreate({ name, description, startDate: startDateIso ?? "", endDate: endDateIso ?? "" });
    } finally {
      setIsSaving(false);
    }
  }

  return <div className="view-stack form-view trip-form-view"><div className="page-head"><div><button className="back-link inline-back" onClick={onBack} type="button"><ArrowLeft size={15} /> Kembali</button><p className="eyebrow">{isJoin ? "MASUK KE ROMBONGAN" : "MULAI DARI SINI"}</p><h1>{isJoin ? "Gabung trip." : "Bikin trip baru."}</h1><p className="page-subtitle">{isJoin ? "Minta kode dari teman yang sudah membuat trip." : "Nama dan tanggal sudah cukup untuk mulai mencatat."}</p></div></div><section className="panel narrow-form-panel">{isJoin ? <><div className="form-hero-icon"><KeyRound size={21} aria-hidden="true" /></div><Field label="Kode gabung" htmlFor="join-code"><TextInput id="join-code" className="invite-input" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="Masukkan kode undangan" maxLength={12} autoComplete="off" /></Field><p className="field-hint form-helper">Kode undangan dibagikan oleh admin trip.</p><Button className="btn-full" onClick={submit} disabled={isSaving || code.length < 4}>{isSaving ? "Memeriksa…" : "Gabung ke trip"} <ArrowUpRight size={16} /></Button></> : <><div className="form-hero-icon"><CalendarDays size={21} aria-hidden="true" /></div><Field label="Nama trip" htmlFor="trip-name"><TextInput id="trip-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Misalnya: Trip akhir tahun" maxLength={120} /></Field><Field label="Tanggal trip" hint="Pilih mulai lalu selesai"><TripDateRangePicker startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} /></Field><Field label="Deskripsi" hint="Opsional" htmlFor="trip-description"><TextArea id="trip-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Sedikit konteks buat rombongan…" rows={3} /></Field><Button className="btn-full" onClick={submit} disabled={isSaving || name.trim().length < 2}>{isSaving ? "Membuat…" : "Bikin trip"} <ArrowUpRight size={16} /></Button></>}</section>{error || formError ? <p className="inline-error" role="alert">{error || formError}</p> : null}</div>;
}
