import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { loadAppState, removeTripMember, updateTripMemberRole } from "@/lib/supabase/repository";

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
    const profile = { id: currentUserId, display_name: "Andi", avatar_url: null, created_at: "2026-08-11T00:00:00.000Z" };
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
      throw new Error(`Unexpected table ${table}`);
    });
    const client = { from } as unknown as SupabaseClient<Database>;

    const state = await loadAppState(client, currentUserId);

    expect(from).toHaveBeenCalledTimes(6);
    expect(selections.some((selection) => selection.includes("profiles(id,display_name,avatar_url,created_at)"))).toBe(true);
    expect(selections.some((selection) => selection.includes("expense_allocations(id,expense_id,user_id,amount)"))).toBe(true);
    expect(state.profiles).toEqual([{ id: currentUserId, displayName: "Andi", avatarUrl: null, createdAt: "2026-08-11T00:00:00.000Z" }]);
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
