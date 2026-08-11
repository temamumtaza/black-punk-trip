"use client";

import { ListFilter, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, TextInput } from "@/components/ui";
import { ExpenseRow } from "@/components/expense-row";
import type { Expense, Profile } from "@/lib/types";
import { categoryLabels, formatRupiah } from "@/lib/format";

interface ExpenseListProps {
  expenses: Expense[];
  profiles: Profile[];
  onAdd: () => void;
  onOpen: (expenseId: string) => void;
}

export function ExpenseList({ expenses, profiles, onAdd, onOpen }: ExpenseListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | Expense["category"]>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const allocationCountsByExpenseId = useMemo(() => new Map(expenses.map((expense) => [
    expense.id,
    expense.allocations.reduce((count, allocation) => count + (allocation.amount > 0 ? 1 : 0), 0),
  ])), [expenses]);
  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const filtered = useMemo(() => expenses.filter((expense) => {
    const matchesQuery = `${expense.title} ${expense.notes ?? ""}`.toLowerCase().includes(normalizedQuery);
    return matchesQuery && (category === "all" || expense.category === category);
  }).sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)), [category, expenses, normalizedQuery]);

  const hasFilters = query.trim().length > 0 || category !== "all";
  return <div className="view-stack"><div className="page-head"><div><p className="eyebrow">CATATAN KEUANGAN TRIP</p><h1>Semua talangan</h1><p className="page-subtitle">Satu daftar untuk semua yang sudah keluar uang.</p></div><Button onClick={onAdd} size="small"><Plus size={16} /> Tambah</Button></div><section className="panel list-toolbar"><div className="search-field"><Search size={16} /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari pengeluaran…" aria-label="Cari pengeluaran" /></div><label className="filter-select"><ListFilter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} aria-label="Filter kategori"><option value="all">Semua kategori</option>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section><section className="panel expense-panel"><div className="panel-head"><div><p className="eyebrow">{filtered.length} CATATAN</p><h2>Urutan terbaru</h2></div><span className="panel-note">Total {formatRupiah(total)}</span></div>{filtered.length ? <div className="expense-list">{filtered.map((expense) => <ExpenseRow key={expense.id} expense={expense} payer={profileById.get(expense.paidBy)} allocationCount={allocationCountsByExpenseId.get(expense.id) ?? 0} onClick={() => onOpen(expense.id)} />)}</div> : <div className="empty-state compact-empty"><span className="empty-mark">{hasFilters ? "⌕" : "+"}</span><h3>{hasFilters ? "Nggak ketemu." : "Belum ada talangan."}</h3><p>{hasFilters ? "Coba kata kunci atau filter yang lain." : "Tambahkan pengeluaran pertama untuk mulai menghitung."}</p>{hasFilters ? null : <Button variant="ghost" size="small" onClick={onAdd}>Tambah Talangan</Button>}</div>}</section></div>;
}
