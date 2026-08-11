/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "@/components/expense-form";
import type { Profile } from "@/lib/types";

const members: Profile[] = [
  { id: "andi", displayName: "Andi", createdAt: "2026-08-01" },
  { id: "budi", displayName: "Budi", createdAt: "2026-08-01" },
  { id: "caca", displayName: "Caca", createdAt: "2026-08-01" },
  { id: "deni", displayName: "Deni", createdAt: "2026-08-01" },
];

describe("ExpenseForm", () => {
  it("keeps custom allocation submission locked until the total reconciles", () => {
    const onSubmit = vi.fn();
    render(<ExpenseForm members={members} currentUserId="andi" tripId="trip" onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Jumlah talangan"), { target: { value: "800000" } });
    fireEvent.change(screen.getByPlaceholderText("Misalnya: pengeluaran bersama"), { target: { value: "Makan bersama" } });
    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));

    const customInputs = [...document.querySelectorAll<HTMLInputElement>(".mini-amount-input")];
    expect(customInputs).toHaveLength(4);
    fireEvent.change(customInputs[0], { target: { value: "100000" } });
    fireEvent.change(customInputs[1], { target: { value: "250000" } });
    fireEvent.change(customInputs[2], { target: { value: "150000" } });
    fireEvent.change(customInputs[3], { target: { value: "300000" } });

    fireEvent.click(screen.getByRole("button", { name: /Simpan talangan/ }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0].allocations.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)).toBe(800000);
  });
});
