"use client";

import { ArrowUpRight, BanknoteArrowDown, ChevronRight, Plus, Rows3, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui";
import { AvatarStack, ExpenseRow } from "@/components/expense-row";
import type { Expense, MemberLedger, Profile, Trip } from "@/lib/types";
import { formatRupiah, formatTripDates } from "@/lib/format";

interface TripHomeProps {
  trip: Trip;
  profiles: Profile[];
  expenses: Expense[];
  ledger: MemberLedger[];
  currentUserId: string;
  isAdmin: boolean;
  onNavigate: (view: "add-expense" | "expenses" | "members" | "settlement" | "review" | "trips") => void;
  onOpenExpense: (expenseId: string) => void;
}

export function TripHome({ trip, profiles, expenses, ledger, currentUserId, isAdmin, onNavigate, onOpenExpense }: TripHomeProps) {
  const myLedger = ledger.find((item) => item.userId === currentUserId) ?? { balance: 0, paid: 0, share: 0 };
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)).slice(0, 3), [expenses]);
  const allocationCountsByExpenseId = useMemo(() => new Map(sortedExpenses.map((expense) => [
    expense.id,
    expense.allocations.reduce((count, allocation) => count + (allocation.amount > 0 ? 1 : 0), 0),
  ])), [sortedExpenses]);
  const currentProfile = profileById.get(currentUserId);

  return <div className="view-stack view-stack-home">
    <div className="page-head home-head"><div><p className="eyebrow">{trip.status === "finalized" ? "TRIP SELESAI" : "TRIP AKTIF"}</p><h1>{trip.name}</h1><p className="page-subtitle">{formatTripDates(trip)} <span className="subtle-separator">·</span> {profiles.length} orang ikut jalan</p></div><AvatarStack profiles={profiles} /></div>
    <section className="summary-panel">
      <div className="summary-panel-main"><p className="eyebrow">TOTAL PENGELUARAN</p><div className="summary-total">{formatRupiah(total)}</div><p className="summary-support">{expenses.length} catatan talangan selama trip ini</p></div>
      <div className={`balance-block ${myLedger.balance > 0 ? "is-positive" : myLedger.balance < 0 ? "is-negative" : "is-zero"}`}><span className="balance-label">SALDO KAMU</span><strong>{formatRupiah(myLedger.balance, true)}</strong><span>{myLedger.balance > 0 ? "Kamu harus menerima" : myLedger.balance < 0 ? "Kamu masih harus bayar" : "Kamu sudah beres"}</span></div>
    </section>
    <div className="home-actions"><Button className="add-expense-button" onClick={() => onNavigate("add-expense")} disabled={trip.status === "finalized"}><Plus size={18} /> Tambah Talangan</Button><button className="plain-action" onClick={() => onNavigate("settlement")} type="button"><BanknoteArrowDown size={16} /> Cek settlement <ArrowUpRight size={14} /></button><button className="plain-action" onClick={() => onNavigate("trips")} type="button"><Rows3 size={16} /> Kelola trip <ArrowUpRight size={14} /></button></div>
    <div className="content-grid content-grid-home">
      <section className="panel expense-panel"><div className="panel-head"><div><p className="eyebrow">YANG TERBARU</p><h2>Catatan talangan</h2></div><button className="text-link small-link" onClick={() => onNavigate("expenses")} type="button">Lihat semua <ChevronRight size={14} /></button></div>{sortedExpenses.length ? <div className="expense-list">{sortedExpenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} payer={profileById.get(expense.paidBy)} allocationCount={allocationCountsByExpenseId.get(expense.id) ?? 0} onClick={() => onOpenExpense(expense.id)} />)}</div> : <EmptyExpenses onAdd={() => onNavigate("add-expense")} />}</section>
      <aside className="side-stack"><section className="panel next-panel"><div className="next-panel-icon"><Sparkles size={17} /></div><p className="eyebrow">LANGKAH BERIKUTNYA</p><h2>{trip.status === "finalized" ? "Trip sudah ditutup." : "Semua pengeluaran sudah tercatat?"}</h2><p>{trip.status === "finalized" ? "Settlement tetap bisa ditandai sudah dibayar dari halaman settlement." : isAdmin ? "Review saldo semua orang sebelum menutup trip ini." : "Lihat saldo dan rencana transfer untuk trip ini."}</p><button className="card-link" onClick={() => onNavigate(trip.status === "finalized" || !isAdmin ? "settlement" : "review")} type="button">{trip.status === "finalized" || !isAdmin ? "Buka settlement" : "Review sekarang"} <ArrowUpRight size={14} /></button></section><section className="panel mini-ledger"><div className="panel-head"><div><p className="eyebrow">RINGKAS CEPAT</p><h2>{currentProfile?.displayName ?? "Kamu"}</h2></div></div><div className="mini-ledger-row"><span>Total bayar</span><strong>{formatRupiah(myLedger.paid)}</strong></div><div className="mini-ledger-row"><span>Bagian kamu</span><strong>{formatRupiah(myLedger.share)}</strong></div><div className="mini-ledger-row mini-ledger-total"><span>Saldo akhir</span><strong>{formatRupiah(myLedger.balance, true)}</strong></div><button className="text-link small-link" onClick={() => onNavigate("members")} type="button">Bandingkan dengan anggota lain <ChevronRight size={14} /></button></section></aside>
    </div>
  </div>;
}

function EmptyExpenses({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><span className="empty-mark">+</span><h3>Belum ada yang nombok.</h3><p>Jadi orang pertama yang talangin sesuatu di trip ini.</p><Button variant="ghost" size="small" onClick={onAdd}>Tambah Talangan</Button></div>;
}
