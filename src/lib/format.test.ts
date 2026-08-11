import { describe, expect, it } from "vitest";
import { avatarColor, formatDateInput, formatDateInputValue, formatRupiahInput, parseDateInput, parseRupiahInput } from "@/lib/format";

describe("Indonesian form formatting", () => {
  it("formats Rupiah input with dot separators without changing the value", () => {
    expect(formatRupiahInput("50000")).toBe("50.000");
    expect(formatRupiahInput("1.500.000")).toBe("1.500.000");
    expect(parseRupiahInput("1.500.000")).toBe(1_500_000);
  });

  it("formats and validates dates as dd/mm/yyyy", () => {
    expect(formatDateInput("2026-08-11")).toBe("11/08/2026");
    expect(formatDateInputValue("11082026")).toBe("11/08/2026");
    expect(parseDateInput("11/08/2026")).toBe("2026-08-11");
    expect(parseDateInput("31/02/2026")).toBeNull();
  });

  it("assigns a stable, different palette color to each member in a trip", () => {
    const ids = ["andi", "budi", "caca", "deni"];
    const colors = ids.map((id) => avatarColor(id, ids));

    expect(new Set(colors).size).toBe(ids.length);
    expect(avatarColor("budi", ids)).toBe(avatarColor("budi", [...ids].reverse()));
  });
});
