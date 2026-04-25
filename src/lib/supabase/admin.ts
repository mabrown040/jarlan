/**
 * Server-side admin role detection.
 *
 * Today auth is binary (signed-in or not). The "admin" role is a
 * single elevated capability granted by setting
 * `app_metadata.role = 'admin'` on a user via the Supabase
 * dashboard or service-role client. There is no in-app UI to grant
 * or revoke admin — adequate for a tool with one operator.
 *
 * `app_metadata` is server-only; clients cannot mutate it through
 * the JS client (RLS-equivalent for auth metadata). That's why
 * checking the role on the server is safe.
 *
 * Used by the AI-chat growth tool at /admin/scenario-from-text.
 * See docs/ai-chat-architecture.md for the broader access model.
 */

import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "./server";

/**
 * Pure check on a resolved user. Returns true if `app_metadata.role`
 * is exactly "admin". Null/undefined input returns false.
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}

export type AdminGateResult =
  | { ok: true; user: User }
  | {
      ok: false;
      status: 401 | 403;
      reason: "not_authenticated" | "not_admin";
    };

/**
 * Server-side gate for admin-only routes. Resolves the current
 * Supabase session, confirms the user has admin role, and returns
 * a discriminated result. Callers convert to a NextResponse with
 * the included status.
 *
 *   const gate = await requireAdmin();
 *   if (!gate.ok) {
 *     return NextResponse.json({ error: gate.reason }, { status: gate.status });
 *   }
 *   // gate.user is the admin
 */
export async function requireAdmin(): Promise<AdminGateResult> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    // Supabase not configured at all — admin features are unavailable
    // by definition. Treat as "not authenticated" so the caller
    // returns 401 and doesn't leak that admin features exist.
    return { ok: false, status: 401, reason: "not_authenticated" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, reason: "not_authenticated" };
  }

  if (!isAdmin(user)) {
    return { ok: false, status: 403, reason: "not_admin" };
  }

  return { ok: true, user };
}
