"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Button, Field, TextInput } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  initialError?: string;
}

export function AuthForm({ mode, initialError }: AuthFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(initialError ? "error" : "idle");
  const [message, setMessage] = useState(initialError ?? "");
  const isSignUp = mode === "sign-up";

  function getNextPath() {
    const candidate = new URLSearchParams(window.location.search).get("next");
    return candidate && candidate.startsWith("/") && !candidate.startsWith("//") && !/[\\\u0000-\u001f\u007f]/.test(candidate) ? candidate : "/app?view=home";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const client = getSupabaseBrowserClient();

    if (!client) {
      setStatus("error");
      setMessage("Supabase belum dikonfigurasi untuk environment ini.");
      return;
    }

    const nextPath = getNextPath();
    const response = isSignUp
      ? await client.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` } })
      : await client.auth.signInWithPassword({ email, password });

    if (response.error) {
      setStatus("error");
      setMessage("Belum berhasil masuk. Cek email dan password, lalu coba lagi.");
      return;
    }

    setStatus("success");
    setMessage(isSignUp ? "Akun dibuat. Cek email kalau verifikasi diperlukan." : "Berhasil masuk.");
    if (!isSignUp || response.data.session) window.setTimeout(() => router.push(getNextPath()), 500);
  }

  async function handleGoogle() {
    setStatus("loading");
    setMessage("");
    const client = getSupabaseBrowserClient();
    if (!client) {
      setStatus("error");
      setMessage("Supabase belum dikonfigurasi untuk environment ini.");
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(getNextPath())}` },
    });
    if (error) {
      setStatus("error");
      setMessage("Login Google belum berhasil. Coba lagi.");
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-topbar"><Link className="back-link" href="/"><ArrowLeft size={15} /> Kembali</Link><BrandMark compact /></div>
      <section className="auth-card">
        <div className="auth-heading"><p className="eyebrow">{isSignUp ? "TRIP BARU DIMULAI" : "SELAMAT DATANG LAGI"}</p><h1>{isSignUp ? <>Bikin ruang buat<br /><em>urusan nombok.</em></> : <>Lanjutkan<br /><em>perjalananmu.</em></>}</h1><p>{isSignUp ? "Satu akun untuk semua trip dan semua talangan yang perlu dibereskan." : "Masuk untuk melihat trip, saldo, dan settlement yang sudah menunggumu."}</p></div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp ? <Field label="Nama panggilan" htmlFor="auth-display-name"><div className="input-with-icon"><UserRound size={17} aria-hidden="true" /><TextInput id="auth-display-name" autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Misalnya: nama kamu" required minLength={2} /></div></Field> : null}
          <Field label="Email" htmlFor="auth-email"><div className="input-with-icon"><Mail size={17} aria-hidden="true" /><TextInput id="auth-email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="kamu@email.com" required /></div></Field>
          <Field label="Password" htmlFor="auth-password" hint={isSignUp ? "Minimal 6 karakter" : undefined}><div className="input-with-icon"><LockKeyhole size={17} aria-hidden="true" /><TextInput id="auth-password" autoComplete={isSignUp ? "new-password" : "current-password"} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required minLength={6} /></div></Field>
          <Button type="submit" className="btn-full" disabled={status === "loading"}>{status === "loading" ? "Memproses…" : isSignUp ? "Buat akun" : "Masuk"}<ArrowUpRight size={16} /></Button>
          {message ? <p className={`form-message form-message-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">{message}</p> : null}
        </form>
        <div className="auth-divider"><span>atau</span></div>
        <Button variant="ghost" className="btn-full google-btn" onClick={handleGoogle} disabled={status === "loading"}><span className="google-glyph" aria-hidden="true">G</span> Lanjut dengan Google</Button>
        <p className="auth-switch">{isSignUp ? "Sudah punya akun?" : "Belum punya akun?"} <Link href={isSignUp ? "/login" : "/signup"}>{isSignUp ? "Masuk" : "Daftar sekarang"}</Link></p>
        <div className="auth-security-note"><span className="status-dot" /><span>Data trip hanya bisa dibuka oleh anggota yang terautentikasi.</span></div>
      </section>
    </main>
  );
}
