"use client";

import { BellRing, Check, Clock3, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getNotificationPermission, getNotificationSettingsLabel, shouldShowNotificationPrompt } from "@/lib/notifications";
import type { NotificationPreference } from "@/lib/types";

interface NotificationActions {
  onEnable: () => Promise<boolean>;
  onSnooze: () => Promise<boolean>;
  onNever: () => Promise<boolean>;
}

interface NotificationPromptProps extends NotificationActions {
  preference: NotificationPreference;
  supported: boolean;
  isSaving: boolean;
  error?: string;
}

export function NotificationPrompt({ preference, supported, isSaving, error, onEnable, onSnooze, onNever }: NotificationPromptProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    primaryRef.current?.focus();
    const timer = window.setTimeout(() => setPermission(getNotificationPermission()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldShowNotificationPrompt(preference)) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) void onSnooze();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, onSnooze, preference]);

  if (!shouldShowNotificationPrompt(preference)) return null;

  const permissionBlocked = permission === "denied";
  const unavailable = !supported || permissionBlocked;
  const message = error || localError;

  async function enable() {
    if (unavailable || isSaving) return;
    setLocalError("");
    const saved = await onEnable();
    if (!saved) setLocalError("Notifikasi belum berhasil diaktifkan. Coba lagi.");
  }

  async function snooze() {
    if (isSaving) return;
    setLocalError("");
    const saved = await onSnooze();
    if (!saved) setLocalError("Pilihan belum tersimpan. Coba lagi.");
  }

  async function never() {
    if (isSaving) return;
    setLocalError("");
    const saved = await onNever();
    if (!saved) setLocalError("Pilihan belum tersimpan. Coba lagi.");
  }

  return <div className="notification-prompt-backdrop" role="presentation">
    <section className="notification-prompt" role="dialog" aria-modal="true" aria-labelledby="notification-prompt-title" aria-describedby="notification-prompt-copy">
      <div className="notification-prompt-mark" aria-hidden="true"><BellRing size={22} strokeWidth={1.8} /></div>
      <p className="eyebrow">BIAR NGGAK KELEWAT</p>
      <h2 id="notification-prompt-title">Aktifkan notifikasi trip.</h2>
      <p id="notification-prompt-copy" className="notification-prompt-copy">Dapat kabar saat ada talangan baru, perubahan anggota, settlement, dan pengingat waktu trip.</p>
      <ul className="notification-prompt-benefits">
        <li><Check size={15} aria-hidden="true" /> Talangan dan perubahan pembagian</li>
        <li><Check size={15} aria-hidden="true" /> Trip difinalisasi atau dibuka kembali</li>
        <li><Check size={15} aria-hidden="true" /> Pengingat H-1 mulai dan H+1 selesai</li>
      </ul>
      {unavailable ? <p className="notification-prompt-note">{permissionBlocked ? "Izin notifikasi diblokir browser. Buka pengaturan situs untuk mengaktifkannya." : "Perangkat ini belum mendukung push notification."}</p> : <p className="notification-prompt-note"><ShieldCheck size={14} aria-hidden="true" /> Hanya dikirim untuk trip yang kamu ikuti.</p>}
      {message ? <p className="notification-prompt-error" role="alert">{message}</p> : null}
      <div className="notification-prompt-actions">
        <button ref={primaryRef} className="btn btn-primary notification-prompt-primary" type="button" onClick={() => { void enable(); }} disabled={unavailable || isSaving}>
          <BellRing size={17} aria-hidden="true" /> {isSaving ? "Menyimpan…" : unavailable ? "Tidak tersedia di perangkat ini" : "Aktifkan notifikasi"}
        </button>
        <button className="notification-prompt-snooze" type="button" onClick={() => { void snooze(); }} disabled={isSaving}><Clock3 size={15} aria-hidden="true" /> Ingatkan besok</button>
        <button className="notification-prompt-never" type="button" onClick={() => { void never(); }} disabled={isSaving}>Jangan pernah tampilkan lagi</button>
      </div>
    </section>
  </div>;
}

interface NotificationSettingsCardProps {
  preference: NotificationPreference;
  supported: boolean;
  isSaving: boolean;
  onEnable: () => Promise<boolean>;
}

export function NotificationSettingsCard({ preference, supported, isSaving, onEnable }: NotificationSettingsCardProps) {
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    const timer = window.setTimeout(() => setPermission(getNotificationPermission()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const blocked = permission === "denied";

  async function enable() {
    setError("");
    const saved = await onEnable();
    if (!saved) setError("Notifikasi belum berhasil diaktifkan. Coba lagi.");
  }

  return <section className="panel notification-settings-panel" aria-labelledby="notification-settings-title">
    <div className="notification-settings-icon" aria-hidden="true"><BellRing size={19} /></div>
    <div className="notification-settings-copy">
      <p className="eyebrow">PENGINGAT</p>
      <h2 id="notification-settings-title">Notifikasi trip</h2>
      <p>{getNotificationSettingsLabel(preference)}. Kamu akan mendapat kabar penting tanpa harus membuka app terus-menerus.</p>
      {blocked ? <small className="field-hint">Izin diblokir browser. Ubah izin situs dari pengaturan browser, lalu aktifkan lagi di sini.</small> : null}
      {!supported ? <small className="field-hint">Push notification belum didukung oleh perangkat atau browser ini.</small> : null}
      {error ? <p className="notification-prompt-error" role="alert">{error}</p> : null}
    </div>
    <button className="btn btn-primary notification-settings-button" type="button" onClick={() => { void enable(); }} disabled={!supported || blocked || isSaving}>
      <BellRing size={15} aria-hidden="true" /> {isSaving ? "Menyimpan…" : preference.pushEnabled ? "Perbarui perangkat" : "Aktifkan"}
    </button>
  </section>;
}
