"use client";

import Link from "next/link";
import { Copy } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ChartShell, CompactPageHeader, StatCard } from "@/components/brand";
import { HistoricalBacktestChart } from "@/components/withdrawal/historical-backtest-chart";
import { FailureRateChart } from "@/components/withdrawal/failure-rate-chart";
import { WorstCaseSpendingChart } from "@/components/withdrawal/worst-case-spending-chart";
import {
  supportedStrategyTypes,
  type SupportedStrategyType,
} from "@/components/withdrawal/use-withdrawal-strategy-comparison";
import { SpendWhatIfAdvancedDetail } from "@/components/scenario-lab/spend-what-if-advanced-detail";
import {
  FailureRateScenarioComparisonChart,
  HistoricalScenarioComparisonChart,
  WorstCaseScenarioComparisonChart,
} from "@/components/scenario-lab/retirement-what-if-charts";
import { SpendWhatIfGlobalControls } from "@/components/scenario-lab/spend-what-if-global-controls";
import { useRetirementScenarioSimulation } from "@/components/scenario-lab/use-retirement-scenario-simulation";
import { useRetirementReadiness } from "@/components/retirement/use-retirement-readiness";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  formatCompactCurrency,
  formatPercent,
} from "@/lib/calc";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import {
  buildSpendDecisionTemplates,
  resolveSpendDecision,
  type SpendDecisionParam,
} from "@/lib/scenario-lab/spend-decisions";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
} from "@/lib/share";
import type { WhatIfPortfolioMode } from "@/lib/scenario-lab/spend-analysis";
import { useScenarioStore } from "@/lib/store";
import { useDrawerStore } from "@/lib/store/use-drawer-store";
import { withdrawalStrategyMetadata } from "@/lib/sim";
import { cn } from "@/lib/utils";

const evidenceViews = [
  { id: "worst-case", label: "Worst case" },
  { id: "historical", label: "Historical fan" },
  { id: "sequence", label: "Sequence risk" },
] as const;

type EvidenceView = (typeof evidenceViews)[number]["id"];

function formatParamValue(param: SpendDecisionParam, value: number): string {
  switch (param.type) {
    case "currency":
      return formatCompactCurrency(value);
    case "currency_signed":
      return `${value >= 0 ? "+" : "-"}${formatCompactCurrency(Math.abs(value))}`;
    case "years":
      return value === 1 ? "1 year" : `${Math.round(value)} years`;
    case "percent":
      return formatPercent(value, 0);
    default:
      return String(value);
  }
}

function getDirectionColor(direction: "positive" | "negative" | "neutral") {
  if (direction === "positive") {
    return "text-emerald-600";
  }

  if (direction === "negative") {
    return "text-red-500";
  }

  return "text-muted-foreground";
}

function getDirectionLabel(direction: "positive" | "negative" | "neutral") {
  if (direction === "positive") {
    return "Usually sturdier";
  }

  if (direction === "negative") {
    return "Usually riskier";
  }

  return "Depends on your baseline";
}

function getSuccessTone(value: number | null) {
  if (value === null) {
    return "default" as const;
  }

  if (value >= 0.9) {
    return "success" as const;
  }

  if (value >= 0.75) {
    return "warning" as const;
  }

  return "danger" as const;
}

function getRiskTone(value: number | null) {
  if (value === null) {
    return "default" as const;
  }

  if (value <= 0.1) {
    return "success" as const;
  }

  if (value <= 0.2) {
    return "warning" as const;
  }

  return "danger" as const;
}

function getDeltaTone(value: number) {
  if (Math.abs(value) < 0.0005) {
    return "default" as const;
  }

  return value > 0 ? "success" : "danger";
}

function formatPointDelta(value: number) {
  if (Math.abs(value) < 0.0005) {
    return "Flat";
  }

  return `${value > 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)} pts`;
}

