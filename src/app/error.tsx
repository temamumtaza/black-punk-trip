"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { /* Keep the boundary intentionally quiet in the UI. */ }, []);
  return <main className="error-screen"><p className="eyebrow">BLACK PUNK TRIP</p><h1>Ada yang nyangkut.</h1><p>Coba muat ulang bagian ini. Data yang belum tersimpan tidak akan dianggap berhasil.</p><Button onClick={reset}>Coba lagi</Button></main>;
}

