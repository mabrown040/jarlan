"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChartShell, CompactPageHeader, StatCard } from "@/components/brand";
import {
  ProjectionChart,
  ChartLegend,
} from "@/components/landing/projection-chart";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
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
  evaluateLifeDecisions,
  type LifeDecisionResult,
} from "@/lib/scenario-lab/life-decisions";
import { buildSensitivityAnalysis } from "@/lib/scenario-lab/analysis";
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

function getImpactColor(
  direction: LifeDecisionResult["decision"]["direction"],
) {
  if (direction === "positive") return "text-emerald-500";
  if (direction === "negative") return "text-red-500";
  return "text-amber-500";
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

  /* ---- Selection state ---- */
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  /* ---- Derived data ---- */
  const baseSummary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );

  const plannedContribution = useMemo(
    () => getPlannedAnnualInvestmentContribution(activeScenario),
    [activeScenario],
  );

  const decisionResults = useMemo(
    () => evaluateLifeDecisions(activeScenario),
    [activeScenario],
  );

  const sensitivity = useMemo(
    () => buildSensitivityAnalysis(activeScenario),
    [activeScenario],
  );

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

  /* ---- Selected decision + computed comparison summary ---- */
  const selectedDecision =
    decisionResults.find((r) => r.decision.id === selectedId)?.decision ?? null;

  const selectedSummary = useMemo(() => {
    if (!selectedDecision) return null;
    return calculateQuickFireSummary(selectedDecision.apply(activeScenario));
  }, [selectedDecision, activeScenario]);

  const selectedResult =
    decisionResults.find((r) => r.decision.id === selectedId) ?? null;

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

  /* ---- Toggle handler ---- */
  function handleCardClick(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

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
            selectedDecision
              ? `${selectedDecision.emoji} ${selectedDecision.label}`
              : "Your base case"
          }
        >
          <ProjectionChart
            data={baseSummary.projection}
            annualContribution={plannedContribution}
            startAge={activeScenario.profile.age}
            comparisonData={selectedSummary?.projection}
            comparisonLabel={selectedDecision?.label}
          />
          <div className="mt-3">
            <ChartLegend comparisonLabel={selectedDecision?.label} />
          </div>
        </ChartShell>

        {/* ---- Section 2: Impact Summary (only when selected) ---- */}
        {selectedResult && selectedSummary ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Card 1: Your plan */}
              <StatCard
                label="Your plan"
                value={formatCompactCurrency(baseSummary.fireNumber)}
                description={`${formatYears(baseSummary.yearsToFi)} to FI${baseSummary.fireAge !== null ? ` (age ${Math.round(baseSummary.fireAge)})` : ""}`}
              />

              {/* Card 2: With decision */}
              <StatCard
                label={`With ${selectedResult.decision.emoji} ${selectedResult.decision.label}`}
                value={formatCompactCurrency(selectedSummary.fireNumber)}
                description={`${formatYears(selectedSummary.yearsToFi)} to FI${selectedSummary.fireAge !== null ? ` (age ${Math.round(selectedSummary.fireAge)})` : ""}`}
                tone="accent"
              />

              {/* Card 3: Impact */}
              <StatCard
                label="Impact"
                value={
                  selectedResult.deltaYears === 0
                    ? "No change"
                    : selectedResult.deltaYears > 0
                      ? `${Math.abs(selectedResult.deltaYears).toFixed(1)} yrs sooner`
                      : `${Math.abs(selectedResult.deltaYears).toFixed(1)} yrs later`
                }
                description={
                  Math.abs(selectedResult.deltaFireNumber) >= 500
                    ? `Target ${selectedResult.deltaFireNumber > 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(selectedResult.deltaFireNumber))} ${selectedResult.deltaYears > 0 ? "\u2191" : selectedResult.deltaYears < 0 ? "\u2193" : ""}`
                    : `${selectedResult.deltaYears > 0 ? "\u2191 Closer to FI" : selectedResult.deltaYears < 0 ? "\u2193 Further from FI" : "No change"}`
                }
                tone={
                  selectedResult.deltaYears > 0
                    ? "success"
                    : selectedResult.deltaYears < 0
                      ? "danger"
                      : "default"
                }
              />
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                Reset comparison
              </button>
            </div>
          </div>
        ) : null}

        {/* ---- Section 3: Life Decision Cards ---- */}
        <ChartShell
          eyebrow="Life decisions"
          title="How real choices change your timeline"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {decisionResults.map((result) => {
              const { decision, deltaYears, deltaFireNumber } = result;
              const isSelected = selectedId === decision.id;
              const sooner = deltaYears > 0;
              const fireNumberChanged = Math.abs(deltaFireNumber) >= 500;

              return (
                <button
                  key={decision.id}
                  type="button"
                  onClick={() => handleCardClick(decision.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-[var(--ember)] bg-[rgba(255,107,53,0.05)] ring-1 ring-[var(--ember)]/20"
                      : "border-border/60 bg-card hover:border-[var(--ember)]/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        <span className="mr-1.5">{decision.emoji}</span>
                        {decision.label}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {decision.description}
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
              );
            })}
          </div>
          {!selectedId ? (
            <p className="mt-4 text-center text-xs text-muted-foreground/60">
              Click any card to see its impact on the chart above
            </p>
          ) : null}
        </ChartShell>

        {/* ---- Section 4: Sensitivity (collapsed) ---- */}
        <CollapsibleSection
          title="What moves the plan the most"
          summary="4 key levers ranked by impact"
        >
          <div className="space-y-4">
            {sensitivity.map((item, index) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">
                    {item.improvementYears.toFixed(1)} years faster
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(Math.max(item.improvementYears * 10, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

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
