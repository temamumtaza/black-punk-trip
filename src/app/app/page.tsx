import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TripApp } from "@/components/trip-app";
import type { AppView } from "@/components/trip-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Trip kamu" };

const views: AppView[] = ["home", "expenses", "members", "settlement", "review", "settings", "add-expense", "detail", "edit-expense", "trips", "create-trip", "join-trip"];

function normalizeView(value: string | string[] | undefined): AppView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && views.includes(candidate as AppView) ? candidate as AppView : "home";
}

export default async function AppPage({ searchParams }: { searchParams: Promise<{ view?: string | string[]; trip?: string | string[]; code?: string | string[]; expense?: string | string[] }> }) {
  const params = await searchParams;
  const client = await getSupabaseServerClient();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, Array.isArray(value) ? value[0] : value);
  }
  const next = `/app${query.toString() ? `?${query.toString()}` : ""}`;
  if (!client) redirect(`/login?error=configuration&next=${encodeURIComponent(next)}`);
  const userResponse = await client.auth.getUser();
  if (userResponse.error || !userResponse.data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const trip = Array.isArray(params.trip) ? params.trip[0] : params.trip;
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const expense = Array.isArray(params.expense) ? params.expense[0] : params.expense;
  return <TripApp initialView={normalizeView(params.view)} initialUserId={userResponse.data.user.id} initialTripId={trip} initialJoinCode={code} initialExpenseId={expense} />;
}
