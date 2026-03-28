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
  type WithdrawalStrategyComparisonPoint,
  type WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import {
  SpendQuickControls,
  type SpendControlFocusArea,
} from "@/components/withdrawal/spend-quick-controls";
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
import type {
  HistoricalBacktestResult,
  MonteCarloResult,
} from "@/lib/sim/contracts";
import { useScenarioStore } from "@/lib/store";
import { useDrawerStore } from "@/lib/store/use-drawer-store";
import { Card, CardContent } from "@/components/ui/card";

const supportedStrategyTypes = [
  "fixed",
  "cape_dynamic",
  "guyton_klinger",
  "vpw",
  "constant_pct",
  "rmd",
  "floor_ceiling",
  "spending_smile",
] as const;

type SupportedStrategyType = (typeof supportedStrategyTypes)[number];

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

function buildScenarioForStrategy(
  scenario: Scenario,
  type: SupportedStrategyType,
  overrideBalance?: number,
): Scenario {
  const nextScenario = cloneScenario(scenario);
  nextScenario.withdrawalStrategy.type = type;
  if (overrideBalance !== undefined && nextScenario.accounts.length > 0) {
    nextScenario.accounts[0].currentBalance = overrideBalance;
  }
  return nextScenario;
}

const strategiesWithTuning = new Set<SupportedStrategyType>([
  "cape_dynamic",
  "guyton_klinger",
  "floor_ceiling",
  "spending_smile",
]);

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
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const requestTokenRef = useRef(0);
  const monteCarloRequestTokenRef = useRef(0);
  const heatmapRequestTokenRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<SpendControlFocusArea>("core");
  const [portfolioMode, setPortfolioMode] = useState<"fire-target" | "current">("fire-target");
  const [backtestStatus, setBacktestStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<
    Partial<Record<SupportedStrategyType, HistoricalBacktestResult>>
  >({});
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

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++requestTokenRef.current;
      setBacktestStatus("loading");
      setBacktestError(null);

      void Promise.all(
        supportedStrategyTypes.map(async (type) => {
          const simulationResult = (await runSimulation({
            kind: "historical",
            datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
            scenario: buildScenarioForStrategy(activeScenario, type, effectivePortfolio),
          })) as HistoricalBacktestResult;

          return [type, simulationResult] as const;
        }),
      )
        .then((results) => {
          if (requestToken !== requestTokenRef.current) {
            return;
          }

          setComparisonResults(Object.fromEntries(results));
          setBacktestStatus("ready");
        })
        .catch((error: Error) => {
          if (requestToken !== requestTokenRef.current) {
            return;
          }

          setComparisonResults({});
          setBacktestStatus("error");
          setBacktestError(error.message);
        });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeScenario, effectivePortfolio, status]);

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
  const comparisonTemplateBand =
    supportedStrategyTypes
      .map((type) => comparisonResults[type]?.percentileBand)
      .find((band): band is NonNullable<typeof band> => Boolean(band?.length)) ?? [];
  const strategyComparisonRows = useMemo<WithdrawalStrategyComparisonPoint[]>(
    () =>
      comparisonTemplateBand.map((point, index) =>
        supportedStrategyTypes.reduce(
          (row, type) => ({
            ...row,
            [type]:
              comparisonResults[type]?.percentileBand[index]?.withdrawal ?? null,
          }),
          { year: point.year } as WithdrawalStrategyComparisonPoint,
        ),
      ),
    [comparisonResults, comparisonTemplateBand],
  );
  const strategyComparisonSeries = useMemo<WithdrawalStrategySeries[]>(
    () => [
      { key: "fixed", label: "Fixed real", color: "var(--color-primary)" },
      { key: "cape_dynamic", label: "CAPE dynamic", color: "var(--color-chart-1)" },
      {
        key: "guyton_klinger",
        label: "Guyton-Klinger",
        color: "var(--ember)",
      },
      { key: "vpw", label: "VPW", color: "var(--color-chart-2)" },
      {
        key: "constant_pct",
        label: "Constant %",
        color: "var(--color-chart-3)",
      },
      { key: "rmd", label: "RMD", color: "var(--color-chart-4)" },
      {
        key: "floor_ceiling",
        label: "Floor/Ceiling",
        color: "var(--color-chart-5)",
      },
      {
        key: "spending_smile",
        label: "Spending smile",
        color: "var(--ember-light)",
      },
    ],
    [],
  );
  const comparisonSummaries = useMemo(
    () =>
      supportedStrategyTypes.map((type) => ({
        type,
        label: withdrawalStrategyMetadata[type].label,
        description: withdrawalStrategyMetadata[type].shortDescription,
        result: comparisonResults[type] ?? undefined,
      })),
    [comparisonResults],
  );
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

  const progressToFi = fireTarget > 0 ? currentBalance / fireTarget : 0;
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
        title="Your Plan"
        description="See whether your spending plan survives real history, forward-looking randomness, and expensive starting markets."
        metrics={[
          {
            label: "Testing with",
            value: formatCompactCurrency(effectivePortfolio),
            accent: portfolioMode === "fire-target",
          },
          { label: "Strategy", value: selectedStrategyMeta.label, accent: true },
          {
            label: "Success",
            value: displayedHistoricalResult
              ? formatPercent(displayedHistoricalResult.successRate, 1)
              : "Running...",
          },
          {
            label: "Readiness",
            value: readiness.assessment
              ? `${Math.round(readiness.assessment.score)}/100`
              : "...",
            accent: readiness.assessment
              ? readiness.assessment.score >= 80
              : false,
          },
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[23rem_minmax(0,1fr)]">
          <div className="order-2 space-y-4 lg:order-1 lg:sticky lg:top-24">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-4">
                  <div className="inline-flex rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Preview mode
                  </div>
                  <div className="space-y-3">
                    <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.04em] text-foreground">
                      {progressToFi >= 1
                        ? "Your retirement playbook is ready for a real stress test."
                        : "You are building the retirement playbook before the finish line."}
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {progressToFi >= 1
                        ? "This is where you pressure-test spending, flexibility, and downside risk before you lock in a retirement date."
                        : "That is useful: understanding how spending flexes and where failure risk shows up early makes the eventual switch from saving to spending much less abrupt."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild type="button" variant="outline">
                      <Link href={"/accumulation" as Route}>
                        Back to savings plan
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleAnalysisViewChange("compare")}
                    >
                      Compare strategies
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">
                      Progress to your FIRE target
                    </span>
                    <span className="font-medium text-[var(--ember)]">
                      {formatPercent(progressToFi, 0)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--glow)]"
                      style={{
                        width: `${Math.min(Math.max(progressToFi * 100, 0), 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {portfolioMode === "fire-target"
                      ? `FIRE target mode is on, so the analysis is using ${formatCompactCurrency(
                          fireTarget,
                        )} as the retirement portfolio you want to reach.`
                      : `Current portfolio mode is on, so the analysis is stress-testing the ${formatCompactCurrency(
                          currentBalance,
                        )} you have saved today.`}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Active strategy
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {selectedStrategyMeta.label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedStrategyMeta.shortDescription}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      label: "Current portfolio",
                      value: formatCompactCurrency(currentBalance),
                      description: "What you have saved today.",
                    },
                    {
                      label: "FIRE target",
                      value: formatCompactCurrency(fireTarget),
                      description:
                        "Implied by retirement spending and the active withdrawal rate.",
                    },
                    {
                      label: "First-year spending",
                      value: displayedHistoricalResult
                        ? formatCompactCurrency(
                            displayedHistoricalResult.initialWithdrawal,
                          )
                        : formatCompactCurrency(activeScenario.retirementExpenses),
                      description: "The modeled starting withdrawal amount.",
                    },
                    {
                      label: "Median ending value",
                      value: displayedHistoricalResult
                        ? formatCompactCurrency(
                            displayedHistoricalResult.terminalValueStats.median,
                          )
                        : "Running...",
                      description: "Where the median historical path finishes.",
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-border/60 bg-card/35 p-4"
                    >
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="mt-2 font-display text-3xl leading-none tracking-[-0.03em] text-foreground">
                        {metric.value}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {metric.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="order-1 min-w-0 lg:order-2">
            <AnalysisTabs
              activeTab={analysisTab}
              onTabChange={handleAnalysisViewChange}
              controls={
                <SpendQuickControls
                  focusArea={analysisTab}
                  saveStatus={saveStatus}
                  portfolioMode={portfolioMode}
                  currentBalance={currentBalance}
                  fireTarget={fireTarget}
                  strategy={selectedStrategy}
                  strategyLabel={selectedStrategyMeta.label}
                  strategyDescription={selectedStrategyMeta.shortDescription}
                  strategyOptions={strategyOptions}
                  withdrawalRate={activeScenario.assumptions.withdrawalRate}
                  stockAllocation={stockAllocation}
                  retirementDuration={activeScenario.simulationSettings.retirementDuration}
                  finalValueTarget={activeScenario.simulationSettings.finalValueTarget}
                  monteCarloTrials={activeScenario.simulationSettings.monteCarloTrials}
                  monteCarloSimulationType={monteCarloSimulationType}
                  rebalanceFrequency={activeScenario.simulationSettings.rebalanceFrequency}
                  onPortfolioModeChange={setPortfolioMode}
                  onStrategyChange={(value) =>
                    updateWithdrawalStrategyType(
                      value as Scenario["withdrawalStrategy"]["type"],
                    )
                  }
                  onWithdrawalRateChange={updateWithdrawalRate}
                  onRetirementDurationChange={updateRetirementDuration}
                  onSimulationTypeChange={updateSimulationType}
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
              monteCarloTrials={activeScenario.simulationSettings.monteCarloTrials}
              mortalityRisk={displayedMortalityRisk}
              healthStatus={activeScenario.profile.healthStatus}
              strategyComparisonRows={strategyComparisonRows}
              strategyComparisonSeries={strategyComparisonSeries}
              comparisonSummaries={comparisonSummaries}
              heatmapData={heatmapData}
              heatmapStatus={heatmapStatus}
              heatmapError={heatmapError}
              heatmapWithdrawalRates={heatmapWithdrawalRates}
              heatmapCapeBuckets={heatmapCapeBuckets.map(
                ({ id, label, description }) => ({
                  id,
                  label,
                  description,
                }),
              )}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <CollapsibleSection
          title="Further detail"
          summary="Readiness memo, share tools, and ongoing retirement checkup."
          defaultOpen={false}
        >
          <div className="space-y-6">
            {readiness.assessment ? (
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
