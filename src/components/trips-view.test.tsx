/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TripsView } from "@/components/trips-view";
import type { MemberLedger, Trip } from "@/lib/types";

const trips: Trip[] = [
  {
    id: "bali",
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
  },
  {
    id: "bandung",
    name: "Bandung akhir pekan",
    description: null,
    coverUrl: null,
    startDate: "2026-09-02",
    endDate: "2026-09-04",
    inviteCode: "BDG2026",
    status: "finalized",
    createdBy: "andi",
    createdAt: "2026-08-01T00:00:00.000Z",
    finalizedAt: "2026-09-05T00:00:00.000Z",
  },
];

const ledgers: Record<string, MemberLedger> = {
  bali: { userId: "andi", paid: 500_000, share: 300_000, balance: 200_000 },
  bandung: { userId: "andi", paid: 150_000, share: 200_000, balance: -50_000 },
};

describe("TripsView", () => {
  it("identifies the active trip and opens another trip in one action", () => {
    const onOpen = vi.fn();
    render(<TripsView trips={trips} activeTripId="bali" memberCountsByTrip={{ bali: 4, bandung: 2 }} ledgersByTrip={ledgers} totalsByTrip={{ bali: 1_200_000, bandung: 400_000 }} onOpen={onOpen} onCreate={vi.fn()} onJoin={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Kelola trip" })).toBeTruthy();
    expect(screen.getByText("Sedang dibuka")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Bandung akhir pekan/i }));
    expect(onOpen).toHaveBeenCalledWith("bandung");
  });
});
