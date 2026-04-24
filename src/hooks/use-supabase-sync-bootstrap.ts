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
 * - On first sign-in: push all local scenarios to Supabase (stamping
 *   owner_id), then pull any remote scenarios not yet in Dexie.
 * - On subsequent app loads while signed in: pull remote changes that
 *   are newer than local, write them to Dexie, refresh the scenario list.
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
        // Step 1: push local scenarios to cloud. Safe no-op if no user.
        const local = await listStoredScenarios();
        const localScenarios = local.map((row) => row.scenario);
        await pushLocalScenariosToCloud(localScenarios);

        // Step 2: pull cloud scenarios and merge newer ones into Dexie.
        const remote = await pullScenariosFromCloud();
        const localById = new Map(localScenarios.map((s) => [s.id, s]));

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
        }

        // Step 3: refresh the scenario list in the UI.
        await refreshScenarioList();
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
