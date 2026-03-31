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
  { id: "worst-case", label: "Hardest path" },
  { id: "historical", label: "Historical range" },
  { id: "sequence", label: "Early risk" },
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
    return "Usually safer";
  }

  if (direction === "negative") {
    return "Usually less safe";
  }

  return "Depends on this plan";
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

function getEvidenceTitle(
  evidenceView: EvidenceView,
  hasComparison: boolean,
) {
  if (hasComparison) {
    switch (evidenceView) {
      case "historical":
        return "Before and after the historical range";
      case "sequence":
        return "Before and after early failure risk";
      case "worst-case":
      default:
        return "Before and after the hardest retirement path";
    }
  }

  switch (evidenceView) {
    case "historical":
      return "The historical range for your current plan";
    case "sequence":
      return "How early failure risk builds today";
    case "worst-case":
    default:
      return "The hardest path for your current plan";
  }
}

function getEvidenceDescription(
  evidenceView: EvidenceView,
  hasComparison: boolean,
) {
  if (!hasComparison) {
    switch (evidenceView) {
      case "historical":
        return "Zoom out to the full spread of historical retirement outcomes, or pick a change above to turn this into a before-and-after comparison.";
      case "sequence":
        return "See how much risk sits in the first decade of retirement, or pick a change above to compare before and after.";
      case "worst-case":
      default:
        return "Start here to see how painful the hardest historical retirement path could feel. Pick a change above to turn this into a before-and-after comparison.";
    }
  }

  switch (evidenceView) {
    case "historical":
      return "Zoom out from the hardest cohort and compare the full spread of historical retirement outcomes.";
    case "sequence":
      return "See how much of the remaining risk is concentrated in the fragile first decade of retirement.";
    case "worst-case":
    default:
      return "Start here if you want the most intuitive spend-phase story: how the hardest historical path feels before and after the selected change.";
  }
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
          {hasComparison ? " and selected path" : ""}...
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
        Pick a change above to compare your current plan against a different
        retirement path.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <CompactPageHeader
        title="Which retirement changes make this plan safer?"
        description="Start with a real retirement change, then see how much safer the plan gets and what trade-off you accept."
        metrics={[
          {
            label: "Retirement spending",
            value: formatCompactCurrency(activeScenario.retirementExpenses),
            accent: true,
          },
          {
            label: "Testing portfolio",
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
        <ChartShell
          eyebrow="Retirement levers"
          title="Start with the retirement change you would actually make"
          description="These are the levers that usually move a spend plan the most: retirement spending, timing, bridge income, guardrails, and ending-wealth expectations."
        >
          <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0">💡</span>
            <div>
              <span>
                Pick the real change you would consider first. Once you select
                one, the page reruns the same retirement analysis used in Your
                Plan and shows the before-and-after answer below.
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
                    Each card changes the real retirement plan behind your
                    scenario. The evidence and guidance below compare your
                    current plan with the selected path using the same
                    historical, Monte Carlo, and readiness logic as Your Plan.
                  </p>
                  <p className="mt-1.5">
                    Current path uses the portfolio you are projected to retire
                    with. FIRE target stress-tests the plan at the target size
                    implied by your withdrawal rate.
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
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onClick={() => handleCardClick(decision.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleCardClick(decision.id);
                      }
                    }}
                    className="w-full cursor-pointer p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ember)]/30"
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
                              <button
                                type="button"
                                aria-label={`Explain ${decision.label}`}
                                onClick={(event) => event.stopPropagation()}
                                className="flex-shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                              >
                                ?
                              </button>
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
                          You accept: {decision.tradeoff}
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
                          Fine-tune after selecting
                        </span>
                      ) : null}
                    </div>
                  </div>

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
              {selectedIds.size === 1
                ? "1 change selected."
                : `${selectedIds.size} changes selected.`}{" "}
              Scroll down for the before-and-after answer.
            </p>
          ) : null}
        </ChartShell>

        <SpendWhatIfGlobalControls
          saveStatus={saveStatus}
          strategy={selectedStrategy}
          strategyLabel={selectedStrategyMeta.label}
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

        {hasComparison && impactSummary ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Current plan"
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
                label="Selected path"
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
                label="Safety gain"
                value={
                  Math.abs(impactSummary.historicalSuccessDelta) < 0.0005
                    ? "No big change"
                    : `${formatPointDelta(
                        impactSummary.historicalSuccessDelta,
                      )} success`
                }
                description={`Readiness ${
                  impactSummary.readinessScoreDelta >= 0 ? "+" : ""
                }${Math.round(impactSummary.readinessScoreDelta)} · hardest-path floor ${
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
                Combined impact is not just the sum of the cards. The full
                retirement answer reruns after the changes stack together.
              </p>
            ) : null}
          </div>
        ) : null}

        <ChartShell
          eyebrow="Evidence"
          title={getEvidenceTitle(evidenceView, hasComparison)}
          description={getEvidenceDescription(evidenceView, hasComparison)}
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
                  ? `Current ${formatPercent(
                      baseSimulation.historicalResult.successRate,
                      1,
                    )} · ${formatPointDelta(
                      activeHistoricalResult
                        ? activeHistoricalResult.successRate -
                            baseSimulation.historicalResult.successRate
                        : 0,
                    )}`
                  : "Share of historical start dates that made it through the full plan."
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
                  ? `Current ${formatPercent(
                      baseSimulation.monteCarloResult.successRate,
                      1,
                    )} · ${formatPointDelta(
                      activeMonteCarloResult
                        ? activeMonteCarloResult.successRate -
                            baseSimulation.monteCarloResult.successRate
                        : 0,
                    )}`
                  : "Forward-looking success under your selected return model."
              }
              tone={getSuccessTone(activeMonteCarloResult?.successRate ?? null)}
            />
            <StatCard
              label="Early failure risk"
              value={
                comparisonFirstDecadeFailureRisk === null
                  ? "Pending"
                  : formatPercent(comparisonFirstDecadeFailureRisk, 1)
              }
              description={
                hasComparison && comparisonReady && baseFirstDecadeFailureRisk !== null
                  ? `Current ${formatPercent(
                      baseFirstDecadeFailureRisk,
                      1,
                    )} · ${formatPointDelta(
                      (comparisonFirstDecadeFailureRisk ?? 0) -
                        (baseFirstDecadeFailureRisk ?? 0),
                    )}`
                  : "Chance of failure by year 10, when sequence risk is usually most painful."
              }
              tone={getRiskTone(comparisonFirstDecadeFailureRisk)}
            />
            <StatCard
              label="Hardest-path floor"
              value={
                activeHistoricalResult
                  ? formatCompactCurrency(
                      activeHistoricalResult.withdrawalSummary.minMedian,
                    )
                  : "Pending"
              }
              description={
                hasComparison && comparisonReady && baseSimulation.historicalResult
                  ? `Current ${formatCompactCurrency(
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
                  : "Lowest real spending reached in the hardest historical path."
              }
              tone="accent"
            />
          </div>
        </ChartShell>

        <ChartShell
          eyebrow="Guidance"
          title={
            hasComparison && comparisonReady
              ? "Why the answer changes"
              : "Why the current answer looks this way"
          }
          description={
            guidanceReady && hasComparison
              ? `Same readiness model as Your Plan: current plan ${Math.round(
                  baseReadiness.assessment.score,
                )}/100, selected path ${Math.round(
                  selectedAssessment.score,
                )}/100. The notes below describe the selected path.`
              : "This uses the same readiness model as Your Plan, so the strengths, watchouts, and next actions stay tied to the same retirement logic once the simulations finish."
          }
        >
          {guidanceReady ? (
            <>
              {hasComparison && comparisonReady ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Current plan
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {baseReadiness.assessment.title}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {baseReadiness.assessment.summary}
                        </p>
                      </div>
                      <span className="font-display text-3xl leading-none tracking-[-0.03em] text-foreground">
                        {Math.round(baseReadiness.assessment.score)}/100
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.08)] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Selected path
                    </p>
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {selectedAssessment.title}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {selectedAssessment.summary}
                        </p>
                      </div>
                      <span className="font-display text-3xl leading-none tracking-[-0.03em] text-[var(--ember)]">
                        {Math.round(selectedAssessment.score)}/100
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
                  <p className="font-medium text-foreground">
                    {selectedAssessment.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedAssessment.summary}
                  </p>
                </div>
              )}

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
                        No standout strengths surfaced beyond the baseline
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
                    {selectedAssessment.nextActions.length > 0 ? (
                      selectedAssessment.nextActions.map((item) => (
                        <div
                          key={item}
                          className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground"
                        >
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-sm text-muted-foreground">
                        No immediate next step stands out beyond staying on plan
                        and monitoring the key assumptions.
                      </div>
                    )}
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
          title="Advanced detail"
          summary="Open the full retirement lab for strategy comparison, stress tests, and your ongoing checkup."
          defaultOpen={false}
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
