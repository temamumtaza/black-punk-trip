"use client";

import { ArrowUpRight, Check, Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui";
import type { MemberLedger, Trip } from "@/lib/types";
import { formatRupiah, formatTripDates } from "@/lib/format";

interface TripsViewProps {
  trips: Trip[];
  memberCountsByTrip: Record<string, number>;
  ledgersByTrip: Record<string, MemberLedger>;
  totalsByTrip: Record<string, number>;
  activeTripId: string;
  onOpen: (tripId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

export function TripsView({ trips, memberCountsByTrip, ledgersByTrip, totalsByTrip, activeTripId, onOpen, onCreate, onJoin }: TripsViewProps) {
  return <div className="view-stack trips-view"><div className="page-head"><div><p className="eyebrow">RUANG TRIP</p><h1>Kelola trip</h1><p className="page-subtitle">Pilih ruang yang ingin dibuka, atau mulai perjalanan baru.</p></div><div className="head-actions"><Button variant="ghost" size="small" onClick={onJoin}>Gabung trip</Button><Button size="small" onClick={onCreate}><Plus size={16} /> Trip baru</Button></div></div><div className="trip-manager-summary"><span>{trips.length} trip di akunmu</span><span>Pilih satu untuk pindah ruang</span></div><div className="trip-cards">{trips.map((trip) => { const ledger = ledgersByTrip[trip.id]; const isCurrent = trip.id === activeTripId; return <button className={`trip-card ${isCurrent ? "is-current" : ""}`} key={trip.id} onClick={() => onOpen(trip.id)} type="button" aria-current={isCurrent ? "page" : undefined}><div className="trip-card-top"><span className="trip-card-mark">{trip.name.slice(0, 2).toUpperCase()}</span><span className="trip-card-badges">{isCurrent ? <span className="trip-current-tag"><Check size={12} aria-hidden="true" /> Sedang dibuka</span> : null}<span className={`status-badge ${trip.status === "finalized" ? "is-finalized" : "is-active"}`}>{trip.status === "finalized" ? "Finalized" : "Aktif"}</span></span></div><h2>{trip.name}</h2><p>{formatTripDates(trip)}</p><div className="trip-card-meta"><span><UsersRound size={14} /> {memberCountsByTrip[trip.id] ?? 0} orang</span><span>{formatRupiah(totalsByTrip[trip.id] ?? 0)} tercatat</span></div><div className="trip-card-footer"><span>{isCurrent ? <><Check size={14} aria-hidden="true" /> Trip yang sedang dibuka</> : <>Pindah ke trip <ArrowUpRight size={14} aria-hidden="true" /></>}</span><strong className={ledger?.balance && ledger.balance > 0 ? "positive-text" : ledger?.balance && ledger.balance < 0 ? "negative-text" : ""}>{ledger ? formatRupiah(ledger.balance, true) : "—"}</strong></div></button>; })}<button className="trip-card trip-card-new" onClick={onCreate} type="button"><span className="trip-card-new-icon">+</span><h2>Bikin trip baru</h2><p>Mulai dari nama, tanggal, dan kode gabung.</p></button></div></div>;
}
