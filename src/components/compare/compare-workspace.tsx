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
 * - Both Plan A and Plan B are picked from the saved-plans list. The
 *   active scenario is the *initial* default for A; either side can
 *   be swapped to any other plan freely (and to each other via the
 *   Swap button).
 * - Left always loads from IndexedDB rather than reading the in-memory
 *   active scenario directly, so the two sides stay symmetric — same
 *   load path, same staleness rules.
 * - Below the picker: metrics grid (FIRE number, years to FI, savings
 *   rate, balance at FI) and a two-line projection overlay.
 *
 * URL-based compare links are still future work — today this is an
 * in-session triage tool.
 */
export function CompareWorkspace() {
  useInitializeStore();
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  const scenarioList = useScenarioStore((s) => s.scenarioList);
  const refreshList = useScenarioStore((s) => s.refreshScenarioList);

  // Both sides are now equal-footing pickers. We keep only ids in
  // state and hydrate the full Scenario objects in effects, so React
  // state stays cheap and the drawer can rename/edit in parallel
  // without invalidating our copies until we explicitly reload.
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [leftScenario, setLeftScenario] = useState<Scenario | null>(null);
  const [rightScenario, setRightScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  // Initial defaults: A = active scenario, B = most-recently-updated
  // other plan. Lets the page be immediately useful without forcing
  // a click. After that the user is in control.
  useEffect(() => {
    if (leftId === null) setLeftId(activeScenario.id);
  }, [activeScenario.id, leftId]);

  useEffect(() => {
    if (rightId !== null) return;
    const candidate = scenarioList.find((s) => s.id !== leftId);
    if (candidate) setRightId(candidate.id);
  }, [scenarioList, leftId, rightId]);

  // Hydrate scenarios from Dexie whenever the picked id changes.
  useEffect(() => {
    let cancelled = false;
    if (!leftId) {
      setLeftScenario(null);
      return;
    }
    void loadScenarioById(leftId).then((loaded) => {
      if (!cancelled) setLeftScenario(loaded ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [leftId]);

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

  const handleSwap = () => {
    setLeftId((prevLeft) => {
      setRightId(prevLeft);
      return rightId;
    });
  };

  const leftSummary = useMemo(
    () => (leftScenario ? calculateQuickFireSummary(leftScenario) : null),
    [leftScenario],
  );
  const rightSummary = useMemo(
    () => (rightScenario ? calculateQuickFireSummary(rightScenario) : null),
    [rightScenario],
  );

  const leftTax = useMemo(
    () => (leftScenario ? estimateScenarioTax(leftScenario) : null),
    [leftScenario],
  );
  const rightTax = useMemo(
    () => (rightScenario ? estimateScenarioTax(rightScenario) : null),
    [rightScenario],
  );

  const sameSelection = leftId !== null && leftId === rightId;

  return (
    <div className="space-y-8 pb-12">
      <CompactPageHeader
        title="Compare plans"
        description="Set two plans side-by-side. See what changes."
      />

      <section className="mx-auto max-w-7xl px-6">
        {/* Both sides are user-pickable. The Swap button mirrors the
            pattern from currency-converter UIs — a one-click flip
            instead of two re-picks. */}
        {scenarioList.length < 2 ? (
          <Card tone="elevated" className="p-5">
            <SectionEyebrow>Compare plans</SectionEyebrow>
            <p className="mt-2 font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
              You need at least two saved plans
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save a copy of your current plan or save a what-if
              variant from the Save / Spend tabs to compare them here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <ScenarioPicker
              eyebrow="Plan A"
              activeId={leftId}
              scenarios={scenarioList}
              activeScenarioId={activeScenario.id}
              onPick={setLeftId}
            />
            <div className="flex items-center justify-center md:px-2">
              <button
                type="button"
                onClick={handleSwap}
                disabled={!leftId || !rightId}
                aria-label="Swap Plan A and Plan B"
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SwapIcon />
                <span className="hidden sm:inline">Swap</span>
              </button>
            </div>
            <ScenarioPicker
              eyebrow="Plan B"
              activeId={rightId}
              scenarios={scenarioList}
              activeScenarioId={activeScenario.id}
              onPick={setRightId}
            />
          </div>
        )}
        {sameSelection ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Both sides are pointing at the same plan — pick a different
            plan for one side to see a comparison.
          </p>
        ) : null}
      </section>

      {leftScenario &&
      leftSummary &&
      leftTax &&
      rightScenario &&
      rightSummary &&
      !sameSelection ? (
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
                leftValue={formatPercent(leftTax.afterTaxSavingsRate, 0)}
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
                  left={scenarioToSeries(leftScenario, leftSummary, "#ff6b35", "Plan A")}
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

/* ── Scenario picker ─────────────────────────────────────────── */

interface ScenarioPickerProps {
  eyebrow: string;
  activeId: string | null;
  scenarios: { id: string; name: string }[];
  /** id of the currently-active scenario in the rest of the app — flagged so users can find it in the list. */
  activeScenarioId: string;
  onPick: (id: string) => void;
}

function ScenarioPicker({
  eyebrow,
  activeId,
  scenarios,
  activeScenarioId,
  onPick,
}: ScenarioPickerProps) {
  const activeName =
    scenarios.find((s) => s.id === activeId)?.name ?? "Pick a plan";
  return (
    <Card tone="elevated" className="p-5">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <p className="mt-2 truncate font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
        {activeName}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onPick(scenario.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              scenario.id === activeId
                ? "border-primary/40 bg-[rgba(255,107,53,0.08)] text-foreground"
                : "border-border/60 bg-card/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {scenario.name}
            {scenario.id === activeScenarioId ? (
              <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--ember)]">
                active
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </Card>
  );
}

function SwapIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-muted-foreground"
      aria-hidden="true"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
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
