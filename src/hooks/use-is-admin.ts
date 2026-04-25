"use client";

import { useEffect, useState } from "react";

import { fetchIsAdminFromBrowser } from "@/lib/supabase/admin-browser";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * React hook for the signed-in user's admin status.
 *
 * Returns `{ isAdmin, isLoading }`. Re-fetches when the auth
 * state changes (sign-in / sign-out / token refresh).
 *
 * Mirrors `useProPlan` in shape: never blocks; defaults to
 * `false` when Supabase isn't configured or the user isn't
 * signed in. Use only for display concerns (showing/hiding
 * UI). Page-level gating goes through the server-side
 * `requireAdmin()` helper, which is the source of truth.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const result = await fetchIsAdminFromBrowser();
      if (!cancelled) {
        setIsAdmin(result);
        setIsLoading(false);
      }
    }

    void refresh();

    const supabase = getSupabaseBrowserClient();
    const subscription = supabase?.auth.onAuthStateChange(() => {
      void refresh();
    }).data.subscription;

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading };
}
