"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const slides = [
  {
    eyebrow: "MULAI DARI YANG NYATA",
    title: <>Siapa yang<br /><em>nombok?</em></>,
    lede: "Simpan setiap talangan di satu ruang yang bisa dilihat seluruh rombongan.",
    cardLabel: "01 · CATAT",
    cardTitle: "Tidak ada lagi chat, “yang bayar siapa tadi?”",
    items: ["Nama dan tanggal pengeluaran", "Siapa yang membayar", "Bukti pembayaran bila perlu"],
  },
  {
    eyebrow: "BAGI SESUAI KENYATAAN",
    title: <>Biar semua<br /><em>kebagian pas.</em></>,
    lede: "Villa bisa rata. Makan bisa beda-beda. Setiap orang hanya menanggung bagiannya.",
    cardLabel: "02 · BAGI",
    cardTitle: "Satu total. Pembagian yang masuk akal.",
    items: ["Bagi rata untuk semua", "Pilih anggota yang ikut", "Nominal custom per orang"],
  },
  {
    eyebrow: "PULANG TANPA GANTUNGAN",
    title: <>Sekali transfer,<br /><em>beres.</em></>,
    lede: "Di akhir trip, sistem merangkum saldo dan menyusun transfer sesingkat mungkin.",
    cardLabel: "03 · SELESAI",
    cardTitle: "Admin review. Semua tahu harus bayar ke siapa.",
    items: ["Saldo: dibayar dikurangi bagian", "Settlement paling singkat", "Trip terkunci setelah final"],
  },
];

export function OnboardingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = slides[activeSlide];
  const isLastSlide = activeSlide === slides.length - 1;

  return <main className="onboarding-entry-shell">
    <a className="skip-link" href="#onboarding-content">Lewati ke konten utama</a>
    <header className="onboarding-entry-topbar">
      <BrandMark />
      <Link className="onboarding-skip" href="/login">Lewati ke login <ChevronRight size={15} aria-hidden="true" /></Link>
    </header>
    <section className="onboarding-entry-content" id="onboarding-content" aria-label="Pengenalan Black Punk Trip">
      <div className="onboarding-slide" key={activeSlide}>
        <div className="onboarding-slide-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> {slide.eyebrow}</p>
          <p className="onboarding-slide-count" aria-live="polite">{activeSlide + 1} dari {slides.length}</p>
          <h1>{slide.title}</h1>
          <p className="onboarding-entry-lede">{slide.lede}</p>
        </div>
        <div className="onboarding-slide-card" aria-label={slide.cardLabel}>
          <div className="onboarding-slide-card-top"><span>BLACK PUNK TRIP</span><span>{slide.cardLabel}</span></div>
          <h2>{slide.cardTitle}</h2>
          <ul className="onboarding-slide-list">
            {slide.items.map((item) => <li key={item}><Check size={15} aria-hidden="true" /><span>{item}</span></li>)}
          </ul>
          <div className="onboarding-slide-card-footer"><span>LOGIN + RLS</span><span>Tersimpan di akunmu</span></div>
        </div>
        <div className="onboarding-slide-controls">
          {activeSlide > 0 ? <button className="onboarding-control-back" type="button" onClick={() => setActiveSlide((current) => current - 1)}><ArrowLeft size={15} aria-hidden="true" /> Kembali</button> : <span aria-hidden="true" />}
          <div className="onboarding-dots" aria-label={`Slide ${activeSlide + 1} dari ${slides.length}`}>
            {slides.map((item, index) => <button key={item.cardLabel} type="button" className={index === activeSlide ? "is-active" : ""} onClick={() => setActiveSlide(index)} aria-label={`Buka slide ${index + 1}`} aria-current={index === activeSlide ? "step" : undefined} />)}
          </div>
          {isLastSlide ? <Link className="btn btn-primary onboarding-start-button" href="/signup">Buat akun <ArrowUpRight size={16} aria-hidden="true" /></Link> : <button className="btn btn-primary onboarding-next-button" type="button" onClick={() => setActiveSlide((current) => current + 1)}>Lanjut <ArrowRight size={16} aria-hidden="true" /></button>}
        </div>
      </div>
    </section>
    <footer className="onboarding-entry-footer"><span>Black Punk Trip</span><span>Catat yang nyata. Bagi dengan jelas.</span></footer>
  </main>;
}
