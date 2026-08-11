"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ExpenseDetail } from "@/components/expense-detail";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import { MembersView } from "@/components/members-view";
import { SettingsView } from "@/components/settings-view";
import { SettlementView } from "@/components/settlement-view";
import { TripFormView } from "@/components/trip-form-view";
import { TripHome } from "@/components/trip-home";
import { AppView, TripShell } from "@/components/trip-shell";
import { TripsView } from "@/components/trips-view";
import { Button } from "@/components/ui";
import { buildSettlementPreview, calculateMemberLedgers, validateTripExpenses } from "@/lib/finance";
import {
  createTrip,
  deleteExpense,
  finalizeTrip,
  getReceiptUrl,
  joinTrip,
  loadAppState,
  markSettlementPaid,
  RepositoryError,
  saveExpense,
  unlockTrip,
  uploadReceipt,
} from "@/lib/supabase/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppState, Expense, Profile, SettlementPreview } from "@/lib/types";

interface TripAppProps {
  initialView: AppView;
  initialUserId?: string;
  initialTripId?: string;
  initialJoinCode?: string;
  initialExpenseId?: string;
}

type LoadStatus = "loading" | "ready" | "error";

function errorMessage(error: unknown) {
  if (error instanceof RepositoryError) {
    if (error.code === "INVITE_NOT_FOUND") return "Kode gabung tidak ditemukan atau trip sudah ditutup.";
    if (error.code === "TRIP_LOCKED") return "Trip sudah ditutup dan tidak menerima perubahan lagi.";
    if (error.code === "EXPENSE_ACCESS_DENIED") return "Kamu tidak punya izin mengubah catatan ini.";
    if (error.code === "PROFILE_NOT_FOUND") return "Profil akun belum siap. Coba muat ulang.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Koneksi belum siap. Coba lagi.";
}

export function TripApp({ initialView, initialUserId, initialTripId, initialJoinCode, initialExpenseId }: TripAppProps) {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeTripId, setActiveTripId] = useState(initialTripId ?? "");
  const [view, setView] = useState<AppView>(initialView);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(initialExpenseId ?? null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [pendingSettlementId, setPendingSettlementId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const loadInFlight = useRef<Promise<void> | null>(null);
  const initialUserIdRef = useRef(initialUserId ?? "");

  const client = getSupabaseBrowserClient();

  async function load() {
    if (loadInFlight.current) return loadInFlight.current;

    const operation = (async () => {
      if (!client) {
        setStatus("error");
        setError("Supabase belum dikonfigurasi untuk environment ini.");
        return;
      }

      let userId = initialUserIdRef.current;
      if (!userId) {
        const userResponse = await client.auth.getUser();
        if (userResponse.error || !userResponse.data.user) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        userId = userResponse.data.user.id;
      }

      const nextState = await loadAppState(client, userId);
      setCurrentUserId(userId);
      setState(nextState);
      setActiveTripId((current) => initialTripId && !nextState.trips.some((trip) => trip.id === initialTripId)
        ? initialTripId
        : current && nextState.trips.some((trip) => trip.id === current) ? current : nextState.trips[0]?.id ?? "");
      setStatus("ready");
      setError("");
    })();
    loadInFlight.current = operation;
    try {
      await operation;
    } finally {
      if (loadInFlight.current === operation) loadInFlight.current = null;
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!client) {
      return () => { mounted = false; };
    }

    // Initial hydration intentionally synchronizes external Supabase state into this client shell.
    load().catch((loadError) => {
      if (mounted) {
        setStatus("error");
        setError(errorMessage(loadError));
      }
    });

    const { data: authListener } = client.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        router.replace("/login");
        return;
      }
      if (event === "USER_UPDATED") {
        window.setTimeout(() => load().catch(() => undefined), 0);
      }
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
    // The client is a stable singleton and the initial URL is intentionally read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navigate(nextView: AppView, nextTripId = activeTripId, nextExpenseId = selectedExpenseId ?? "") {
    setView(nextView);
    const query = nextTripId ? `&trip=${encodeURIComponent(nextTripId)}` : "";
    const expenseQuery = nextExpenseId && (nextView === "detail" || nextView === "edit-expense") ? `&expense=${encodeURIComponent(nextExpenseId)}` : "";
    const nextUrl = `/app?view=${nextView}${query}${expenseQuery}`;
    if (window.location.pathname === "/app") {
      window.history.replaceState(window.history.state, "", nextUrl);
    } else {
      router.replace(nextUrl);
    }
  }

  async function reload(nextTripId = activeTripId) {
    setActionError("");
    await load();
    if (nextTripId) setActiveTripId(nextTripId);
  }

  async function runAction(action: () => Promise<void>) {
    setActionError("");
    try {
      await action();
    } catch (actionFailure) {
      setActionError(errorMessage(actionFailure));
    }
  }

  function updateAppState(updater: (current: AppState) => AppState) {
    setState((current) => current ? updater(current) : current);
  }

  async function handleSaveExpense(expense: Expense) {
    if (!client) return;
    await runAction(async () => {
      const persistedExpense = await saveExpense(client, expense);
      updateAppState((current) => ({
        ...current,
        expenses: current.expenses.some((item) => item.id === persistedExpense.id)
          ? current.expenses.map((item) => item.id === persistedExpense.id ? persistedExpense : item)
          : [...current.expenses, persistedExpense],
      }));
      setSelectedExpenseId(persistedExpense.id);
      navigate("detail", expense.tripId, persistedExpense.id);
    });
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!client || !window.confirm("Hapus catatan ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeletingExpenseId(expenseId);
    try {
      await runAction(async () => {
        await deleteExpense(client, expenseId);
        updateAppState((current) => ({
          ...current,
          expenses: current.expenses.filter((expense) => expense.id !== expenseId),
        }));
        setSelectedExpenseId(null);
        navigate("expenses");
      });
    } finally {
      setDeletingExpenseId(null);
    }
  }

  async function handleMarkSettlementPaid(settlementId: string) {
    if (!client) return;
    setPendingSettlementId(settlementId);
    try {
      await runAction(async () => {
        const updatedSettlement = await markSettlementPaid(client, settlementId);
        updateAppState((current) => ({
          ...current,
          settlements: current.settlements.map((settlement) => settlement.id === updatedSettlement.id ? updatedSettlement : settlement),
        }));
      });
    } finally {
      setPendingSettlementId(null);
    }
  }

  async function handleFinalizeTrip() {
    if (!client || !trip || !window.confirm("Setelah ditutup, pengeluaran tidak bisa diubah lagi. Lanjutkan?")) return;
    if (currentMember?.role !== "admin") {
      setActionError("Hanya admin trip yang dapat memfinalisasi trip.");
      return;
    }
    setIsFinalizing(true);
    try {
      await runAction(async () => {
        const finalizedSettlements = await finalizeTrip(client, trip.id);
        updateAppState((current) => ({
          ...current,
          trips: current.trips.map((item) => item.id === trip.id
            ? { ...item, status: "finalized", finalizedAt: new Date().toISOString() }
            : item),
          settlements: [
            ...current.settlements.filter((settlement) => settlement.tripId !== trip.id),
            ...finalizedSettlements,
          ],
        }));
        navigate("settlement", trip.id);
      });
    } finally {
      setIsFinalizing(false);
    }
  }

  async function handleUnlockTrip() {
    if (!client || !trip || trip.status !== "finalized" || currentMember?.role !== "admin") {
      setActionError("Hanya admin trip yang dapat membuka kembali trip.");
      return;
    }
    if (!window.confirm("Buka kembali trip? Settlement pending akan dibuat ulang saat kamu finalize lagi.")) return;
    setIsUnlocking(true);
    try {
      await runAction(async () => {
        const reopenedTrip = await unlockTrip(client, trip.id);
        updateAppState((current) => ({
          ...current,
          trips: current.trips.map((item) => item.id === reopenedTrip.id ? reopenedTrip : item),
          settlements: current.settlements.filter((settlement) => settlement.tripId !== reopenedTrip.id),
        }));
        navigate("settlement", trip.id);
      });
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleCreateTrip(input: { name: string; description: string; startDate: string; endDate: string }) {
    if (!client) return;
    await runAction(async () => {
      const created = await createTrip(client, input);
      updateAppState((current) => ({
        ...current,
        trips: [...current.trips.filter((trip) => trip.id !== created.id), created],
        tripMembers: [
          ...current.tripMembers.filter((member) => !(member.tripId === created.id && member.userId === currentUserId)),
          { tripId: created.id, userId: currentUserId, role: "admin", joinedAt: created.createdAt },
        ],
      }));
      setActiveTripId(created.id);
      navigate("home", created.id);
    });
  }

  async function handleJoinTrip(code: string) {
    if (!client) return;
    await runAction(async () => {
      const tripId = await joinTrip(client, code);
      await reload(tripId);
      navigate("home", tripId);
    });
  }

  async function handleSignOut() {
    if (!client) return;
    await runAction(async () => {
      const response = await client.auth.signOut();
      if (response.error) throw response.error;
      router.replace("/login");
    });
  }

  async function handleUploadReceipt(tripId: string, file: File) {
    if (!client) throw new RepositoryError("Supabase belum siap.");
    return uploadReceipt(client, tripId, file);
  }

  const handleGetReceiptUrl = useCallback(async (path: string) => {
    if (!client) return null;
    return getReceiptUrl(client, path);
  }, [client]);

  const derived = useMemo(() => {
    const requestedTripMissing = Boolean(state && initialTripId && activeTripId === initialTripId && !state.trips.some((item) => item.id === initialTripId));
    const trip = requestedTripMissing ? undefined : state?.trips.find((item) => item.id === activeTripId) ?? state?.trips[0];
    const membersByTripId = new Map<string, AppState["tripMembers"]>();
    const expensesByTripId = new Map<string, Expense[]>();

    for (const member of state?.tripMembers ?? []) {
      const members = membersByTripId.get(member.tripId) ?? [];
      members.push(member);
      membersByTripId.set(member.tripId, members);
    }
    for (const expense of state?.expenses ?? []) {
      const expenses = expensesByTripId.get(expense.tripId) ?? [];
      expenses.push(expense);
      expensesByTripId.set(expense.tripId, expenses);
    }

    const tripMembers = trip ? membersByTripId.get(trip.id) ?? [] : [];
    const memberIds = tripMembers.map((member) => member.userId);
    const profileById = new Map((state?.profiles ?? []).map((profile) => [profile.id, profile]));
    const profiles = memberIds
      .map((userId) => profileById.get(userId))
      .filter((profile): profile is Profile => Boolean(profile));
    const expenses = trip ? expensesByTripId.get(trip.id) ?? [] : [];
    const settlements = state?.settlements.filter((settlement) => settlement.tripId === trip?.id) ?? [];
    const ledgers = trip ? calculateMemberLedgers(memberIds, expenses) : [];
    let preview: SettlementPreview[] = [];
    let settlementCalculationError = "";
    try {
      preview = buildSettlementPreview(ledgers);
    } catch (calculationError) {
      settlementCalculationError = calculationError instanceof Error ? calculationError.message : "Saldo trip belum valid.";
    }

    const memberCountsByTrip: Record<string, number> = {};
    const ledgersByTrip: Record<string, { userId: string; paid: number; share: number; balance: number }> = {};
    const totalsByTrip: Record<string, number> = {};
    for (const item of state?.trips ?? []) {
      const tripMemberRows = membersByTripId.get(item.id) ?? [];
      const tripExpenses = expensesByTripId.get(item.id) ?? [];
      const tripLedgers = calculateMemberLedgers(tripMemberRows.map((member) => member.userId), tripExpenses);
      memberCountsByTrip[item.id] = tripMemberRows.length;
      ledgersByTrip[item.id] = tripLedgers.find((ledger) => ledger.userId === currentUserId) ?? { userId: currentUserId, paid: 0, share: 0, balance: 0 };
      totalsByTrip[item.id] = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    return {
      requestedTripMissing,
      trip,
      tripMembers,
      memberIds,
      profiles,
      expenses,
      settlements,
      ledgers,
      preview,
      validationErrors: [...validateTripExpenses(expenses, memberIds), ...(settlementCalculationError ? [settlementCalculationError] : [])],
      currentProfile: profileById.get(currentUserId),
      selectedExpense: state?.expenses.find((expense) => expense.id === selectedExpenseId && expense.tripId === trip?.id),
      currentMember: tripMembers.find((member) => member.userId === currentUserId),
      creatorName: trip ? profileById.get(trip.createdBy)?.displayName ?? "Anggota trip" : "Anggota trip",
      memberCountsByTrip,
      ledgersByTrip,
      totalsByTrip,
    };
  }, [activeTripId, currentUserId, initialTripId, selectedExpenseId, state]);
  const {
    requestedTripMissing,
    trip,
    tripMembers,
    profiles,
    expenses,
    settlements,
    ledgers,
    preview,
    validationErrors,
    currentProfile,
    selectedExpense,
    currentMember,
    creatorName,
    memberCountsByTrip,
    ledgersByTrip,
    totalsByTrip,
  } = derived;

  if (!client) return <AppError message="Supabase belum dikonfigurasi untuk environment ini." onRetry={() => window.location.reload()} onLogin={() => router.push("/login")} />;
  if (status === "loading") return <AppLoading />;
  if (status === "error" || !state || !currentProfile) return <AppError message={error || "Akun belum siap."} onRetry={() => load().catch((loadError) => setError(errorMessage(loadError)))} onLogin={() => router.push("/login")} />;

  if (requestedTripMissing) {
    return <TripNotFoundView onBack={() => { setActiveTripId(state.trips[0]?.id ?? ""); navigate("trips", state.trips[0]?.id ?? ""); }} />;
  }

  if (!state.trips.length || !trip) {
    if (view === "create-trip" || view === "join-trip") {
      return <main className="onboarding-shell"><div className="onboarding-brand"><BrandMark compact href="/" /></div><TripFormView mode={view === "join-trip" ? "join" : "create"} initialCode={initialJoinCode} onBack={() => setView("trips")} onCreate={handleCreateTrip} onJoin={handleJoinTrip} error={actionError} /></main>;
    }
    return <NoTripsView profile={currentProfile} actionError={actionError} onCreate={() => setView("create-trip")} onJoin={() => setView("join-trip")} onSignOut={handleSignOut} />;
  }

  const isAdmin = currentMember?.role === "admin";
  const common = { trip, currentProfile, activeView: view, isAdmin, onNavigate: navigate, onSignOut: handleSignOut };
  if ((view === "detail" || view === "edit-expense") && !selectedExpense) {
    return <TripShell {...common}><section className="panel missing-state"><p className="eyebrow">CATATAN TIDAK DITEMUKAN</p><h1>Talangan ini tidak tersedia.</h1><p>Catatan mungkin sudah dihapus atau kamu tidak punya akses ke trip tersebut.</p><Button variant="ghost" onClick={() => navigate("expenses")}>Kembali ke talangan</Button></section></TripShell>;
  }
  return <TripShell {...common}>
    {actionError ? <div className="app-alert" role="alert">{actionError}</div> : null}
    {view === "home" ? <TripHome trip={trip} profiles={profiles} expenses={expenses} ledger={ledgers} currentUserId={currentUserId} isAdmin={currentMember?.role === "admin"} onNavigate={navigate} onOpenExpense={(id) => { setSelectedExpenseId(id); navigate("detail", trip.id, id); }} /> : null}
    {view === "expenses" ? <ExpenseList expenses={expenses} profiles={profiles} onAdd={() => navigate("add-expense")} onOpen={(id) => { setSelectedExpenseId(id); navigate("detail", trip.id, id); }} /> : null}
    {view === "members" ? <MembersView profiles={profiles} members={tripMembers} ledgers={ledgers} currentUserId={currentUserId} /> : null}
    {view === "settlement" || view === "review" ? <SettlementView trip={trip} profiles={profiles} ledgers={ledgers} preview={preview} settlements={settlements} validationErrors={validationErrors} currentUserId={currentUserId} isReview={view === "review" && isAdmin} isAdmin={isAdmin} pendingSettlementId={pendingSettlementId} isFinalizing={isFinalizing} isUnlocking={isUnlocking} onMarkPaid={handleMarkSettlementPaid} onFinalize={handleFinalizeTrip} onUnlock={handleUnlockTrip} /> : null}
    {view === "settings" ? <SettingsView trip={trip} creatorName={creatorName} isAdmin={isAdmin} onReview={() => navigate("review")} onManageTrips={() => navigate("trips")} onSignOut={handleSignOut} /> : null}
    {view === "add-expense" ? <ExpenseForm members={profiles} currentUserId={currentUserId} tripId={trip.id} locked={trip.status === "finalized"} onSubmit={handleSaveExpense} onUploadReceipt={handleUploadReceipt} onCancel={() => navigate("home")} /> : null}
    {view === "edit-expense" && selectedExpense ? <ExpenseForm members={profiles} currentUserId={currentUserId} tripId={trip.id} initialExpense={selectedExpense} locked={trip.status === "finalized" || (selectedExpense.createdBy !== currentUserId && currentMember?.role !== "admin")} onSubmit={handleSaveExpense} onUploadReceipt={handleUploadReceipt} onCancel={() => navigate("detail")} /> : null}
    {view === "detail" && selectedExpense ? <ExpenseDetail expense={selectedExpense} trip={trip} profiles={profiles} currentUserId={currentUserId} canEdit={selectedExpense.createdBy === currentUserId || currentMember?.role === "admin"} isDeleting={deletingExpenseId === selectedExpense.id} onBack={() => navigate("expenses")} onEdit={() => navigate("edit-expense")} onDelete={() => handleDeleteExpense(selectedExpense.id)} onGetReceiptUrl={handleGetReceiptUrl} /> : null}
    {view === "trips" ? <TripsView trips={state.trips} memberCountsByTrip={memberCountsByTrip} ledgersByTrip={ledgersByTrip} totalsByTrip={totalsByTrip} activeTripId={trip.id} onOpen={(tripId) => { setActiveTripId(tripId); navigate("home", tripId); }} onCreate={() => navigate("create-trip")} onJoin={() => navigate("join-trip")} /> : null}
    {view === "create-trip" || view === "join-trip" ? <TripFormView mode={view === "join-trip" ? "join" : "create"} initialCode={initialJoinCode} onBack={() => navigate("trips")} onCreate={handleCreateTrip} onJoin={handleJoinTrip} error={actionError} /> : null}
  </TripShell>;
}

function AppLoading() {
  return <main className="error-screen"><span className="status-dot" /><p className="eyebrow">BLACK PUNK TRIP</p><h1>Menyiapkan ruangmu.</h1><p>Mengambil trip dan catatan yang tersimpan.</p></main>;
}

function AppError({ message, onRetry, onLogin }: { message: string; onRetry: () => void; onLogin: () => void }) {
  return <main className="error-screen"><p className="eyebrow">KONEKSI BELUM SIAP</p><h1>Data belum terbuka.</h1><p>{message}</p><div className="error-actions"><Button onClick={onRetry}>Coba lagi</Button><Button variant="ghost" onClick={onLogin}>Kembali ke login</Button></div></main>;
}

function NoTripsView({ profile, actionError, onCreate, onJoin, onSignOut }: { profile: Profile; actionError: string; onCreate: () => void; onJoin: () => void; onSignOut: () => void }) {
  return <main className="no-trips-shell"><div className="no-trips-topbar"><BrandMark compact href="/" /><button className="account-mini" onClick={onSignOut} type="button"><span className="avatar">{profile.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{profile.displayName}</strong><small>Akun aktif</small></span></button></div><section className="no-trips-card"><p className="eyebrow">RUANG PERTAMAMU</p><h1>Belum ada trip.</h1><p>Bikin ruang baru atau masuk ke trip teman dengan kode undangan. Semua data akan tersimpan di akunmu.</p>{actionError ? <div className="app-alert" role="alert">{actionError}</div> : null}<div className="no-trips-actions"><Button onClick={onCreate}>Bikin trip baru</Button><Button variant="ghost" onClick={onJoin}>Gabung dengan kode</Button></div></section></main>;
}

function TripNotFoundView({ onBack }: { onBack: () => void }) {
  return <main className="error-screen"><p className="eyebrow">TRIP TIDAK DITEMUKAN</p><h1>Ruang ini tidak terbuka.</h1><p>Trip tersebut tidak ada atau akunmu belum menjadi anggotanya.</p><Button variant="ghost" onClick={onBack}>Kembali ke daftar trip</Button></main>;
}
