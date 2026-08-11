import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database";
import { allocationsReconcile } from "@/lib/finance";
import type { AppState, Expense, MemberRole, Profile, Settlement, Trip, TripMember } from "@/lib/types";

type Client = SupabaseClient<Database>;
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type TripRow = Database["public"]["Tables"]["trips"]["Row"];
type TripMemberRow = Database["public"]["Tables"]["trip_members"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type AllocationRow = Database["public"]["Tables"]["expense_allocations"]["Row"];
type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"];
type TripMemberWithProfileRow = TripMemberRow & { profiles: ProfileRow | null };
type ExpenseWithAllocationsRow = ExpenseRow & { expense_allocations: AllocationRow[] | null };

const tripFields = "id,name,description,cover_url,start_date,end_date,invite_code,status,created_by,created_at,finalized_at";
const expenseFields = "id,trip_id,title,notes,category,amount,expense_date,paid_by,created_by,split_type,receipt_url,created_at,updated_at";
const profileFields = "id,display_name,avatar_url,is_guest,created_at";
const memberFields = "trip_id,user_id,role,joined_at";
const allocationFields = "id,expense_id,user_id,amount";
const settlementFields = "id,trip_id,from_user_id,to_user_id,amount,status,paid_at,created_at";
const memberFieldsWithProfile = `${memberFields},profiles(${profileFields})`;
const expenseFieldsWithAllocations = `${expenseFields},expense_allocations(${allocationFields})`;
const receiptUrlCache = new Map<string, { url: string | null; expiresAt: number }>();
const receiptUrlInFlight = new Map<string, Promise<string | null>>();

export class RepositoryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

function assertNoError(error: { message: string; code?: string } | null): asserts error is null {
  if (!error) return;
  const knownCodes = [
    "AUTH_REQUIRED", "TRIP_ACCESS_DENIED", "TRIP_LOCKED", "INVALID_TITLE", "INVALID_AMOUNT", "INVALID_DATE",
    "INVALID_CATEGORY", "INVALID_RECEIPT", "PAYER_NOT_IN_TRIP", "INVALID_ALLOCATIONS", "ALLOCATIONS_DO_NOT_RECONCILE", "INVALID_ALLOCATION_AMOUNT",
    "DUPLICATE_ALLOCATION", "ALLOCATION_MEMBER_NOT_IN_TRIP", "EXPENSE_NOT_FOUND", "EXPENSE_ACCESS_DENIED", "TRIP_NOT_FOUND",
    "TRIP_ALREADY_FINALIZED", "INVALID_TRIP_EXPENSES", "UNBALANCED_TRIP", "INVALID_SETTLEMENT", "SETTLEMENT_ACCESS_DENIED", "INVITE_NOT_FOUND",
    "ADMIN_REQUIRED", "OWNER_REQUIRED", "INVALID_TRIP_NAME", "INVALID_TRIP_DATES", "TRIP_NOT_FINALIZED", "SETTLEMENT_ALREADY_PAID", "MEMBER_NOT_FOUND", "MEMBER_HAS_ACTIVITY", "SELF_MEMBER_MANAGEMENT_FORBIDDEN", "INVALID_GUEST_NAME", "GUEST_NOT_FOUND", "GUEST_CANNOT_PAY", "GUEST_CANNOT_BE_ADMIN",
  ];
  const code = knownCodes.find((candidate) => error.code === candidate || error.message.includes(candidate));
  const messages: Record<string, string> = {
    AUTH_REQUIRED: "Sesi login sudah berakhir.",
    TRIP_ACCESS_DENIED: "Kamu tidak punya akses ke trip ini.",
    TRIP_LOCKED: "Trip sudah ditutup dan tidak menerima perubahan lagi.",
    INVALID_TITLE: "Judul pengeluaran belum valid.",
    INVALID_AMOUNT: "Jumlah pengeluaran belum valid.",
    INVALID_DATE: "Tanggal pengeluaran belum valid.",
    INVALID_CATEGORY: "Kategori pengeluaran belum valid.",
    INVALID_RECEIPT: "Bukti pembayaran belum valid untuk trip ini.",
    PAYER_NOT_IN_TRIP: "Payer harus menjadi anggota trip.",
    INVALID_ALLOCATIONS: "Pembagian pengeluaran belum valid.",
    ALLOCATIONS_DO_NOT_RECONCILE: "Pembagian belum sama dengan total pengeluaran.",
    INVALID_ALLOCATION_AMOUNT: "Nominal pembagian belum valid.",
    DUPLICATE_ALLOCATION: "Anggota pembagian tidak boleh duplikat.",
    ALLOCATION_MEMBER_NOT_IN_TRIP: "Semua penerima pembagian harus anggota trip.",
    EXPENSE_NOT_FOUND: "Catatan pengeluaran tidak ditemukan.",
    EXPENSE_ACCESS_DENIED: "Kamu tidak punya izin mengubah catatan ini.",
    TRIP_NOT_FOUND: "Trip tidak ditemukan.",
    TRIP_ALREADY_FINALIZED: "Trip sudah ditutup.",
    INVALID_TRIP_EXPENSES: "Masih ada pembagian pengeluaran yang perlu dibereskan.",
    UNBALANCED_TRIP: "Saldo trip tidak seimbang.",
    INVALID_SETTLEMENT: "Settlement belum valid.",
    SETTLEMENT_ACCESS_DENIED: "Kamu tidak punya izin menandai pembayaran ini.",
    INVITE_NOT_FOUND: "Kode gabung tidak ditemukan atau trip sudah ditutup.",
    ADMIN_REQUIRED: "Hanya admin trip yang dapat melakukan aksi ini.",
    OWNER_REQUIRED: "Hanya pemilik trip yang dapat mengubah atau menghapus trip.",
    INVALID_TRIP_NAME: "Nama trip harus berisi 1–120 karakter.",
    INVALID_TRIP_DATES: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    TRIP_NOT_FINALIZED: "Trip belum difinalisasi.",
    SETTLEMENT_ALREADY_PAID: "Trip tidak bisa dibuka kembali karena sudah ada transfer yang ditandai lunas.",
    MEMBER_NOT_FOUND: "Anggota ini sudah tidak ada di trip.",
    MEMBER_HAS_ACTIVITY: "Anggota ini punya catatan atau pembagian aktif. Bereskan catatan tersebut sebelum mengeluarkannya.",
    SELF_MEMBER_MANAGEMENT_FORBIDDEN: "Admin tidak dapat mengubah atau mengeluarkan dirinya sendiri.",
    INVALID_GUEST_NAME: "Nama anggota manual harus berisi 1–80 karakter.",
    GUEST_NOT_FOUND: "Anggota manual ini sudah tidak ada di trip.",
    GUEST_CANNOT_PAY: "Anggota manual tidak dapat dipilih sebagai pembayar.",
    GUEST_CANNOT_BE_ADMIN: "Anggota manual tidak dapat dijadikan admin.",
  };
  const infrastructureMessage = error.code === "57014"
    ? "Server terlalu lama memproses permintaan. Data belum berubah—coba lagi beberapa detik."
    : error.code === "42501"
      ? "Akun ini tidak punya izin untuk mengubah data tersebut."
      : error.code === "23505"
        ? "Data serupa sudah tersimpan. Muat ulang lalu coba lagi."
        : error.code === "PGRST202"
          ? "Layanan backend belum siap untuk perintah ini. Muat ulang lalu coba lagi."
          : error.code === "PGRST200"
            ? "Relasi data trip belum bisa dibaca. Muat ulang lalu coba lagi."
          : /failed to fetch|network|fetch failed|timeout|timed out/i.test(error.message)
            ? "Koneksi ke Supabase sedang lambat atau terputus. Data belum berubah—coba lagi."
            : "Permintaan belum selesai. Data belum berubah—coba lagi beberapa detik.";
  throw new RepositoryError(code ? messages[code] : infrastructureMessage, code ?? error.code);
}

function mapProfile(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url, isGuest: row.is_guest, createdAt: row.created_at };
}

