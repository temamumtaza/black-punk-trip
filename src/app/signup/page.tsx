import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Daftar" };
export default async function SignupPage() {
  const client = await getSupabaseServerClient();
  if (client) {
    const userResponse = await client.auth.getUser();
    if (!userResponse.error && userResponse.data.user) redirect("/app?view=home");
  }
  return <AuthForm mode="sign-up" />;
}
