/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TripDateRangePicker } from "@/components/trip-date-range-picker";

function ControlledPicker() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  return <TripDateRangePicker startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} initialMonth={{ year: 2026, month: 7 }} />;
}

describe("TripDateRangePicker", () => {
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("selects a start and end date from one booking-style calendar", () => {
    render(<ControlledPicker />);

    fireEvent.click(screen.getByRole("button", { name: "Tanggal mulai" }));
    expect(screen.getByRole("dialog", { name: "Pilih tanggal trip" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "15 Agustus 2026" }));

    expect(screen.getByText("Pilih tanggal selesai")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tanggal mulai" }).textContent).toContain("15/08/2026");
    fireEvent.click(screen.getByRole("button", { name: "18 Agustus 2026" }));

    expect(screen.queryByRole("dialog", { name: "Pilih tanggal trip" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tanggal selesai" }).textContent).toContain("18/08/2026");
  });

  it("uses a viewport layer above the form and below the mobile navigation", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    render(<ControlledPicker />);

    fireEvent.click(screen.getByRole("button", { name: "Tanggal mulai" }));
    const dialog = await screen.findByRole("dialog", { name: "Pilih tanggal trip" });

    await waitFor(() => expect(dialog.getAttribute("aria-modal")).toBe("true"));
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });
});