function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverUrl: row.cover_url,
    startDate: row.start_date,
    endDate: row.end_date,
    inviteCode: row.invite_code,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    finalizedAt: row.finalized_at,
  };
}

function mapMember(row: TripMemberRow): TripMember {
  return { tripId: row.trip_id, userId: row.user_id, role: row.role, joinedAt: row.joined_at };
}

function mapExpense(row: ExpenseRow, allocations: AllocationRow[]): Expense {
  const category = ["accommodation", "food", "transport", "activity", "shopping", "other"].includes(row.category)
    ? row.category as Expense["category"]
    : "other";
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    notes: row.notes,
    category,
    amount: row.amount,
    expenseDate: row.expense_date,
    paidBy: row.paid_by,
    createdBy: row.created_by,
    splitType: row.split_type,
    receiptUrl: row.receipt_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    allocations: allocations.map((allocation) => ({
      id: allocation.id,
      expenseId: allocation.expense_id,
      userId: allocation.user_id,
      amount: allocation.amount,
    })),
  };
}

function mapSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    tripId: row.trip_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amount: row.amount,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

async function queryRows<T>(query: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>): Promise<T> {
  const response = await query;
  assertNoError(response.error);
  return response.data ?? ([] as T);
}

export async function loadAppState(client: Client, currentUserId: string): Promise<AppState> {
  const [profileResponse, memberRows] = await Promise.all([
    client.from("profiles").select(profileFields).eq("id", currentUserId).maybeSingle(),
    queryRows(client.from("trip_members").select(memberFields).eq("user_id", currentUserId)),
  ]);
  assertNoError(profileResponse.error);
  if (!profileResponse.data) {
    throw new RepositoryError("Profil akun belum siap. Muat ulang beberapa detik lagi.", "PROFILE_NOT_FOUND");
  }

  const tripIds = memberRows.map((member) => member.trip_id);
  if (tripIds.length === 0) {
    return {
      currentUserId,
      profiles: [mapProfile(profileResponse.data)],
      trips: [],
      tripMembers: [],
      expenses: [],
      settlements: [],
    };
  }

  const allMemberRowsPromise = queryRows(
    client.from("trip_members").select(memberFieldsWithProfile).in("trip_id", tripIds),
  ).then((rows) => rows as unknown as TripMemberWithProfileRow[]);
  const expenseRowsPromise = queryRows(
    client.from("expenses").select(expenseFieldsWithAllocations).in("trip_id", tripIds),
  ).then((rows) => rows as unknown as ExpenseWithAllocationsRow[]);
  const [tripRows, allMemberRows, settlementRows, expenseRows] = await Promise.all([
    queryRows(client.from("trips").select(tripFields).in("id", tripIds)),
    allMemberRowsPromise,
    queryRows(client.from("settlements").select(settlementFields).in("trip_id", tripIds)),
    expenseRowsPromise,
  ]);

  const profilesById = new Map<string, Profile>();
  profilesById.set(profileResponse.data.id, mapProfile(profileResponse.data));
  for (const member of allMemberRows) {
    if (member.profiles) profilesById.set(member.profiles.id, mapProfile(member.profiles));
  }

  return {
    currentUserId,
    profiles: [...profilesById.values()],
    trips: tripRows.map(mapTrip),
    tripMembers: allMemberRows.map(mapMember),
    expenses: expenseRows.map((expense) => mapExpense(expense, expense.expense_allocations ?? [])),
    settlements: settlementRows.map(mapSettlement),
  };
}

