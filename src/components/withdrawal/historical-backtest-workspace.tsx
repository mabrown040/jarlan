"use client";

import type { Route } from "next";
import { Copy, DatabaseZap, LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChartShell,
  CompactPageHeader,
  EnhancedStatCard,
  InsightMiniTable,
  InsightProgressBar,
  SectionHeading,
  StatCard,
} from "@/components/brand";
import { FieldLabel } from "@/components/form/field-label";
import { cloneScenario } from "@/lib/domain";
import { HistoricalBacktestChart } from "@/components/withdrawal/historical-backtest-chart";
import { FailureRateChart } from "@/components/withdrawal/failure-rate-chart";
import { RichBrokeDeadChart } from "@/components/withdrawal/rich-broke-dead-chart";
import { SuccessRateHeatmap } from "@/components/withdrawal/success-rate-heatmap";
import {
  WithdrawalStrategyComparisonChart,
  type WithdrawalStrategyComparisonPoint,
  type WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { HistogramChart } from "@/components/charts/histogram-chart";
import { RetirementCheckupSummary } from "@/components/retirement/retirement-checkup-summary";
import { RetirementReadinessSummary } from "@/components/retirement/retirement-readiness-summary";
import { useRetirementReadiness } from "@/components/retirement/use-retirement-readiness";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ErrorAlert } from "@/components/ui/error-alert";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  calculateFireNumber,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatYears,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { listScenarioSnapshots, type ScenarioSnapshotRecord } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { Scenario } from "@/lib/domain/types";
import { buildRetirementCheckup } from "@/lib/retirement";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
  deserializeScenarioFromSearchParam,
  serializeScenarioToSearchParam,
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
import { useDrawerStore, useScenarioStore } from "@/lib/store";

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
const heatmapDurations = [20, 30, 40, 50, 60];

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

