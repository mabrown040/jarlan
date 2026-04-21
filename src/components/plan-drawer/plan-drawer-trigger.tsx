"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo } from "react";

import { deriveDisplayYearsToFi } from "@/components/landing/fire-display";
import {
  calculateFireTypeSummaries,
  calculateQuickFireSummary,
  formatCompactCurrency,
} from "@/lib/calc";
import { transformForDisplay } from "@/lib/calc/display-transform";
import { useDisplayPreferences } from "@/lib/store/use-display-preferences";
import { useDrawerStore, useScenarioStore } from "@/lib/store";

/**
 * Shared pill chrome so the personalized and sample states look visually
 * consistent — same rounded shape, same hover affordance, same gear icon.
 */
const PILL_CLASSES =
  "inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-sm transition-all hover:border-primary/40 hover:shadow-sm";

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export function PlanDrawerTrigger() {
  const { activeScenario, status } = useScenarioStore();
  const { open } = useDrawerStore();
  const displayMode = useDisplayPreferences((s) => s.mode);

  const summary = useMemo(
    () => (status === "ready" ? calculateQuickFireSummary(activeScenario) : null),
    [activeScenario, status],
  );
  // Use the same integer display the Save stat card uses, so the pill and
  // the card never disagree (was "11.3 yrs" pill vs "12 yrs" card).
  const pillYears = useMemo(() => {
    if (!summary) return null;
    const fireTypes = calculateFireTypeSummaries(activeScenario);
    const traditionalTarget =
      fireTypes.find((ft) => ft.id === "traditional")?.target ?? 0;
    return deriveDisplayYearsToFi({
      scenario: activeScenario,
      traditionalTarget,
      projection: summary.projection,
      analyticalYearsToFi: summary.yearsToFi,
    }).displayYearsToFi;
  }, [activeScenario, summary]);

  if (status !== "ready" || !summary) return null;

  // Non-personalized state: the store is showing the built-in sample
  // scenario ($185K portfolio, 34yo married-joint CA). Previously we
  // rendered "$1.4M · 17 yrs" on the pill, which read to new users as
  // "the site already knows my numbers" — a trust breaker. Surface a
  // quiz CTA instead so the pill becomes a conversion surface.
  if (!activeScenario.isPersonalized) {
    return (
      <Link
        href={"/quiz" as Route}
        className={PILL_CLASSES}
        aria-label="Take the FIRE quiz to personalize your plan"
      >
        <GearIcon />
        <span className="hidden sm:inline text-xs font-medium text-foreground">
          Take the quiz →
        </span>
        <span className="sm:hidden text-xs font-medium text-foreground">Plan</span>
      </Link>
    );
  }

  // In nominal mode, inflate the FIRE number to the target year so the
  // pill matches the big card on the planner page (both show the nominal
  // target in future dollars).
  const pillFireNumber =
    displayMode === "nominal"
      ? transformForDisplay({
          realAmount: summary.fireNumber,
          yearsFromNow: pillYears ?? 0,
          mode: displayMode,
          inflation: activeScenario.assumptions.inflation,
        })
      : summary.fireNumber;

  return (
    <button type="button" onClick={() => open()} className={PILL_CLASSES}>
      <GearIcon />
      <span className="hidden sm:inline">
        <span className="font-medium text-foreground">
          {formatCompactCurrency(pillFireNumber)}
        </span>
        <span className="mx-1 text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {pillYears === null
            ? "—"
            : pillYears === 0
              ? "at FI"
              : `${pillYears} yr${pillYears === 1 ? "" : "s"}`}
        </span>
        {displayMode === "nominal" ? (
          // Tiny badge in the pill so users never wonder why the number
          // got bigger when they flipped the toggle — every dollar in
          // the UI now agrees it's in future-year purchasing power.
          <span className="ml-2 rounded-full bg-[var(--ember)]/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ember)]">
            future $
          </span>
        ) : null}
      </span>
      <span className="sm:hidden text-xs font-medium text-foreground">Plan</span>
    </button>
  );
}
