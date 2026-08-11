"use client";

import { ArrowDownLeft, ArrowUpRight, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo } from "react";
import { AvatarStack } from "@/components/expense-row";
import type { MemberLedger, Profile, TripMember } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

interface MembersViewProps {
  profiles: Profile[];
  members: TripMember[];
  ledgers: MemberLedger[];
  currentUserId: string;
}

export function MembersView({ profiles, members, ledgers, currentUserId }: MembersViewProps) {
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const ledgerById = useMemo(() => new Map(ledgers.map((ledger) => [ledger.userId, ledger])), [ledgers]);
  return <div className="view-stack"><div className="page-head"><div><p className="eyebrow">ORANG-ORANG DI TRIP INI</p><h1>Anggota trip</h1><p className="page-subtitle">Paid, share, dan saldo akhir—dibuka tanpa rumus tersembunyi.</p></div><AvatarStack profiles={profiles} /></div><section className="panel member-summary"><div className="member-summary-icon"><UsersRound size={18} /></div><div><strong>{profiles.length} orang</strong><span>Semua orang bisa menambah talangan. Admin hanya punya satu tugas tambahan: menutup trip dengan rapi.</span></div></section><section className="panel members-panel"><div className="members-table-head"><span>ANGGOTA</span><span>DIBAYAR</span><span>BAGIAN</span><span>SALDO</span></div><div className="member-list">{members.map((member) => { const profile = profileById.get(member.userId); const ledger = ledgerById.get(member.userId); const positive = (ledger?.balance ?? 0) > 0; const negative = (ledger?.balance ?? 0) < 0; return <div className="member-ledger-row" key={member.userId}><div className="member-identity"><span className="avatar">{profile?.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{profile?.displayName ?? "Anggota"}{member.userId === currentUserId ? <small> · kamu</small> : null}</strong><small>{member.role === "admin" ? <><ShieldCheck size={12} /> Admin</> : "Peserta trip"}</small></span></div><span className="ledger-number" data-label="Dibayar">{formatRupiah(ledger?.paid ?? 0)}</span><span className="ledger-number" data-label="Bagian">{formatRupiah(ledger?.share ?? 0)}</span><span className={`ledger-balance ${positive ? "is-positive" : negative ? "is-negative" : "is-zero"}`} data-label="Saldo">{positive ? <ArrowUpRight size={14} /> : negative ? <ArrowDownLeft size={14} /> : null}{formatRupiah(ledger?.balance ?? 0, true)}</span></div>; })}</div><div className="members-legend"><span><i className="legend-dot positive" /> Positif = menerima</span><span><i className="legend-dot negative" /> Negatif = bayar</span><span><i className="legend-dot neutral" /> Nol = beres</span></div></section></div>;
}
