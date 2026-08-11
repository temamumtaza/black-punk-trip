import { describe, expect, it } from "vitest";
import { getJakartaDate, getNotificationSettingsLabel, getTomorrowJakartaDate, shouldShowNotificationPrompt } from "@/lib/notifications";
import type { NotificationPreference } from "@/lib/types";

const preference = (overrides: Partial<NotificationPreference> = {}): NotificationPreference => ({
  promptState: "prompt",
  snoozeUntil: null,
  pushEnabled: false,
  ...overrides,
});

describe("notification preferences", () => {
  it("shows the first opt-in prompt and hides it after never/enable", () => {
    expect(shouldShowNotificationPrompt(preference())).toBe(true);
    expect(shouldShowNotificationPrompt(preference({ promptState: "never" }))).toBe(false);
    expect(shouldShowNotificationPrompt(preference({ promptState: "enabled", pushEnabled: true }))).toBe(false);
    expect(shouldShowNotificationPrompt(preference({ promptState: "denied" }))).toBe(false);
  });

  it("only resurfaces a snoozed prompt on the requested date", () => {
    const snoozed = preference({ promptState: "snoozed", snoozeUntil: "2026-08-12" });
    expect(shouldShowNotificationPrompt(snoozed, "2026-08-11")).toBe(false);
    expect(shouldShowNotificationPrompt(snoozed, "2026-08-12")).toBe(true);
    expect(shouldShowNotificationPrompt(snoozed, "2026-08-13")).toBe(true);
  });

  it("formats dates in Jakarta independently of the browser locale", () => {
    const instant = new Date("2026-08-11T17:30:00.000Z");
    expect(getJakartaDate(instant)).toBe("2026-08-12");
  });

  it("returns a stable tomorrow date and readable settings labels", () => {
    const tomorrow = getTomorrowJakartaDate();
    expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getNotificationSettingsLabel(preference({ promptState: "snoozed", snoozeUntil: tomorrow }))).toBe("Akan ditawarkan lagi besok");
    expect(getNotificationSettingsLabel(preference({ promptState: "never" }))).toBe("Tidak akan ditawarkan lagi otomatis");
  });
});
