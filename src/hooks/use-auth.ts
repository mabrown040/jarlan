"use client";

/**
 * Auth session hook.
 *
 * Subscribes to Supabase auth state and returns the current user/session.
 * If Supabase env vars are missing (local-only mode), returns a degraded
 * shape with `supabaseConfigured: false` — callers should hide auth UI.
 *
 * See docs/cloud-sync.md for the local-first → cloud-sync mental model.
 */
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type UseAuthResult = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  supabaseConfigured: boolean;
  signOut: () => Promise<void>;
};

export function useAuth(): UseAuthResult {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Configured state is stable for the process lifetime — derive once.
  const supabaseConfigured = supabase !== null;

  const [session, setSession] = useState<Session | null>(null);
  // Start in "loading" only when Supabase is configured. If it isn't, we
  // already know there's nothing to fetch.
  const [isLoading, setIsLoading] = useState<boolean>(supabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    // Refresh server components so any RSC that read the session
    // (e.g. /account) re-renders with the signed-out state.
    router.refresh();
  }, [router, supabase]);

  if (!supabase) {
    return {
      user: null,
      session: null,
      isLoading: false,
      supabaseConfigured: false,
      signOut: async () => {},
    };
  }

  return {
    user: session?.user ?? null,
    session,
    isLoading,
    supabaseConfigured: true,
    signOut,
  };
}
