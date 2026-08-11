"use client";

import { ArrowLeft, ArrowUpRight, CalendarDays, FileText, Pencil, Trash2, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExpenseCategoryIcon } from "@/components/expense-category-icon";
import { Button } from "@/components/ui";
import type { Expense, Profile, Trip } from "@/lib/types";
import { categoryLabels, formatRupiah, formatShortDate } from "@/lib/format";

interface ExpenseDetailProps {
  expense: Expense;
  trip: Trip;
  profiles: Profile[];
  currentUserId: string;
  canEdit: boolean;
  isDeleting?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGetReceiptUrl?: (path: string) => Promise<string | null>;
}

export function ExpenseDetail({ expense, trip, profiles, currentUserId, canEdit, isDeleting = false, onBack, onEdit, onDelete, onGetReceiptUrl }: ExpenseDetailProps) {
  const [receiptState, setReceiptState] = useState<{ path: string; href: string | null; loading: boolean; error: boolean } | null>(null);
  const [openReceiptPath, setOpenReceiptPath] = useState<string | null>(null);
  const [failedPreviewPath, setFailedPreviewPath] = useState<string | null>(null);
  const closeReceiptButtonRef = useRef<HTMLButtonElement>(null);
  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const visibleAllocations = useMemo(() => expense.allocations
    .filter((allocation) => allocation.amount > 0)
    .map((allocation) => ({ allocation, profile: profileById.get(allocation.userId) })), [expense.allocations, profileById]);
  const payer = profileById.get(expense.paidBy);
  const creator = profileById.get(expense.createdBy);

  useEffect(() => {
    let mounted = true;
    if (!expense.receiptUrl || !onGetReceiptUrl) return () => { mounted = false; };
    onGetReceiptUrl(expense.receiptUrl)
      .then((url) => { if (mounted) setReceiptState({ path: expense.receiptUrl as string, href: url, loading: false, error: false }); })
      .catch(() => { if (mounted) setReceiptState({ path: expense.receiptUrl as string, href: null, loading: false, error: true }); });
    return () => { mounted = false; };
  }, [expense.receiptUrl, onGetReceiptUrl]);

  const currentReceipt = expense.receiptUrl && receiptState?.path === expense.receiptUrl ? receiptState : null;
  const receiptLoading = Boolean(expense.receiptUrl && onGetReceiptUrl && !currentReceipt);
  const receiptHref = currentReceipt?.href ?? null;
  const receiptError = currentReceipt?.error ?? false;
  const isReceiptOpen = Boolean(expense.receiptUrl && openReceiptPath === expense.receiptUrl && receiptHref);
  const previewFailed = Boolean(expense.receiptUrl && failedPreviewPath === expense.receiptUrl);

  function closeReceipt() {
    setOpenReceiptPath(null);
  }

  function openReceipt() {
    if (!expense.receiptUrl) return;
    setFailedPreviewPath(null);
    setOpenReceiptPath(expense.receiptUrl);
  }

  function handlePreviewError() {
    if (expense.receiptUrl) setFailedPreviewPath(expense.receiptUrl);
  }

  useEffect(() => {
    if (!isReceiptOpen) return;
    closeReceiptButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenReceiptPath(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isReceiptOpen]);

  return <div className="view-stack detail-view">
    <div className="detail-top">
      <button className="back-link" onClick={onBack} type="button"><ArrowLeft size={15} /> Semua talangan</button>
      {canEdit && trip.status === "active" ? <div className="detail-actions"><Button variant="ghost" size="small" onClick={onEdit}><Pencil size={15} /> Edit</Button><Button variant="ghost" size="small" onClick={onDelete} disabled={isDeleting}><Trash2 size={15} /> {isDeleting ? "Menghapus…" : "Hapus"}</Button></div> : null}
    </div>
    <section className="detail-hero panel">
      <div className="detail-symbol"><ExpenseCategoryIcon category={expense.category} size={22} strokeWidth={1.65} /></div>
      <p className="eyebrow">{categoryLabels[expense.category]} · {formatShortDate(expense.expenseDate)}</p>
      <h1>{expense.title}</h1>
      <div className="detail-amount">{formatRupiah(expense.amount)}</div>
      <p className="detail-payer">Dibayar oleh <strong>{payer?.displayName ?? "Anggota"}</strong></p>
    </section>
    <div className="detail-grid">
      <section className="panel">
        <div className="panel-head"><div><p className="eyebrow">PEMBAGIAN</p><h2>Bagian tiap orang</h2></div><span className="split-badge">{expense.splitType === "equal" ? "Rata" : expense.splitType === "selected_equal" ? "Pilih orang" : "Custom"}</span></div>
        <div className="allocation-list">{visibleAllocations.map(({ allocation, profile }) => <div className="allocation-row" key={allocation.id || `${expense.id}-${allocation.userId}`}><span className="avatar avatar-small" aria-hidden="true">{profile?.displayName.slice(0, 2).toUpperCase()}</span><span>{profile?.displayName ?? "Anggota"}{allocation.userId === currentUserId ? <small> · kamu</small> : null}</span><strong>{formatRupiah(allocation.amount)}</strong></div>)}</div>
      </section>
      <aside className="side-stack">
        <section className="panel detail-meta-panel">
          <div className="meta-line"><CalendarDays size={16} aria-hidden="true" /><span>Tanggal pengeluaran</span><strong>{formatShortDate(expense.expenseDate)}</strong></div>
          <div className="meta-line"><UserRound size={16} aria-hidden="true" /><span>Dicatat oleh</span><strong>{creator?.displayName ?? "Anggota"}</strong></div>
          {expense.notes ? <div className="detail-notes"><FileText size={16} aria-hidden="true" /><p>{expense.notes}</p></div> : null}
          {expense.receiptUrl ? <div className="receipt-placeholder"><span>Bukti pembayaran tersimpan</span><small>{expense.receiptUrl.split("/").pop()}</small>{receiptLoading ? <small role="status">Menyiapkan tampilan aman…</small> : receiptHref ? <button className="text-link small-link" type="button" onClick={openReceipt}>Lihat bukti</button> : receiptError ? <small role="alert">Bukti belum bisa dibuka. Coba lagi.</small> : null}</div> : null}
        </section>
        <div className="panel detail-lock-note"><ArrowUpRight size={16} aria-hidden="true" /><span>{trip.status === "finalized" ? "Trip sudah difinalisasi. Catatan ini terkunci." : "Butuh koreksi? Pembuat catatan atau admin bisa mengedit selama trip aktif."}</span></div>
      </aside>
    </div>
    {isReceiptOpen && receiptHref && typeof document !== "undefined" ? createPortal(<div className="receipt-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReceipt(); }}>
      <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title" aria-describedby="receipt-modal-description">
        <header className="receipt-modal-head"><div><p className="eyebrow">BUKTI PEMBAYARAN</p><h2 id="receipt-modal-title">{expense.title}</h2><p id="receipt-modal-description">Geser untuk melihat struk. Tutup kapan saja untuk kembali ke detail talangan.</p></div><button className="receipt-modal-close" type="button" onClick={closeReceipt} ref={closeReceiptButtonRef} aria-label="Tutup bukti pembayaran"><X size={20} aria-hidden="true" /></button></header>
        <div className="receipt-modal-viewer">{previewFailed ? <div className="receipt-preview-fallback"><strong>Preview belum tersedia.</strong><p>Format bukti ini tersimpan aman, tetapi belum bisa ditampilkan langsung di perangkat ini.</p></div> : <Image className="receipt-modal-image" src={receiptHref} alt={`Bukti pembayaran ${expense.title}`} width={1600} height={1600} unoptimized onError={handlePreviewError} />}</div>
      </section>
    </div>, document.body) : null}
  </div>;
}
