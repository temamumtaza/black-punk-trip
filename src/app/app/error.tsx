"use client";

import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-screen"><p className="eyebrow">TRIP TIDAK TERBUKA</p><h1>Coba lagi sebentar.</h1><p>Koneksi belum siap. Tidak ada perubahan yang dianggap berhasil sebelum server mengonfirmasinya.</p><Button onClick={reset}>Muat ulang</Button></main>;
}
