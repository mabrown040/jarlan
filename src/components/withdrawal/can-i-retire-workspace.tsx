"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CompactPageHeader,
} from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/form/field-label";
import { cloneScenario } from "@/lib/domain";
import {
  SpendQuickControls,
  type SpendControlFocusArea,
} from "@/components/withdrawal/spend-quick-controls";
import {
  strategiesWithTuning,
  supportedStrategyTypes,
  type SupportedStrategyType,
  useWithdrawalStrategyComparison,
} from "@/components/withdrawal/use-withdrawal-strategy-comparison";
import { RetirementCheckupSummary } from "@/components/retirement/retirement-checkup-summary";
import { RetirementReadinessSummary } from "@/components/retirement/retirement-readiness-summary";
import { useRetirementReadiness } from "@/components/retirement/use-retirement-readiness";
import { AnalysisTabs } from "@/components/withdrawal/analysis-tabs";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { NumberInput } from "@/components/ui/number-input";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
  calculateFireNumber,
  formatCompactCurrency,
  formatPercent,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { listScenarioSnapshots, type ScenarioSnapshotRecord } from "@/lib/db";
import type { Scenario } from "@/lib/domain/types";
import { buildRetirementCheckup } from "@/lib/retirement";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
} from "@/lib/share";
import {
  runSimulation,
  simulationCapabilities,
  buildMortalityRiskTimeline,
  withdrawalStrategyMetadata,
} from "@/lib/sim";
import { cn } from "@/lib/utils";
import type {
  HistoricalBacktestResult,
  MonteCarloResult,
} from "@/lib/sim/contracts";
import { useScenarioStore } from "@/lib/store";
import { useDrawerStore } from "@/lib/store/use-drawer-store";

const heatmapWithdrawalRates = [0.03, 0.035, 0.04, 0.045, 0.05];
const heatmapCapeBuckets = [
  { id: "under15", label: "<15", description: "cheap", min: Number.NEGATIVE_INFINITY, max: 15 },
  { id: "15to20", label: "15-20", description: "below avg", min: 15, max: 20 },
  { id: "20to25", label: "20-25", description: "fair", min: 20, max: 25 },
  { id: "25to30", label: "25-30", description: "elevated", min: 25, max: 30 },
  { id: "over30", label: "30+", description: "expensive", min: 30, max: Number.POSITIVE_INFINITY },
] as const;

type HeatmapCapeBucketId = (typeof heatmapCapeBuckets)[number]["id"];

const supportedMonteCarloTypes = [
  "monte_carlo_parametric",
  "monte_carlo_bootstrap",
  "monte_carlo_block",
  "monte_carlo_regime",
] as const satisfies ReadonlyArray<
  Extract<
    Scenario["simulationSettings"]["simulationType"],
    | "monte_carlo_parametric"
    | "monte_carlo_bootstrap"
    | "monte_carlo_block"
    | "monte_carlo_regime"
  >
>;

function getMonteCarloMode(
  simulationType: Scenario["simulationSettings"]["simulationType"],
) {
  switch (simulationType) {
    case "monte_carlo_bootstrap":
      return "bootstrap" as const;
    case "monte_carlo_block":
      return "block-bootstrap" as const;
    case "monte_carlo_regime":
      return "regime-switching" as const;
    case "monte_carlo_parametric":
    case "historical":
    default:
      return "parametric" as const;
  }
}

function getHeatmapCapeBucket(startingCape: number | null): HeatmapCapeBucketId | null {
  if (startingCape === null) {
    return null;
  }

  const bucket = heatmapCapeBuckets.find(
    (candidate) => startingCape >= candidate.min && startingCape < candidate.max,
  );

  return bucket?.id ?? null;
}