export async function createTrip(client: Client, input: { name: string; description: string; startDate: string; endDate: string }) {
  const response = await client.rpc("create_trip", {
    p_name: input.name.trim(),
    p_description: input.description.trim() || null,
    p_start_date: input.startDate || null,
    p_end_date: input.endDate || null,
  });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Trip belum berhasil dibuat.");
  return mapTrip(response.data);
}

export async function updateOwnedTrip(client: Client, tripId: string, input: { name: string; description: string; startDate: string; endDate: string }) {
  const response = await client.rpc("update_owned_trip", {
    p_trip_id: tripId,
    p_name: input.name.trim(),
    p_description: input.description.trim() || null,
    p_start_date: input.startDate || null,
    p_end_date: input.endDate || null,
  });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Trip belum berhasil diperbarui.");
  return mapTrip(response.data);
}

export async function deleteOwnedTrip(client: Client, tripId: string) {
  const response = await client.rpc("delete_owned_trip", { p_trip_id: tripId });
  assertNoError(response.error);
}

export async function joinTrip(client: Client, inviteCode: string) {
  const response = await client.rpc("join_trip_by_invite", { p_invite_code: inviteCode.trim().toUpperCase() });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Kode gabung tidak ditemukan.", "INVITE_NOT_FOUND");
  return response.data.trip_id;
}