export default function WhatIfWorkspace() {
  const {
    activeScenario,
    saveStatus,
    updateRetirementExpenses,
    updateRetirementDuration,
    updateWithdrawalStrategyType,
    updateSimulationType,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const [copied, setCopied] = useState(false);
  const [portfolioMode, setPortfolioMode] =
    useState<WhatIfPortfolioMode>("current-path");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customValues, setCustomValues] = useState<
    Record<string, Record<string, number>>
  >({});
  const [evidenceView, setEvidenceView] =
    useState<EvidenceView>("worst-case");

  useInitializeStore(sharedScenarioParam);
  useAutoSaveScenario({ syncUrl: true });
  useGlobalScenarioFormatting(activeScenario);

  const strategyOptions = useMemo(
    () =>
      supportedStrategyTypes.map((type) => ({
        value: type,
        label: withdrawalStrategyMetadata[type].label,
      })),
    [],
  );
  const selectedStrategy = supportedStrategyTypes.includes(
    activeScenario.withdrawalStrategy.type as SupportedStrategyType,
  )
    ? (activeScenario.withdrawalStrategy.type as SupportedStrategyType)
    : "fixed";
  const selectedStrategyMeta = withdrawalStrategyMetadata[selectedStrategy];

  const templates = useMemo(
    () => buildSpendDecisionTemplates(activeScenario),
    [activeScenario],
  );
  const resolvedDecisions = useMemo(
    () =>
      templates.map((template) => {
        const values: Record<string, number> = {};
        for (const param of template.params) {
          values[param.id] =
            customValues[template.id]?.[param.id] ?? param.defaultValue;
        }

        return resolveSpendDecision(template, values, activeScenario);
      }),
    [activeScenario, customValues, templates],
  );
  const selectedDecisions = useMemo(
    () => resolvedDecisions.filter((decision) => selectedIds.has(decision.id)),
    [resolvedDecisions, selectedIds],
  );
  const comparisonScenario = useMemo(() => {
    if (selectedDecisions.length === 0) {
      return activeScenario;
    }

    return selectedDecisions.reduce(
      (scenario, decision) => decision.apply(scenario),
      activeScenario,
    );
  }, [activeScenario, selectedDecisions]);
  const hasComparison = selectedDecisions.length > 0;

  const baseSimulation = useRetirementScenarioSimulation({
    scenario: activeScenario,
    portfolioMode,
  });
  const comparisonSimulation = useRetirementScenarioSimulation({
    scenario: comparisonScenario,
    portfolioMode,
    enabled: hasComparison,
  });
  const baseReadiness = useRetirementReadiness({
    scenario: baseSimulation.simulationScenario,
    historicalResult: baseSimulation.historicalResult,
    monteCarloResult: baseSimulation.monteCarloResult,
    mortalityRisk: baseSimulation.mortalityRisk,
    autoSimulate: false,
  });
  const comparisonReadiness = useRetirementReadiness({
    scenario: hasComparison
      ? comparisonSimulation.simulationScenario
      : baseSimulation.simulationScenario,
    historicalResult: hasComparison
      ? comparisonSimulation.historicalResult
      : baseSimulation.historicalResult,
    monteCarloResult: hasComparison
      ? comparisonSimulation.monteCarloResult
      : baseSimulation.monteCarloResult,
    mortalityRisk: hasComparison
      ? comparisonSimulation.mortalityRisk
      : baseSimulation.mortalityRisk,
    autoSimulate: false,
  });

  const comparisonLabel =
    selectedDecisions.length === 1
      ? selectedDecisions[0].label
      : `Combined (${selectedDecisions.length})`;
  const comparisonReady =
    !hasComparison ||
    (baseSimulation.status === "ready" &&
      comparisonSimulation.status === "ready");
  const selectedAssessment = hasComparison
    ? comparisonReadiness.assessment
    : baseReadiness.assessment;
  const activeHistoricalResult = hasComparison
    ? comparisonSimulation.historicalResult
    : baseSimulation.historicalResult;
  const activeMonteCarloResult = hasComparison
    ? comparisonSimulation.monteCarloResult
    : baseSimulation.monteCarloResult;
  const guidanceReady =
    baseSimulation.status === "ready" && (!hasComparison || comparisonReady);

  const baseFirstDecadeFailureRisk =
    baseSimulation.monteCarloResult?.failureRateByYear[9]
      ?.cumulativeFailureRate ??
    baseSimulation.monteCarloResult?.failureRateByYear.at(-1)
      ?.cumulativeFailureRate ??
    null;
  const comparisonFirstDecadeFailureRisk =
    activeMonteCarloResult?.failureRateByYear[9]?.cumulativeFailureRate ??
    activeMonteCarloResult?.failureRateByYear.at(-1)?.cumulativeFailureRate ??
    null;
  const impactSummary = useMemo(() => {
    if (
      !hasComparison ||
      !comparisonReady ||
      !baseSimulation.historicalResult ||
      !comparisonSimulation.historicalResult ||
      !baseSimulation.monteCarloResult ||
      !comparisonSimulation.monteCarloResult
    ) {
      return null;
    }

    return {
      historicalSuccessDelta:
        comparisonSimulation.historicalResult.successRate -
        baseSimulation.historicalResult.successRate,
      firstDecadeFailureRiskImprovement:
        (baseFirstDecadeFailureRisk ?? 0) -
        (comparisonFirstDecadeFailureRisk ?? 0),
      worstCaseFloorDelta:
        comparisonSimulation.historicalResult.withdrawalSummary.minMedian -
        baseSimulation.historicalResult.withdrawalSummary.minMedian,
      readinessScoreDelta:
        selectedAssessment.score - baseReadiness.assessment.score,
    };
  }, [
    baseFirstDecadeFailureRisk,
    baseReadiness.assessment.score,
    baseSimulation.historicalResult,
    baseSimulation.monteCarloResult,
    comparisonFirstDecadeFailureRisk,
    comparisonReady,
    comparisonSimulation.historicalResult,
    comparisonSimulation.monteCarloResult,
    hasComparison,
    selectedAssessment.score,
  ]);

  const evidenceError =
    baseSimulation.error ??
    (hasComparison ? comparisonSimulation.error : null);

  function handleCardClick(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        setCustomValues((previous) => {
          const updated = { ...previous };
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
      setCustomValues((current) => ({
        ...current,
        [decisionId]: {
          ...current[decisionId],
          [paramId]: value,
        },
      }));
    },
    [],
  );

  async function handleCopyShareLink() {
    if (typeof window === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(
      buildScenarioShareUrl(
        `${window.location.origin}${pathname}`,
        activeScenario,
      ),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  function renderEvidenceChart() {
    if (evidenceError) {
      return (
        <ErrorAlert title="We couldn't refresh the retirement comparison">
          {evidenceError}
        </ErrorAlert>
      );
    }

    if (
      baseSimulation.status === "loading" ||
      (hasComparison && comparisonSimulation.status === "loading")
    ) {
      return (
        <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          Running the retirement simulations for your current plan
          {hasComparison ? " and selected scenario" : ""}...
        </div>
      );
    }

    if (
      evidenceView === "historical" &&
      baseSimulation.historicalResult &&
      activeHistoricalResult
    ) {
      if (hasComparison && comparisonReady && comparisonSimulation.historicalResult) {
        return (
          <HistoricalScenarioComparisonChart
            baseData={baseSimulation.historicalResult.percentileBand}
            comparisonData={comparisonSimulation.historicalResult.percentileBand}
          />
        );
      }

      return (
        <HistoricalBacktestChart
          data={baseSimulation.historicalResult.percentileBand}
        />
      );
    }

    if (
      evidenceView === "sequence" &&
      baseSimulation.monteCarloResult &&
      activeMonteCarloResult
    ) {
      if (hasComparison && comparisonReady && comparisonSimulation.monteCarloResult) {
        return (
          <FailureRateScenarioComparisonChart
            baseData={baseSimulation.monteCarloResult.failureRateByYear}
            comparisonData={
              comparisonSimulation.monteCarloResult.failureRateByYear
            }
          />
        );
      }

      return (
        <FailureRateChart data={baseSimulation.monteCarloResult.failureRateByYear} />
      );
    }

    if (
      evidenceView === "worst-case" &&
      baseSimulation.historicalResult &&
      activeHistoricalResult
    ) {
      if (hasComparison && comparisonReady && comparisonSimulation.historicalResult) {
        return (
          <WorstCaseScenarioComparisonChart
            baseData={baseSimulation.historicalResult.worstCasePath}
            comparisonData={comparisonSimulation.historicalResult.worstCasePath}
            baseInitialWithdrawal={
              baseSimulation.historicalResult.initialWithdrawal
            }
            comparisonInitialWithdrawal={
              comparisonSimulation.historicalResult.initialWithdrawal
            }
          />
        );
      }

      return (
        <WorstCaseSpendingChart
          data={baseSimulation.historicalResult.worstCasePath}
          initialWithdrawal={baseSimulation.historicalResult.initialWithdrawal}
        />
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        Select a scenario above to compare the base plan against a different
        retirement path.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <CompactPageHeader
        title="What changes make this retirement plan sturdier?"
        description="Choose a real retirement lever first, then see how it changes durability, early sequence risk, and the trade-offs you would actually feel."
        metrics={[
          {
            label: "Retirement spend",
            value: formatCompactCurrency(activeScenario.retirementExpenses),
            accent: true,
          },
          {
            label: "Starting portfolio",
            value: formatCompactCurrency(baseSimulation.startingPortfolio),
          },
          {
            label: "Historical success",
            value: baseSimulation.historicalResult
              ? formatPercent(baseSimulation.historicalResult.successRate, 1)
              : "Running...",
          },
          {
            label: "Readiness",
            value:
              baseSimulation.status === "ready"
                ? `${Math.round(baseReadiness.assessment.score)}/100`
                : "Running...",
            accent:
              baseSimulation.status === "ready" &&
              baseReadiness.assessment.score >= 80,
          },
        ]}
        actions={
          <>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/withdrawal">Back to spend plan</Link>
            </Button>
            <Button type="button" variant="outline" onClick={handleCopyShareLink}>
              <Copy className="size-4" />
              {copied ? "Copied share link" : "Copy share link"}
            </Button>
          </>
        }
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        <SpendWhatIfGlobalControls
          saveStatus={saveStatus}
          strategy={selectedStrategy}
          strategyDescription={selectedStrategyMeta.shortDescription}
          strategyOptions={strategyOptions}
          retirementExpenses={activeScenario.retirementExpenses}
          retirementDuration={activeScenario.simulationSettings.retirementDuration}
          portfolioMode={portfolioMode}
          onStrategyChange={(value) =>
            updateWithdrawalStrategyType(
              value as typeof activeScenario.withdrawalStrategy.type,
            )
          }
          onRetirementExpensesChange={updateRetirementExpenses}
          onRetirementDurationChange={updateRetirementDuration}
          onPortfolioModeChange={setPortfolioMode}
          onOpenAdvancedSettings={() => drawerStore.open("retirement")}
        />

        <ChartShell
          eyebrow="Retirement levers"
          title="The main choices that change withdrawal durability"
          description="Start with the concrete levers most people actually use in retirement: spending, timing, bridge income, flexible guardrails, and how much legacy the plan still needs to preserve."
        >
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0">💡</span>
            <div>
              <span>
                Pick one or more changes to see how they alter your retirement
                plan. The full simulations only run for the scenario you select,
                so the page stays fast while still using the real retirement
                engine for the final answer.
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/80 transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    How it works
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs leading-relaxed">
                  <p className="font-medium text-foreground">
                    How this works
                  </p>
                  <p className="mt-1.5">
                    Each card changes the real retirement scenario behind your
                    plan, then the historical and Monte Carlo engines rerun for
                    the selected scenario only.
                  </p>
                  <p className="mt-1.5">
                    Current path uses the portfolio projected to your
                    retirement start date. FIRE target instead stress-tests the
                    spending plan at the target size implied by your current
                    withdrawal rate.
                  </p>
                  <p className="mt-1.5">
                    The guidance section uses the same readiness model as Your
                    Plan, so strengths, watchouts, and next actions stay tied to
                    the same retirement logic.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {resolvedDecisions.map((decision) => {
              const isSelected = selectedIds.has(decision.id);

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
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          {decision.category}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 font-medium text-foreground">
                          <span>{decision.emoji}</span>
                          <span className="flex-1">{decision.label}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-shrink-0 cursor-help rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80">
                                ?
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs leading-relaxed">
                              {decision.methodology}
                            </TooltipContent>
                          </Tooltip>
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {decision.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground/80">
                          {decision.tradeoff}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground/60">
                          e.g. {decision.examples.slice(0, 3).join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          getDirectionColor(decision.direction),
                        )}
                      >
                        {getDirectionLabel(decision.direction)}
                      </span>
                      {decision.template.params.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Adjust on select
                        </span>
                      ) : null}
                    </div>
                  </button>

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
                                onValueChange={([value]) =>
                                  updateParam(decision.id, param.id, value)
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
            <p className="text-center text-xs text-muted-foreground/60">
              {selectedIds.size} selected. Scroll down to see how the full
              retirement answer changes.
            </p>
          ) : null}
        </ChartShell>

        {hasComparison && impactSummary ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Your plan"
                value={formatPercent(
                  baseSimulation.historicalResult?.successRate ?? 0,
                  1,
                )}
                description={`Monte Carlo ${formatPercent(
                  baseSimulation.monteCarloResult?.successRate ?? 0,
                  1,
                )} · readiness ${Math.round(baseReadiness.assessment.score)}/100`}
              />
              <StatCard
                label={
                  selectedDecisions.length === 1
                    ? "With this change"
                    : `With ${selectedDecisions.length} changes`
                }
                value={formatPercent(
                  comparisonSimulation.historicalResult?.successRate ?? 0,
                  1,
                )}
                description={`Monte Carlo ${formatPercent(
                  comparisonSimulation.monteCarloResult?.successRate ?? 0,
                  1,
                )} · readiness ${Math.round(selectedAssessment.score)}/100`}
                tone="accent"
              />
              <StatCard
                label="Impact"
                value={`${formatPointDelta(
                  impactSummary.historicalSuccessDelta,
                )} success`}
                description={`Readiness ${
                  impactSummary.readinessScoreDelta >= 0 ? "+" : ""
                }${Math.round(impactSummary.readinessScoreDelta)} · worst-case floor ${
                  impactSummary.worstCaseFloorDelta >= 0 ? "+" : "-"
                }${formatCompactCurrency(
                  Math.abs(impactSummary.worstCaseFloorDelta),
                )}`}
                tone={getDeltaTone(impactSummary.historicalSuccessDelta)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {selectedDecisions.map((decision) => (
                <button
                  key={decision.id}
                  type="button"
                  onClick={() => handleCardClick(decision.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ember)]/30 bg-[rgba(255,107,53,0.06)] px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-[rgba(255,107,53,0.12)]"
                >
                  <span>{decision.emoji}</span>
                  <span>{decision.label}</span>
                  <span className="text-muted-foreground/60">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                Clear all
              </button>
            </div>

            {selectedDecisions.length > 1 ? (
              <p className="text-center text-[11px] text-muted-foreground/60">
                Combined impact can differ from the sum of each card because the
                retirement engine reruns the full scenario after the changes are
                stacked together.
              </p>
            ) : null}
          </div>
        ) : null}

        <ChartShell
          eyebrow="Evidence"
          title={
            hasComparison
              ? `How ${comparisonLabel} changes the answer`
              : "How your current retirement plan looks today"
          }
          description={
            hasComparison
              ? "Switch between the hardest historical cohort, the full historical distribution, and first-decade sequence risk to see what improved or got worse."
              : "Choose a scenario above to turn this into a before-and-after comparison."
          }
          actions={
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1.5 shadow-sm">
              {evidenceViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    evidenceView === view.id
                      ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  onClick={() => setEvidenceView(view.id)}
                >
                  {view.label}
                </button>
              ))}
            </div>
          }
        >
          {renderEvidenceChart()}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Historical success"
              value={
                activeHistoricalResult
                  ? formatPercent(activeHistoricalResult.successRate, 1)
                  : "Pending"
              }
              description={
                hasComparison && comparisonReady && baseSimulation.historicalResult
                  ? `Base ${formatPercent(
                      baseSimulation.historicalResult.successRate,
                      1,
                    )} · ${formatPointDelta(
                      activeHistoricalResult
                        ? activeHistoricalResult.successRate -
                            baseSimulation.historicalResult.successRate
                        : 0,
                    )}`
                  : "Rolling historical start dates using the active strategy."
              }
              tone={getSuccessTone(activeHistoricalResult?.successRate ?? null)}
            />
            <StatCard
              label="Monte Carlo success"
              value={
                activeMonteCarloResult
                  ? formatPercent(activeMonteCarloResult.successRate, 1)
                  : "Pending"
              }
              description={
                hasComparison && comparisonReady && baseSimulation.monteCarloResult
                  ? `Base ${formatPercent(
                      baseSimulation.monteCarloResult.successRate,
                      1,
                    )} · ${formatPointDelta(
                      activeMonteCarloResult
                        ? activeMonteCarloResult.successRate -
                            baseSimulation.monteCarloResult.successRate
                        : 0,
                    )}`
                  : "Forward-looking success at your current return model."
              }
              tone={getSuccessTone(activeMonteCarloResult?.successRate ?? null)}
            />
            <StatCard
              label="First 10-year failure risk"
              value={
                comparisonFirstDecadeFailureRisk === null
                  ? "Pending"
                  : formatPercent(comparisonFirstDecadeFailureRisk, 1)
              }
              description={
                hasComparison && comparisonReady && baseFirstDecadeFailureRisk !== null
                  ? `Base ${formatPercent(
                      baseFirstDecadeFailureRisk,
                      1,
                    )} · ${
                      (baseFirstDecadeFailureRisk ?? 0) -
                        (comparisonFirstDecadeFailureRisk ?? 0) >=
                      0
                        ? "-"
                        : "+"
                    }${Math.abs(
                      ((baseFirstDecadeFailureRisk ?? 0) -
                        (comparisonFirstDecadeFailureRisk ?? 0)) *
                        100,
                    ).toFixed(1)} pts`
                  : "A direct read on how exposed the early retirement years are."
              }
              tone={getRiskTone(comparisonFirstDecadeFailureRisk)}
            />
            <StatCard
              label="Worst-case spending floor"
              value={
                activeHistoricalResult
                  ? formatCompactCurrency(
                      activeHistoricalResult.withdrawalSummary.minMedian,
                    )
                  : "Pending"
              }
              description={
                hasComparison && comparisonReady && baseSimulation.historicalResult
                  ? `Base ${formatCompactCurrency(
                      baseSimulation.historicalResult.withdrawalSummary.minMedian,
                    )} · ${
                      activeHistoricalResult &&
                      activeHistoricalResult.withdrawalSummary.minMedian -
                        baseSimulation.historicalResult.withdrawalSummary
                          .minMedian >=
                        0
                        ? "+"
                        : "-"
                    }${formatCompactCurrency(
                      Math.abs(
                        (activeHistoricalResult?.withdrawalSummary.minMedian ??
                          0) -
                          baseSimulation.historicalResult.withdrawalSummary
                            .minMedian,
                      ),
                    )}`
                  : "The lowest real median spending the hardest historical path reached."
              }
              tone="accent"
            />
          </div>
        </ChartShell>

        <ChartShell
          eyebrow="Guidance"
          title={
            hasComparison && comparisonReady
              ? "Why the answer changed"
              : "Why the current answer looks this way"
          }
          description={
            guidanceReady && hasComparison
              ? `Readiness moves from ${Math.round(
                  baseReadiness.assessment.score,
                )}/100 to ${Math.round(
                  selectedAssessment.score,
                )}/100. The strengths, watchouts, and next actions below reflect the selected scenario.`
              : "These strengths, watchouts, and next actions are generated from the same readiness model as your spend plan once the simulations finish."
          }
        >
          {guidanceReady ? (
            <>
              <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
                <p className="font-medium text-foreground">
                  {selectedAssessment.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedAssessment.summary}
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Strengths
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedAssessment.strengths.length > 0 ? (
                      selectedAssessment.strengths.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                        No major strengths surfaced beyond the baseline tax and
                        planning assumptions.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Watchouts
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedAssessment.watchouts.length > 0 ? (
                      selectedAssessment.watchouts.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                        No major watchouts surfaced beyond normal monitoring.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Next actions
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedAssessment.nextActions.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
              Refreshing the strengths, watchouts, and next actions for the
              active scenario...
            </div>
          )}
        </ChartShell>

        <CollapsibleSection
          title="Advanced analysis"
          summary="Open strategy comparison, valuation stress tests, and the current-year retirement checkup."
        >
          <SpendWhatIfAdvancedDetail
            baseScenario={activeScenario}
            scenario={hasComparison ? comparisonScenario : activeScenario}
            startingPortfolio={
              hasComparison
                ? comparisonSimulation.startingPortfolio
                : baseSimulation.startingPortfolio
            }
            simulationStatus={
              hasComparison
                ? comparisonSimulation.status
                : baseSimulation.status
            }
            simulationError={
              hasComparison
                ? comparisonSimulation.error
                : baseSimulation.error
            }
            historicalResult={
              hasComparison
                ? comparisonSimulation.historicalResult
                : baseSimulation.historicalResult
            }
            monteCarloResult={
              hasComparison
                ? comparisonSimulation.monteCarloResult
                : baseSimulation.monteCarloResult
            }
            mortalityRisk={
              hasComparison
                ? comparisonSimulation.mortalityRisk
                : baseSimulation.mortalityRisk
            }
            onMonteCarloSimulationTypeChange={updateSimulationType}
          />
        </CollapsibleSection>
      </section>
    </div>
  );
}
