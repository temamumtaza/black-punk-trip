import { describe, expect, it } from "vitest";
import { buildSettlementPreview, calculateMemberLedgers, splitEvenly, allocationsReconcile } from "@/lib/finance";
import type { Expense } from "@/lib/types";

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "test-expense",
    tripId: "trip",
    title: "Test",
    notes: null,
    category: "other",
    amount: 100,
    expenseDate: "2026-08-10",
    paidBy: "a",
    createdBy: "a",
    splitType: "custom",
    receiptUrl: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    allocations: [],
    ...overrides,
  };
}

describe("Rupiah allocation math", () => {
  it("splits an even amount exactly", () => {
    const result = splitEvenly(1_000_000, ["a", "b", "c", "d"]);
    expect(Object.values(result)).toEqual([250_000, 250_000, 250_000, 250_000]);
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(1_000_000);
  });

  it("distributes an uneven remainder deterministically", () => {
    const result = splitEvenly(100, ["a", "b", "c"]);
    expect(result).toEqual({ a: 34, b: 33, c: 33 });
  });

  it("only allocates selected participants", () => {
    const result = splitEvenly(600_000, ["b", "d"]);
    expect(result).toEqual({ b: 300_000, d: 300_000 });
    expect(Object.keys(result)).toHaveLength(2);
  });

  it("rebalances an equal expense when a new member joins", () => {
    expect(splitEvenly(6_000_000, ["a", "b", "c"])).toEqual({
      a: 2_000_000,
      b: 2_000_000,
      c: 2_000_000,
    });
  });

  it("rejects custom allocations that do not reconcile", () => {
    expect(allocationsReconcile(800_000, [{ userId: "a", amount: 100_000 }, { userId: "b", amount: 250_000 }, { userId: "c", amount: 150_000 }])).toBe(false);
    expect(allocationsReconcile(800_000, [{ userId: "a", amount: 100_000 }, { userId: "b", amount: 250_000 }, { userId: "c", amount: 150_000 }, { userId: "d", amount: 300_000 }])).toBe(true);
  });

  it("calculates paid minus allocated, including self allocation", () => {
    const result = calculateMemberLedgers(["a", "b"], [expense({ amount: 800, paidBy: "a", allocations: [{ id: "1", expenseId: "test-expense", userId: "a", amount: 250 }, { id: "2", expenseId: "test-expense", userId: "b", amount: 550 }] })]);
    expect(result).toEqual([{ userId: "a", paid: 800, share: 250, balance: 550 }, { userId: "b", paid: 0, share: 550, balance: -550 }]);
  });

  it("keeps an equal split equal across separate advances", () => {
    const result = calculateMemberLedgers(["a", "b"], [
      expense({
        id: "advance-a",
        amount: 1_500_000,
        paidBy: "a",
        splitType: "equal",
        allocations: [
          { id: "a-1", expenseId: "advance-a", userId: "a", amount: 750_000 },
          { id: "a-2", expenseId: "advance-a", userId: "b", amount: 750_000 },
        ],
      }),
      expense({
        id: "advance-b",
        amount: 4_500_000,
        paidBy: "b",
        splitType: "equal",
        allocations: [
          { id: "b-1", expenseId: "advance-b", userId: "a", amount: 2_250_000 },
          { id: "b-2", expenseId: "advance-b", userId: "b", amount: 2_250_000 },
        ],
      }),
    ]);

    expect(result).toEqual([
      { userId: "a", paid: 1_500_000, share: 3_000_000, balance: -1_500_000 },
      { userId: "b", paid: 4_500_000, share: 3_000_000, balance: 1_500_000 },
    ]);
    expect(buildSettlementPreview(result)).toEqual([{ fromUserId: "a", toUserId: "b", amount: 1_500_000 }]);
  });

  it("matches the join case where a prior equal advance is rebuilt", () => {
    const priorAdvance = splitEvenly(1_500_000, ["a", "b"]);
    const result = calculateMemberLedgers(["a", "b"], [
      expense({
        id: "before-join",
        amount: 1_500_000,
        paidBy: "a",
        splitType: "equal",
        allocations: Object.entries(priorAdvance).map(([userId, amount], index) => ({ id: `before-${index}`, expenseId: "before-join", userId, amount })),
      }),
      expense({
        id: "after-join",
        amount: 4_500_000,
        paidBy: "b",
        splitType: "equal",
        allocations: [
          { id: "after-1", expenseId: "after-join", userId: "a", amount: 2_250_000 },
          { id: "after-2", expenseId: "after-join", userId: "b", amount: 2_250_000 },
        ],
      }),
    ]);

    expect(result).toEqual([
      { userId: "a", paid: 1_500_000, share: 3_000_000, balance: -1_500_000 },
      { userId: "b", paid: 4_500_000, share: 3_000_000, balance: 1_500_000 },
    ]);
  });

  it("generates settlements that clear every balance", () => {
    const ledgers = [
      { userId: "a", paid: 2_400, share: 700, balance: 1_700 },
      { userId: "b", paid: 800, share: 850, balance: -50 },
      { userId: "c", paid: 600, share: 1_050, balance: -450 },
      { userId: "d", paid: 0, share: 1_200, balance: -1_200 },
    ];
    const settlements = buildSettlementPreview(ledgers);
    expect(settlements).toEqual([{ fromUserId: "b", toUserId: "a", amount: 50 }, { fromUserId: "c", toUserId: "a", amount: 450 }, { fromUserId: "d", toUserId: "a", amount: 1_200 }]);
    expect(settlements.reduce((sum, item) => sum + item.amount, 0)).toBe(1_700);
  });

  it("rejects invalid allocation values and duplicate participants", () => {
    expect(allocationsReconcile(100, [{ userId: "a", amount: -50 }, { userId: "b", amount: 150 }])).toBe(false);
    expect(allocationsReconcile(100, [{ userId: "a", amount: 0.5 }, { userId: "b", amount: 99.5 }])).toBe(false);
    expect(allocationsReconcile(100, [{ userId: "a", amount: 50 }, { userId: "a", amount: 50 }])).toBe(false);
    expect(allocationsReconcile(100, [{ userId: "", amount: 100 }])).toBe(false);
    expect(() => splitEvenly(101, ["a", "a"])).toThrow();
  });

  it("rejects non-conserving settlement input", () => {
    expect(() => buildSettlementPreview([
      { userId: "a", paid: 10, share: 0, balance: 10 },
      { userId: "b", paid: 0, share: 5, balance: -5 },
    ])).toThrow("Saldo trip tidak seimbang");
  });

  it("rejects ledgers whose balance does not match paid minus share", () => {
    expect(() => buildSettlementPreview([
      { userId: "a", paid: 100, share: 40, balance: 50 },
      { userId: "b", paid: 0, share: 60, balance: -60 },
    ])).toThrow("Saldo anggota tidak valid");
  });
});