export function HistoricalBacktestWorkspace() {
  const {
    activeScenario,
    status,
    saveStatus,
    initialize,
    saveDraft,
    updateRetirementDuration,
    updateWithdrawalStrategyType,
    updateCapeParameter,
    updateGuytonKlingerParameter,
    updateFloorCeilingParameter,
    updateSpendingDeclineRate,
    updateStockAllocation,
    updateRebalanceFrequency,
    updateFinalValueTarget,
    updateSimulationType,
    updateMonteCarloTrials,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const hasInitialized = useRef(false);
  const requestTokenRef = useRef(0);
  const monteCarloRequestTokenRef = useRef(0);
  const heatmapRequestTokenRef = useRef(0);
  const [copied, setCopied] = useState(false);
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
      retirementDuration: number;
      successRate: number;
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

  useGlobalScenarioFormatting(activeScenario);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    void initialize(
      sharedScenarioParam
        ? deserializeScenarioFromSearchParam(sharedScenarioParam)
        : undefined,
    );
  }, [initialize, sharedScenarioParam]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDraft();

      const encodedScenario = serializeScenarioToSearchParam(activeScenario);

      if (encodedScenario === sharedScenarioParam) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(SCENARIO_QUERY_KEY, encodedScenario);
      router.replace(`${pathname}?${nextParams.toString()}` as Route, {
        scroll: false,
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeScenario,
    pathname,
    router,
    saveDraft,
    searchParams,
    sharedScenarioParam,
    status,
  ]);

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

      void Promise.all(
        heatmapWithdrawalRates.flatMap((withdrawalRate) =>
          heatmapDurations.map(async (retirementDuration) => {
            const nextScenario = cloneScenario(activeScenario);
            if (nextScenario.accounts.length > 0) {
              nextScenario.accounts[0].currentBalance = effectivePortfolio;
            }
            const startingBalance = effectivePortfolio;

            nextScenario.withdrawalStrategy.type = strategyType;
            nextScenario.withdrawalStrategy.initialRate = withdrawalRate;
            nextScenario.assumptions.withdrawalRate = withdrawalRate;
            nextScenario.retirementExpenses = startingBalance * withdrawalRate;
            nextScenario.simulationSettings.retirementDuration = retirementDuration;

            const simulationResult = (await runSimulation({
              kind: "historical",
              datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
              scenario: nextScenario,
            })) as HistoricalBacktestResult;

            return {
              withdrawalRate,
              retirementDuration,
              successRate: simulationResult.successRate,
            };
          }),
        ),
      )
        .then((results) => {
          if (requestToken !== heatmapRequestTokenRef.current) {
            return;
          }

          setHeatmapData(results);
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
  const selectedStrategyMeta = withdrawalStrategyMetadata[selectedStrategy];
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
  const strategyComparisonRows = useMemo<WithdrawalStrategyComparisonPoint[]>(
    () =>
      (comparisonResults.fixed?.percentileBand ?? []).map((point, index) =>
        supportedStrategyTypes.reduce(
          (row, type) => ({
            ...row,
            [type]:
              comparisonResults[type]?.percentileBand[index]?.withdrawal ?? null,
          }),
          { year: point.year } as WithdrawalStrategyComparisonPoint,
        ),
      ),
    [comparisonResults],
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
  const backtestRows = useMemo(
    () =>
      result?.percentileBand.filter(
        (point, index) =>
          index === 0 ||
          index === result.percentileBand.length - 1 ||
          point.year % 5 === 0,
      ) ?? [],
    [result],
  );
  const comparisonSummaries = useMemo(
    () =>
      supportedStrategyTypes.map((type) => ({
        type,
        label: withdrawalStrategyMetadata[type].label,
        description: withdrawalStrategyMetadata[type].shortDescription,
        result: comparisonResults[type] ?? null,
      })),
    [comparisonResults],
  );
  const historicalVsMonteCarlo = useMemo(() => {
    if (!result || !monteCarloResult) {
      return null;
    }

    return {
      successRateDelta: monteCarloResult.successRate - result.successRate,
      terminalMedianDelta:
        monteCarloResult.terminalValueStats.median - result.terminalValueStats.median,
    };
  }, [monteCarloResult, result]);
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

  return (
    <div className="space-y-10 pb-12">
      <CompactPageHeader
        title="Withdrawal Lab"
        description="Compare withdrawal strategies against every historical start date since 1871."
        metrics={[
          { label: "Testing with", value: formatCompactCurrency(effectivePortfolio), accent: portfolioMode === "fire-target" },
          { label: "Strategy", value: selectedStrategyMeta.label, accent: true },
          { label: "Success", value: result ? formatPercent(result.successRate, 1) : "Running..." },
          { label: "Readiness", value: readiness.assessment ? `${Math.round(readiness.assessment.score)}/100` : "...", accent: readiness.assessment ? readiness.assessment.score >= 80 : false },
        ]}
      />

      {/* Portfolio mode toggle */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 p-1 text-sm">
          {(["fire-target", "current"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={cn(
                "rounded-full px-3 py-1 transition-colors",
                portfolioMode === mode
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setPortfolioMode(mode)}
            >
              {mode === "fire-target"
                ? `FIRE target (${formatCompactCurrency(fireTarget)})`
                : `Current portfolio (${formatCompactCurrency(currentBalance)})`}
            </button>
          ))}
        </div>
      </section>

      {/* Compact strategy tuning (only when the active strategy has tunable params) */}
      {strategiesWithTuning.has(selectedStrategy) ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border/60 bg-card/40 px-5 py-4">
            <p className="w-full text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {selectedStrategyMeta.label} tuning
            </p>

            {selectedStrategy === "cape_dynamic" ? (
              <>
                <div className="w-36 space-y-1">
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
                <div className="w-36 space-y-1">
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
                <div className="w-36 space-y-1">
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
                <div className="w-36 space-y-1">
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
                <div className="w-36 space-y-1">
                  <FieldLabel htmlFor="gk-suspend-years" label="Cap pres. cutoff" />
                  <NumberInput
                    id="gk-suspend-years"
                    min={0}
                    max={40}
                    step={1}
                    inputMode="numeric"
                    value={activeGkParams.suspendCapPreservationYears}
                    onValueChange={(value) =>
                      updateGuytonKlingerParameter(
                        "suspendCapPreservationYears",
                        value,
                      )
                    }
                  />
                </div>
              </>
            ) : null}

            {selectedStrategy === "floor_ceiling" ? (
              <>
                <div className="w-36 space-y-1">
                  <FieldLabel htmlFor="floor-withdrawal" label="Floor spending" />
                  <NumberInput
                    id="floor-withdrawal"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={activeFloorCeiling.floor}
                    onValueChange={(value) =>
                      updateFloorCeilingParameter("floor", value)
                    }
                  />
                </div>
                <div className="w-36 space-y-1">
                  <FieldLabel htmlFor="ceiling-withdrawal" label="Ceiling spending" />
                  <NumberInput
                    id="ceiling-withdrawal"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={activeFloorCeiling.ceiling}
                    onValueChange={(value) =>
                      updateFloorCeilingParameter("ceiling", value)
                    }
                  />
                </div>
              </>
            ) : null}

            {selectedStrategy === "spending_smile" ? (
              <div className="w-36 space-y-1">
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
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6">
        <div className="space-y-8">
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

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Summary"
                title={`${selectedStrategyMeta.label} summary`}
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description={`Results are based on ${
                  result?.periodsTested ?? "all eligible"
                } rolling historical start months from ${
                  result?.startDateRange.start ?? "the dataset"
                } onward.`}
              />
            </CardHeader>
            <CardContent className="space-y-5">
              {backtestStatus === "loading" && !result ? (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Running historical backtest...
                </div>
              ) : null}
              {backtestStatus === "error" ? (
                <ErrorAlert title="Historical backtest failed">
                  {backtestError}
                </ErrorAlert>
              ) : null}

              {result ? (
                <>
                  {result.initialWithdrawalRate > 0.06 ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-amber-100">
                      This strategy starts around{" "}
                      <span className="font-medium">
                        {formatPercent(result.initialWithdrawalRate, 1)}
                      </span>{" "}
                      of the initial portfolio. That is far above classic early-retirement baselines, so a poor success rate is expected rather than a sign that the engine is broken.
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <EnhancedStatCard
                      label="Success rate"
                      value={formatPercent(result.successRate, 1)}
                      tone={result.successRate >= 0.9 ? "success" : result.successRate >= 0.75 ? "warning" : "accent"}
                      insight={
                        <InsightProgressBar
                          progress={result.successRate}
                          label={`${result.successCount} of ${result.periodsTested} periods survived`}
                          tone={result.successRate >= 0.9 ? "success" : result.successRate >= 0.75 ? "warning" : "accent"}
                        />
                      }
                      caption={`95% confidence: ${formatPercent(result.confidenceInterval.low, 1)}–${formatPercent(result.confidenceInterval.high, 1)}`}
                      learnMore={{
                        title: "What is success rate?",
                        content: "The percentage of historical retirement periods where the portfolio survived the full duration. Each period starts in a different month from 1871 to present, using actual stock and bond returns. A 95%+ rate is generally considered robust.",
                      }}
                    />
                    <EnhancedStatCard
                      label="First-year withdrawal"
                      value={formatCompactCurrency(result.initialWithdrawal)}
                      tone="accent"
                      insight={
                        <InsightMiniTable
                          rows={[
                            { label: "Withdrawal rate", value: formatPercent(result.initialWithdrawalRate, 2) },
                            { label: "Strategy", value: selectedStrategyMeta.label },
                          ]}
                        />
                      }
                      caption="Initial annual income from your portfolio."
                      learnMore={{
                        title: "How is this calculated?",
                        content: "The first-year withdrawal is determined by your chosen strategy. Fixed real uses portfolio x withdrawal rate. CAPE-based adjusts for market valuation. Guyton-Klinger starts at a higher rate with guardrails that adjust spending based on portfolio performance.",
                      }}
                    />
                    <EnhancedStatCard
                      label="Median ending value"
                      value={formatCompactCurrency(result.terminalValueStats.median)}
                      insight={
                        <InsightMiniTable
                          rows={[
                            { label: "10th percentile", value: formatCompactCurrency(result.terminalValueStats.p10) },
                            { label: "50th percentile", value: formatCompactCurrency(result.terminalValueStats.median) },
                            { label: "90th percentile", value: formatCompactCurrency(result.terminalValueStats.p90) },
                          ]}
                        />
                      }
                      caption="Portfolio value at end of retirement period."
                      learnMore={{
                        title: "Terminal value distribution",
                        content: "Most historical periods leave a significant estate. The wide range between p10 and p90 reflects sequence-of-returns risk -- the same average return can produce very different outcomes depending on the order of good and bad years.",
                      }}
                    />
                    <EnhancedStatCard
                      label="Spending band"
                      value={formatCompactCurrency(result.withdrawalSummary.averageMedian)}
                      subtitle="/yr avg"
                      insight={
                        <InsightMiniTable
                          rows={[
                            { label: "Lowest year", value: formatCompactCurrency(result.withdrawalSummary.minMedian) },
                            { label: "Highest year", value: formatCompactCurrency(result.withdrawalSummary.maxMedian) },
                          ]}
                        />
                      }
                      caption="Range of annual spending across the median path."
                      learnMore={{
                        title: "Why does spending vary?",
                        content: "Dynamic strategies (CAPE-based, Guyton-Klinger) adjust spending based on portfolio performance. Fixed real spending stays constant in today's dollars. A wider band means more income volatility but often higher overall success rates.",
                      }}
                    />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <ChartShell
            eyebrow="Path distribution"
            title="Historical path distribution"
            description="The chart tracks the 10th, 50th, and 90th percentile portfolio path across the tested historical cohorts for the active strategy."
          >
            {result ? (
              <>
                <HistoricalBacktestChart
                  data={result.percentileBand}
                  ariaLabel="Historical percentile chart showing 10th percentile, median, and 90th percentile portfolio outcomes across retirement years."
                />
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Year</th>
                        <th className="px-4 py-3 font-medium">Age</th>
                        <th className="px-4 py-3 font-medium">10th %</th>
                        <th className="px-4 py-3 font-medium">Median</th>
                        <th className="px-4 py-3 font-medium">90th %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtestRows.map((row) => (
                        <tr key={row.year} className="border-t border-border/60">
                          <td className="px-4 py-3">{row.year}</td>
                          <td className="px-4 py-3">{row.age}</td>
                          <td className="px-4 py-3">{formatCurrency(row.p10)}</td>
                          <td className="px-4 py-3">{formatCurrency(row.p50)}</td>
                          <td className="px-4 py-3">{formatCurrency(row.p90)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                Historical results will appear here once the worker finishes its
                first run.
              </div>
            )}
          </ChartShell>

          <CollapsibleSection
            title="Success Rate Heatmap"
            summary={
              heatmapStatus === "ready"
                ? `${heatmapData.length} cells computed for ${selectedStrategyMeta.label}`
                : heatmapStatus === "loading"
                  ? "Building heatmap..."
                  : "Waiting for data"
            }
            defaultOpen={false}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This matrix reruns the active strategy across a small retirement-duration and withdrawal-rate grid so you can see where the plan starts to break.
              </p>
              {heatmapStatus === "error" ? (
                <ErrorAlert title="Heat map failed to load">
                  {heatmapError}
                </ErrorAlert>
              ) : null}
              {heatmapData.length > 0 ? (
                <SuccessRateHeatmap
                  data={heatmapData}
                  withdrawalRates={heatmapWithdrawalRates}
                  durations={heatmapDurations}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                  {heatmapStatus === "loading"
                    ? "Building the withdrawal-rate heat map..."
                    : "Heat map results will appear once the strategy finishes its first run."}
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Strategy Comparison"
            summary={`Active: ${selectedStrategyMeta.label} -- comparing ${supportedStrategyTypes.length} strategies`}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each line shows the median real withdrawal at each retirement year so you can compare spending behavior, not just survival odds.
              </p>
              {strategyComparisonRows.length > 0 ? (
                <>
                  <WithdrawalStrategyComparisonChart
                    data={strategyComparisonRows}
                    series={strategyComparisonSeries}
                    ariaLabel="Line chart comparing the median annual withdrawal path for each supported spending strategy."
                  />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {comparisonSummaries.map((summary) => (
                      <div
                        key={summary.type}
                        className={`rounded-xl border p-4 ${
                          summary.type === selectedStrategy
                            ? "border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.1)]"
                            : "border-border/60 bg-card/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{summary.label}</p>
                          <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                            {summary.type === selectedStrategy ? "Active" : "Compare"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {summary.description}
                        </p>
                        {summary.result ? (
                          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-3">
                              <span>Success rate</span>
                              <span className="font-medium text-foreground">
                                {formatPercent(summary.result.successRate, 1)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Median year-one</span>
                              <span className="font-medium text-foreground">
                                {formatCompactCurrency(
                                  summary.result.withdrawalSummary.firstYearMedian,
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Median ending value</span>
                              <span className="font-medium text-foreground">
                                {formatCompactCurrency(
                                  summary.result.terminalValueStats.median,
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-muted-foreground">
                            Waiting for results...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                  Strategy comparison results will appear here once the worker
                  finishes its first run.
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Outcome Distribution"
            summary={
              result
                ? `Median terminal value: ${formatCompactCurrency(result.terminalValueStats.median)}`
                : "Waiting for backtest results"
            }
            defaultOpen={false}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These histograms show how often the active strategy finishes with different ending balances, and when failing paths tend to break.
              </p>
              {result ? (
                <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Historical terminal value histogram
                    </p>
                    <HistogramChart
                      data={result.terminalValueHistogram.map((bin) => ({
                        label: bin.label,
                        count: bin.count,
                      }))}
                      ariaLabel="Histogram showing how often each historical terminal portfolio value bucket occurs."
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Historical failure-year histogram
                    </p>
                    {result.failureYearHistogram.length > 0 ? (
                      <HistogramChart
                        data={result.failureYearHistogram.map((bin) => ({
                          label: bin.label,
                          count: bin.count,
                        }))}
                        barColor="var(--glow-soft)"
                        ariaLabel="Histogram showing which retirement years historical failures most often occurred in."
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                        No failure histogram yet because the current strategy has no
                        failing historical paths in the tested window.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                  Outcome histograms appear once the active historical run completes.
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Monte Carlo"
            summary={
              monteCarloResult
                ? `${formatPercent(monteCarloResult.successRate, 1)} success across ${activeScenario.simulationSettings.monteCarloTrials.toLocaleString()} ${monteCarloSimulationType.replaceAll("_", " ")} trials`
                : monteCarloStatus === "loading"
                  ? "Running Monte Carlo..."
                  : "Waiting for simulation"
            }
            defaultOpen={false}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The active strategy is also simulated with {activeScenario.simulationSettings.monteCarloTrials.toLocaleString()} trials in {monteCarloSimulationType.replaceAll("_", " ")} mode.
              </p>
              {monteCarloStatus === "loading" && !monteCarloResult ? (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Running Monte Carlo simulation...
                </div>
              ) : null}
              {monteCarloStatus === "error" ? (
                <ErrorAlert title="Monte Carlo simulation failed">
                  {monteCarloError}
                </ErrorAlert>
              ) : null}
              {monteCarloResult ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      label="Success rate"
                      value={formatPercent(monteCarloResult.successRate, 1)}
                      description={`95% Wilson interval: ${formatPercent(
                        monteCarloResult.confidenceInterval.low,
                        1,
                      )} to ${formatPercent(
                        monteCarloResult.confidenceInterval.high,
                        1,
                      )}.`}
                      tone={
                        monteCarloResult.successRate >= 0.9
                          ? "success"
                          : monteCarloResult.successRate >= 0.75
                            ? "warning"
                            : "danger"
                      }
                    />
                    <StatCard
                      label="Median first-year withdrawal"
                      value={formatCompactCurrency(monteCarloResult.initialWithdrawal)}
                      description={`Implied rate: ${formatPercent(
                        monteCarloResult.initialWithdrawalRate,
                        2,
                      )}.`}
                      tone="accent"
                    />
                    <StatCard
                      label="Median ending value"
                      value={formatCompactCurrency(
                        monteCarloResult.terminalValueStats.median,
                      )}
                      description={`10th to 90th percentile: ${formatCompactCurrency(
                        monteCarloResult.terminalValueStats.p10,
                      )} to ${formatCompactCurrency(
                        monteCarloResult.terminalValueStats.p90,
                      )}.`}
                    />
                    <StatCard
                      label="Failure by year 10"
                      value={formatPercent(
                        monteCarloResult.failureRateByYear[9]?.cumulativeFailureRate ?? 0,
                        1,
                      )}
                      description={`Cumulative failure by year ${activeScenario.simulationSettings.retirementDuration}: ${formatPercent(
                        monteCarloResult.failureRateByYear.at(-1)
                          ?.cumulativeFailureRate ?? 0,
                        1,
                      )}.`}
                    />
                  </div>

                  <HistoricalBacktestChart
                    data={monteCarloResult.percentileBand}
                    ariaLabel="Monte Carlo percentile chart showing 10th percentile, median, and 90th percentile portfolio outcomes across retirement years."
                  />

                  <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        Sequence risk curve
                      </p>
                      <FailureRateChart
                        data={monteCarloResult.failureRateByYear}
                        ariaLabel="Line chart showing the cumulative probability of failure by year across Monte Carlo trials."
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">
                        Monte Carlo terminal value histogram
                      </p>
                      <HistogramChart
                        data={monteCarloResult.terminalValueHistogram.map((bin) => ({
                          label: bin.label,
                          count: bin.count,
                        }))}
                        barColor="var(--color-chart-3)"
                        ariaLabel="Histogram showing the distribution of Monte Carlo terminal portfolio values."
                      />
                    </div>
                  </div>

                  {historicalVsMonteCarlo ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          Historical vs Monte Carlo success rate
                        </p>
                        <p className="mt-2">
                          Historical: {formatPercent(result?.successRate ?? 0, 1)}.
                          Monte Carlo: {formatPercent(monteCarloResult.successRate, 1)}.
                          Delta:{" "}
                          {formatPercent(historicalVsMonteCarlo.successRateDelta, 1)}.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          Median ending value comparison
                        </p>
                        <p className="mt-2">
                          Historical median:{" "}
                          {formatCompactCurrency(result?.terminalValueStats.median ?? 0)}.
                          Monte Carlo median:{" "}
                          {formatCompactCurrency(
                            monteCarloResult.terminalValueStats.median,
                          )}
                          . Delta:{" "}
                          {formatCompactCurrency(
                            historicalVsMonteCarlo.terminalMedianDelta,
                          )}
                          .
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    {monteCarloResult.notes.map((note) => (
                      <div
                        key={note}
                        className="rounded-lg border border-border/60 bg-card/40 p-3 text-sm text-muted-foreground"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Rich, Broke, or Dead"
            summary={
              mortalityRisk
                ? `${formatPercent(mortalityRisk.points.at(-1)?.aliveAndSolventProbability ?? 0, 1)} alive and solvent at horizon`
                : "Waiting for Monte Carlo results"
            }
            defaultOpen={false}
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This view combines Monte Carlo failure timing with SSA mortality data, adjusted by the health outlook in your scenario.
              </p>
              {mortalityRisk ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      label="Alive at horizon"
                      value={formatPercent(mortalityRisk.terminalAliveProbability, 1)}
                      description="Probability that at least one planned household member is still alive at the end of the modeled retirement horizon."
                    />
                    <StatCard
                      label="Alive and solvent"
                      value={formatPercent(
                        mortalityRisk.points.at(-1)?.aliveAndSolventProbability ?? 0,
                        1,
                      )}
                      description="Probability of still being alive and still having portfolio assets at the horizon."
                      tone="success"
                    />
                    <StatCard
                      label="Alive and broke"
                      value={formatPercent(
                        mortalityRisk.points.at(-1)?.aliveAndBrokeProbability ?? 0,
                        1,
                      )}
                      description="Probability of still being alive after the portfolio has already failed."
                      tone="warning"
                    />
                    <StatCard
                      label="Health assumption"
                      value={activeScenario.profile.healthStatus.replace("_", " ")}
                      description="The mortality curve shifts about five years younger or older for below- and above-average longevity."
                    />
                  </div>
                  <RichBrokeDeadChart
                    data={mortalityRisk.points}
                    ariaLabel="Stacked probability chart showing the chance of being alive and solvent, alive and broke, or dead through retirement."
                  />
                  <div className="overflow-x-auto rounded-xl border border-border/60">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Year</th>
                          <th className="px-4 py-3 font-medium">Alive</th>
                          <th className="px-4 py-3 font-medium">Alive and solvent</th>
                          <th className="px-4 py-3 font-medium">Alive and broke</th>
                          <th className="px-4 py-3 font-medium">Dead</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mortalityRisk.points
                          .filter(
                            (point, index) =>
                              index === 0 ||
                              index === mortalityRisk.points.length - 1 ||
                              point.year % 10 === 0,
                          )
                          .map((point) => (
                            <tr key={point.year} className="border-t border-border/60">
                              <td className="px-4 py-3">{point.year}</td>
                              <td className="px-4 py-3">
                                {formatPercent(point.aliveProbability, 1)}
                              </td>
                              <td className="px-4 py-3">
                                {formatPercent(point.aliveAndSolventProbability, 1)}
                              </td>
                              <td className="px-4 py-3">
                                {formatPercent(point.aliveAndBrokeProbability, 1)}
                              </td>
                              <td className="px-4 py-3">
                                {formatPercent(point.deadProbability, 1)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                    The wedge usually widens toward death with money remaining. A
                    lower raw success rate can still leave a small probability of
                    being both alive and broke once mortality is included.
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                  The mortality-aware view appears once Monte Carlo results are
                  available for the active strategy.
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Methodology Notes"
            summary={
              result?.notes.length
                ? `${result.notes.length} note${result.notes.length === 1 ? "" : "s"} for ${selectedStrategyMeta.label}`
                : "Waiting for backtest results"
            }
            defaultOpen={false}
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              {result?.notes.map((note) => (
                <div
                  key={note}
                  className="rounded-lg border border-border/60 bg-card/40 p-3"
                >
                  {note}
                </div>
              )) ?? <p>Waiting for a backtest result...</p>}
            </div>
          </CollapsibleSection>
        </div>
      </section>
    </div>
  );
}
