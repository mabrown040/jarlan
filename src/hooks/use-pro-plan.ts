"use client";

import { useEffect, useState } from "react";

import {
  DEV_PRO_OVERRIDE_EVENT,
  getDevProOverride,
} from "@/lib/dev/dev-pro-override";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isStripeConfiguredClient } from "@/lib/stripe/client";
import { fetchPlanFromBrowser, type Plan } from "@/lib/supabase/pro-plan";

/**
 * React hook for the signed-in user's Pro plan state.
 *
 * Returns { plan, isPro, isLoading }.
 *
 * Behavior matrix:
 * - Dev-only Pro override set (via QA panel)     → { plan: "pro",  isPro: true  }
 *     ↑ Noop in production builds — the override getter returns false
 *       when `NODE_ENV === "production"`.
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
 * refresh) OR when the dev Pro override is toggled, so upgrades /
 * dev-tool flips are picked up within one cycle.
 */
export function useProPlan() {
  const [plan, setPlan] = useState<Plan>("free");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      // Dev-only short-circuit: pretend Pro when the QA toggle is on.
      // Skipped entirely in production by the override getter.
      if (getDevProOverride()) {
        if (!cancelled) {
          setPlan("pro");
          setIsLoading(false);
        }
        return;
      }

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

    // Listen for the dev toggle flipping (same tab + cross tab).
    const onDevOverrideChange = () => {
      void refresh();
    };
    window.addEventListener(DEV_PRO_OVERRIDE_EVENT, onDevOverrideChange);
    window.addEventListener("storage", onDevOverrideChange);

    const supabase = getSupabaseBrowserClient();
    const subscription = supabase?.auth.onAuthStateChange(() => {
      void refresh();
    }).data.subscription;

    return () => {
      cancelled = true;
      window.removeEventListener(DEV_PRO_OVERRIDE_EVENT, onDevOverrideChange);
      window.removeEventListener("storage", onDevOverrideChange);
      subscription?.unsubscribe();
    };
  }, []);

  return { plan, isPro: plan === "pro", isLoading };
}
