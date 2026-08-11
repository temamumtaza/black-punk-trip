/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationPrompt, NotificationSettingsCard } from "@/components/notification-prompt";
import type { NotificationPreference } from "@/lib/types";

const promptPreference: NotificationPreference = { promptState: "prompt", snoozeUntil: null, pushEnabled: false };

afterEach(() => cleanup());

describe("NotificationPrompt", () => {
  it("puts activation first and persists the never choice through its callback", async () => {
    const onNever = vi.fn().mockResolvedValue(true);
    render(<NotificationPrompt preference={promptPreference} supported onEnable={vi.fn()} onSnooze={vi.fn()} onNever={onNever} isSaving={false} />);

    expect(screen.getByRole("button", { name: "Aktifkan notifikasi" })).toBeTruthy();
    expect(screen.getByText("Jangan pernah tampilkan lagi")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Jangan pernah tampilkan lagi" }));

    await waitFor(() => expect(onNever).toHaveBeenCalledOnce());
  });

  it("keeps a manual activation path in settings after automatic prompting is disabled", async () => {
    const onEnable = vi.fn().mockResolvedValue(true);
    render(<NotificationSettingsCard preference={{ promptState: "never", snoozeUntil: null, pushEnabled: false }} supported isSaving={false} onEnable={onEnable} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktifkan" }));
    await waitFor(() => expect(onEnable).toHaveBeenCalledOnce());
  });
});
