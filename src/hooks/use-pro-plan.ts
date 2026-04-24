"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isStripeConfiguredClient } from "@/lib/stripe/client";
import { fetchPlanFromBrowser, type Plan } from "@/lib/supabase/pro-plan";

/**
 * React hook for the signed-in user's Pro plan state.
 *
 * Returns { plan, isPro, isLoading }.
 *
 * Behavior matrix:
 * - Supabase not configured (no auth at all)     → { plan: "free", isPro: false }
 * - Supabase configured, not signed in           → { plan: "free", isPro: false }
 * - Signed in, Stripe NOT configured             → { plan: "pro",  isPro: true  }
 *     ↑ Treats all signed-in users as Pro while billing is pre-launch.
 *       Once Stripe env vars land, real plan enforcement kicks in with
 *       no code change required.
 * - Signed in, Stripe configured, profile="free" → { plan: "free", isPro: false }
 * - Signed in, Stripe configured, profile="pro"  → { plan: "pro",  isPro: true  }
 *
 * Re-fetches when the auth state changes (sign-in / sign-out / token
 * refresh), so upgrades that happen after sign-in are picked up within
 * one auth refresh cycle.
 */
export function useProPlan() {
  const [plan, setPlan] = useState<Plan>("free");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function refresh() {
      const client = getSupabaseBrowserClient();
      if (!client) {
        if (!cancelled) {
          setPlan("free");
          setIsLoading(false);
        }
        return;
      }

      // Pre-billing mode: if Stripe isn't configured, grant Pro to any
      // signed-in user so the features work. Check auth first to make
      // sure a signed-out visitor still sees "free".
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setPlan("free");
          setIsLoading(false);
        }
        return;
      }

      if (!isStripeConfiguredClient()) {
        if (!cancelled) {
          setPlan("pro");
          setIsLoading(false);
        }
        return;
      }

      const result = await fetchPlanFromBrowser();
      if (!cancelled) {
        setPlan(result);
        setIsLoading(false);
      }
    }

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { plan, isPro: plan === "pro", isLoading };
}
