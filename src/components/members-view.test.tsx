/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MembersView } from "@/components/members-view";
import type { MemberLedger, Profile, Trip, TripMember } from "@/lib/types";

const trip: Trip = { id: "bali", name: "Bali bareng", description: null, coverUrl: null, startDate: null, endDate: null, inviteCode: "BALI2026", status: "active", createdBy: "andi", createdAt: "2026-08-01T00:00:00.000Z", finalizedAt: null };
const profiles: Profile[] = [
  { id: "andi", displayName: "Andi", avatarUrl: null, createdAt: "2026-08-01T00:00:00.000Z" },
  { id: "budi", displayName: "Budi", avatarUrl: null, createdAt: "2026-08-01T00:00:00.000Z" },
];
const members: TripMember[] = [
  { tripId: "bali", userId: "andi", role: "admin", joinedAt: "2026-08-01T00:00:00.000Z" },
  { tripId: "bali", userId: "budi", role: "member", joinedAt: "2026-08-01T00:00:00.000Z" },
];
const ledgers: MemberLedger[] = [
  { userId: "andi", paid: 100_000, share: 50_000, balance: 50_000 },
  { userId: "budi", paid: 0, share: 50_000, balance: -50_000 },
];

function renderMembers(overrides: Partial<React.ComponentProps<typeof MembersView>> = {}) {
  const onChangeRole = vi.fn().mockResolvedValue(true);
  const onRemove = vi.fn().mockResolvedValue(true);
  render(<MembersView trip={trip} profiles={profiles} members={members} ledgers={ledgers} currentUserId="andi" isAdmin pendingMemberId={null} onChangeRole={onChangeRole} onRemove={onRemove} {...overrides} />);
  return { onChangeRole, onRemove };
}

describe("MembersView", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  afterEach(() => cleanup());

  it("shares the active trip invitation for every member", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    renderMembers();

    fireEvent.click(screen.getByRole("button", { name: "Bagikan undangan" }));

    await waitFor(() => expect(share).toHaveBeenCalledWith({
      title: "Undangan Bali bareng · Black Punk Trip",
      text: "Yuk gabung ke Bali bareng di Black Punk Trip. Catat dan bagi pengeluaran trip bareng.",
      url: "http://localhost:3000/app?view=join-trip&code=BALI2026",
    }));
  });

  it("lets an admin change a different member role and remove that member", async () => {
    const { onChangeRole, onRemove } = renderMembers();

    fireEvent.click(screen.getByRole("button", { name: "Kelola" }));
    fireEvent.click(screen.getByRole("button", { name: "Jadikan admin" }));
    await waitFor(() => expect(onChangeRole).toHaveBeenCalledWith(members[1], "admin"));

    fireEvent.click(screen.getByRole("button", { name: "Kelola" }));
    fireEvent.click(screen.getByRole("button", { name: "Keluarkan dari trip" }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith(members[1]));
  });
});
