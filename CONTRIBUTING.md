# Kontribusi

Terima kasih sudah ingin membantu Black Punk Trip. Aplikasi ini menangani data pengeluaran pribadi; perubahan harus menjaga kebenaran perhitungan, privasi, dan pengalaman PWA mobile-first.

## Menyiapkan lingkungan lokal

1. Gunakan Node.js 20.9 atau lebih baru dan npm 10 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`, lalu isi URL dan publishable key Supabase milik lingkungan pengembangan.
3. Jalankan `npm install` dan `npm run dev`.

Jangan pernah menyertakan `.env.local`, service-role key, token akses, data pengguna, atau bukti pembayaran nyata dalam commit, issue, maupun pull request.

## Sebelum mengajukan pull request

```bash
npm run ci
```

Tambahkan atau sesuaikan test untuk perubahan perilaku. Untuk perubahan finance, pertahankan nominal sebagai integer Rupiah dan buktikan bahwa total allocation selalu sama dengan total expense.

## Batasan produk

- UI publik dan aplikasi memakai bahasa Indonesia yang jelas dan format tanggal `dd/mm/yyyy`.
- Data trip hanya boleh bisa diakses oleh anggota trip sesuai RLS.
- Pembagian `Rata` harus menghitung ulang seluruh anggota saat anggota baru bergabung; `Custom` dan peserta terpilih tetap merupakan pilihan eksplisit.
- Pengeluaran pada trip terkunci tidak boleh diubah kecuali trip dibuka kembali oleh admin.

## Database dan deployment

Migration Supabase berada di `supabase/migrations`. Jangan mengubah atau menghapus migration yang sudah dipush. Tambahkan migration baru dan verifikasi project target sebelum menjalankan `supabase db push`.

Vercel membangun aplikasi saat ada push ke `main`. Jangan menaruh secret di workflow GitHub Actions; environment produksi dikelola di Vercel dan Supabase.
