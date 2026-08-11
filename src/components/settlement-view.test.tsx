/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettlementView } from "@/components/settlement-view";
import type { MemberLedger, Profile, SettlementPreview, Trip } from "@/lib/types";

const trip: Trip = { id: "bali", name: "Bali bareng", description: null, coverUrl: null, startDate: null, endDate: null, inviteCode: "BALI2026", status: "active", createdBy: "andi", createdAt: "2026-08-01T00:00:00.000Z", finalizedAt: null };
const profiles: Profile[] = [
  { id: "andi", displayName: "Andi", avatarUrl: null, isGuest: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "budi", displayName: "Budi", avatarUrl: null, isGuest: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "caca", displayName: "Caca", avatarUrl: null, isGuest: false, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "deni", displayName: "Deni", avatarUrl: null, isGuest: false, createdAt: "2026-08-01T00:00:00.000Z" },
];
const ledgers: MemberLedger[] = [
  { userId: "andi", paid: 0, share: 100_000, balance: -100_000 },
  { userId: "budi", paid: 100_000, share: 0, balance: 100_000 },
  { userId: "caca", paid: 0, share: 40_000, balance: -40_000 },
  { userId: "deni", paid: 40_000, share: 0, balance: 40_000 },
];
const preview: SettlementPreview[] = [
  { fromUserId: "andi", toUserId: "budi", amount: 100_000 },
  { fromUserId: "caca", toUserId: "deni", amount: 40_000 },
];

function renderSettlement() {
  render(<SettlementView trip={trip} profiles={profiles} ledgers={ledgers} preview={preview} settlements={[]} validationErrors={[]} currentUserId="andi" onMarkPaid={vi.fn()} onFinalize={vi.fn()} onUnlock={vi.fn()} />);
}

describe("SettlementView payment filter", () => {
  afterEach(() => cleanup());

  it("shows all transfer plans by default and limits the list to the active user on demand", () => {
    renderSettlement();

    expect(screen.getByText("bayar ke Budi")).toBeTruthy();
    expect(screen.getByText("bayar ke Deni")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Hanya saya" }));

    expect(screen.getByText("bayar ke Budi")).toBeTruthy();
    expect(screen.queryByText("bayar ke Deni")).toBeNull();
    expect(screen.getByRole("tab", { name: "Hanya saya" }).getAttribute("aria-selected")).toBe("true");
  });
});
