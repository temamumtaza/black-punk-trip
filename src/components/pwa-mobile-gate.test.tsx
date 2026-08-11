/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PwaMobileGate } from "@/components/pwa-mobile-gate";

describe("PwaMobileGate", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Linux; Android 14; Mobile)" });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  });

  afterEach(() => cleanup());

  it("asks a mobile browser to continue through an installed PWA instead of rendering private content", async () => {
    Object.defineProperty(navigator, "getInstalledRelatedApps", { configurable: true, value: vi.fn().mockResolvedValue([{ platform: "webapp", id: "/" }]) });
    render(<PwaMobileGate><p>Private trip content</p></PwaMobileGate>);

    await waitFor(() => expect(screen.getByText("Black Punk Trip sudah terpasang.")).toBeTruthy());
    expect(screen.queryByText("Private trip content")).toBeNull();
  });
});
