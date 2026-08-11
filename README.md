# Black Punk Trip

> PWA mobile-first untuk mencatat talangan, membagi pengeluaran, dan menutup settlement trip bersama.

[Buka aplikasi produksi](https://black-punk-trip.vercel.app) · [Laporkan isu](https://github.com/temamumtaza/black-punk-trip/issues)

## Ringkasan

Black Punk Trip adalah PWA untuk mencatat talangan perjalanan, membagi pengeluaran per anggota, menghitung saldo, dan menyelesaikan utang antaranggota.

Versi ini hanya memakai data akun dan trip dari Supabase. Tidak ada fallback demo, fixture trip, atau penyimpanan mutasi di `localStorage`: tanpa konfigurasi backend, aplikasi menampilkan error konfigurasi dan tidak mengaku sudah tersimpan.

## Stack

- Next.js 16 + React 19 + TypeScript
- Supabase Auth, PostgreSQL, RLS, dan private Storage
- Vercel untuk deployment
- PWA standalone dengan service worker untuk shell publik/offline yang jujur

## Prasyarat

- Node.js 20 atau lebih baru
- npm
- Supabase CLI
- Project Supabase dengan Email/Password dan Google Auth yang sudah dikonfigurasi

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Isi `.env.local` dengan URL dan publishable key project Supabase. Pengguna harus masuk atau mendaftar sebelum membuka area trip.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` masih diterima sebagai fallback untuk project Supabase lama. Jangan pernah memasukkan service-role key ke browser, `.env.example`, atau environment variable `NEXT_PUBLIC_*`.

## Supabase

Migration tersedia di:

- `supabase/migrations/0001_black_punk_trip.sql` — schema awal, RLS, dan storage bucket privat.
- `supabase/migrations/0002_production_workflows.sql` — RPC atomik untuk create/join/save/delete/finalize/mark-paid, validasi allocation, dan kebijakan akses produksi.
- `supabase/migrations/0003_finalize_trip_lint.sql` dan `0004_finalize_trip_arrays.sql` — koreksi implementasi settlement agar schema lint production bersih.
- `supabase/migrations/0005_google_first_name_profiles.sql` — default nama depan untuk akun Google tanpa menimpa nickname email.
- `supabase/migrations/0006_rebalance_equal_expenses_on_join.sql` — memasukkan member baru ke expense `Rata` secara atomik dan memperbaiki expense aktif lama yang terdampak.

Link project dan jalankan migration setelah memastikan project yang aktif benar:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase config push
```

Migration production harus tersinkron sebelum mutasi digunakan. Jangan menghapus data existing saat melakukan sinkronisasi schema. Auth Site URL production adalah `https://black-punk-trip.vercel.app`, dan Redirect URL Supabase Auth mencakup:

```text
https://black-punk-trip.vercel.app/auth/callback
```

Tambahkan juga URL lokal bila diperlukan:

```text
http://localhost:3000/auth/callback
```

Storage menggunakan bucket privat `trip-receipts`; URL bukti pembayaran dibuat melalui signed URL dan tidak dipublikasikan sebagai asset umum.

## Fitur tersedia

- daftar/masuk dengan email atau Google
- membuat trip dan bergabung dengan kode undangan
- mencatat, mengedit, menghapus, dan mencari talangan
- pembagian rata, pilih anggota, atau nominal custom
- unggah bukti pembayaran ke storage privat dan melihatnya melalui popup in-app
- melihat saldo dan settlement dengan format Rupiah Indonesia
- admin memvalidasi lalu mengunci trip secara atomik
- debitur atau admin menandai settlement sudah dibayar
- offline shell PWA yang jujur; mutasi tetap membutuhkan koneksi dan tidak disimpan diam-diam di perangkat

OCR, transfer bank otomatis, chat, dan sinkronisasi database offline bukan bagian dari scope V1.

## Arsitektur data dan keamanan

- Seluruh mutasi utama berjalan melalui Supabase RPC dengan pengguna terautentikasi; aturan RLS tetap menjadi batas otoritas di server.
- Bukti pembayaran disimpan pada bucket privat `trip-receipts` dan dibuka memakai signed URL yang berumur pendek.
- Area `/app` memakai `Cache-Control: private, no-store`; service worker hanya menyimpan shell publik dan tidak menyimpan data trip.
- Jangan commit `.env.local`, publishable key yang tidak dimaksudkan, atau service-role key. Service-role key tidak pernah dibutuhkan oleh browser.

## Quality checks

```bash
npm run dev       # development server
npm run lint      # ESLint
npm test          # unit/component tests
npm run check     # lint, tests, dan typecheck
npm run ci        # seluruh quality checks + production build
npm run build     # production build
npm start         # serve production build
```

## Deployment Vercel

Project deploy memakai Next.js dengan environment variables berikut pada Development, Preview, dan Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

URL Vercel saat ini: `https://black-punk-trip.vercel.app`.

Setelah mengubah schema, jalankan `supabase db push` hanya terhadap project yang telah diverifikasi. Hubungkan repository ini ke project Vercel bila ingin deployment otomatis pada push ke `main`; alternatifnya, gunakan `vercel deploy --prod` dari checkout yang sudah terhubung. Workflow GitHub Actions menjalankan validasi pada push dan pull request.

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk alur kontribusi, validasi lokal, dan batasan keamanan. Repository ini menggunakan lisensi `UNLICENSED`; tidak ada izin penggunaan ulang yang diberikan tanpa persetujuan pemilik.
