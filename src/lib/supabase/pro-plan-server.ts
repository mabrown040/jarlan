/**
 * Server-side Pro plan detection.
 *
 * Kept in a separate module from `pro-plan.ts` so the browser version
 * can be imported into client components without pulling `next/headers`
 * (which breaks the client bundle).
 *
 * Use this helper in Server Components or Route Handlers that need to
 * gate access based on the user's plan.
 */

import { getSupabaseServerClient } from "./server";

import type { Plan } from "./pro-plan";

export async function fetchPlanFromServer(): Promise<Plan> {
  const supabase = await getSupabaseServerClient();
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
