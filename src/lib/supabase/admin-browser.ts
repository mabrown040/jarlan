/**
 * Browser-side admin role detection. Reads `app_metadata.role`
 * from the current Supabase session.
 *
 * `app_metadata` is server-only writable — clients can read it
 * via `auth.getUser()` but can't mutate it through the JS SDK.
 * So a positive result here faithfully reflects the server-set
 * role. Never trust this for access decisions that have impact
 * (page gates, mutation routes) — those go through the
 * server-side `requireAdmin()` in `./admin.ts`. This helper
 * exists for *display* concerns: showing or hiding an admin
 * nav link.
 *
 * Returns `false` when Supabase isn't configured, the user
 * isn't signed in, or any error occurs. Never throws.
 */

import { getSupabaseBrowserClient } from "./client";

export async function fetchIsAdminFromBrowser(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.app_metadata?.role === "admin";
  } catch {
    return false;
  }
}
