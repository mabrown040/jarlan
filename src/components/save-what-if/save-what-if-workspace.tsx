"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChartShell, CompactPageHeader, StatCard } from "@/components/brand";
import {
  ProjectionChart,
  ChartLegend,
  type MilestoneMarker,
} from "@/components/landing/projection-chart";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calculateFireNumber,
  calculateQuickFireSummary,
  calculateYearsToTarget,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatYears,
  getSavingsRate,
} from "@/lib/calc";
import { getPlannedAnnualInvestmentContribution } from "@/lib/calc/scenario";
import { US_BENCHMARKS } from "@/lib/data/benchmarks";
import {
  buildDecisionTemplates,
  resolveDecision,
  type LifeDecision,
  type DecisionParam,
} from "@/lib/scenario-lab/life-decisions";
// buildSensitivityAnalysis removed — replaced by year-by-year comparison table
import {
  SCENARIO_QUERY_KEY,
  deserializeScenarioFromSearchParam,
  serializeScenarioToSearchParam,
} from "@/lib/share";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Savings rate table config                                                  */
/* -------------------------------------------------------------------------- */

const SAVINGS_RATE_ROWS = [0.046, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

function buildSavingsRateTableRows(
  annualIncome: number,
  withdrawalRate: number,
  annualRealReturn: number,
  currentBalance: number,
) {
  if (annualIncome <= 0) return [];

  return SAVINGS_RATE_ROWS.map((rate) => {
    const annualSavings = annualIncome * rate;
    const annualExpenses = annualIncome - annualSavings;
    const fireNumber = calculateFireNumber(annualExpenses, withdrawalRate);
    const yearsToFi = calculateYearsToTarget({
      currentBalance,
      annualContribution: annualSavings,
      targetBalance: fireNumber,
      annualRealReturn,
    });

    return {
      rate,
      annualExpenses,
      fireNumber,
      yearsToFi,
    };
  });
}

function formatFireDate(yearsToFi: number | null): string {
  if (yearsToFi === null) return "Never";
  const now = new Date();
  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth() + Math.round(yearsToFi * 12),
  );
  return targetDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/*  Decision card color helpers                                                */
/* -------------------------------------------------------------------------- */

function getImpactColor(direction: LifeDecision["direction"]) {
  if (direction === "positive") return "text-emerald-600";
  if (direction === "negative") return "text-red-500";
  if (direction === "neutral") return "text-muted-foreground";
  return "text-amber-500";
}

/* -------------------------------------------------------------------------- */
/*  Param formatting                                                           */
/* -------------------------------------------------------------------------- */

function formatParamValue(param: DecisionParam, value: number): string {
  switch (param.type) {
    case "currency":
      return value < 0
        ? `-$${Math.abs(value).toLocaleString("en-US")}`
        : `$${value.toLocaleString("en-US")}`;
    case "currency_signed":
      return (value >= 0 ? "+$" : "-$") + Math.abs(value).toLocaleString("en-US");
    case "percent":
      return `${Math.round(value * 100)}%`;
    case "years":
      if (value < 1) return `${Math.round(value * 12)} mo`;
      return value === 1 ? "1 yr" : `${value} yr`;
    case "return":
      return `${(value * 100).toFixed(1)}%`;
    case "age":
      return `Age ${Math.round(value)}`;
    default:
      return String(value);
  }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function SaveWhatIfWorkspace() {
  const { activeScenario, status, saveDraft, initialize } = useScenarioStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const hasInitialized = useRef(false);

  useGlobalScenarioFormatting(activeScenario);

  /* ---- Selection + custom param state ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customValues, setCustomValues] = useState<
    Record<string, Record<string, number>>
  >({});

  /* ---- Initialize from URL or storage ---- */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    void initialize(
      sharedScenarioParam
        ? deserializeScenarioFromSearchParam(sharedScenarioParam)
        : undefined,
    );
  }, [initialize, sharedScenarioParam]);

  /* ---- URL sync ---- */
  useEffect(() => {
    if (status !== "ready") return;

    const timeout = window.setTimeout(() => {
      void saveDraft();
      const encodedScenario = serializeScenarioToSearchParam(activeScenario);
      if (encodedScenario === sharedScenarioParam) return;

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(SCENARIO_QUERY_KEY, encodedScenario);
      router.replace(`${pathname}?${nextParams.toString()}` as Route, {
        scroll: false,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    activeScenario,
    pathname,
    router,
    saveDraft,
    searchParams,
    sharedScenarioParam,
    status,
  ]);

  /* ---- Build templates + resolved decisions ---- */
  const templates = useMemo(
    () => buildDecisionTemplates(activeScenario),
    [activeScenario],
  );

  const resolvedDecisions = useMemo(() => {
    return templates.map((t) => {
      const values: Record<string, number> = {};
      for (const p of t.params) {
        values[p.id] = customValues[t.id]?.[p.id] ?? p.defaultValue;
      }
      // Pass _expenses so interpolation of {savings} works for move-cheaper
      values._expenses = activeScenario.annualExpenses;
      return resolveDecision(t, values);
    });
  }, [templates, customValues, activeScenario.annualExpenses]);

  /* ---- Derived data ---- */
  const baseSummary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );

  const plannedContribution = useMemo(
    () => getPlannedAnnualInvestmentContribution(activeScenario),
    [activeScenario],
  );

  const decisionResults = useMemo(() => {
    return resolvedDecisions.map((d) => {
      const modified = d.apply(activeScenario);
      const newSummary = calculateQuickFireSummary(modified);
      return {
        decision: d,
        baseYearsToFi: baseSummary.yearsToFi,
        newYearsToFi: newSummary.yearsToFi,
        deltaYears:
          (baseSummary.yearsToFi ?? Infinity) -
          (newSummary.yearsToFi ?? Infinity),
        baseFireNumber: baseSummary.fireNumber,
        newFireNumber: newSummary.fireNumber,
        deltaFireNumber: newSummary.fireNumber - baseSummary.fireNumber,
      };
    });
  }, [resolvedDecisions, activeScenario, baseSummary]);

  const savingsRateRows = useMemo(
    () =>
      buildSavingsRateTableRows(
        activeScenario.annualIncome,
        activeScenario.assumptions.withdrawalRate,
        activeScenario.assumptions.expectedRealReturn,
        activeScenario.accounts.reduce((t, a) => t + a.currentBalance, 0),
      ),
    [activeScenario],
  );

  const userSavingsRate = getSavingsRate(activeScenario);

  /* ---- Combined multi-select scenario ---- */
  const selectedDecisions = useMemo(
    () => resolvedDecisions.filter((d) => selectedIds.has(d.id)),
    [resolvedDecisions, selectedIds],
  );

  const combinedSummary = useMemo(() => {
    if (selectedIds.size === 0) return null;
    let combined = activeScenario;
    for (const d of selectedDecisions) {
      combined = d.apply(combined);
    }
    return calculateQuickFireSummary(combined);
  }, [selectedDecisions, selectedIds, activeScenario]);

  const combinedDelta = useMemo(() => {
    if (!combinedSummary) return null;
    const deltaYears =
      (baseSummary.yearsToFi ?? Infinity) -
      (combinedSummary.yearsToFi ?? Infinity);
    const deltaFireNumber = combinedSummary.fireNumber - baseSummary.fireNumber;
    return { deltaYears, deltaFireNumber };
  }, [combinedSummary, baseSummary]);

  /* ---- Chart milestones (Coast FIRE, base FIRE, events, combined FIRE) ---- */
  const chartMilestones = useMemo((): MilestoneMarker[] => {
    const markers: MilestoneMarker[] = [];
    const age = activeScenario.profile.age;
    const retAge = activeScenario.profile.retirementAge ?? age;
    const effectiveReturn = activeScenario.assumptions.expectedRealReturn - (activeScenario.simulationSettings?.feeDrag ?? 0);
    const wr = activeScenario.assumptions.withdrawalRate;
    const expenses = activeScenario.retirementExpenses || activeScenario.annualExpenses;

    // Coast FIRE: when balance reaches coastTarget (compounding alone finishes)
    const coastTarget = baseSummary.fireNumber / Math.pow(1 + effectiveReturn, Math.max(retAge - age, 1));
    const coastPoint = baseSummary.projection.find(
      (p, i) => i > 0 && p.balance >= coastTarget,
    );
    if (coastPoint) {
      markers.push({
        year: coastPoint.year,
        label: "Coast FI",
        target: coastTarget,
        description: `At ${formatCompactCurrency(coastTarget)} saved, compounding finishes the job by retirement.`,
      });
    }

    // Base FIRE: when base scenario crosses target
    const baseFiPoint = baseSummary.projection.find(
      (p, i) => i > 0 && p.balance >= p.target,
    );
    if (baseFiPoint) {
      markers.push({
        year: baseFiPoint.year,
        label: combinedSummary ? "FI (base)" : "FIRE",
        target: baseSummary.fireNumber,
        description: `${formatCompactCurrency(baseSummary.fireNumber)} sustains ${formatCompactCurrency(expenses)}/yr at ${(wr * 100).toFixed(0)}% WR.`,
      });
    }

    // Event start markers from selected decisions — styled as subtle events
    for (const d of selectedDecisions) {
      const vals: Record<string, number> = {};
      for (const p of d.template.params) {
        vals[p.id] = customValues[d.id]?.[p.id] ?? p.defaultValue;
      }
      const startAge = vals.startAge ?? vals.atAge ?? age;
      const year = Math.round(startAge - age);
      if (year > 0 && year < (baseSummary.projection.length ?? 20)) {
        markers.push({
          year,
          label: `${d.emoji} ${d.label.split(" at ")[0].split(" for ")[0]}`,
          isEvent: true,
        });
      }
    }

    // Combined scenario FIRE (only when different from base)
    if (combinedSummary) {
      const compFiPoint = combinedSummary.projection.find(
        (p, i) => i > 0 && p.balance >= p.target,
      );
      if (compFiPoint && (!baseFiPoint || compFiPoint.year !== baseFiPoint.year)) {
        markers.push({
          year: compFiPoint.year,
          label: "FI (new)",
          target: combinedSummary.fireNumber,
          description: `FI at age ${Math.round(compFiPoint.age)} with selected changes.`,
        });
      }
    }

    return markers;
  }, [selectedDecisions, combinedSummary, baseSummary, activeScenario, customValues]);

  /* ---- Find closest savings rate row for user highlight ---- */
  function isClosestToUser(rate: number): boolean {
    if (savingsRateRows.length === 0) return false;
    let closest = savingsRateRows[0].rate;
    let minDiff = Math.abs(userSavingsRate - closest);
    for (const row of savingsRateRows) {
      const diff = Math.abs(userSavingsRate - row.rate);
      if (diff < minDiff) {
        closest = row.rate;
        minDiff = diff;
      }
    }
    return rate === closest;
  }

  /* ---- Handlers ---- */
  function handleCardClick(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Clear custom values for deselected decision
        setCustomValues((cv) => {
          const updated = { ...cv };
          delete updated[id];
          return updated;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearAll() {
    setSelectedIds(new Set());
    setCustomValues({});
  }

  const updateParam = useCallback(
    (decisionId: string, paramId: string, value: number) => {
      setCustomValues((prev) => ({
        ...prev,
        [decisionId]: { ...prev[decisionId], [paramId]: value },
      }));
    },
    [],
  );

  return (
    <div className="space-y-8 pb-12">
      {/* ---- Header ---- */}
      <CompactPageHeader
        title="What if?"
        description="Click any scenario below to see how it changes your path to financial independence."
        metrics={[
          {
            label: "FIRE number",
            value: formatCompactCurrency(baseSummary.fireNumber),
            accent: true,
          },
          {
            label: "Years to FI",
            value: formatYears(baseSummary.yearsToFi),
          },
          {
            label: "FI age",
            value:
              baseSummary.fireAge !== null
                ? `${Math.round(baseSummary.fireAge)}`
                : "---",
          },
        ]}
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        {/* ---- Section 1: Comparison Chart ---- */}
        <ChartShell
          title={
            selectedIds.size > 0
              ? `With ${selectedIds.size} change${selectedIds.size === 1 ? "" : "s"}`
              : "Your base case"
          }
        >
          <ProjectionChart
            data={baseSummary.projection}
            annualContribution={plannedContribution}
            startAge={activeScenario.profile.age}
            milestones={chartMilestones}
            comparisonData={combinedSummary?.projection}
            comparisonLabel={
              selectedIds.size === 1
                ? selectedDecisions[0]?.label
                : selectedIds.size > 1
                  ? `Combined (${selectedIds.size})`
                  : undefined
            }
          />
          <div className="mt-3">
            <ChartLegend
              comparisonLabel={
                selectedIds.size === 1
                  ? selectedDecisions[0]?.label
                  : selectedIds.size > 1
                    ? `Combined (${selectedIds.size})`
                    : undefined
              }
            />
          </div>
        </ChartShell>

        {/* ---- Section 2: Impact Summary (when any selected) ---- */}
        {combinedSummary && combinedDelta ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Card 1: Your plan */}
              <StatCard
                label="Your plan"
                value={formatCompactCurrency(baseSummary.fireNumber)}
                description={`${formatYears(baseSummary.yearsToFi)} to FI${baseSummary.fireAge !== null ? ` (age ${Math.round(baseSummary.fireAge)})` : ""}`}
              />

              {/* Card 2: Combined scenario */}
              <StatCard
                label={`With ${selectedIds.size} change${selectedIds.size === 1 ? "" : "s"}`}
                value={formatCompactCurrency(combinedSummary.fireNumber)}
                description={`${formatYears(combinedSummary.yearsToFi)} to FI${combinedSummary.fireAge !== null ? ` (age ${Math.round(combinedSummary.fireAge)})` : ""}`}
                tone="accent"
              />

              {/* Card 3: Combined impact */}
              <StatCard
                label="Combined impact"
                value={
                  combinedDelta.deltaYears === 0
                    ? "No change"
                    : combinedDelta.deltaYears > 0
                      ? `${Math.abs(combinedDelta.deltaYears).toFixed(1)} yrs sooner`
                      : `${Math.abs(combinedDelta.deltaYears).toFixed(1)} yrs later`
                }
                description={
                  Math.abs(combinedDelta.deltaFireNumber) >= 500
                    ? `Target ${combinedDelta.deltaFireNumber > 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(combinedDelta.deltaFireNumber))} ${combinedDelta.deltaYears > 0 ? "\u2191" : combinedDelta.deltaYears < 0 ? "\u2193" : ""}`
                    : `${combinedDelta.deltaYears > 0 ? "\u2191 Closer to FI" : combinedDelta.deltaYears < 0 ? "\u2193 Further from FI" : "No change"}`
                }
                tone={
                  combinedDelta.deltaYears > 0
                    ? "success"
                    : combinedDelta.deltaYears < 0
                      ? "danger"
                      : "default"
                }
              />
            </div>

            {/* Active decisions tags */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {selectedDecisions.map((d) => {
                const result = decisionResults.find(
                  (r) => r.decision.id === d.id,
                );
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleCardClick(d.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ember)]/30 bg-[rgba(255,107,53,0.06)] px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-[rgba(255,107,53,0.12)]"
                  >
                    <span>{d.emoji}</span>
                    <span>{d.label}</span>
                    {result ? (
                      <span
                        className={cn(
                          "ml-0.5 text-[10px]",
                          result.deltaYears > 0
                            ? "text-emerald-600"
                            : result.deltaYears < 0
                              ? "text-red-500"
                              : "text-muted-foreground",
                        )}
                      >
                        ({result.deltaYears > 0 ? "-" : "+"}
                        {Math.abs(result.deltaYears).toFixed(1)}yr)
                      </span>
                    ) : null}
                    <span className="text-muted-foreground/60">×</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                Clear all
              </button>
            </div>

            {/* Note about interaction effects */}
            {selectedIds.size > 1 ? (
              <p className="text-center text-[11px] text-muted-foreground/60">
                Combined impact may differ from the sum of individual changes
                due to interaction effects.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ---- Section 3: Life Decision Cards ---- */}
        <ChartShell
          eyebrow="Life decisions"
          title="How real choices change your timeline"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decisionResults.map((result) => {
              const { decision, deltaYears, deltaFireNumber } = result;
              const isSelected = selectedIds.has(decision.id);
              const sooner = deltaYears > 0;
              const fireNumberChanged = Math.abs(deltaFireNumber) >= 500;

              return (
                <div
                  key={decision.id}
                  className={cn(
                    "rounded-xl border transition-all",
                    isSelected
                      ? "border-[var(--ember)] bg-[rgba(255,107,53,0.05)] ring-1 ring-[var(--ember)]/20"
                      : "border-border/60 bg-card hover:border-[var(--ember)]/30",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleCardClick(decision.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium text-foreground">
                          <span>{decision.emoji}</span>
                          <span className="flex-1">{decision.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-shrink-0 cursor-help rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80">?</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs leading-relaxed">
                              {decision.methodology}
                            </TooltipContent>
                          </Tooltip>
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {decision.description}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/60">
                          e.g. {decision.examples.slice(0, 3).join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          getImpactColor(decision.direction),
                        )}
                      >
                        {deltaYears === 0
                          ? "No change"
                          : sooner
                            ? `${Math.abs(deltaYears).toFixed(1)} years sooner \u2191`
                            : `${Math.abs(deltaYears).toFixed(1)} years later \u2193`}
                      </p>
                      {fireNumberChanged ? (
                        <p className="text-xs text-muted-foreground">
                          Target changes by{" "}
                          {deltaFireNumber > 0 ? "+" : "-"}$
                          {Math.round(Math.abs(deltaFireNumber) / 1000)}K
                        </p>
                      ) : null}
                    </div>
                  </button>

                  {/* ---- Inline parameter inputs (only when selected) ---- */}
                  {isSelected && decision.template.params.length > 0 ? (
                    <div className="px-4 pb-4">
                      {decision.template.params.map((param) => {
                        const currentValue =
                          customValues[decision.id]?.[param.id] ??
                          param.defaultValue;

                        return (
                          <div
                            key={param.id}
                            className="mt-3 border-t border-border/40 pt-3"
                          >
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{param.label}</span>
                              <span className="font-medium text-foreground">
                                {formatParamValue(param, currentValue)}
                              </span>
                            </div>
                            <div className="mt-2">
                              <Slider
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={[currentValue]}
                                onValueChange={([v]) =>
                                  updateParam(decision.id, param.id, v)
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {selectedIds.size === 0 ? (
            <p className="mt-4 text-center text-xs text-muted-foreground/60">
              Click any card to see its impact — select multiple to combine
            </p>
          ) : null}
        </ChartShell>

        {/* ---- Section 4: Year-by-year comparison (collapsed) ---- */}
        {(() => {
          const hasComparison = combinedSummary != null;
          const showIncome = selectedIds.has("income-change") || selectedIds.has("career-break");
          const showExpenses = selectedIds.has("lifestyle-change") || selectedIds.has("new-dependent") || selectedIds.has("career-break");

          // Build event timing map: which ages have events starting/ending
          const eventTimings: Map<number, string[]> = new Map();
          if (hasComparison) {
            for (const d of selectedDecisions) {
              const template = d.template;
              const vals: Record<string, number> = {};
              for (const p of template.params) {
                vals[p.id] = customValues[d.id]?.[p.id] ?? p.defaultValue;
              }
              // Determine event start age from params
              const startAge = vals.startAge ?? vals.atAge ?? activeScenario.profile.age;
              const duration = vals.duration ?? null;
              const existing = eventTimings.get(Math.round(startAge)) ?? [];
              existing.push(`${d.emoji} ${d.label.split(" at ")[0].split(" for ")[0]}`);
              eventTimings.set(Math.round(startAge), existing);
              // Mark end of duration-based events
              if (duration && duration > 0) {
                const endAge = Math.round(startAge + duration);
                const endExisting = eventTimings.get(endAge) ?? [];
                endExisting.push(`${d.emoji} ends`);
                eventTimings.set(endAge, endExisting);
              }
            }
          }

          // Track FIRE milestones
          let baseHitFiYear: number | null = null;
          let compHitFiYear: number | null = null;

          return (
            <CollapsibleSection
              title="Year-by-year breakdown"
              summary={
                selectedIds.size > 0
                  ? `${baseSummary.projection.length} years · comparing base vs ${selectedIds.size} change${selectedIds.size === 1 ? "" : "s"}`
                  : `${baseSummary.projection.length} years`
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="pb-3 pr-3 font-medium">Year</th>
                      <th className="pb-3 pr-3 font-medium">Age</th>
                      <th className="pb-3 pr-3 font-medium">Portfolio</th>
                      {hasComparison ? (
                        <>
                          <th className="pb-3 pr-3 font-medium">With changes</th>
                          <th className="pb-3 pr-3 font-medium">Δ</th>
                        </>
                      ) : null}
                      {showIncome ? (
                        <th className="pb-3 pr-3 font-medium">Income</th>
                      ) : null}
                      {showExpenses ? (
                        <th className="pb-3 pr-3 font-medium">Expenses</th>
                      ) : null}
                      <th className="pb-3 pr-3 font-medium">Savings/yr</th>
                      <th className="pb-3 pr-3 font-medium">Growth</th>
                      <th className="pb-3 font-medium">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baseSummary.projection.map((point, i) => {
                      const compPoint = combinedSummary?.projection[i];
                      const diff = compPoint ? compPoint.balance - point.balance : 0;

                      // Track FIRE milestones
                      const baseAtFi = point.balance >= point.target && point.year > 0;
                      const compAtFi = compPoint && compPoint.balance >= compPoint.target && compPoint.year > 0;
                      if (baseAtFi && baseHitFiYear === null) baseHitFiYear = point.year;
                      if (compAtFi && compHitFiYear === null) compHitFiYear = point.year;
                      const showBaseFiBadge = point.year === baseHitFiYear;
                      const showCompFiBadge = hasComparison && point.year === compHitFiYear;

                      // Enriched data
                      const baseInc = point.income ?? 0;
                      const baseExp = point.expenses ?? 0;
                      const baseSav = point.savings ?? 0;
                      const baseGrw = point.growth ?? 0;
                      const compInc = compPoint?.income ?? 0;
                      const compExp = compPoint?.expenses ?? 0;
                      const compSav = compPoint?.savings ?? 0;
                      const compGrw = compPoint?.growth ?? 0;
                      const incChanged = hasComparison && Math.abs(compInc - baseInc) > 100;
                      const expChanged = hasComparison && Math.abs(compExp - baseExp) > 100;
                      const savChanged = hasComparison && Math.abs(compSav - baseSav) > 100;
                      const grwChanged = hasComparison && Math.abs(compGrw - baseGrw) > 100;

                      // Event tags for this age
                      const age = Math.round(point.age);
                      const events = eventTimings.get(age) ?? [];

                      return (
                        <tr
                          key={point.year}
                          className={cn(
                            "border-b border-border/50 transition-colors",
                            showCompFiBadge && "bg-emerald-50/50 dark:bg-emerald-950/10",
                            showBaseFiBadge && !showCompFiBadge && "bg-[rgba(255,107,53,0.04)]",
                          )}
                        >
                          <td className="py-2 pr-3 tabular-nums">{point.year}</td>
                          <td className="py-2 pr-3 tabular-nums">{age}</td>
                          <td className="py-2 pr-3 tabular-nums font-medium">
                            {formatCompactCurrency(point.balance)}
                          </td>
                          {hasComparison ? (
                            <>
                              <td className={cn(
                                "py-2 pr-3 tabular-nums font-medium",
                                compAtFi && "text-emerald-600",
                              )}>
                                {compPoint ? formatCompactCurrency(compPoint.balance) : "—"}
                              </td>
                              <td className={cn(
                                "py-2 pr-3 tabular-nums text-xs",
                                diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-muted-foreground",
                              )}>
                                {Math.abs(diff) < 100 ? "—" : diff > 0 ? `+${formatCompactCurrency(diff)}` : `-${formatCompactCurrency(Math.abs(diff))}`}
                              </td>
                            </>
                          ) : null}
                          {showIncome ? (
                            <td className="py-2 pr-3 tabular-nums text-xs">
                              <span className={cn(
                                incChanged ? "text-[var(--ember)] font-medium" : "text-muted-foreground",
                              )}>
                                {formatCompactCurrency(hasComparison ? compInc : baseInc)}
                              </span>
                            </td>
                          ) : null}
                          {showExpenses ? (
                            <td className="py-2 pr-3 tabular-nums text-xs">
                              <span className={cn(
                                expChanged ? "text-[var(--ember)] font-medium" : "text-muted-foreground",
                              )}>
                                {formatCompactCurrency(hasComparison ? compExp : baseExp)}
                              </span>
                            </td>
                          ) : null}
                          <td className="py-2 pr-3 tabular-nums text-xs">
                            <span className={cn(
                              savChanged
                                ? compSav > baseSav ? "text-emerald-600 font-medium" : "text-red-500 font-medium"
                                : "text-muted-foreground",
                            )}>
                              {formatCompactCurrency(hasComparison ? compSav : baseSav)}
                            </span>
                          </td>
                          <td className="py-2 pr-3 tabular-nums text-xs">
                            <span className={cn(
                              grwChanged
                                ? compGrw > baseGrw ? "text-emerald-600 font-medium" : "text-red-500 font-medium"
                                : "text-muted-foreground",
                            )}>
                              {formatCompactCurrency(hasComparison ? compGrw : baseGrw)}
                            </span>
                          </td>
                          <td className="py-2 text-xs">
                            <div className="flex flex-wrap gap-1">
                              {events.map((evt, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {evt}
                                </span>
                              ))}
                              {showCompFiBadge ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  🎯 FI
                                </span>
                              ) : showBaseFiBadge ? (
                                <span className="inline-flex items-center rounded-full bg-[rgba(255,107,53,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ember)]">
                                  🎯 FI (base)
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* ---- Section 5: Savings Rate Table (collapsed) ---- */}
        <CollapsibleSection
          title="Savings rate vs. time to FI"
          summary="10%\u201380% with FIRE dates"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Save %</th>
                  <th className="pb-3 pr-4 font-medium">Spend/yr</th>
                  <th className="pb-3 pr-4 font-medium">FIRE #</th>
                  <th className="pb-3 pr-4 font-medium">Years</th>
                  <th className="pb-3 font-medium">FIRE Date</th>
                </tr>
              </thead>
              <tbody>
                {savingsRateRows.map((row) => {
                  const isUser = isClosestToUser(row.rate);
                  const isUsAvg = row.rate === US_BENCHMARKS.savingsRate;

                  return (
                    <tr
                      key={row.rate}
                      className={cn(
                        "border-b border-border/50 transition-colors",
                        isUser &&
                          "bg-[rgba(255,107,53,0.06)] font-semibold",
                        isUsAvg && !isUser && "bg-muted/40",
                      )}
                    >
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2">
                          {formatPercent(row.rate, 1)}
                          {isUser ? (
                            <span className="inline-flex items-center rounded-full bg-[var(--ember)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-white">
                              YOU
                            </span>
                          ) : null}
                          {isUsAvg && !isUser ? (
                            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                              US AVG
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {formatCurrency(row.annualExpenses)}
                      </td>
                      <td className="py-3 pr-4">
                        {formatCompactCurrency(row.fireNumber)}
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-4",
                          isUser && "text-[var(--ember)]",
                        )}
                      >
                        {row.yearsToFi === null
                          ? "Never"
                          : `${row.yearsToFi.toFixed(1)}`}
                      </td>
                      <td
                        className={cn(
                          "py-3",
                          isUser && "text-[var(--ember)]",
                        )}
                      >
                        {formatFireDate(row.yearsToFi)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}
