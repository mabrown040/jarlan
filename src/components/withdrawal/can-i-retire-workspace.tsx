"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CompactPageHeader,
} from "@/components/brand";
import { FieldLabel } from "@/components/form/field-label";
import { cloneScenario } from "@/lib/domain";
import {
  type WithdrawalStrategyComparisonPoint,
  type WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { RetirementCheckupSummary } from "@/components/retirement/retirement-checkup-summary";
import { RetirementReadinessSummary } from "@/components/retirement/retirement-readiness-summary";
import { useRetirementReadiness } from "@/components/retirement/use-retirement-readiness";
import { AnalysisTabs } from "@/components/withdrawal/analysis-tabs";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { NumberInput } from "@/components/ui/number-input";
import {
  calculateFireNumber,
  formatCompactCurrency,
  formatPercent,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { listScenarioSnapshots, type ScenarioSnapshotRecord } from "@/lib/db";
import { cn } from "@/lib/utils";
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

export function CanIRetireWorkspace() {
  const {
    activeScenario,
    status,
    saveStatus,
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const requestTokenRef = useRef(0);
  const monteCarloRequestTokenRef = useRef(0);
  const heatmapRequestTokenRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const [analysisTab, setAnalysisTab] = useState("historical");
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
    <div className="space-y-8 pb-12">
      {/* ============================================================
          ACT 1 — THE ANSWER (above fold)
          ============================================================ */}

      {/* 1. Compact page header with 4 key metrics */}
      <CompactPageHeader
        title="Your Plan"
        description="Stress-test your withdrawal strategy against historical data and Monte Carlo simulations."
        metrics={[
          { label: "Testing with", value: formatCompactCurrency(effectivePortfolio), accent: portfolioMode === "fire-target" },
          { label: "Strategy", value: selectedStrategyMeta.label, accent: true },
          { label: "Success", value: result ? formatPercent(result.successRate, 1) : "Running..." },
          { label: "Readiness", value: readiness.assessment ? `${Math.round(readiness.assessment.score)}/100` : "...", accent: readiness.assessment ? readiness.assessment.score >= 80 : false },
        ]}
      />

      {/* Journey context banner — adapts to how close the user is to FI */}
      {(() => {
        const progress = fireTarget > 0 ? currentBalance / fireTarget : 0;
        if (progress >= 1) {
          return (
            <section className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Your portfolio ({formatCompactCurrency(currentBalance)}) exceeds your {formatCompactCurrency(fireTarget)} target.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This is your real stress test. The results below show whether your money will last through retirement.{" "}
                  <Link href={"/accumulation" as Route} className="font-medium text-primary hover:text-primary/80">
                    Review your assumptions &rarr;
                  </Link>
                </p>
              </div>
            </section>
          );
        }
        if (progress >= 0.9) {
          return (
            <section className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  You're {formatPercent(progress, 0)} of the way to your {formatCompactCurrency(fireTarget)} target. Almost there.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start understanding how your withdrawal strategy will work. These results preview what retirement looks like at your target.{" "}
                  <Link href={"/accumulation" as Route} className="font-medium text-primary hover:text-primary/80">
                    Back to your savings plan &rarr;
                  </Link>
                </p>
              </div>
            </section>
          );
        }
        if (progress >= 0.5) {
          return (
            <section className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4">
                <p className="text-sm font-medium text-foreground">
                  You're {formatPercent(progress, 0)} of the way to {formatCompactCurrency(fireTarget)}. Getting closer.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This page previews what retirement could look like when you reach your target. Building intuition about withdrawal risk now makes the transition smoother later.{" "}
                  <Link href={"/accumulation" as Route} className="font-medium text-primary hover:text-primary/80">
                    Back to your savings plan &rarr;
                  </Link>
                </p>
              </div>
            </section>
          );
        }
        return (
          <section className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4">
              <p className="text-sm font-medium text-foreground">
                You're building toward {formatCompactCurrency(fireTarget)}.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This page previews what retirement will look like when you get there. It's testing your FIRE target — not your current {formatCompactCurrency(currentBalance)} portfolio — so the success rates reflect the plan you're building toward.{" "}
                <Link href={"/accumulation" as Route} className="font-medium text-primary hover:text-primary/80">
                  Back to your savings plan &rarr;
                </Link>
              </p>
            </div>
          </section>
        );
      })()}

      {/* 2. Portfolio mode toggle (FIRE target vs current) */}
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

      {/* 3. Strategy tuning strip (conditional inline inputs) */}
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

      {/* ── Tabbed analysis (graphs first) ── */}
      <AnalysisTabs
        activeTab={analysisTab}
        onTabChange={setAnalysisTab}
        backtestResult={result}
        backtestStatus={backtestStatus}
        backtestError={backtestError}
        selectedStrategyMeta={selectedStrategyMeta}
        selectedStrategy={selectedStrategy}
        startAge={activeScenario.profile.age}
        monteCarloResult={monteCarloResult}
        monteCarloStatus={monteCarloStatus}
        monteCarloError={monteCarloError}
        monteCarloSimulationType={monteCarloSimulationType}
        monteCarloTrials={activeScenario.simulationSettings.monteCarloTrials}
        mortalityRisk={mortalityRisk}
        healthStatus={activeScenario.profile.healthStatus}
        strategyComparisonRows={strategyComparisonRows}
        strategyComparisonSeries={strategyComparisonSeries}
        comparisonSummaries={comparisonSummaries}
        heatmapData={heatmapData}
        heatmapStatus={heatmapStatus}
        heatmapError={heatmapError}
        heatmapWithdrawalRates={heatmapWithdrawalRates}
        heatmapDurations={heatmapDurations}
      />

      {/* ── Retirement readiness (below graphs) ── */}
      {readiness.assessment ? (
        <section className="mx-auto max-w-7xl px-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>Your {Math.round(readiness.assessment.score)}/100 readiness score is based on:</span>
            <button type="button" className="font-medium text-primary hover:text-primary/80" onClick={() => setAnalysisTab("historical")}>
              Historical survival ({result ? formatPercent(result.successRate, 0) : "..."})
            </button>
            <button type="button" className="font-medium text-primary hover:text-primary/80" onClick={() => setAnalysisTab("monte-carlo")}>
              Monte Carlo ({monteCarloResult ? formatPercent(monteCarloResult.successRate, 0) : "..."})
            </button>
            <button type="button" className="font-medium text-primary hover:text-primary/80" onClick={() => setAnalysisTab("mortality")}>
              Longevity risk
            </button>
            <button type="button" className="font-medium text-primary hover:text-primary/80" onClick={() => setAnalysisTab("compare")}>
              Strategy fit
            </button>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6">
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
      </section>

      {/* Retirement checkup summary (conditional on snapshots) */}
      <section className="mx-auto max-w-7xl px-6">
        <RetirementCheckupSummary
          checkup={retirementCheckup}
          description="Use this after retirement to compare your live withdrawal rate, current CAPE guidance, and change since the last saved review."
        />
      </section>
    </div>
  );
}

export default CanIRetireWorkspace;
