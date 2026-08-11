"use client";

import { Download, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type AccessState = "checking" | "allowed" | "install-required";
type InstalledState = "checking" | "installed" | "not-detected";
type TutorialLanguage = "id" | "en";

type RelatedAppsNavigator = Navigator & {
  getInstalledRelatedApps?: () => Promise<Array<{ id?: string; platform: string; url?: string }>>;
};

function isIOS() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isMobileDevice() {
  return isIOS() || /Android|Mobi/i.test(navigator.userAgent);
}

function isStandalone() {
  const appleNavigator = navigator as Navigator & { standalone?: boolean };
  return appleNavigator.standalone === true || (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
}

function safariTutorialLanguage(): TutorialLanguage {
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "id";
}

function AppleSafariShareIcon() {
  return <svg className="apple-safari-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V2.75" /><path d="m7.75 7 4.25-4.25L16.25 7" /><path d="M5.25 10.25v9a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-9" /></svg>;
}

export function PwaMobileGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessState>("checking");
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const [isPromptingInstall, setIsPromptingInstall] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);
  const [iosTutorialLanguage, setIosTutorialLanguage] = useState<TutorialLanguage>("id");
  const [installedState, setInstalledState] = useState<InstalledState>("checking");

  useEffect(() => {
    let cancelled = false;
    const installRequired = () => isMobileDevice() && !isStandalone();
    const syncAccess = async () => {
      setIosDevice(isIOS());
      setIosTutorialLanguage(safariTutorialLanguage());
      const requiresInstall = installRequired();
      setAccess(requiresInstall ? "install-required" : "allowed");
      if (!requiresInstall) {
        setInstalledState("not-detected");
        return;
      }

      const relatedApps = navigator as RelatedAppsNavigator;
      if (!relatedApps.getInstalledRelatedApps) {
        setInstalledState("not-detected");
        return;
      }
      setInstalledState("checking");
      try {
        const installedApps = await relatedApps.getInstalledRelatedApps();
        if (!cancelled) setInstalledState(installedApps.length > 0 ? "installed" : "not-detected");
      } catch {
        if (!cancelled) setInstalledState("not-detected");
      }
    };
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const displayMode = typeof window.matchMedia === "function" ? window.matchMedia("(display-mode: standalone)") : null;

    void syncAccess();
    displayMode?.addEventListener("change", syncAccess);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => {
      cancelled = true;
      displayMode?.removeEventListener("change", syncAccess);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  async function requestInstall() {
    if (!deferredInstallPrompt) return;
    setIsPromptingInstall(true);
    setInstallMessage("");
    try {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      setInstallMessage(choice.outcome === "accepted" ? "Instalasi dimulai. Setelah selesai, buka Black Punk Trip dari layar utama." : "Instalasi dibatalkan. Kamu bisa mencoba lagi dari menu browser.");
      setDeferredInstallPrompt(null);
    } catch {
      setInstallMessage("Instalasi belum bisa dimulai. Gunakan menu browser untuk memasang aplikasi.");
    } finally {
      setIsPromptingInstall(false);
    }
  }

  if (access === "allowed") return <>{children}</>;

  const iosCopy = iosTutorialLanguage === "en"
    ? { lead: "On iPhone or iPad:", tap: "Tap", share: "Share", inSafari: "in Safari.", choose: "Choose", add: "Add to Home Screen", open: "Open Black Punk Trip from the Home Screen.", fallback: "If you cannot find this option, open this page in Safari." }
    : { lead: "Di iPhone atau iPad:", tap: "Ketuk", share: "Bagikan", inSafari: "di Safari.", choose: "Pilih", add: "Tambahkan ke Layar Utama", open: "Buka Black Punk Trip dari layar utama.", fallback: "Jika opsinya belum terlihat, buka halaman ini dengan Safari." };

  return <main className="pwa-gate" aria-busy={access === "checking"}>
    <section className="pwa-gate-card" aria-labelledby="pwa-gate-title">
      <span className="pwa-gate-mark" aria-hidden="true">BP</span>
      <p className="eyebrow">BLACK PUNK TRIP</p>
      <h1 id="pwa-gate-title">Buka sebagai aplikasi.</h1>
      <p className="pwa-gate-lede">Black Punk Trip di ponsel dibuat khusus untuk PWA agar sesi, notifikasi, dan tampilan layar penuh tetap konsisten.</p>
      {access === "checking" ? <p className="pwa-gate-status" role="status">Menyiapkan aplikasi…</p> : installedState === "installed" ? <div className="pwa-gate-instructions"><p><strong>Black Punk Trip sudah terpasang.</strong></p><ol><li><Smartphone size={15} aria-hidden="true" /> Kembali ke layar utama perangkat.</li><li>Buka <strong>Black Punk Trip</strong> dari ikon aplikasi untuk melanjutkan.</li></ol><small>Browser tidak diberi izin untuk membuka PWA secara paksa. Halaman ini sengaja meminta kamu melanjutkan lewat aplikasi yang sudah terpasang.</small></div> : iosDevice ? <div className="pwa-gate-instructions"><p>{iosCopy.lead}</p><ol><li><AppleSafariShareIcon /> {iosCopy.tap} <strong>{iosCopy.share}</strong> {iosCopy.inSafari}</li><li><span className="pwa-gate-plus" aria-hidden="true">＋</span> {iosCopy.choose} <strong>{iosCopy.add}</strong>.</li><li><Smartphone size={15} aria-hidden="true" /> {iosCopy.open}</li></ol><small>{iosCopy.fallback}</small><p className="pwa-open-existing-tip">Sudah terpasang? Tutup browser lalu buka Black Punk Trip dari Layar Utama.</p></div> : <div className="pwa-gate-instructions"><p>Pasang Black Punk Trip ke perangkatmu, lalu buka dari layar utama.</p>{deferredInstallPrompt ? <button className="btn btn-primary pwa-install-button" type="button" onClick={requestInstall} disabled={isPromptingInstall}><Download size={17} aria-hidden="true" /> {isPromptingInstall ? "Menyiapkan instalasi…" : "Instal Black Punk Trip"}</button> : <ol><li><span className="pwa-gate-menu" aria-hidden="true">⋮</span> Buka menu browser.</li><li>Pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</li><li><Smartphone size={15} aria-hidden="true" /> Buka Black Punk Trip dari layar utama.</li></ol>}<p className="pwa-open-existing-tip">Sudah terpasang? Tutup browser lalu buka Black Punk Trip dari layar utama.</p></div>}
      {installMessage ? <p className="pwa-gate-status" role="status">{installMessage}</p> : null}
      <p className="pwa-gate-footnote">Akses browser desktop tetap tersedia untuk pengelolaan yang lebih luas.</p>
    </section>
  </main>;
}
