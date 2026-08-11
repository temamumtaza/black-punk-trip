"use client";

import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, CircleCheck, LockKeyhole, RefreshCw, Send, ShieldCheck, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type { MemberLedger, Profile, Settlement, SettlementPreview, Trip } from "@/lib/types";
import { avatarColor, formatRupiah, formatShortDate } from "@/lib/format";

interface SettlementViewProps {
  trip: Trip;
  profiles: Profile[];
  ledgers: MemberLedger[];
  preview: SettlementPreview[];
  settlements: Settlement[];
  validationErrors: string[];
  currentUserId: string;
  isReview?: boolean;
  isAdmin?: boolean;
  pendingSettlementId?: string | null;
  isFinalizing?: boolean;
  isUnlocking?: boolean;
  onMarkPaid: (settlementId: string) => void;
  onFinalize: () => void;
  onUnlock: () => void;
}

interface DisplaySettlement {
  id?: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status?: Settlement["status"];
  paidAt?: Settlement["paidAt"];
}

export function SettlementView({ trip, profiles, ledgers, preview, settlements, validationErrors, currentUserId, isReview = false, isAdmin = false, pendingSettlementId = null, isFinalizing = false, isUnlocking = false, onMarkPaid, onFinalize, onUnlock }: SettlementViewProps) {
  const [paymentFilter, setPaymentFilter] = useState<"all" | "mine">("all");
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const rows = useMemo<DisplaySettlement[]>(() => trip.status === "finalized"
    ? settlements.map((settlement) => ({ id: settlement.id, fromUserId: settlement.fromUserId, toUserId: settlement.toUserId, amount: settlement.amount, status: settlement.status, paidAt: settlement.paidAt }))
    : preview.map((item) => ({ fromUserId: item.fromUserId, toUserId: item.toUserId, amount: item.amount })), [preview, settlements, trip.status]);
  const netSum = useMemo(() => ledgers.reduce((sum, ledger) => sum + ledger.balance, 0), [ledgers]);
  const valid = validationErrors.length === 0 && netSum === 0;
  const pendingCount = useMemo(() => settlements.reduce((count, settlement) => count + (settlement.status === "pending" ? 1 : 0), 0), [settlements]);
  const visibleRows = useMemo(() => paymentFilter === "all" ? rows : rows.filter((row) => row.fromUserId === currentUserId || row.toUserId === currentUserId), [currentUserId, paymentFilter, rows]);
  const profileName = (id: string) => profileById.get(id)?.displayName ?? "Anggota";

  return <div className="view-stack">
    <div className="page-head"><div><p className="eyebrow">{isReview ? "ADMIN · LANGKAH TERAKHIR" : "SESUAIKAN UTANGNYA"}</p><h1>{isReview ? "Review & tutup" : "Settlement"}</h1><p className="page-subtitle">{trip.status === "finalized" ? `Trip difinalisasi ${formatShortDate(trip.finalizedAt?.slice(0, 10))}.` : "Sistem menyusun transfer paling singkat dari saldo setiap orang."}</p></div><span className={`status-badge ${trip.status === "finalized" ? "is-finalized" : "is-active"}`}>{trip.status === "finalized" ? <><LockKeyhole size={13} /> Finalized</> : <><span className="status-dot" /> Aktif</>}</span></div>
    <section className="panel settlement-status"><div className="settlement-status-icon"><Send size={18} /></div><div><p className="eyebrow">{trip.status === "finalized" ? "TRANSFER YANG DISIMPAN" : "PREVIEW TRANSFER"}</p><strong>{rows.length ? `${rows.length} transfer untuk member trip` : "Semua beres"}</strong><span>{rows.length ? "Dibuat dari paid minus share. Menandai pembayaran tidak mengubah pengeluaran asli." : "Tidak ada pembayaran antar-member yang tersisa."}</span></div><div className="settlement-total"><small>Total yang berpindah</small><strong>{formatRupiah(rows.reduce((sum, row) => sum + row.amount, 0))}</strong></div></section>
    {isReview ? <section className={`panel validation-panel ${valid ? "is-valid" : "is-invalid"}`}><div className="validation-heading">{valid ? <CircleCheck size={19} /> : <AlertTriangle size={19} />}<div><strong>{valid ? "Data trip siap ditutup." : "Masih ada yang perlu dibereskan."}</strong><span>{valid ? "Semua alokasi pas dan saldo bersihnya kembali ke nol." : "Jangan kunci trip sebelum data finansialnya valid."}</span></div></div>{validationErrors.length ? <ul>{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul> : null}</section> : null}
    <div className="settlement-layout"><section className="panel settlement-panel"><div className="panel-head"><div><p className="eyebrow">RENCANA PEMBAYARAN</p><h2>{rows.length ? "Siapa bayar siapa" : "Semua beres."}</h2></div>{trip.status === "active" ? <span className="panel-note"><RefreshCw size={13} aria-hidden="true" /> Dari saldo saat ini</span> : null}</div>{rows.length ? <><div className="segmented-control settlement-filter" role="tablist" aria-label="Filter rencana pembayaran"><button type="button" role="tab" aria-selected={paymentFilter === "all"} className={paymentFilter === "all" ? "is-active" : ""} onClick={() => setPaymentFilter("all")}>Semua orang</button><button type="button" role="tab" aria-selected={paymentFilter === "mine"} className={paymentFilter === "mine" ? "is-active" : ""} onClick={() => setPaymentFilter("mine")}>Hanya saya</button></div>{visibleRows.length ? <div className="settlement-list">{visibleRows.map((row) => { const isCurrent = row.fromUserId === currentUserId; const isPending = pendingSettlementId === row.id; return <div className="settlement-row" key={row.id ?? `${row.fromUserId}-${row.toUserId}`}><div className="settlement-person"><span className="avatar" aria-hidden="true" style={{ backgroundColor: avatarColor(row.fromUserId, profiles.map((profile) => profile.id)) }}>{profileName(row.fromUserId).slice(0, 2).toUpperCase()}</span><span><strong>{profileName(row.fromUserId)}</strong><small><ArrowDownLeft size={12} aria-hidden="true" /> bayar ke {profileName(row.toUserId)}</small></span></div><div className="settlement-amount"><strong>{formatRupiah(row.amount)}</strong>{trip.status === "finalized" && row.id ? row.status === "paid" ? <span className="paid-tag"><Check size={12} aria-hidden="true" /> Sudah dibayar{row.paidAt ? ` · ${formatShortDate(row.paidAt.slice(0, 10))}` : ""}</span> : <Button variant="soft" size="small" onClick={() => onMarkPaid(row.id as string)} disabled={(!isCurrent && !isAdmin) || isPending}>{isPending ? "Menyimpan…" : "Tandai lunas"}</Button> : null}</div></div>; })}</div> : <div className="empty-state compact-empty"><span className="empty-mark" aria-hidden="true">—</span><h3>Tidak ada pembayaran untukmu.</h3><p>Kamu tidak terlibat dalam rencana transfer yang tersisa.</p></div>}</> : <div className="empty-state"><span className="empty-mark" aria-hidden="true">✓</span><h3>Semua beres.</h3><p>Tidak ada pembayaran antar-member yang tersisa.</p></div>}</section><aside className="side-stack"><section className="panel ledger-check-panel"><div className="panel-head"><div><p className="eyebrow">CEK SALDO</p><h2>Net balance</h2></div><ShieldCheck size={17} aria-hidden="true" /></div><div className="ledger-check-list">{ledgers.map((ledger) => <div key={ledger.userId}><span>{profileName(ledger.userId)}</span><strong className={ledger.balance > 0 ? "positive-text" : ledger.balance < 0 ? "negative-text" : ""}>{formatRupiah(ledger.balance, true)}</strong></div>)}</div><div className="net-total"><span>Jumlah bersih</span><strong>{formatRupiah(netSum, true)}</strong></div></section>{isReview && trip.status === "active" && isAdmin ? <section className="panel finalize-panel"><LockKeyhole size={19} aria-hidden="true" /><h2>Tutup trip setelah semua sepakat.</h2><p>Setelah trip difinalisasi, pengeluaran akan dikunci dan settlement akhir dibuat.</p><Button onClick={onFinalize} disabled={!valid || isFinalizing}><LockKeyhole size={15} aria-hidden="true" /> {isFinalizing ? "Mengunci…" : "Finalize trip"}</Button></section> : isReview && trip.status === "active" ? <div className="settlement-helper"><ShieldCheck size={15} aria-hidden="true" /><span>Hanya admin trip yang dapat menutup settlement.</span></div> : null}{trip.status === "finalized" && isAdmin ? <section className="panel finalize-panel"><Unlock size={19} aria-hidden="true" /><h2>Buka kembali bila perlu koreksi.</h2><p>Settlement pending akan dihapus agar trip bisa diedit dan difinalisasi ulang. Transfer yang sudah lunas tidak bisa dibuka kembali.</p><Button variant="soft" onClick={onUnlock} disabled={isUnlocking}><Unlock size={15} aria-hidden="true" /> {isUnlocking ? "Membuka…" : "Buka kembali trip"}</Button></section> : null}{trip.status === "finalized" && pendingCount > 0 ? <div className="settlement-helper"><ArrowUpRight size={15} aria-hidden="true" /><span>{pendingCount} transfer masih menunggu ditandai lunas.</span></div> : null}</aside></div>
  </div>;
}
