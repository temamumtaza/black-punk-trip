/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/components/settings-view";
import type { Trip } from "@/lib/types";

const trip: Trip = {
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
};

const inviteUrl = "http://localhost:3000/app?view=join-trip&code=BALI2026";

function renderSettings(overrides: Partial<React.ComponentProps<typeof SettingsView>> = {}) {
  return render(<SettingsView trip={trip} creatorName="Andi" isAdmin isOwner isSavingTrip={false} isDeletingTrip={false} onReview={vi.fn()} onManageTrips={vi.fn()} onSignOut={vi.fn()} onSaveTrip={vi.fn().mockResolvedValue(true)} onDeleteTrip={vi.fn().mockResolvedValue(undefined)} {...overrides} />);
}

describe("SettingsView invite actions", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, "share");
  });

  it("copies the invitation link with one action", async () => {
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Salin link" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(inviteUrl));
    expect(screen.getByText("Link undangan disalin.")).toBeTruthy();
  });

  it("sends the trip context and invitation link to the native share sheet", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Bagikan undangan" }));

    await waitFor(() => expect(share).toHaveBeenCalledWith({
      title: "Undangan Bali bareng · Black Punk Trip",
      text: "Yuk gabung ke Bali bareng di Black Punk Trip. Catat dan bagi pengeluaran trip bareng.",
      url: inviteUrl,
    }));
  });

  it("only exposes permanent trip management to its owner", () => {
    renderSettings();
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hapus trip" })).toBeTruthy();

    cleanup();
    renderSettings({ isOwner: false });
    expect(screen.queryByRole("button", { name: "Hapus trip" })).toBeNull();
  });
});
