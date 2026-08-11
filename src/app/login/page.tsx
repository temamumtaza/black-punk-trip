import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Masuk" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const client = await getSupabaseServerClient();
  if (client) {
    const userResponse = await client.auth.getUser();
    if (!userResponse.error && userResponse.data.user) redirect("/app?view=home");
  }
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const initialError = error === "auth_callback" ? "Login Google belum selesai. Coba lagi." : error === "configuration" ? "Supabase belum dikonfigurasi untuk environment ini." : undefined;
  return <AuthForm mode="sign-in" initialError={initialError} />;
}
