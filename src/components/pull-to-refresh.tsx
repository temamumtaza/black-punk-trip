"use client";

import { ArrowDown, Check, LoaderCircle, WifiOff } from "lucide-react";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

const threshold = 72;
type RefreshPhase = "idle" | "pulling" | "ready" | "refreshing" | "success" | "error";

function isAtTop() {
  return window.scrollY <= 1 && document.documentElement.scrollTop <= 1 && document.body.scrollTop <= 1;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const hapticReady = useRef(false);
  const completionTimer = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [phase, setPhase] = useState<RefreshPhase>("idle");
  const refreshing = phase === "refreshing";
  const active = phase !== "idle";

  function pulse(duration: number) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(duration);
  }

  function resetPull() {
    startY.current = null;
    setDistance(0);
    hapticReady.current = false;
  }

  function cancelPull() {
    resetPull();
    if (!refreshing) setPhase("idle");
  }

  function showCompletion(nextPhase: "success" | "error") {
    setPhase(nextPhase);
    if (completionTimer.current) window.clearTimeout(completionTimer.current);
    completionTimer.current = window.setTimeout(() => {
      setPhase("idle");
      completionTimer.current = null;
    }, nextPhase === "success" ? 1700 : 2500);
  }

  async function refreshIfReady() {
    const shouldRefresh = phase === "ready" && !refreshing;
    resetPull();
    if (!shouldRefresh) {
      setPhase("idle");
      return;
    }
    setPhase("refreshing");
    try {
      await onRefresh();
      pulse(10);
      showCompletion("success");
    } catch {
      showCompletion("error");
    }
  }

  const progress = Math.min(1, distance / threshold);
  const label = phase === "ready" ? "Lepaskan untuk memuat" : phase === "refreshing" ? "Memuat data terbaru…" : phase === "success" ? "Data sudah terbaru" : phase === "error" ? "Belum bisa memuat" : "Tarik untuk memuat";
  const laneHeight = phase === "pulling" || phase === "ready" ? Math.min(52, Math.round(distance * 0.72)) : active ? 52 : 0;
  const Icon = phase === "success" ? Check : phase === "error" ? WifiOff : phase === "refreshing" ? LoaderCircle : ArrowDown;

  return <div className={`pull-refresh-shell ${active ? "is-pulling" : ""}`} style={{ "--pull-space": `${laneHeight}px` } as CSSProperties} onTouchStart={(event) => {
    if (event.touches.length === 1 && isAtTop() && !refreshing && phase !== "success" && phase !== "error") startY.current = event.touches[0]?.clientY ?? null;
  }} onTouchMove={(event) => {
    if (startY.current === null || refreshing) return;
    const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current;
    if (delta <= 0) {
      resetPull();
      return;
    }
    if (!isAtTop()) {
      resetPull();
      return;
    }
    event.preventDefault();
    const nextDistance = Math.min(112, delta * 0.48);
    const isReady = nextDistance >= threshold;
    if (isReady && !hapticReady.current) {
      pulse(8);
      hapticReady.current = true;
    }
    if (!isReady) hapticReady.current = false;
    setDistance(nextDistance);
    setPhase(isReady ? "ready" : "pulling");
  }} onTouchEnd={() => { void refreshIfReady(); }} onTouchCancel={cancelPull}>
    <div className="pull-refresh-lane" aria-hidden={phase === "idle"}>
      <div className={`pull-refresh-indicator is-${phase}`} role="status" aria-live="polite" aria-label={label} style={{ "--pull-progress": progress } as CSSProperties}>
        <span className="pull-refresh-ring" aria-hidden="true"><Icon size={15} className={phase === "refreshing" ? "is-spinning" : ""} /></span>
        <span className="pull-refresh-label">{label}</span>
      </div>
    </div>
    {children}
  </div>;
}
