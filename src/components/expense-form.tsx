"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, FileUp, RotateCcw } from "lucide-react";
import { Button, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { DatePicker } from "@/components/date-picker";
import { ExpenseCategoryIcon } from "@/components/expense-category-icon";
import type { Expense, ExpenseCategory, Profile, SplitType } from "@/lib/types";
import {
  categoryLabels,
  avatarColor,
  formatDateInput,
  formatRupiah,
  formatRupiahInput,
  parseDateInput,
  parseRupiahInput,
} from "@/lib/format";
import { allocationsReconcile, splitEvenly, sumAmounts } from "@/lib/finance";

export interface ExpenseFormProps {
  members: Profile[];
  currentUserId: string;
  tripId: string;
  initialExpense?: Expense;
  locked?: boolean;
  onSubmit: (expense: Expense) => Promise<void> | void;
  onUploadReceipt?: (tripId: string, file: File) => Promise<string>;
  onCancel: () => void;
}

export function ExpenseForm({ members, currentUserId, tripId, initialExpense, locked = false, onSubmit, onUploadReceipt, onCancel }: ExpenseFormProps) {
  const payingMembers = useMemo(() => members.filter((member) => !member.isGuest), [members]);
  const [title, setTitle] = useState(initialExpense?.title ?? "");
  const [amountText, setAmountText] = useState(initialExpense ? formatRupiahInput(initialExpense.amount) : "");
  const [paidBy, setPaidBy] = useState(initialExpense?.paidBy ?? currentUserId);
  const [expenseDate, setExpenseDate] = useState(initialExpense ? formatDateInput(initialExpense.expenseDate) : formatDateInput(new Date().toISOString().slice(0, 10)));
  const [category, setCategory] = useState<ExpenseCategory>(initialExpense?.category ?? "food");
  const [notes, setNotes] = useState(initialExpense?.notes ?? "");
  const [splitType, setSplitType] = useState<SplitType>(initialExpense?.splitType ?? "equal");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialExpense?.allocations.filter((item) => item.amount > 0).map((item) => item.userId) ?? members.map((member) => member.id));
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => Object.fromEntries(initialExpense?.allocations.map((item) => [item.userId, formatRupiahInput(item.amount)]) ?? []));
  const [receiptName, setReceiptName] = useState(initialExpense?.receiptUrl?.split("/").pop() ?? "");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const parsedAmount = parseRupiahInput(amountText);
  const amountInvalid = amountText.length > 0 && !Number.isSafeInteger(parsedAmount);
  const amount = amountInvalid ? 0 : parsedAmount;

  const allocationMap = useMemo<Record<string, number>>(() => {
    if (splitType === "equal") return splitEvenly(amount, members.map((member) => member.id));
    if (splitType === "selected_equal") return splitEvenly(amount, selectedIds);
    return Object.fromEntries(selectedIds.map((userId) => [userId, parseRupiahInput(customAmounts[userId] ?? "")]));
  }, [amount, customAmounts, members, selectedIds, splitType]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const assigned = sumAmounts(Object.values(allocationMap));
  const reconciles = allocationsReconcile(amount, Object.entries(allocationMap).map(([userId, value]) => ({ userId, amount: value })));
  const customAmountsInvalid = splitType === "custom" && selectedIds.some((userId) => !Number.isSafeInteger(parseRupiahInput(customAmounts[userId] ?? "")));

  function toggleMember(userId: string) {
    setSelectedIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
    setCustomAmounts((current) => ({ ...current, [userId]: current[userId] ?? "0" }));
  }

  function resetSplit() {
    setSplitType("equal");
    setSelectedIds(members.map((member) => member.id));
    setCustomAmounts({});
  }

  async function handleSubmit() {
    if (locked) return;
    if (amountInvalid) {
      setError("Jumlah talangan terlalu besar. Gunakan nominal Rupiah yang lebih kecil.");
      return;
    }
    const expenseDateIso = parseDateInput(expenseDate);
    if (!title.trim() || amount <= 0 || !expenseDateIso) {
      setError("Isi judul, jumlah, dan tanggal dulu.");
      return;
    }
    if (!payingMembers.some((member) => member.id === paidBy)) {
      setError("Pilih anggota yang benar-benar membayar.");
      return;
    }
    if (customAmountsInvalid) {
      setError("Nominal custom belum valid. Gunakan angka Rupiah bulat.");
      return;
    }
    if (selectedIds.length === 0 || !reconciles) {
      setError("Bagian tiap orang belum pas dengan total talangan.");
      return;
    }
    if (receiptFile && !onUploadReceipt) {
      setError("Upload bukti belum tersedia. Muat ulang aplikasi lalu coba lagi.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const receiptUrl = receiptFile && onUploadReceipt ? await onUploadReceipt(tripId, receiptFile) : initialExpense?.receiptUrl ?? null;
      const id = initialExpense?.id ?? "";
      await onSubmit({
        id,
        tripId: initialExpense?.tripId ?? tripId,
        title: title.trim(),
        notes: notes.trim() || null,
        category,
        amount,
        expenseDate: expenseDateIso,
        paidBy,
        createdBy: initialExpense?.createdBy ?? currentUserId,
        splitType,
        receiptUrl,
        createdAt: initialExpense?.createdAt ?? "",
        updatedAt: new Date().toISOString(),
        allocations: Object.entries(allocationMap).filter(([, value]) => value > 0).map(([userId, value]) => ({ id: "", expenseId: id, userId, amount: value })),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Talangan belum tersimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="view-stack form-view">
      <div className="page-head"><div><button className="back-link inline-back" onClick={onCancel} type="button"><ArrowLeft size={15} /> Kembali</button><p className="eyebrow">{initialExpense ? "KOREKSI CATATAN" : "CATAT PENGELUARAN"}</p><h1>{initialExpense ? "Edit talangan" : "Tambah talangan"}</h1><p className="page-subtitle">Tulis singkat. Pembagiannya bisa kamu atur di bawah.</p></div></div>
      <div className="form-layout">
        <section className="panel expense-form-panel">
          <Field label="Jumlah talangan" htmlFor="expense-amount" hint="Otomatis pakai titik"><div className="amount-input-wrap"><span aria-hidden="true">Rp</span><input id="expense-amount" className="amount-input" inputMode="numeric" value={amountText} onChange={(event) => setAmountText(formatRupiahInput(event.target.value))} placeholder="0" disabled={locked} /></div></Field>
          <Field label="Untuk apa?" htmlFor="expense-title"><TextInput id="expense-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Misalnya: pengeluaran bersama" maxLength={160} disabled={locked} /></Field>
          <div className="two-fields"><Field label="Dibayar oleh" htmlFor="expense-payer"><SelectInput id="expense-payer" value={paidBy} onChange={(event) => setPaidBy(event.target.value)} disabled={locked}>{payingMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</SelectInput></Field><Field label="Tanggal" htmlFor="expense-date" hint="Pilih dari kalender"><DatePicker id="expense-date" ariaLabel="Tanggal talangan" value={expenseDate} onChange={setExpenseDate} disabled={locked} /></Field></div>
          <Field label="Kategori"><div className="category-grid">{Object.entries(categoryLabels).map(([value, label]) => <button className={`category-chip ${category === value ? "is-selected" : ""}`} key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value as ExpenseCategory)} disabled={locked}><ExpenseCategoryIcon category={value as ExpenseCategory} size={15} />{label}</button>)}</div></Field>
          <Field label="Catatan" htmlFor="expense-notes" hint="Opsional"><TextArea id="expense-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Konteks kecil biar nggak lupa…" rows={3} disabled={locked} /></Field>
          <Field label="Bukti pembayaran" hint="Opsional"><label className={`upload-box ${receiptName ? "has-file" : ""}`}><FileUp size={18} aria-hidden="true" /><span>{receiptName || "Pilih foto struk dari perangkat"}</span><small>{receiptName ? "Bukti akan diunggah saat disimpan" : "JPG, PNG, HEIC, atau WebP · maksimal 8 MB"}</small><input id="expense-receipt" type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp" aria-label="Pilih bukti pembayaran" onChange={(event) => { const file = event.target.files?.[0] ?? null; const allowedTypes = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]; if (file && (!allowedTypes.includes(file.type) || file.size > 8 * 1024 * 1024)) { event.currentTarget.value = ""; setReceiptFile(null); setReceiptName(""); setError("Bukti harus berupa JPG, PNG, HEIC, atau WebP maksimal 8 MB."); return; } setError(""); setReceiptFile(file); setReceiptName(file?.name ?? ""); }} disabled={locked} /></label></Field>
        </section>
        <aside className="panel split-panel">
          <div className="panel-head split-heading"><div><p className="eyebrow">BAGIAN TIAP ORANG</p><h2>Atur pembagian</h2></div><button className="icon-btn" type="button" onClick={resetSplit} aria-label="Reset pembagian"><RotateCcw size={15} /></button></div>
          <div className="segmented-control" role="tablist" aria-label="Metode pembagian"><button id="split-tab-equal" role="tab" aria-selected={splitType === "equal"} aria-controls="split-options" type="button" className={splitType === "equal" ? "is-active" : ""} onClick={() => setSplitType("equal")} disabled={locked}>Rata</button><button id="split-tab-selected" role="tab" aria-selected={splitType === "selected_equal"} aria-controls="split-options" type="button" className={splitType === "selected_equal" ? "is-active" : ""} onClick={() => setSplitType("selected_equal")} disabled={locked}>Pilih orang</button><button id="split-tab-custom" role="tab" aria-selected={splitType === "custom"} aria-controls="split-options" type="button" className={splitType === "custom" ? "is-active" : ""} onClick={() => setSplitType("custom")} disabled={locked}>Custom</button></div>
          <div id="split-options" role="tabpanel" aria-labelledby={splitType === "equal" ? "split-tab-equal" : splitType === "selected_equal" ? "split-tab-selected" : "split-tab-custom"}>{splitType === "equal" ? <div className="split-explainer"><span className="split-explainer-mark" aria-hidden="true">÷</span><div><strong>Dibagi rata ke semua anggota</strong><p>{members.length} orang · masing-masing {formatRupiah(allocationMap[members[0]?.id] ?? 0)}</p></div></div> : <div className="member-check-list">{members.map((member) => { const isSelected = selectedIdSet.has(member.id); return <label className={`member-check-row ${isSelected ? "is-selected" : ""}`} key={member.id}><input type="checkbox" checked={isSelected} onChange={() => toggleMember(member.id)} disabled={locked} aria-label={`Bagi ke ${member.displayName}`} /><span className="avatar avatar-small" aria-hidden="true" style={{ backgroundColor: avatarColor(member.id, members.map((item) => item.id)) }}>{member.displayName.slice(0, 2).toUpperCase()}</span><span className="member-check-name">{member.displayName}{member.isGuest ? <small> · manual</small> : null}</span>{splitType === "custom" && isSelected ? <input className="mini-amount-input" inputMode="numeric" value={customAmounts[member.id] ?? ""} onChange={(event) => setCustomAmounts((current) => ({ ...current, [member.id]: formatRupiahInput(event.target.value) }))} onClick={(event) => event.stopPropagation()} disabled={locked} aria-label={`Nominal ${member.displayName}`} /> : <span className="member-allocation">{isSelected ? formatRupiah(allocationMap[member.id] ?? 0) : "—"}</span>}</label>; })}</div>}</div>
          <div className={`reconcile-box ${reconciles ? "is-valid" : "is-invalid"}`}><div><span>Terbagi</span><strong>{Number.isSafeInteger(assigned) ? formatRupiah(assigned) : "Nominal belum valid"} <small>/ {formatRupiah(amount)}</small></strong></div><span className="reconcile-status" role="status">{reconciles ? <><Check size={14} aria-hidden="true" /> Pas</> : customAmountsInvalid ? <>Nominal belum valid</> : <>Sisa {formatRupiah(Math.abs(amount - assigned))}</>}</span></div>{amountInvalid ? <p className="form-note" role="alert">Nominal terlalu besar untuk diproses dengan aman.</p> : customAmountsInvalid ? <p className="form-note" role="alert">Isi nominal custom dengan angka Rupiah bulat.</p> : selectedIds.length === 0 ? <p className="form-note">Pilih minimal satu orang untuk membagi talangan.</p> : null}
        </aside>
      </div>
      {error ? <div className="inline-error" role="alert">{error}</div> : null}
      <div className="form-actions"><Button variant="ghost" onClick={onCancel}>Batal</Button><Button onClick={handleSubmit} disabled={locked || isSaving || !reconciles || amount <= 0 || amountInvalid}>{isSaving ? "Menyimpan…" : initialExpense ? "Simpan koreksi" : "Simpan talangan"}<ArrowUpRightIcon /></Button></div>
    </div>
  );
}

function ArrowUpRightIcon() {
  return <span aria-hidden="true">↗</span>;
}
