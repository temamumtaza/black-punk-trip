import type { ExpenseCategory, Profile, Trip } from "@/lib/types";

export const categoryLabels: Record<ExpenseCategory, string> = {
  accommodation: "Penginapan",
  food: "Makan",
  transport: "Transportasi",
  activity: "Aktivitas",
  shopping: "Belanja",
  other: "Lainnya",
};

export const categorySymbols: Record<ExpenseCategory, string> = {
  accommodation: "⌂",
  food: "✦",
  transport: "↗",
  activity: "◌",
  shopping: "□",
  other: "·",
};

const rupiahFormatter = new Intl.NumberFormat("id-ID");

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseRupiahInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : Number.NaN;
}

export function formatRupiahInput(value: number | string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? groupDigits(digits) : "";
}

export function formatRupiah(amount: number, withSign = false): string {
  if (!Number.isSafeInteger(amount)) return "Rp—";
  const sign = amount < 0 ? "−" : withSign && amount > 0 ? "+" : "";
  const absolute = Math.abs(amount);
  return `${sign}Rp${rupiahFormatter.format(absolute)}`;
}

export function formatShortDate(value?: string | null): string {
  return formatDateInput(value) || "Tanggal belum diatur";
}

export function formatDateInput(value?: string | null): string {
  if (!value) return "";
  const raw = value.trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  const displayMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return displayMatch ? raw : "";
}

export function formatDateInputValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateInput(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${match[2]}-${match[1]}`;
}

export function formatTripDates(trip: Trip): string {
  if (!trip.startDate && !trip.endDate) return "Tanggal fleksibel";
  if (trip.startDate && trip.endDate) {
    return `${formatShortDate(trip.startDate)} – ${formatShortDate(trip.endDate)}`;
  }
  return formatShortDate(trip.startDate ?? trip.endDate);
}

export function initials(profile?: Profile): string {
  if (!profile?.displayName) return "?";
  return profile.displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function compactAmount(amount: number): string {
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)} jt`;
  if (amount >= 1_000) return `Rp${Math.round(amount / 1_000)}k`;
  return formatRupiah(amount);
}
