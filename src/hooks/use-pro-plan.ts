"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchPlanFromBrowser, type Plan } from "@/lib/supabase/pro-plan";

/**
 * React hook for the signed-in user's Pro plan state.
 *
 * Returns { plan, isPro, isLoading }. If Supabase isn't configured or
 * the user isn't signed in, returns { plan: "free", isPro: false, isLoading: false }.
 *
 * Re-fetches when the auth state changes (sign-in / sign-out / token
 * refresh), so upgrades that happen after sign-in are picked up
 * within one auth refresh cycle.
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
