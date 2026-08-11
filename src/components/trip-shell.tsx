"use client";

import Link from "next/link";
import Image from "next/image";
import { BanknoteArrowDown, ChevronDown, ClipboardList, Home, LogOut, Settings2, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { avatarColor } from "@/lib/format";
import type { Profile, Trip } from "@/lib/types";

export type AppView = "home" | "expenses" | "members" | "settlement" | "review" | "settings" | "add-expense" | "detail" | "edit-expense" | "trips" | "create-trip" | "join-trip";

interface TripShellProps {
  trip: Trip;
  currentProfile: Profile;
  activeView: AppView;
  children: React.ReactNode;
  isAdmin: boolean;
  onNavigate: (view: AppView) => void;
  onSignOut: () => void;
}

const navItems: Array<{ view: AppView; label: string; icon: typeof Home }> = [
  { view: "home", label: "Ringkasan", icon: Home },
  { view: "expenses", label: "Talangan", icon: ClipboardList },
  { view: "members", label: "Anggota", icon: UsersRound },
  { view: "settlement", label: "Settlement", icon: BanknoteArrowDown },
];

export function TripShell({ trip, currentProfile, activeView, children, isAdmin, onNavigate, onSignOut }: TripShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>
      <aside className="app-rail">
        <div className="rail-brand"><BrandMark compact href="/app?view=home" /></div>
        <button className="trip-switcher" type="button" onClick={() => onNavigate("trips")} aria-label="Kelola dan pindah trip">
          <span className="trip-switcher-mark">{trip.name.slice(0, 2).toUpperCase()}</span>
          <span><strong>{trip.name}</strong><small>{trip.status === "finalized" ? "Trip selesai" : "Trip aktif"}</small></span>
          <span className="trip-switcher-chevron">⌄</span>
        </button>
        <nav className="rail-nav" aria-label="Navigasi trip">
          <span className="rail-section-label">TRIP</span>
          {navItems.map(({ view, label, icon: Icon }) => <button key={view} className={`rail-nav-item ${activeView === view ? "is-active" : ""}`} onClick={() => onNavigate(view)} type="button"><Icon size={17} /><span>{label}</span></button>)}
          <span className="rail-section-label rail-section-spaced">RUANG TRIP</span>
          {isAdmin ? <button className={`rail-nav-item ${activeView === "review" ? "is-active" : ""}`} onClick={() => onNavigate("review")} type="button"><BanknoteArrowDown size={17} /><span>{trip.status === "finalized" ? "Kelola finalisasi" : "Review & tutup"}</span>{trip.status === "active" ? <span className="nav-ping" /> : null}</button> : null}
          <button className={`rail-nav-item ${activeView === "settings" ? "is-active" : ""}`} onClick={() => onNavigate("settings")} type="button"><Settings2 size={17} /><span>Pengaturan</span></button>
        </nav>
        <div className="rail-bottom">
          <div className="invite-mini"><span className="eyebrow">KODE GABUNG</span><strong>{trip.inviteCode}</strong><small>Bagikan ke rombongan</small></div>
          <button className="account-mini" onClick={onSignOut} type="button"><span className="avatar" style={{ backgroundColor: avatarColor(currentProfile.id) }}>{currentProfile.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{currentProfile.displayName}</strong><small>Akun aktif</small></span><LogOut size={15} /></button>
        </div>
      </aside>
      <div className="app-content">
        <header className="app-topbar">
          <Link className="app-header-mark" href="/app?view=home" aria-label="Black Punk Trip, ringkasan"><Image src="/brand/bp-logo.png" alt="" width={1024} height={1024} priority /></Link>
          <button className="mobile-trip-switcher" type="button" onClick={() => onNavigate("trips")} aria-label="Kelola dan pindah trip"><span className="mobile-trip-name"><span>{trip.name}</span><small>{trip.status === "finalized" ? "Finalized" : "Aktif"}</small></span><ChevronDown size={15} aria-hidden="true" /></button>
          <div className="topbar-actions"><span className="sync-pill"><span className="status-dot" /> tersimpan</span><button className="icon-btn" type="button" aria-label="Pengaturan" onClick={() => onNavigate("settings")}><Settings2 size={17} /></button></div>
        </header>
        <main className="app-main" id="main-content">{children}</main>
        <nav className="mobile-tabs" aria-label="Navigasi utama trip">
          {navItems.map(({ view, label, icon: Icon }) => <button key={view} className={`mobile-tab ${activeView === view ? "is-active" : ""}`} onClick={() => onNavigate(view)} type="button"><Icon size={19} /><span>{label}</span></button>)}
        </nav>
      </div>
    </div>
  );
}
