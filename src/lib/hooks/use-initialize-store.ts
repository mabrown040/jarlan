"use client";

import { useEffect, useRef } from "react";

import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { deserializeScenarioFromSearchParam } from "@/lib/share";

/**
 * Hydrate the scenario store from IndexedDB (or a shared URL param).
 *
 * Call once per page/workspace — the hook is safe to call multiple times
 * (double-mount in StrictMode, multiple components on the same page, etc.)
 * because it guards on `hasInitialized` and the store's own `status`.
 *
 * @param sharedScenarioParam - Optional compressed scenario from URL search
 *   params. Pass `searchParams.get(SCENARIO_QUERY_KEY)` when the page
 *   supports shared scenario URLs, or omit for pages that don't.
 */
export function useInitializeStore(
  sharedScenarioParam?: string | null,
) {
  const initialize = useScenarioStore((s) => s.initialize);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    void initialize(
      sharedScenarioParam
        ? deserializeScenarioFromSearchParam(sharedScenarioParam)
        : undefined,
    );
  }, [initialize, sharedScenarioParam]);
}
