"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const registerServiceWorker = () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // PWA support remains progressive enhancement when registration is unavailable.
        });
      }
    };
    const registrationTimer = window.setTimeout(registerServiceWorker, 1200);
    return () => {
      window.clearTimeout(registrationTimer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return offline ? <div className="offline-banner" role="status" aria-live="polite">Offline — perubahan baru belum bisa disimpan.</div> : null;
}
