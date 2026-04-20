"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ChartShell, CompactPageHeader, StatCard } from "@/components/brand";
import {
  ProjectionChart,
  ChartLegend,
  type MilestoneMarker,
} from "@/components/landing/projection-chart";
import { deriveDisplayYearsToFi } from "@/components/landing/fire-display";
import { computeProjectionMilestones } from "@/lib/calc/milestones";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Slider } from "@/components/ui/slider";
import { clamp } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calculateFireTypeSummaries,
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatYears,
} from "@/lib/calc";
import { getPlannedAnnualInvestmentContribution } from "@/lib/calc/scenario";
import {
  buildDecisionTemplates,
  resolveDecision,
  type LifeDecision,
  type DecisionParam,
} from "@/lib/scenario-lab/life-decisions";
// buildSensitivityAnalysis removed — replaced by year-by-year comparison table
import {
  SCENARIO_QUERY_KEY,
} from "@/lib/share";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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
  const { activeScenario } = useScenarioStore();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);

  useInitializeStore(sharedScenarioParam);
  useAutoSaveScenario({ syncUrl: true });
  useGlobalScenarioFormatting(activeScenario);

  /* ---- Selection + custom param state ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customValues, setCustomValues] = useState<
    Record<string, Record<string, number>>
  >({});

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

  // Integer years + fire age — match Save's stat card so the page header
  // doesn't disagree with it (fractional "11.3 yrs" vs. integer "12 yrs").
  const { displayYearsToFi, displayFireAge } = useMemo(() => {
    const fireTypes = calculateFireTypeSummaries(activeScenario);
    const traditionalTarget =
      fireTypes.find((ft) => ft.id === "traditional")?.target ?? 0;
    return deriveDisplayYearsToFi({
      scenario: activeScenario,
      traditionalTarget,
      projection: baseSummary.projection,
      analyticalYearsToFi: baseSummary.yearsToFi,
    });
  }, [activeScenario, baseSummary.projection, baseSummary.yearsToFi]);

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

  // Round 4 finding R4-2: the "Your plan" / "With N changes" stat cards
  // in the impact summary were rendering fractional years (e.g. "8.1 yrs")
  // while the page header and pill use integer years via
  // `deriveDisplayYearsToFi`. Compute the integer-years projection for
  // the combined scenario too so the cards agree with the header.
  const combinedDisplay = useMemo(() => {
    if (selectedIds.size === 0 || !combinedSummary) return null;
    let combined = activeScenario;
    for (const d of selectedDecisions) {
      combined = d.apply(combined);
    }
    const fireTypes = calculateFireTypeSummaries(combined);
    const traditionalTarget =
      fireTypes.find((ft) => ft.id === "traditional")?.target ?? 0;
    return deriveDisplayYearsToFi({
      scenario: combined,
      traditionalTarget,
      projection: combinedSummary.projection,
      analyticalYearsToFi: combinedSummary.yearsToFi,
    });
  }, [selectedDecisions, selectedIds, activeScenario, combinedSummary]);

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
    const age = activeScenario.profile.age;

    // Core FIRE milestones from shared computation
    const coreMilestones = computeProjectionMilestones({
      scenario: activeScenario,
      summary: baseSummary,
      comparisonSummary: combinedSummary,
    });

    // Event start markers from selected decisions — styled as subtle events
    const eventMarkers: MilestoneMarker[] = [];
    for (const d of selectedDecisions) {
      const vals: Record<string, number> = {};
      for (const p of d.template.params) {
        vals[p.id] = customValues[d.id]?.[p.id] ?? p.defaultValue;
      }
      const startAge = vals.startAge ?? vals.atAge ?? age;
      const year = Math.round(startAge - age);
      if (year > 0 && year < (baseSummary.projection.length ?? 20)) {
        eventMarkers.push({
          year,
          label: `${d.emoji} ${d.label.split(" at ")[0].split(" for ")[0]}`,
          isEvent: true,
        });
      }
    }

    return [...coreMilestones, ...eventMarkers];
  }, [selectedDecisions, combinedSummary, baseSummary, activeScenario, customValues]);

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
        title="How real choices change your timeline"
        description="Select one or more life decisions to see how they shift your path to financial independence."
        metrics={[
          {
            label: "FIRE number",
            value: formatCompactCurrency(baseSummary.fireNumber),
            accent: true,
          },
          {
            // Integer years (same source of truth as Save's stat card and the
            // header pill). Fractional display was the source of "29.8 yrs"
            // here vs. "30 yrs" on the Save card.
            label: "Years to FI",
            value:
              displayYearsToFi === null
                ? "—"
                : displayYearsToFi === 0
                  ? "at FI"
                  : `${displayYearsToFi} yr${displayYearsToFi === 1 ? "" : "s"}`,
          },
          {
            label: "FI age",
            value: displayFireAge === null ? "---" : `${displayFireAge}`,
          },
        ]}
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        {/* ---- Life Decision Cards (primary interaction — shown first) ----
            Page header above already says "How real choices change your
            timeline"; the inner shell gets a scoped title so the user
            doesn't read the same headline twice in a row. */}
        <ChartShell
          eyebrow="Life decisions"
          title="Pick the changes you want to model"
        >
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0">💡</span>
            <div>
              <span>Select any scenario to see how it shifts your FIRE date. Combine multiple to model real life.</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="ml-1.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 hover:bg-muted/80 hover:text-foreground transition-colors">
                    How it works
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs leading-relaxed">
                  <p className="font-medium text-foreground mb-1">How this works</p>
                  <p>Each card models a specific life change — a raise, a career break, a new child — and shows how many years it adds or removes from your timeline.</p>
                  <p className="mt-1.5">When you select multiple cards, Calcifer compounds them together into a single scenario. The chart and table below update in real time so you can see the combined effect year by year.</p>
                  <p className="mt-1.5">Adjust the sliders on each card to match your situation. All calculations use your actual tax rate, savings, and portfolio — not generic assumptions.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        // Source-of-truth value, pre-clamp. May be NaN /
                        // out-of-range if a persisted draft or a racy setState
                        // lands an invalid number; clamp defensively before
                        // it hits the Slider (Radix's behavior on invalid
                        // input is undefined) or derived summary math.
                        const rawValue =
                          customValues[decision.id]?.[param.id] ??
                          param.defaultValue;
                        const safeValue = Number.isFinite(rawValue)
                          ? clamp(rawValue, param.min, param.max)
                          : param.defaultValue;
                        const currentValue = safeValue;

                        if (param.type === "boolean") {
                          const checked = currentValue !== 0;
                          return (
                            <div
                              key={param.id}
                              className="mt-3 border-t border-border/40 pt-3"
                            >
                              <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span>{param.label}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    updateParam(
                                      decision.id,
                                      param.id,
                                      e.target.checked ? 1 : 0,
                                    )
                                  }
                                  className="size-4 rounded border-border/60 text-[var(--ember)] focus:ring-1 focus:ring-[var(--ember)]"
                                />
                              </label>
                            </div>
                          );
                        }

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
          {selectedIds.size > 0 ? (
            <p className="mt-3 text-center text-xs text-muted-foreground/60">
              {selectedIds.size} selected · scroll down to see the impact on your timeline
            </p>
          ) : null}
        </ChartShell>

        {/* ---- Comparison Chart ---- */}
        <ChartShell
          title={
            selectedIds.size > 0
              ? `With ${selectedIds.size} change${selectedIds.size === 1 ? "" : "s"}`
              : "Save projection"
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

          {/* ---- Year-by-year breakdown (inside the chart card) ---- */}
          {(() => {
            const hasComparison = combinedSummary != null;
            const showIncome = selectedIds.has("income-change") || selectedIds.has("career-break");
            const showExpenses = selectedIds.has("lifestyle-change") || selectedIds.has("new-dependent") || selectedIds.has("career-break");

            // Build event timing map
            const eventTimings: Map<number, string[]> = new Map();
            if (hasComparison) {
              for (const d of selectedDecisions) {
                const vals: Record<string, number> = {};
                for (const p of d.template.params) {
                  vals[p.id] = customValues[d.id]?.[p.id] ?? p.defaultValue;
                }
                const startAge = vals.startAge ?? vals.atAge ?? activeScenario.profile.age;
                const duration = vals.duration ?? null;
                const existing = eventTimings.get(Math.round(startAge)) ?? [];
                existing.push(`${d.emoji} ${d.label.split(" at ")[0].split(" for ")[0]}`);
                eventTimings.set(Math.round(startAge), existing);
                if (duration && duration > 0) {
                  const endAge = Math.round(startAge + duration);
                  const endExisting = eventTimings.get(endAge) ?? [];
                  endExisting.push(`${d.emoji} ends`);
                  eventTimings.set(endAge, endExisting);
                }
              }
            }

            let baseHitFiYear: number | null = null;
            let compHitFiYear: number | null = null;

            return (
              <CollapsibleSection
                title="Year-by-year breakdown"
                summary={
                  hasComparison
                    ? `${baseSummary.projection.length} years · base vs ${selectedIds.size} change${selectedIds.size === 1 ? "" : "s"}`
                    : `${baseSummary.projection.length} years`
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      <tr>
                        <th className="pb-3 pr-3 font-medium">Age</th>
                        <th className="pb-3 pr-3 font-medium">Portfolio</th>
                        {hasComparison ? (
                          <>
                            <th className="pb-3 pr-3 font-medium">With changes</th>
                            <th className="pb-3 pr-3 font-medium">Δ</th>
                          </>
                        ) : null}
                        {showIncome ? <th className="pb-3 pr-3 font-medium">Income</th> : null}
                        {showExpenses ? <th className="pb-3 pr-3 font-medium">Expenses</th> : null}
                        <th className="pb-3 pr-3 font-medium">Savings/yr</th>
                        <th className="pb-3 pr-3 font-medium">Growth</th>
                        <th className="pb-3 font-medium">Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baseSummary.projection.map((point, i) => {
                        const compPoint = combinedSummary?.projection[i];
                        const diff = compPoint ? compPoint.balance - point.balance : 0;
                        const baseAtFi = point.balance >= point.target && point.year > 0;
                        const compAtFi = compPoint && compPoint.balance >= compPoint.target && compPoint.year > 0;
                        if (baseAtFi && baseHitFiYear === null) baseHitFiYear = point.year;
                        if (compAtFi && compHitFiYear === null) compHitFiYear = point.year;
                        const showBaseFiBadge = point.year === baseHitFiYear;
                        const showCompFiBadge = hasComparison && point.year === compHitFiYear;

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

                        const age = Math.round(point.age);
                        const events = eventTimings.get(age) ?? [];

                        return (
                          <tr
                            key={point.year}
                            className={cn(
                              "border-t border-border/40",
                              showCompFiBadge && "bg-emerald-50/50 dark:bg-emerald-950/10",
                              showBaseFiBadge && !showCompFiBadge && "bg-[rgba(255,107,53,0.04)]",
                            )}
                          >
                            <td className="py-2 pr-3 tabular-nums">{age}</td>
                            <td className="py-2 pr-3 tabular-nums font-medium">{formatCompactCurrency(point.balance)}</td>
                            {hasComparison ? (
                              <>
                                <td className={cn("py-2 pr-3 tabular-nums font-medium", compAtFi && "text-emerald-600")}>
                                  {compPoint ? formatCompactCurrency(compPoint.balance) : "—"}
                                </td>
                                <td className={cn("py-2 pr-3 tabular-nums text-xs", diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-muted-foreground")}>
                                  {Math.abs(diff) < 100 ? "—" : diff > 0 ? `+${formatCompactCurrency(diff)}` : `-${formatCompactCurrency(Math.abs(diff))}`}
                                </td>
                              </>
                            ) : null}
                            {showIncome ? (
                              <td className="py-2 pr-3 tabular-nums text-xs">
                                <span className={cn(incChanged ? "text-[var(--ember)] font-medium" : "text-muted-foreground")}>
                                  {formatCompactCurrency(hasComparison ? compInc : baseInc)}
                                </span>
                              </td>
                            ) : null}
                            {showExpenses ? (
                              <td className="py-2 pr-3 tabular-nums text-xs">
                                <span className={cn(expChanged ? "text-[var(--ember)] font-medium" : "text-muted-foreground")}>
                                  {formatCompactCurrency(hasComparison ? compExp : baseExp)}
                                </span>
                              </td>
                            ) : null}
                            <td className="py-2 pr-3 tabular-nums text-xs">
                              <span className={cn(savChanged ? (compSav > baseSav ? "text-emerald-600 font-medium" : "text-red-500 font-medium") : "text-muted-foreground")}>
                                {formatCompactCurrency(hasComparison ? compSav : baseSav)}
                              </span>
                            </td>
                            <td className="py-2 pr-3 tabular-nums text-xs">
                              <span className={cn(grwChanged ? (compGrw > baseGrw ? "text-emerald-600 font-medium" : "text-red-500 font-medium") : "text-muted-foreground")}>
                                {formatCompactCurrency(hasComparison ? compGrw : baseGrw)}
                              </span>
                            </td>
                            <td className="py-2 text-xs">
                              <div className="flex flex-wrap gap-1">
                                {events.map((evt, idx) => (
                                  <span key={idx} className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {evt}
                                  </span>
                                ))}
                                {showCompFiBadge ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">🎯 FI</span>
                                ) : showBaseFiBadge ? (
                                  <span className="inline-flex items-center rounded-full bg-[rgba(255,107,53,0.1)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ember)]">🎯 FI (base)</span>
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
        </ChartShell>

        {/* ---- Section 2: Impact Summary (when any selected) ---- */}
        {combinedSummary && combinedDelta ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Card 1: Your plan. Use integer-years display so this matches
                  the page header metric and the pill (both driven by
                  `deriveDisplayYearsToFi`). Fall back to the fractional
                  formatter when the projection doesn't reach FI. */}
              <StatCard
                label="Your plan"
                value={formatCompactCurrency(baseSummary.fireNumber)}
                description={
                  displayYearsToFi !== null
                    ? `${displayYearsToFi} yrs to FI${displayFireAge !== null ? ` (age ${displayFireAge})` : ""}`
                    : `${formatYears(baseSummary.yearsToFi)} to FI${baseSummary.fireAge !== null ? ` (age ${Math.round(baseSummary.fireAge)})` : ""}`
                }
              />

              {/* Card 2: Combined scenario — same integer-years treatment. */}
              <StatCard
                label={`With ${selectedIds.size} change${selectedIds.size === 1 ? "" : "s"}`}
                value={formatCompactCurrency(combinedSummary.fireNumber)}
                description={
                  combinedDisplay && combinedDisplay.displayYearsToFi !== null
                    ? `${combinedDisplay.displayYearsToFi} yrs to FI${combinedDisplay.displayFireAge !== null ? ` (age ${combinedDisplay.displayFireAge})` : ""}`
                    : `${formatYears(combinedSummary.yearsToFi)} to FI${combinedSummary.fireAge !== null ? ` (age ${Math.round(combinedSummary.fireAge)})` : ""}`
                }
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

        {/* Life Decision Cards moved to top of page */}


        {/* ---- Learn link (savings rate table moved to /education/savings-rate) ---- */}
        <Link
          href="/education/savings-rate"
          className="flex items-center justify-between rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.05)]"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ember)]">
              📚 Learn
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              How savings rate determines your timeline
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The shockingly simple math behind early retirement — personalized with your numbers.
            </p>
          </div>
          <span className="text-lg text-muted-foreground">→</span>
        </Link>
      </section>
    </div>
  );
}
