/**
 * Browser-side Pro plan detection — reads the `profiles.plan` column
 * for the signed-in user. Returns 'free' if not signed in, not
 * configured, or on error (never throws; never blocks access).
 *
 * The server-side equivalent lives in `pro-plan-server.ts` (kept in
 * a separate module so this one can be imported from client components
 * without dragging `next/headers` into the client bundle).
 *
 * Webhook handlers update `profiles.plan` server-side; the browser
 * only reads. Never trust client-side plan state for access decisions
 * that have revenue impact — gate sensitive features with the server
 * helper (getSupabaseServerClient) in Server Components.
 */

import { getSupabaseBrowserClient } from "./client";

export type Plan = "free" | "pro";

export async function fetchPlanFromBrowser(): Promise<Plan> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return "free";

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "free";

    const { data, error } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return "free";
    return data.plan === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}
