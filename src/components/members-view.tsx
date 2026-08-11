"use client";

import { ArrowDownLeft, ArrowUpRight, Check, Copy, ShieldCheck, Share2, UserMinus, UserRoundCog, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { AvatarStack } from "@/components/expense-row";
import { Button, TextInput } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import type { MemberLedger, MemberRole, Profile, Trip, TripMember } from "@/lib/types";

interface MembersViewProps {
  trip: Trip;
  profiles: Profile[];
  members: TripMember[];
  ledgers: MemberLedger[];
  currentUserId: string;
  isAdmin: boolean;
  pendingMemberId: string | null;
  onChangeRole: (member: TripMember, role: MemberRole) => Promise<boolean>;
  onRemove: (member: TripMember) => Promise<boolean>;
}

export function MembersView({ trip, profiles, members, ledgers, currentUserId, isAdmin, pendingMemberId, onChangeRole, onRemove }: MembersViewProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [inviteNotice, setInviteNotice] = useState("");
  const [managingMemberId, setManagingMemberId] = useState<string | null>(null);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const ledgerById = useMemo(() => new Map(ledgers.map((ledger) => [ledger.userId, ledger])), [ledgers]);
  const inviteUrl = typeof window === "undefined" ? `/app?view=join-trip&code=${trip.inviteCode}` : `${window.location.origin}/app?view=join-trip&code=${trip.inviteCode}`;
  const inviteText = `Yuk gabung ke ${trip.name} di Black Punk Trip. Catat dan bagi pengeluaran trip bareng.`;

  function showCopied(kind: "code" | "link", message: string) {
    setCopied(kind);
    setInviteNotice(message);
    window.setTimeout(() => setCopied(null), 1600);
  }

  async function copyInvite(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "code" ? trip.inviteCode : inviteUrl);
      showCopied(kind, kind === "code" ? "Kode gabung disalin." : "Link undangan disalin.");
      return true;
    } catch {
      setInviteNotice(kind === "code" ? "Kode belum bisa disalin. Coba salin manual." : "Link belum bisa disalin. Coba salin manual.");
      return false;
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Undangan ${trip.name} · Black Punk Trip`, text: inviteText, url: inviteUrl });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setInviteNotice("Undangan belum bisa dibagikan. Coba lagi.");
      }
      return;
    }

    if (await copyInvite("link")) setInviteNotice("Share belum tersedia di perangkat ini. Link undangan sudah disalin.");
  }

  async function changeRole(member: TripMember, role: MemberRole) {
    if (await onChangeRole(member, role)) setManagingMemberId(null);
  }

  async function removeMember(member: TripMember) {
    if (await onRemove(member)) setManagingMemberId(null);
  }

  return <div className="view-stack">
    <div className="page-head"><div><p className="eyebrow">ORANG-ORANG DI TRIP INI</p><h1>Anggota trip</h1><p className="page-subtitle">Paid, share, dan saldo akhir—dibuka tanpa rumus tersembunyi.</p></div><AvatarStack profiles={profiles} /></div>
    <section className="panel member-summary"><div className="member-summary-icon"><UsersRound size={18} /></div><div><strong>{profiles.length} orang</strong><span>Semua orang bisa menambah talangan. Admin juga dapat mengatur peran dan peserta dengan aman.</span></div></section>
    <section className="panel invite-members-panel" aria-labelledby="invite-members-title">
      <div className="panel-head"><div><p className="eyebrow">AJAK ROMBONGAN</p><h2 id="invite-members-title">Kode dan link gabung</h2></div><Button variant="soft" size="icon" onClick={shareInvite} aria-label="Bagikan undangan"><Share2 size={16} aria-hidden="true" /></Button></div>
      <p>Semua anggota bisa mengirim undangan. Temanmu tinggal masuk dengan akun mereka.</p>
      <div className="invite-member-code"><span>{trip.inviteCode}</span><Button variant="soft" size="icon" onClick={() => copyInvite("code")} aria-label="Salin kode gabung">{copied === "code" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</Button></div>
      <div className="invite-member-link"><TextInput aria-label="Link undangan" value={inviteUrl} readOnly /><Button variant="ghost" size="small" onClick={() => copyInvite("link")}>{copied === "link" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === "link" ? "Tersalin" : "Salin link"}</Button></div>
      <p className="invite-notice" aria-live="polite">{inviteNotice}</p>
    </section>
    <section className="panel members-panel">
      <div className="members-panel-heading"><div><p className="eyebrow">KEUANGAN PER ORANG</p><h2>Posisi anggota</h2></div>{isAdmin ? <small><UserRoundCog size={14} aria-hidden="true" /> Kelola hanya saat trip aktif</small> : null}</div>
      <div className="members-table-head"><span>ANGGOTA</span><span>DIBAYAR</span><span>BAGIAN</span><span>SALDO</span></div>
      <div className="member-list">{members.map((member) => {
        const profile = profileById.get(member.userId);
        const displayName = profile?.displayName ?? "Anggota";
        const ledger = ledgerById.get(member.userId);
        const positive = (ledger?.balance ?? 0) > 0;
        const negative = (ledger?.balance ?? 0) < 0;
        const canManage = isAdmin && member.userId !== currentUserId;
        const isManaging = managingMemberId === member.userId;
        const isPending = pendingMemberId === member.userId;
        return <div className="member-entry" key={member.userId}>
          <div className="member-ledger-row"><div className="member-identity"><span className="avatar">{displayName.slice(0, 2).toUpperCase()}</span><span><strong>{displayName}{member.userId === currentUserId ? <small> · kamu</small> : null}</strong><small>{member.role === "admin" ? <><ShieldCheck size={12} /> Admin</> : "Peserta trip"}</small></span></div><span className="ledger-number" data-label="Dibayar">{formatRupiah(ledger?.paid ?? 0)}</span><span className="ledger-number" data-label="Bagian">{formatRupiah(ledger?.share ?? 0)}</span><span className={`ledger-balance ${positive ? "is-positive" : negative ? "is-negative" : "is-zero"}`} data-label="Saldo">{positive ? <ArrowUpRight size={14} /> : negative ? <ArrowDownLeft size={14} /> : null}{formatRupiah(ledger?.balance ?? 0, true)}</span></div>
          {canManage ? <div className="member-management"><Button variant="ghost" size="small" onClick={() => setManagingMemberId(isManaging ? null : member.userId)} disabled={trip.status !== "active" || isPending}><UserRoundCog size={15} aria-hidden="true" />{isManaging ? "Tutup" : "Kelola"}</Button>{isManaging ? <div className="member-management-actions"><p>Peran menentukan siapa yang bisa memfinalisasi, membuka kembali, dan mengatur anggota.</p><div><Button variant="soft" size="small" onClick={() => changeRole(member, member.role === "admin" ? "member" : "admin")} disabled={isPending}>{member.role === "admin" ? "Jadikan peserta" : "Jadikan admin"}</Button><Button variant="danger" size="small" onClick={() => removeMember(member)} disabled={isPending}><UserMinus size={15} aria-hidden="true" />{isPending ? "Memproses…" : "Keluarkan dari trip"}</Button></div><small>Anggota dengan talangan atau pembagian custom tidak bisa dikeluarkan sampai catatannya dibereskan.</small></div> : null}</div> : null}
        </div>;
      })}</div>
      <div className="members-legend"><span><i className="legend-dot positive" /> Positif = menerima</span><span><i className="legend-dot negative" /> Negatif = bayar</span><span><i className="legend-dot neutral" /> Nol = beres</span></div>
    </section>
  </div>;
}
