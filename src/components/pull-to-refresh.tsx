"use client";

import { RefreshCw } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

const threshold = 72;

function isAtTop() {
  return window.scrollY <= 1 && document.documentElement.scrollTop <= 1 && document.body.scrollTop <= 1;
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const active = distance > 0 || refreshing;

  function resetPull() {
    startY.current = null;
    setDistance(0);
  }

  async function refreshIfReady() {
    const shouldRefresh = distance >= threshold && !refreshing;
    resetPull();
    if (!shouldRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return <div className={`pull-refresh-shell ${active ? "is-pulling" : ""}`} onTouchStart={(event) => {
    if (event.touches.length === 1 && isAtTop() && !refreshing) startY.current = event.touches[0]?.clientY ?? null;
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
    setDistance(Math.min(104, delta * 0.48));
  }} onTouchEnd={() => { void refreshIfReady(); }} onTouchCancel={resetPull}>
    <div className={`pull-refresh-indicator ${distance >= threshold || refreshing ? "is-ready" : ""}`} aria-live="polite" aria-label={refreshing ? "Memuat ulang" : "Tarik untuk memuat ulang"} style={{ transform: `translate(-50%, ${Math.max(-46, distance - 46)}px)` }}>
      <RefreshCw size={15} className={refreshing ? "is-spinning" : ""} aria-hidden="true" />
    </div>
    {children}
  </div>;
}