export async function saveExpense(client: Client, expense: Expense): Promise<Expense> {
  if (!Number.isSafeInteger(expense.amount) || expense.amount <= 0) {
    throw new RepositoryError("Jumlah pengeluaran belum valid.", "INVALID_AMOUNT");
  }
  if (!allocationsReconcile(expense.amount, expense.allocations.map((allocation) => ({ userId: allocation.userId, amount: allocation.amount })))) {
    throw new RepositoryError("Pembagian belum sama dengan total pengeluaran.", "ALLOCATIONS_DO_NOT_RECONCILE");
  }
  const allocations: Json = expense.allocations.map((allocation) => ({ user_id: allocation.userId, amount: allocation.amount }));
  const response = await client.rpc("save_expense", {
    p_trip_id: expense.tripId,
    p_title: expense.title,
    p_amount: expense.amount,
    p_expense_date: expense.expenseDate,
    p_paid_by: expense.paidBy,
    p_split_type: expense.splitType,
    p_allocations: allocations,
    p_expense_id: expense.id || null,
    p_notes: expense.notes ?? null,
    p_category: expense.category,
    p_receipt_url: expense.receiptUrl ?? null,
  });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Talangan belum berhasil disimpan.");
  const persistedAllocations: AllocationRow[] = expense.allocations.map((allocation) => ({
    id: allocation.id || `${response.data.id}:${allocation.userId}`,
    expense_id: response.data.id,
    user_id: allocation.userId,
    amount: allocation.amount,
  }));
  return mapExpense(response.data, persistedAllocations);
}

export async function deleteExpense(client: Client, expenseId: string) {
  const response = await client.rpc("delete_expense", { p_expense_id: expenseId });
  assertNoError(response.error);
}

export async function finalizeTrip(client: Client, tripId: string) {
  const response = await client.rpc("finalize_trip", { p_trip_id: tripId });
  assertNoError(response.error);
  return (response.data ?? []).map(mapSettlement);
}

export async function unlockTrip(client: Client, tripId: string) {
  const response = await client.rpc("unlock_trip", { p_trip_id: tripId });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Trip belum berhasil dibuka kembali.");
  return mapTrip(response.data);
}

export async function updateTripMemberRole(client: Client, tripId: string, userId: string, role: MemberRole) {
  const response = await client.rpc("update_trip_member_role", { p_trip_id: tripId, p_user_id: userId, p_role: role });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Peran anggota belum berhasil diperbarui.");
  return mapMember(response.data);
}

export async function createGuestMember(client: Client, tripId: string, displayName: string) {
  const response = await client.rpc("create_guest_member", { p_trip_id: tripId, p_display_name: displayName.trim() });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Anggota manual belum berhasil ditambahkan.");
  return mapProfile(response.data);
}

export async function updateGuestMemberName(client: Client, tripId: string, userId: string, displayName: string) {
  const response = await client.rpc("update_guest_member_name", { p_trip_id: tripId, p_user_id: userId, p_display_name: displayName.trim() });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Nama anggota manual belum berhasil diperbarui.");
  return mapProfile(response.data);
}

export async function removeTripMember(client: Client, tripId: string, userId: string) {
  const response = await client.rpc("remove_trip_member", { p_trip_id: tripId, p_user_id: userId });
  assertNoError(response.error);
}

export async function markSettlementPaid(client: Client, settlementId: string) {
  const response = await client.rpc("mark_settlement_paid", { p_settlement_id: settlementId });
  assertNoError(response.error);
  if (!response.data) throw new RepositoryError("Pembayaran belum berhasil ditandai.");
  return mapSettlement(response.data);
}

export async function uploadReceipt(client: Client, tripId: string, file: File): Promise<string> {
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]);
  if (!allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024) {
    throw new RepositoryError("Bukti harus berupa JPG, PNG, HEIC, atau WebP maksimal 8 MB.", "INVALID_RECEIPT");
  }
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${tripId}/${crypto.randomUUID()}.${extension}`;
  const response = await client.storage.from("trip-receipts").upload(path, file, { contentType: file.type, upsert: false });
  assertNoError(response.error);
  return path;
}

export async function getReceiptUrl(client: Client, path: string): Promise<string | null> {
  const cached = receiptUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const existingRequest = receiptUrlInFlight.get(path);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const response = await client.storage.from("trip-receipts").createSignedUrl(path, 60 * 60);
    const url = response.error ? null : response.data.signedUrl;
    receiptUrlCache.set(path, { url, expiresAt: Date.now() + (url ? 55 * 60 * 1000 : 10 * 1000) });
    if (receiptUrlCache.size > 100) {
      const oldestPath = receiptUrlCache.keys().next().value;
      if (oldestPath) receiptUrlCache.delete(oldestPath);
    }
    return url;
  })();
  receiptUrlInFlight.set(path, request);
  try {
    return await request;
  } finally {
    receiptUrlInFlight.delete(path);
  }
}
