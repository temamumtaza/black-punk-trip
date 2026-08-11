"use client";

import { Check, Copy, LogOut, Share2, Rows3 } from "lucide-react";
import { useState } from "react";
import { Button, Field, TextInput } from "@/components/ui";
import type { Trip } from "@/lib/types";
import { formatTripDates } from "@/lib/format";

interface SettingsViewProps {
  trip: Trip;
  creatorName: string;
  isAdmin: boolean;
  onReview: () => void;
  onManageTrips: () => void;
  onSignOut: () => void;
}

export function SettingsView({ trip, creatorName, isAdmin, onReview, onManageTrips, onSignOut }: SettingsViewProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [inviteNotice, setInviteNotice] = useState("");
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

  return <div className="view-stack"><div className="page-head"><div><p className="eyebrow">RUANG TRIP</p><h1>Pengaturan</h1><p className="page-subtitle">Detail kecil yang membantu semua orang tetap satu halaman.</p></div></div><div className="settings-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">IDENTITAS TRIP</p><h2>{trip.name}</h2></div><span className={`status-badge ${trip.status === "finalized" ? "is-finalized" : "is-active"}`}>{trip.status === "finalized" ? "Finalized" : "Aktif"}</span></div><dl className="settings-list"><div><dt>Tanggal</dt><dd>{formatTripDates(trip)}</dd></div><div><dt>Dibuat oleh</dt><dd>{creatorName}</dd></div><div><dt>Deskripsi</dt><dd>{trip.description || "Belum ada deskripsi."}</dd></div></dl></section><section className="panel invite-panel"><div className="panel-head"><div><p className="eyebrow">AJAK ROMBONGAN</p><h2>Kode gabung</h2></div><Button variant="soft" size="icon" onClick={shareInvite} aria-label="Bagikan undangan"><Share2 size={16} aria-hidden="true" /></Button></div><p>Bagikan kode atau link ini. Temanmu tinggal masuk dengan akun mereka.</p><div className="invite-code-large"><span>{trip.inviteCode}</span><Button variant="soft" size="icon" onClick={copyCode} aria-label="Salin kode">{copied === "code" ? <Check size={16} /> : <Copy size={16} />}</Button></div><small className="field-hint">Kode hanya berlaku selama trip aktif.</small></section><section className="panel settings-actions"><Field label="Link undangan" htmlFor="invite-link"><div className="invite-link-control"><TextInput id="invite-link" value={inviteUrl} readOnly /><Button variant="ghost" size="small" onClick={copyInviteLink}>{copied === "link" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === "link" ? "Tersalin" : "Salin link"}</Button></div></Field><p className="invite-notice" aria-live="polite">{inviteNotice}</p><Button variant="ghost" onClick={onManageTrips}><Rows3 size={15} aria-hidden="true" /> Kelola semua trip</Button>{isAdmin ? <Button variant="ghost" onClick={onReview} disabled={trip.status === "finalized"}>Buka review admin</Button> : null}<Button variant="soft" onClick={onSignOut}><LogOut size={15} aria-hidden="true" /> Keluar dari akun</Button></section></div></div>;
}
