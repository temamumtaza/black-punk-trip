/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "@/components/date-picker";

function ControlledDatePicker() {
  const [date, setDate] = useState("");
  return <DatePicker ariaLabel="Tanggal talangan" value={date} onChange={setDate} />;
}

describe("DatePicker", () => {
  it("selects a single expense date from a popup calendar", () => {
    render(<ControlledDatePicker />);
    fireEvent.click(screen.getByRole("button", { name: "Tanggal talangan" }));
    expect(screen.getByRole("dialog", { name: "Pilih tanggal talangan" })).toBeTruthy();

    const currentMonth = new Date();
    const label = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(screen.queryByRole("dialog", { name: "Pilih tanggal talangan" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tanggal talangan" }).textContent).toContain("01/");
  });
});
