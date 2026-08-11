import type { NotificationPreference } from "@/lib/types";

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function shouldShowNotificationPrompt(preference: NotificationPreference, today = getJakartaDate()) {
  if (preference.promptState === "prompt") return true;
  return preference.promptState === "snoozed" && Boolean(preference.snoozeUntil && preference.snoozeUntil <= today);
}

export function getJakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year") ?? "0000"}-${values.get("month") ?? "01"}-${values.get("day") ?? "01"}`;
}

export function getTomorrowJakartaDate() {
  const today = getJakartaDate();
  const [year, month, day] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, (day ?? 1) + 1, 12));
  return tomorrow.toISOString().slice(0, 10);
}

function base64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export async function subscribeToPush(): Promise<PushSubscriptionPayload> {
  if (!isPushSupported()) throw new Error("Perangkat ini belum mendukung push notification.");
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error("Push notification belum dikonfigurasi untuk aplikasi ini.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "Izin notifikasi diblokir oleh browser. Buka pengaturan situs untuk mengaktifkannya." : "Izin notifikasi belum diberikan.");

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(vapidKey),
  });
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) throw new Error("Data perangkat untuk notifikasi belum lengkap.");
  return { endpoint: json.endpoint, p256dh, auth, userAgent: navigator.userAgent.slice(0, 500) };
}

export function getNotificationSettingsLabel(preference: NotificationPreference) {
  if (preference.pushEnabled) return "Notifikasi aktif";
  if (preference.promptState === "never") return "Tidak akan ditawarkan lagi otomatis";
  if (preference.promptState === "denied") return "Izin diblokir browser";
  if (preference.promptState === "snoozed") return "Akan ditawarkan lagi besok";
  return "Belum diatur";
}
