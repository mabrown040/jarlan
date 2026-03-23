"use client";

import { useMemo } from "react";

import {
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatYears,
} from "@/lib/calc";
import { useDrawerStore, useScenarioStore } from "@/lib/store";

export function PlanDrawerTrigger() {
  const { activeScenario, status } = useScenarioStore();
  const { open } = useDrawerStore();

  const summary = useMemo(
    () => (status === "ready" ? calculateQuickFireSummary(activeScenario) : null),
    [activeScenario, status],
  );

  if (status !== "ready" || !summary) return null;

  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-sm transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      <span className="hidden sm:inline">
        <span className="font-medium text-foreground">
          {formatCompactCurrency(summary.fireNumber)}
        </span>
        <span className="mx-1 text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {formatYears(summary.yearsToFi)}
        </span>
      </span>
      <span className="sm:hidden text-xs font-medium text-foreground">Plan</span>
    </button>
  );
}
