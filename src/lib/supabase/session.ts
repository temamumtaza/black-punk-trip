import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

type BrowserAuthClient = Pick<SupabaseClient<Database>, "auth">;

/**
 * The server-rendered user and the browser session can briefly diverge in a
 * PWA after a token refresh or an old cached shell. Only use the browser
 * session for browser-side Supabase reads and mutations.
 */
export async function getBrowserSessionUserId(client: BrowserAuthClient): Promise<string | null> {
  const response = await client.auth.getSession();
  if (response.error || !response.data.session?.user) return null;
  return response.data.session.user.id;
}
