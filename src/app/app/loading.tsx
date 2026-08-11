import Image from "next/image";

export default function Loading() {
  return <main className="loading-screen"><span className="loading-mark"><Image src="/brand/bp-logo.png" alt="" width={1024} height={1024} priority /></span><p>Membuka ruang trip…</p></main>;
}
