"use client";

import { useEffect, useRef } from "react";

import { listStoredScenarios, upsertScenarioRecord } from "@/lib/db/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  pullScenariosFromCloud,
  pushLocalScenariosToCloud,
} from "@/lib/supabase/sync";
import { useScenarioStore } from "@/lib/store/use-scenario-store";

/**
 * Bootstraps cloud sync when a user signs in.
 *
 * Behavior:
 * - On first sign-in: push all local *personalized* scenarios to
 *   Supabase (stamping owner_id), then pull any remote scenarios not
 *   yet in Dexie. We deliberately don't push the default seed so the
 *   user's cloud doesn't fill up with empty "Base case" copies that
 *   never represented real data.
 * - On subsequent app loads while signed in: pull remote changes that
 *   are newer than local, write them to Dexie, refresh the scenario
 *   list, and — if the user is currently sitting on the unpersonalized
 *   default — promote their most-recently-updated personalized cloud
 *   scenario to active so they don't have to manually click their
 *   plan from the switcher.
 * - Silent on sign-out — local Dexie data stays untouched, so the user
 *   can keep working offline.
 *
 * Call this hook ONCE at the top of the app tree (e.g. in SiteShell).
 * Safe no-op if Supabase isn't configured.
 */
export function useSupabaseSyncBootstrap() {
  const refreshScenarioList = useScenarioStore((s) => s.refreshScenarioList);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    async function bootstrap() {
      if (hasBootstrapped.current) return;
      hasBootstrapped.current = true;

      try {
        // Step 1: push local *personalized* scenarios to cloud. The
        // default seed scenario gets created in Dexie by various code
        // paths even when the user hasn't done anything; pushing it
        // would add a meaningless "Base case" row to their cloud
        // plans every time they sign in on a fresh browser.
        const local = await listStoredScenarios();
        const localScenarios = local
          .map((row) => row.scenario)
          .filter((s) => s.isPersonalized !== false);
        await pushLocalScenariosToCloud(localScenarios);

        // Step 2: pull cloud scenarios and merge newer ones into Dexie.
        // Track the most-recently-updated remote so we can use it for
        // the auto-switch decision below. We deliberately don't filter
        // by `isPersonalized` here — every row in the user's cloud
        // table is user-written by RLS construction, so the flag isn't
        // a reliable proxy for "is this real data?". Earlier code
        // paths could leave it as `false` even on rows the user
        // clearly owns.
        const remote = await pullScenariosFromCloud();
        const localById = new Map(localScenarios.map((s) => [s.id, s]));

        let bestRemoteId: string | null = null;
        let bestRemoteUpdated = 0;

        for (const remoteScenario of remote) {
          const localScenario = localById.get(remoteScenario.id);
          const remoteUpdated = new Date(remoteScenario.updatedAt).getTime();
          const localUpdated = localScenario
            ? new Date(localScenario.updatedAt).getTime()
            : 0;

          // Pull down if remote is newer OR missing locally.
          if (!localScenario || remoteUpdated > localUpdated) {
            await upsertScenarioRecord(remoteScenario);
          }

          if (remoteUpdated > bestRemoteUpdated) {
            bestRemoteUpdated = remoteUpdated;
            bestRemoteId = remoteScenario.id;
          }
        }

        // Step 3: refresh the scenario list in the UI.
        await refreshScenarioList();

        // Step 4: if we sat down with the default scenario but the
        // cloud has anything for this user, switch to the most
        // recently updated cloud row. Without this, the cloud
        // download lands in Dexie + the switcher dropdown but the
        // home page keeps rendering the marketing hero — exactly the
        // "why isn't it loading my plan?" bug.
        const currentActive = useScenarioStore.getState().activeScenario;
        if (
          currentActive.isPersonalized === false &&
          bestRemoteId !== null
        ) {
          await useScenarioStore.getState().switchToScenario(bestRemoteId);
        }
      } catch (error) {
        console.warn("[cloud-sync] bootstrap failed:", error);
      }
    }

    // Check for current session first — if already signed in when the
    // app loads, bootstrap immediately.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void bootstrap();
    });

    // Also listen for sign-in events (magic link completion, OAuth
    // callback return, etc.).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        hasBootstrapped.current = false;
        void bootstrap();
      }
      if (event === "SIGNED_OUT") {
        hasBootstrapped.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshScenarioList]);
}
