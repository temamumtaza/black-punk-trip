/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExpenseDetail } from "@/components/expense-detail";
import type { Expense, Profile, Trip } from "@/lib/types";

const profiles: Profile[] = [
  { id: "andi", displayName: "Andi", isGuest: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "budi", displayName: "Budi", isGuest: false, createdAt: "2026-08-01T00:00:00.000Z" },
];

const trip: Trip = {
  id: "trip",
  name: "Bali bareng",
  description: null,
  coverUrl: null,
  startDate: "2026-08-20",
  endDate: "2026-08-24",
  inviteCode: "BALI2026",
  status: "active",
  createdBy: "andi",
  createdAt: "2026-08-01T00:00:00.000Z",
  finalizedAt: null,
};

const expense: Expense = {
  id: "expense",
  tripId: "trip",
  title: "Makan malam",
  notes: null,
  category: "food",
  amount: 120_000,
  expenseDate: "2026-08-20",
  paidBy: "andi",
  createdBy: "andi",
  splitType: "equal",
  receiptUrl: "trip/struk.webp",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  allocations: [
    { id: "allocation-1", expenseId: "expense", userId: "andi", amount: 60_000 },
    { id: "allocation-2", expenseId: "expense", userId: "budi", amount: 60_000 },
  ],
};

describe("ExpenseDetail receipt viewer", () => {
  it("opens a signed receipt in a closable in-app dialog", async () => {
    render(<ExpenseDetail expense={expense} trip={trip} profiles={profiles} currentUserId="andi" canEdit onBack={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onGetReceiptUrl={vi.fn().mockResolvedValue("https://example.com/struk.webp")} />);

    fireEvent.click(await screen.findByRole("button", { name: "Lihat bukti" }));
    const dialog = await screen.findByRole("dialog", { name: "Makan malam" });
    expect(dialog).toBeTruthy();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(screen.getByRole("img", { name: "Bukti pembayaran Makan malam" }).getAttribute("src")).toBe("https://example.com/struk.webp");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
