"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useScenarioStore } from "@/lib/store/use-scenario-store";
import {
  SCENARIO_QUERY_KEY,
  serializeScenarioToSearchParam,
} from "@/lib/share";

interface AutoSaveOptions {
  /** When true, sync the scenario to the URL search params (default: false). */
  syncUrl?: boolean;
}

/**
 * Auto-save the active scenario to IndexedDB on a 250ms debounce.
 *
 * Optionally syncs the compressed scenario into the URL search params so
 * the page is shareable. Skips saving when the scenario is still the
 * default (isPersonalized === false) to avoid persisting sample data.
 */
export function useAutoSaveScenario(options?: AutoSaveOptions) {
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  const status = useScenarioStore((s) => s.status);
  const saveDraft = useScenarioStore((s) => s.saveDraft);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const syncUrl = options?.syncUrl ?? false;

  useEffect(() => {
    if (status !== "ready" || activeScenario.isPersonalized === false) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDraft();

      if (!syncUrl) return;

      const encodedScenario = serializeScenarioToSearchParam(activeScenario);

      if (encodedScenario === sharedScenarioParam) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(SCENARIO_QUERY_KEY, encodedScenario);
      router.replace(`${pathname}?${nextParams.toString()}` as Route, {
        scroll: false,
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeScenario,
    pathname,
    router,
    saveDraft,
    searchParams,
    sharedScenarioParam,
    status,
    syncUrl,
  ]);
}
