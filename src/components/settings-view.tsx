"use client";

import { Check, Copy, LogOut, Pencil, Share2, Trash2, Rows3 } from "lucide-react";
import { useState } from "react";
import { TripDateRangePicker } from "@/components/trip-date-range-picker";
import { Button, Field, TextInput } from "@/components/ui";
import type { Trip } from "@/lib/types";
import { formatDateInput, formatTripDates, parseDateInput } from "@/lib/format";

interface SettingsViewProps {
  trip: Trip;
  creatorName: string;
  isAdmin: boolean;
  isOwner: boolean;
  isSavingTrip: boolean;
  isDeletingTrip: boolean;
  onReview: () => void;
  onManageTrips: () => void;
  onSignOut: () => void;
  onSaveTrip: (input: { name: string; description: string; startDate: string; endDate: string }) => Promise<boolean>;
  onDeleteTrip: () => Promise<void>;
}

export function SettingsView({ trip, creatorName, isAdmin, isOwner, isSavingTrip, isDeletingTrip, onReview, onManageTrips, onSignOut, onSaveTrip, onDeleteTrip }: SettingsViewProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [inviteNotice, setInviteNotice] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description ?? "");
  const [startDate, setStartDate] = useState(formatDateInput(trip.startDate));
  const [endDate, setEndDate] = useState(formatDateInput(trip.endDate));
  const inviteUrl = typeof window === "undefined" ? `/app?view=join-trip&code=${trip.inviteCode}` : `${window.location.origin}/app?view=join-trip&code=${trip.inviteCode}`;
  const inviteText = `Yuk gabung ke ${trip.name} di Black Punk Trip. Catat dan bagi pengeluaran trip bareng.`;

  function showCopied(kind: "code" | "link", message: string) {
    setCopied(kind);
    setInviteNotice(message);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      showCopied("code", "Kode gabung disalin.");
    } catch {
      setInviteNotice("Kode belum bisa disalin. Coba salin manual.");
    }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showCopied("link", "Link undangan disalin.");
      return true;
    } catch {
      setInviteNotice("Link belum bisa disalin. Coba salin manual.");
      return false;
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Undangan ${trip.name} · Black Punk Trip`,
          text: inviteText,
          url: inviteUrl,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setInviteNotice("Undangan belum bisa dibagikan. Coba lagi.");
      }
      return;
    }

    const didCopy = await copyInviteLink();
    if (didCopy) setInviteNotice("Share belum tersedia di perangkat ini. Link undangan sudah disalin.");
  }

  function cancelEdit() {
    setName(trip.name);
    setDescription(trip.description ?? "");
    setStartDate(formatDateInput(trip.startDate));
    setEndDate(formatDateInput(trip.endDate));
    setIsEditing(false);
  }

  async function saveTrip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await onSaveTrip({ name, description, startDate: parseDateInput(startDate) ?? "", endDate: parseDateInput(endDate) ?? "" });
    if (saved) setIsEditing(false);
  }

  return <div className="view-stack"><div className="page-head"><div><p className="eyebrow">RUANG TRIP</p><h1>Pengaturan</h1><p className="page-subtitle">Detail kecil yang membantu semua orang tetap satu halaman.</p></div></div><div className="settings-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">IDENTITAS TRIP</p><h2>{trip.name}</h2></div><span className={`status-badge ${trip.status === "finalized" ? "is-finalized" : "is-active"}`}>{trip.status === "finalized" ? "Finalized" : "Aktif"}</span></div><dl className="settings-list"><div><dt>Tanggal</dt><dd>{formatTripDates(trip)}</dd></div><div><dt>Dibuat oleh</dt><dd>{creatorName}</dd></div><div><dt>Deskripsi</dt><dd>{trip.description || "Belum ada deskripsi."}</dd></div></dl></section><section className="panel invite-panel"><div className="panel-head"><div><p className="eyebrow">AJAK ROMBONGAN</p><h2>Kode gabung</h2></div><Button variant="soft" size="icon" onClick={shareInvite} aria-label="Bagikan undangan"><Share2 size={16} aria-hidden="true" /></Button></div><p>Bagikan kode atau link ini. Temanmu tinggal masuk dengan akun mereka.</p><div className="invite-code-large"><span>{trip.inviteCode}</span><Button variant="soft" size="icon" onClick={copyCode} aria-label="Salin kode">{copied === "code" ? <Check size={16} /> : <Copy size={16} />}</Button></div><small className="field-hint">Kode hanya berlaku selama trip aktif.</small></section>{isOwner ? <section className="panel owner-trip-panel"><div className="panel-head"><div><p className="eyebrow">PEMILIK TRIP</p><h2>Kelola trip</h2></div>{!isEditing ? <Button variant="ghost" size="small" onClick={() => setIsEditing(true)}><Pencil size={15} aria-hidden="true" /> Edit</Button> : null}</div>{isEditing ? <form onSubmit={saveTrip} className="owner-trip-form"><Field label="Nama trip" htmlFor="owner-trip-name"><TextInput id="owner-trip-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required disabled={isSavingTrip || isDeletingTrip} /></Field><Field label="Tanggal trip" hint="Pilih mulai lalu selesai"><TripDateRangePicker startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} /></Field><Field label="Deskripsi" htmlFor="owner-trip-description" hint="Opsional"><TextInput id="owner-trip-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} disabled={isSavingTrip || isDeletingTrip} /></Field><div className="owner-trip-actions"><Button type="button" variant="ghost" onClick={cancelEdit} disabled={isSavingTrip}>Batal</Button><Button type="submit" disabled={isSavingTrip || isDeletingTrip}>{isSavingTrip ? "Menyimpan…" : "Simpan perubahan"}</Button></div></form> : <p className="owner-trip-copy">Kamu membuat trip ini. Ubah nama, deskripsi, dan tanggalnya kapan saja.</p>}<div className="owner-trip-danger"><div><strong>Hapus trip</strong><span>Seluruh talangan, pembagian, settlement, dan bukti pembayaran akan terhapus permanen.</span></div><Button variant="danger" size="small" onClick={() => { void onDeleteTrip(); }} disabled={isDeletingTrip || isSavingTrip}><Trash2 size={15} aria-hidden="true" />{isDeletingTrip ? "Menghapus…" : "Hapus trip"}</Button></div></section> : null}<section className="panel settings-actions"><Field label="Link undangan" htmlFor="invite-link"><div className="invite-link-control"><TextInput id="invite-link" value={inviteUrl} readOnly /><Button variant="ghost" size="small" onClick={copyInviteLink}>{copied === "link" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === "link" ? "Tersalin" : "Salin link"}</Button></div></Field><p className="invite-notice" aria-live="polite">{inviteNotice}</p><Button variant="ghost" onClick={onManageTrips}><Rows3 size={15} aria-hidden="true" /> Kelola semua trip</Button>{isAdmin ? <Button variant="ghost" onClick={onReview} disabled={trip.status === "finalized"}>Buka review admin</Button> : null}<Button variant="soft" onClick={onSignOut}><LogOut size={15} aria-hidden="true" /> Keluar dari akun</Button></section></div></div>;
}
