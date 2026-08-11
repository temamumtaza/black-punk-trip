import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { getBrowserSessionUserId } from "@/lib/supabase/session";

describe("getBrowserSessionUserId", () => {
  it("uses the browser session rather than a server-provided user id", async () => {
    const getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "browser-user" } } },
      error: null,
    });
    const client = { auth: { getSession } } as unknown as SupabaseClient<Database>;

    await expect(getBrowserSessionUserId(client)).resolves.toBe("browser-user");
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("returns null when the PWA has no usable browser session", async () => {
    const client = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
    } as unknown as SupabaseClient<Database>;

    await expect(getBrowserSessionUserId(client)).resolves.toBeNull();
  });
});
