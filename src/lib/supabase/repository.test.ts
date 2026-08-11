import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { createGuestMember, deleteOwnedTrip, loadAppState, removeTripMember, updateGuestMemberName, updateOwnedTrip, updateTripMemberRole } from "@/lib/supabase/repository";

function createQuery(data: unknown, selections?: string[]): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  query.select = (fields: string) => {
    selections?.push(fields);
    return query;
  };
  query.eq = (column: string) => {
    void column;
    return query;
  };
  query.in = (column: string) => {
    void column;
    return query;
  };
  query.maybeSingle = () => Promise.resolve({ data, error: null });
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown): Promise<unknown> => Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
  return query;
}

describe("loadAppState", () => {
  it("hydrates profiles and allocations through the parent relation in one read wave", async () => {
    const currentUserId = "00000000-0000-0000-0000-000000000001";
    const tripId = "00000000-0000-0000-0000-000000000010";
    const expenseId = "00000000-0000-0000-0000-000000000020";
    const profile = { id: currentUserId, display_name: "Andi", avatar_url: null, is_guest: false, created_at: "2026-08-11T00:00:00.000Z" };
    const member = { trip_id: tripId, user_id: currentUserId, role: "admin", joined_at: "2026-08-11T00:00:00.000Z" };
    const nestedMember = { ...member, profiles: profile };
    const trip = { id: tripId, name: "Trip uji", description: null, cover_url: null, start_date: null, end_date: null, invite_code: "TEST1234", status: "active", created_by: currentUserId, created_at: "2026-08-11T00:00:00.000Z", finalized_at: null };
    const expense = { id: expenseId, trip_id: tripId, title: "Makan", notes: null, category: "food", amount: 1000, expense_date: "2026-08-11", paid_by: currentUserId, created_by: currentUserId, split_type: "equal", receipt_url: null, created_at: "2026-08-11T00:00:00.000Z", updated_at: "2026-08-11T00:00:00.000Z", expense_allocations: [{ id: "00000000-0000-0000-0000-000000000030", expense_id: expenseId, user_id: currentUserId, amount: 1000 }] };
    const selections: string[] = [];
    let tripMembersQueryCount = 0;
    const from = vi.fn((table: string) => {
      if (table === "profiles") return createQuery(profile, selections);
      if (table === "trip_members") {
        tripMembersQueryCount += 1;
        return createQuery(tripMembersQueryCount === 1 ? [member] : [nestedMember], selections);
      }
      if (table === "trips") return createQuery([trip], selections);
      if (table === "expenses") return createQuery([expense], selections);
      if (table === "settlements") return createQuery([], selections);
      if (table === "notification_preferences") return createQuery(null, selections);
      throw new Error(`Unexpected table ${table}`);
    });
    const client = { from } as unknown as SupabaseClient<Database>;

    const state = await loadAppState(client, currentUserId);

    expect(from).toHaveBeenCalledTimes(7);
    expect(selections.some((selection) => selection.includes("profiles(id,display_name,avatar_url,is_guest,created_at)"))).toBe(true);
    expect(selections.some((selection) => selection.includes("expense_allocations(id,expense_id,user_id,amount)"))).toBe(true);
    expect(state.profiles).toEqual([{ id: currentUserId, displayName: "Andi", avatarUrl: null, isGuest: false, createdAt: "2026-08-11T00:00:00.000Z" }]);
    expect(state.expenses[0]?.allocations).toEqual([{ id: "00000000-0000-0000-0000-000000000030", expenseId, userId: currentUserId, amount: 1000 }]);
  });
});

describe("trip membership mutations", () => {
  it("uses explicit admin RPCs for role changes and removals", async () => {
    const member = { trip_id: "trip", user_id: "member", role: "admin", joined_at: "2026-08-11T00:00:00.000Z" };
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: member, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    const updated = await updateTripMemberRole(client, "trip", "member", "admin");
    await removeTripMember(client, "trip", "member");

    expect(updated).toEqual({ tripId: "trip", userId: "member", role: "admin", joinedAt: "2026-08-11T00:00:00.000Z" });
    expect(rpc).toHaveBeenNthCalledWith(1, "update_trip_member_role", { p_trip_id: "trip", p_user_id: "member", p_role: "admin" });
    expect(rpc).toHaveBeenNthCalledWith(2, "remove_trip_member", { p_trip_id: "trip", p_user_id: "member" });
  });
});

describe("manual trip members", () => {
  it("uses admin-only RPCs to create and rename an accountless participant", async () => {
    const guest = { id: "guest", display_name: "Eka", avatar_url: null, is_guest: true, created_at: "2026-08-11T00:00:00.000Z" };
    const renamedGuest = { ...guest, display_name: "Eka Putri" };
    const rpc = vi.fn().mockResolvedValueOnce({ data: guest, error: null }).mockResolvedValueOnce({ data: renamedGuest, error: null });
    const client = { rpc } as unknown as SupabaseClient<Database>;

    const created = await createGuestMember(client, "trip", " Eka ");
    const updated = await updateGuestMemberName(client, "trip", "guest", " Eka Putri ");

    expect(created).toMatchObject({ id: "guest", displayName: "Eka", isGuest: true });
    expect(updated).toMatchObject({ id: "guest", displayName: "Eka Putri", isGuest: true });
    expect(rpc).toHaveBeenNthCalledWith(1, "create_guest_member", { p_trip_id: "trip", p_display_name: "Eka" });
    expect(rpc).toHaveBeenNthCalledWith(2, "update_guest_member_name", { p_trip_id: "trip", p_user_id: "guest", p_display_name: "Eka Putri" });
  });
});

describe("trip owner mutations", () => {
  it("removes trip receipts through Storage API before the admin delete RPC", async () => {
    const row = { id: "trip", name: "Bandung", description: "Weekend", cover_url: null, start_date: "2026-08-20", end_date: "2026-08-21", invite_code: "BANDUNG", status: "active", created_by: "owner", created_at: "2026-08-11T00:00:00.000Z", finalized_at: null };
    const rpc = vi.fn().mockResolvedValueOnce({ data: row, error: null }).mockResolvedValueOnce({ data: null, error: null });
    const list = vi.fn().mockResolvedValue({ data: [{ id: "receipt-id", name: "struk.webp" }], error: null });
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn().mockReturnValue({ list, remove });
    const client = { rpc, storage: { from } } as unknown as SupabaseClient<Database>;

    const updated = await updateOwnedTrip(client, "trip", { name: "Bandung", description: "Weekend", startDate: "2026-08-20", endDate: "2026-08-21" });
    await deleteOwnedTrip(client, "trip");

    expect(updated.name).toBe("Bandung");
    expect(rpc).toHaveBeenNthCalledWith(1, "update_owned_trip", { p_trip_id: "trip", p_name: "Bandung", p_description: "Weekend", p_start_date: "2026-08-20", p_end_date: "2026-08-21" });
    expect(rpc).toHaveBeenNthCalledWith(2, "delete_owned_trip", { p_trip_id: "trip" });
    expect(from).toHaveBeenCalledWith("trip-receipts");
    expect(list).toHaveBeenCalledWith("trip", { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
    expect(remove).toHaveBeenCalledWith(["trip/struk.webp"]);
  });
});
