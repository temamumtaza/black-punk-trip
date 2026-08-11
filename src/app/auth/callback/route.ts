import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSafeNextPath(value: string | null, origin: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/app?view=home";
  try {
    const candidate = new URL(value, origin);
    if (candidate.origin !== origin) return "/app?view=home";
    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return "/app?view=home";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"), requestUrl.origin);
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  const errorUrl = new URL("/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "auth_callback");

  if (!code) return NextResponse.redirect(errorUrl);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.redirect(redirectUrl);

  const response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? NextResponse.redirect(errorUrl) : response;
}
