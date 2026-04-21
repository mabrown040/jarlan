"use client";

import { useCallback } from "react";

import { transformForDisplay } from "@/lib/calc/display-transform";
import {
  useDisplayPreferences,
  type DisplayMode,
} from "@/lib/store/use-display-preferences";
import { useScenarioStore } from "@/lib/store/use-scenario-store";

/**
 * Hook wrapping the display-mode transform.
 *
 *   const display = useDisplayAmount();
 *   // Today's stat (year 0) — pass 0, identical in both modes.
 *   {formatCompactCurrency(display(summary.fireNumber, 0))}
 *   // Future-year value — pass the projection offset.
 *   {formatCompactCurrency(display(point.balance, point.year))}
 *
 * Returning a callable (rather than the mode + inflation directly)
 * keeps call sites terse and makes it hard to forget the year argument.
 */
export function useDisplayAmount() {
  const mode = useDisplayPreferences((s) => s.mode);
  const inflation = useScenarioStore(
    (s) => s.activeScenario.assumptions.inflation,
  );

  return useCallback(
    (realAmount: number, yearsFromNow: number) =>
      transformForDisplay({
        realAmount,
        yearsFromNow,
        mode,
        inflation,
      }),
    [mode, inflation],
  );
}

/** Returns both the raw mode + the hook's transformer. Handy for
 *  components that need to branch on mode in their labels (e.g. show
 *  "(nominal)" suffixes only when the user is in nominal mode). */
export function useDisplayMode(): {
  mode: DisplayMode;
  display: (realAmount: number, yearsFromNow: number) => number;
  inflation: number;
} {
  const mode = useDisplayPreferences((s) => s.mode);
  const inflation = useScenarioStore(
    (s) => s.activeScenario.assumptions.inflation,
  );
  const display = useDisplayAmount();
  return { mode, display, inflation };
}
