"use client";

import { useEffect, useMemo, useState } from "react";

import { CompactPageHeader, SectionEyebrow } from "@/components/brand";
import { Card } from "@/components/ui/card";
import {
  ComparisonChart,
  type ComparisonSeries,
} from "@/components/compare/comparison-chart";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { loadScenarioById } from "@/lib/db/database";
import {
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatPercent,
} from "@/lib/calc";
import { estimateScenarioTax } from "@/lib/tax";
import type { Scenario } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * Compare two saved plans side-by-side.
 *
 * Design:
 * - Left = the currently-active scenario (the thing the user is
 *   working on). Always populated.
 * - Right = a user-picked second scenario from the saved list.
 *   Renders a scenario picker when nothing's chosen yet.
 * - Below: a metrics grid (FIRE number, years to FI, savings rate,
 *   5-year balance) and a two-line projection overlay.
 *
 * We intentionally don't read scenario ids from the URL (yet). A
 * shareable compare link is a feature for later; today this is an
 * in-session triage tool.
 */
export function CompareWorkspace() {
  useInitializeStore();
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  const scenarioList = useScenarioStore((s) => s.scenarioList);
  const refreshList = useScenarioStore((s) => s.refreshScenarioList);

  // The "right-hand" scenario is lazily loaded from IDB on pick.
  // We keep only the id in state + hydrate the full scenario in a
  // separate effect so React state stays cheap and the drawer can
  // still rename/edit in the background.
  const [rightId, setRightId] = useState<string | null>(null);
  const [rightScenario, setRightScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Auto-pick the most-recently-updated OTHER scenario when one
  // exists and the user hasn't chosen manually yet. Makes the page
  // immediately useful instead of forcing an action first.
  useEffect(() => {
    if (rightId) return;
    const candidate = scenarioList.find((s) => s.id !== activeScenario.id);
    if (candidate) setRightId(candidate.id);
  }, [scenarioList, activeScenario.id, rightId]);

  useEffect(() => {
    let cancelled = false;
    if (!rightId) {
      setRightScenario(null);
      return;
    }
    void loadScenarioById(rightId).then((loaded) => {
      if (!cancelled) setRightScenario(loaded ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [rightId]);

  const leftSummary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );
  const rightSummary = useMemo(
    () => (rightScenario ? calculateQuickFireSummary(rightScenario) : null),
    [rightScenario],
  );

  const leftTax = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );
  const rightTax = useMemo(
    () => (rightScenario ? estimateScenarioTax(rightScenario) : null),
    [rightScenario],
  );

  const otherScenarios = scenarioList.filter((s) => s.id !== activeScenario.id);

  return (
    <div className="space-y-8 pb-12">
      <CompactPageHeader
        title="Compare plans"
        description="Set two plans side-by-side. See what changes."
      />

      <section className="mx-auto max-w-7xl px-6">
        {/* Header row: who's on the left, who's on the right. Left is
            always active; right has a selector. */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card tone="elevated" className="p-5">
            <SectionEyebrow>Plan A (active)</SectionEyebrow>
            <p className="mt-2 font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
              {activeScenario.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Currently active in the drawer.
            </p>
          </Card>

          <Card tone="elevated" className="p-5">
            <SectionEyebrow>Plan B</SectionEyebrow>
            {otherScenarios.length === 0 ? (
              <>
                <p className="mt-2 font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
                  No other saved plans
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Duplicate this plan from the drawer to compare two
                  variations.
                </p>
              </>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {otherScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => setRightId(scenario.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        scenario.id === rightId
                          ? "border-primary/40 bg-[rgba(255,107,53,0.08)] text-foreground"
                          : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {scenario.name}
                    </button>
                  ))}
                </div>
                {rightScenario ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Comparing against:{" "}
                    <span className="font-medium text-foreground">
                      {rightScenario.name}
                    </span>
                  </p>
                ) : null}
              </>
            )}
          </Card>
        </div>
      </section>

      {rightScenario && rightSummary ? (
        <>
          <section className="mx-auto max-w-7xl px-6">
            <SectionEyebrow>Head-to-head</SectionEyebrow>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <CompareMetric
                label="FIRE number"
                leftValue={formatCompactCurrency(leftSummary.fireNumber)}
                rightValue={formatCompactCurrency(rightSummary.fireNumber)}
                delta={
                  rightSummary.fireNumber - leftSummary.fireNumber
                }
                deltaFormat={formatCompactCurrency}
                lowerIsBetter
              />
              <CompareMetric
                label="Years to FI"
                leftValue={formatYearsOrDash(leftSummary.yearsToFi)}
                rightValue={formatYearsOrDash(rightSummary.yearsToFi)}
                delta={
                  (rightSummary.yearsToFi ?? 0) -
                  (leftSummary.yearsToFi ?? 0)
                }
                deltaFormat={(v) => `${v.toFixed(1)} yrs`}
                lowerIsBetter
              />
              <CompareMetric
                label="Savings rate"
                leftValue={formatPercent(
                  leftTax.afterTaxSavingsRate,
                  0,
                )}
                rightValue={formatPercent(
                  rightTax?.afterTaxSavingsRate ?? 0,
                  0,
                )}
                delta={
                  (rightTax?.afterTaxSavingsRate ?? 0) -
                  leftTax.afterTaxSavingsRate
                }
                deltaFormat={(v) => formatPercent(v, 1)}
              />
              <CompareMetric
                label="Balance at FI"
                leftValue={formatCompactCurrency(
                  leftSummary.projection.at(-1)?.balance ?? 0,
                )}
                rightValue={formatCompactCurrency(
                  rightSummary.projection.at(-1)?.balance ?? 0,
                )}
                delta={
                  (rightSummary.projection.at(-1)?.balance ?? 0) -
                  (leftSummary.projection.at(-1)?.balance ?? 0)
                }
                deltaFormat={formatCompactCurrency}
              />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-6">
            <Card tone="feature" className="p-6 sm:p-8">
              <SectionEyebrow>Projection overlay</SectionEyebrow>
              <p className="mt-2 font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
                How the two portfolios grow
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Both lines plot balance over time. Goal lines show each
                plan&rsquo;s FIRE number in its own color.
              </p>
              <div className="mt-5">
                <ComparisonChart
                  left={scenarioToSeries(activeScenario, leftSummary, "#ff6b35", "Plan A")}
                  right={scenarioToSeries(rightScenario, rightSummary, "#7c3aed", "Plan B")}
                />
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function scenarioToSeries(
  scenario: Scenario,
  summary: ReturnType<typeof calculateQuickFireSummary>,
  color: string,
  label: string,
): ComparisonSeries {
  return {
    label,
    projection: summary.projection,
    fireNumber: summary.fireNumber,
    startAge: scenario.profile.age,
    color,
  };
}

function formatYearsOrDash(years: number | null | undefined) {
  if (years === null || years === undefined) return "—";
  return `${Math.round(years)} yrs`;
}

/* ── Metric card ─────────────────────────────────────────────── */

function CompareMetric({
  label,
  leftValue,
  rightValue,
  delta,
  deltaFormat,
  lowerIsBetter = false,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
  delta: number;
  deltaFormat: (v: number) => string;
  /** If true, a negative delta is "good" (e.g. lower FIRE number, fewer years). */
  lowerIsBetter?: boolean;
}) {
  const signedBetter = lowerIsBetter ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 1e-6;
  return (
    <Card tone="soft" className="p-4">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground">A</p>
          <p className="font-display text-xl leading-none text-foreground">
            {leftValue}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">B</p>
          <p className="font-display text-xl leading-none text-foreground">
            {rightValue}
          </p>
        </div>
      </div>
      <p
        className={cn(
          "mt-2 text-xs font-medium",
          isNeutral
            ? "text-muted-foreground"
            : signedBetter
              ? "text-[var(--success)]"
              : "text-[var(--glow)]",
        )}
      >
        {isNeutral
          ? "No change"
          : `${delta > 0 ? "+" : ""}${deltaFormat(delta)} (B vs A)`}
      </p>
    </Card>
  );
}