export function CanIRetireWorkspace() {
  const {
    activeScenario,
    status,
    saveStatus,
    updateRetirementDuration,
    updateWithdrawalRate,
    updateWithdrawalStrategyType,
    updateCapeParameter,
    updateGuytonKlingerParameter,
    updateFloorCeilingParameter,
    updateSpendingDeclineRate,
    updateSimulationType,
    updateStockAllocation,
    updateRebalanceFrequency,
    updateFinalValueTarget,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const monteCarloRequestTokenRef = useRef(0);
  const heatmapRequestTokenRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<SpendControlFocusArea>("core");
  const [portfolioMode, setPortfolioMode] = useState<"fire-target" | "current">("fire-target");
  const [monteCarloStatus, setMonteCarloStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [monteCarloError, setMonteCarloError] = useState<string | null>(null);
  const [monteCarloResult, setMonteCarloResult] = useState<MonteCarloResult | null>(
    null,
  );
  const [snapshots, setSnapshots] = useState<ScenarioSnapshotRecord[]>([]);
  const [heatmapStatus, setHeatmapStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<
    Array<{
      withdrawalRate: number;
      capeBucket: HeatmapCapeBucketId;
      successRate: number;
      sampleCount: number;
    }>
  >([]);

  const currentBalance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );
  const fireTarget = useMemo(
    () => calculateFireNumber(activeScenario.retirementExpenses, activeScenario.assumptions.withdrawalRate),
    [activeScenario.retirementExpenses, activeScenario.assumptions.withdrawalRate],
  );
  const effectivePortfolio = portfolioMode === "fire-target" ? fireTarget : currentBalance;

  useInitializeStore(sharedScenarioParam);
  useAutoSaveScenario({ syncUrl: true });
  useGlobalScenarioFormatting(activeScenario);
  const {
    backtestStatus,
    backtestError,
    comparisonResults,
    strategyComparisonRows,
    strategyComparisonSeries,
    comparisonSummaries,
  } = useWithdrawalStrategyComparison({
    scenario: activeScenario,
    startingPortfolio: effectivePortfolio,
    enabled: status === "ready",
  });

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    void listScenarioSnapshots(activeScenario.id).then(setSnapshots);
  }, [activeScenario.id, status]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++heatmapRequestTokenRef.current;
      const strategyType = supportedStrategyTypes.includes(
        activeScenario.withdrawalStrategy.type as SupportedStrategyType,
      )
        ? (activeScenario.withdrawalStrategy.type as SupportedStrategyType)
        : "fixed";
      setHeatmapStatus("loading");
      setHeatmapError(null);
      setHeatmapData([]);

      void Promise.all(
        heatmapWithdrawalRates.map(async (withdrawalRate) => {
          const nextScenario = cloneScenario(activeScenario);
          if (nextScenario.accounts.length > 0) {
            nextScenario.accounts[0].currentBalance = effectivePortfolio;
          }
          const startingBalance = effectivePortfolio;

          nextScenario.withdrawalStrategy.type = strategyType;
          nextScenario.withdrawalStrategy.initialRate = withdrawalRate;
          nextScenario.assumptions.withdrawalRate = withdrawalRate;
          nextScenario.retirementExpenses = startingBalance * withdrawalRate;

          const simulationResult = (await runSimulation({
            kind: "historical",
            datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
            scenario: nextScenario,
          })) as HistoricalBacktestResult;

          return heatmapCapeBuckets.map((bucket) => {
            const matchingCohorts = simulationResult.cohortSummaries.filter(
              (cohort) => getHeatmapCapeBucket(cohort.startingCape) === bucket.id,
            );
            const successCount = matchingCohorts.filter((cohort) => cohort.success).length;

            return {
              withdrawalRate,
              capeBucket: bucket.id,
              successRate:
                matchingCohorts.length > 0 ? successCount / matchingCohorts.length : 0,
              sampleCount: matchingCohorts.length,
            };
          });
        }),
      )
        .then((results) => {
          if (requestToken !== heatmapRequestTokenRef.current) {
            return;
          }

          setHeatmapData(results.flat());
          setHeatmapStatus("ready");
        })
        .catch((error: Error) => {
          if (requestToken !== heatmapRequestTokenRef.current) {
            return;
          }

          setHeatmapData([]);
          setHeatmapStatus("error");
          setHeatmapError(error.message);
        });
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeScenario, effectivePortfolio, status]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++monteCarloRequestTokenRef.current;
      setMonteCarloStatus("loading");
      setMonteCarloError(null);

      const mcScenario = cloneScenario(activeScenario);
      if (mcScenario.accounts.length > 0) {
        mcScenario.accounts[0].currentBalance = effectivePortfolio;
      }

      void runSimulation({
        kind: "monte-carlo",
        scenario: mcScenario,
        mode: getMonteCarloMode(activeScenario.simulationSettings.simulationType),
        trials: activeScenario.simulationSettings.monteCarloTrials,
      })
        .then((simulationResult) => {
          if (requestToken !== monteCarloRequestTokenRef.current) {
            return;
          }

          setMonteCarloResult(simulationResult as MonteCarloResult);
          setMonteCarloStatus("ready");
        })
        .catch((error: Error) => {
          if (requestToken !== monteCarloRequestTokenRef.current) {
            return;
          }

          setMonteCarloResult(null);
          setMonteCarloStatus("error");
          setMonteCarloError(error.message);
        });
    }, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeScenario, effectivePortfolio, status]);

  const monteCarloSimulationType = supportedMonteCarloTypes.includes(
    activeScenario.simulationSettings.simulationType as (typeof supportedMonteCarloTypes)[number],
  )
    ? (activeScenario.simulationSettings
        .simulationType as (typeof supportedMonteCarloTypes)[number])
    : "monte_carlo_parametric";
  const stockAllocation = activeScenario.accounts[0]?.assetAllocation.stocks ?? 0.8;
  const selectedStrategy = supportedStrategyTypes.includes(
    activeScenario.withdrawalStrategy.type as SupportedStrategyType,
  )
    ? (activeScenario.withdrawalStrategy.type as SupportedStrategyType)
    : "fixed";
  const result = comparisonResults[selectedStrategy] ?? null;
  const displayedHistoricalResult =
    backtestStatus === "ready" ? result : null;
  const selectedStrategyMeta = withdrawalStrategyMetadata[selectedStrategy];
  const strategyOptions = supportedStrategyTypes.map((type) => ({
    value: type,
    label: withdrawalStrategyMetadata[type].label,
  }));
  const activeCapeParams = activeScenario.withdrawalStrategy.capeParams ?? {
    a: 0.0175,
    b: 0.5,
  };
  const activeGkParams = activeScenario.withdrawalStrategy.gkParams ?? {
    guardrailWidth: 0.2,
    adjustmentSize: 0.1,
    suspendCapPreservationYears: 15,
  };
  const activeFloorCeiling = activeScenario.withdrawalStrategy.floorCeiling ?? {
    floor: 36_000,
    ceiling: 72_000,
  };
  const activeSpendingDeclineRate =
    activeScenario.withdrawalStrategy.spendingDeclineRate ?? 0.0125;
  const displayedMonteCarloResult =
    monteCarloStatus === "ready" ? monteCarloResult : null;
  const mortalityRisk = useMemo(
    () =>
      monteCarloResult
        ? buildMortalityRiskTimeline({
            scenario: activeScenario,
            monteCarloResult,
          })
        : null,
    [activeScenario, monteCarloResult],
  );
  const displayedMortalityRisk =
    monteCarloStatus === "ready" ? mortalityRisk : null;
  const readiness = useRetirementReadiness({
    scenario: activeScenario,
    historicalResult: result,
    monteCarloResult,
    mortalityRisk,
  });
  const retirementCheckup = useMemo(
    () => buildRetirementCheckup({ scenario: activeScenario, snapshots }),
    [activeScenario, snapshots],
  );

  async function handleCopyShareLink() {
    if (typeof window === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(
      buildScenarioShareUrl(`${window.location.origin}${pathname}`, activeScenario),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  function handlePrintSnapshot() {
    if (typeof window === "undefined") {
      return;
    }

    window.print();
  }

  function handleAnalysisViewChange(nextView: SpendControlFocusArea) {
    setAnalysisTab(nextView);

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("spend-analysis")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const strategyTuningControls = strategiesWithTuning.has(selectedStrategy) ? (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {selectedStrategyMeta.label} tuning
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust the strategy-specific guardrails that most affect how spending moves over time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {selectedStrategy === "cape_dynamic" ? (
          <>
            <div className="space-y-1">
              <FieldLabel htmlFor="cape-a" label="Intercept (a)" />
              <NumberInput
                id="cape-a"
                min={0}
                max={0.1}
                step={0.0005}
                inputMode="decimal"
                value={activeCapeParams.a}
                onValueChange={(value) => updateCapeParameter("a", value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="cape-b" label="Coefficient (b)" />
              <NumberInput
                id="cape-b"
                min={0}
                max={2}
                step={0.01}
                inputMode="decimal"
                value={activeCapeParams.b}
                onValueChange={(value) => updateCapeParameter("b", value)}
              />
            </div>
          </>
        ) : null}

        {selectedStrategy === "guyton_klinger" ? (
          <>
            <div className="space-y-1">
              <FieldLabel htmlFor="gk-guardrail-width" label="Guardrail width" />
              <NumberInput
                id="gk-guardrail-width"
                min={0.05}
                max={0.5}
                step={0.01}
                inputMode="decimal"
                value={activeGkParams.guardrailWidth}
                onValueChange={(value) =>
                  updateGuytonKlingerParameter("guardrailWidth", value)
                }
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="gk-adjustment-size" label="Adjustment size" />
              <NumberInput
                id="gk-adjustment-size"
                min={0.01}
                max={0.25}
                step={0.01}
                inputMode="decimal"
                value={activeGkParams.adjustmentSize}
                onValueChange={(value) =>
                  updateGuytonKlingerParameter("adjustmentSize", value)
                }
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="gk-suspend-years" label="Cap pres. cutoff" />
              <NumberInput
                id="gk-suspend-years"
                min={0}
                max={40}
                step={1}
                inputMode="numeric"
                value={activeGkParams.suspendCapPreservationYears}
                onValueChange={(value) =>
                  updateGuytonKlingerParameter("suspendCapPreservationYears", value)
                }
              />
            </div>
          </>
        ) : null}

        {selectedStrategy === "floor_ceiling" ? (
          <>
            <div className="space-y-1">
              <FieldLabel htmlFor="floor-withdrawal" label="Floor spending" />
              <NumberInput
                id="floor-withdrawal"
                min={0}
                step={1000}
                inputMode="numeric"
                value={activeFloorCeiling.floor}
                onValueChange={(value) => updateFloorCeilingParameter("floor", value)}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="ceiling-withdrawal" label="Ceiling spending" />
              <NumberInput
                id="ceiling-withdrawal"
                min={0}
                step={1000}
                inputMode="numeric"
                value={activeFloorCeiling.ceiling}
                onValueChange={(value) => updateFloorCeilingParameter("ceiling", value)}
              />
            </div>
          </>
        ) : null}

        {selectedStrategy === "spending_smile" ? (
          <div className="space-y-1">
            <FieldLabel htmlFor="spending-smile-decline" label="Real decline rate" />
            <NumberInput
              id="spending-smile-decline"
              min={0}
              max={0.05}
              step={0.001}
              inputMode="decimal"
              value={activeSpendingDeclineRate}
              onValueChange={updateSpendingDeclineRate}
            />
          </div>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-8 pb-12">
      <CompactPageHeader
        // Matches the sub-nav label and the page's actual question — the
        // Save module owns "Your plan".
        title="Can I retire?"
        description="See whether your spending plan survives real history, forward-looking randomness, and expensive starting markets."
        metrics={[
          {
            label: "Testing with",
            value: formatCompactCurrency(effectivePortfolio),
            accent: portfolioMode === "fire-target",
          },
          { label: "Strategy", value: selectedStrategyMeta.label, accent: true },
          {
            // Disambiguate what portfolio the success rate is testing.
            // "Success" alone read as "you're 86% of the way there" for
            // accumulators seeing a FIRE-target simulation.
            label:
              portfolioMode === "fire-target"
                ? "Success at FIRE target"
                : "Success at today's portfolio",
            value: displayedHistoricalResult
              ? formatPercent(displayedHistoricalResult.successRate, 1)
              : "Running...",
          },
          {
            label: "Readiness",
            // "accumulation" verdict → score is 0 by design but displaying
            // "0/100" alongside the "Still building" banner is confusing.
            // Show "—" instead; consumers check the banner for phase context.
            value: readiness.assessment
              ? readiness.assessment.verdict === "accumulation"
                ? "—"
                : `${Math.round(readiness.assessment.score)}/100`
              : "...",
            accent: readiness.assessment
              ? readiness.assessment.verdict !== "accumulation" &&
                readiness.assessment.score >= 80
              : false,
          },
        ]}
        actions={
          <>
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/35 p-1">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  portfolioMode === "fire-target"
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setPortfolioMode("fire-target")}
              >
                FIRE target
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  portfolioMode === "current"
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setPortfolioMode("current")}
              >
                Current
              </button>
            </div>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href={"/accumulation" as Route}>Back to savings plan</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAnalysisViewChange("compare")}
            >
              Compare strategies
            </Button>
          </>
        }
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <AnalysisTabs
          activeTab={analysisTab}
          onTabChange={handleAnalysisViewChange}
          controls={
            <SpendQuickControls
              saveStatus={saveStatus}
              strategy={selectedStrategy}
              strategyLabel={selectedStrategyMeta.label}
              strategyDescription={selectedStrategyMeta.shortDescription}
              strategyOptions={strategyOptions}
              withdrawalRate={activeScenario.assumptions.withdrawalRate}
              stockAllocation={stockAllocation}
              retirementDuration={activeScenario.simulationSettings.retirementDuration}
              finalValueTarget={activeScenario.simulationSettings.finalValueTarget}
              rebalanceFrequency={activeScenario.simulationSettings.rebalanceFrequency}
              onStrategyChange={(value) =>
                updateWithdrawalStrategyType(
                  value as Scenario["withdrawalStrategy"]["type"],
                )
              }
              onWithdrawalRateChange={updateWithdrawalRate}
              onRetirementDurationChange={updateRetirementDuration}
              onStockAllocationChange={updateStockAllocation}
              onFinalValueTargetChange={updateFinalValueTarget}
              onRebalanceFrequencyChange={updateRebalanceFrequency}
              onOpenAdvancedSettings={() => drawerStore.open("retirement")}
            >
              {strategyTuningControls}
            </SpendQuickControls>
          }
          backtestResult={displayedHistoricalResult}
          backtestStatus={backtestStatus}
          backtestError={backtestError}
          selectedStrategyMeta={selectedStrategyMeta}
          selectedStrategy={selectedStrategy}
          startAge={activeScenario.profile.age}
          monteCarloResult={displayedMonteCarloResult}
          monteCarloStatus={monteCarloStatus}
          monteCarloError={monteCarloError}
          monteCarloSimulationType={monteCarloSimulationType}
          onMonteCarloSimulationTypeChange={(value) =>
            updateSimulationType(
              value as Scenario["simulationSettings"]["simulationType"],
            )
          }
          monteCarloTrials={activeScenario.simulationSettings.monteCarloTrials}
          mortalityRisk={displayedMortalityRisk}
          healthStatus={activeScenario.profile.healthStatus}
          strategyComparisonRows={strategyComparisonRows}
          strategyComparisonSeries={strategyComparisonSeries}
          comparisonSummaries={comparisonSummaries}
          selectedStrategyDescription={selectedStrategyMeta.shortDescription}
          strategyTuningControls={strategyTuningControls}
          heatmapData={heatmapData}
          heatmapStatus={heatmapStatus}
          heatmapError={heatmapError}
          heatmapWithdrawalRates={heatmapWithdrawalRates}
          heatmapCapeBuckets={heatmapCapeBuckets.map(({ id, label, description }) => ({
            id,
            label,
            description,
          }))}
        />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <CollapsibleSection
          title="Further detail"
          summary="Readiness memo, share tools, and ongoing retirement checkup."
          defaultOpen={false}
        >
          <div className="space-y-6">
            {readiness.assessment &&
            readiness.assessment.verdict !== "accumulation" ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span>
                  Your {Math.round(readiness.assessment.score)}/100 readiness
                  score is based on:
                </span>
                <button
                  type="button"
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={() => handleAnalysisViewChange("core")}
                >
                  Historical + Monte Carlo
                </button>
                <button
                  type="button"
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={() => handleAnalysisViewChange("compare")}
                >
                  Strategy fit
                </button>
                <button
                  type="button"
                  className="font-medium text-primary hover:text-primary/80"
                  onClick={() => handleAnalysisViewChange("stress")}
                >
                  Stress test
                </button>
              </div>
            ) : null}

            <RetirementReadinessSummary
              assessment={readiness.assessment}
              status={readiness.status}
              error={readiness.error}
              copied={copied}
              onCopyShareLink={handleCopyShareLink}
              onPrint={handlePrintSnapshot}
              secondaryCta={{
                href: "/tax-strategy",
                label: "Open the tax strategy view",
              }}
            />

            <RetirementCheckupSummary
              checkup={retirementCheckup}
              description="Use this after retirement to compare your live withdrawal rate, current CAPE guidance, and change since the last saved review."
            />
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}

export default CanIRetireWorkspace;
