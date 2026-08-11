import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingPage } from "@/components/onboarding-page";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mulai perjalananmu",
  description: "Catat talangan, bagi pengeluaran, dan bereskan settlement trip bersama.",
};

export default async function Page() {
  const client = await getSupabaseServerClient();
  if (client) {
    const userResponse = await client.auth.getUser();
    if (!userResponse.error && userResponse.data.user) redirect("/app?view=home");
  }
  return <OnboardingPage />;
}
