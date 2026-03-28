"use client";

import { useMemo, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { ChartShell, StatCard } from "@/components/brand";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SpendControlFocusArea } from "@/components/withdrawal/spend-quick-controls";
import type {
  HistoricalBacktestResult,
  MonteCarloResult,
} from "@/lib/sim/contracts";
import type { MortalityRiskResult } from "@/lib/sim/mortality-risk";
import { formatCompactCurrency, formatPercent } from "@/lib/calc";
import { HistoricalBacktestChart } from "@/components/withdrawal/historical-backtest-chart";
import { WorstCaseSpendingChart } from "@/components/withdrawal/worst-case-spending-chart";
import { FailureRateChart } from "@/components/withdrawal/failure-rate-chart";
import type {
  WithdrawalStrategyComparisonPoint,
  WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { MortalityTab } from "./tabs/mortality-tab";
import { CompareTab } from "./tabs/compare-tab";
import { HeatmapTab } from "./tabs/heatmap-tab";
import { DistributionsTab } from "./tabs/distributions-tab";

const TABS = [
  {
    id: "core",
    label: "Core outlook",
    description: "Historical durability and Monte Carlo probability.",
  },
  {
    id: "compare",
    label: "Strategy comparison",
    description: "Income stability, flexibility, and ending wealth.",
  },
  {
    id: "stress",
    label: "Stress test",
    description: "Valuation, failure timing, and longevity pressure.",
  },
] as const;

const CORE_VIEWS = [
  { id: "historical", label: "Historical fan" },
  { id: "monte-carlo", label: "Monte Carlo" },
  { id: "worst-case", label: "Worst case" },
] as const;

const STRESS_VIEWS = [
  { id: "heatmap", label: "Valuation map" },
  { id: "mortality", label: "Longevity" },
  { id: "distributions", label: "Failure timing" },
] as const;

function InlineViewNav({
  items,
  activeItem,
  onChange,
}: {
  items: ReadonlyArray<{ id: string; label: string }>;
  activeItem: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1.5 shadow-sm"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeItem === item.id}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            activeItem === item.id
              ? "bg-primary font-semibold text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function SubViewSwitcher({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border/60 bg-card/40 px-5 py-3">
      {children}
    </div>
  );
}

interface AnalysisTabsProps {
  activeTab: SpendControlFocusArea;
  onTabChange: (tab: SpendControlFocusArea) => void;
  controls?: ReactNode;
  backtestResult: HistoricalBacktestResult | null;
  backtestStatus: "idle" | "loading" | "ready" | "error";
  backtestError: string | null;
  selectedStrategyMeta: { label: string };
  selectedStrategy: string;
  startAge: number;
  monteCarloResult: MonteCarloResult | null;
  monteCarloStatus: "idle" | "loading" | "ready" | "error";
  monteCarloError: string | null;
  monteCarloSimulationType: string;
  onMonteCarloSimulationTypeChange: (value: string) => void;
  monteCarloTrials: number;
  mortalityRisk: MortalityRiskResult | null;
  healthStatus: string;
  strategyComparisonRows: WithdrawalStrategyComparisonPoint[];
  strategyComparisonSeries: WithdrawalStrategySeries[];
  comparisonSummaries: Array<{
    type: string;
    label: string;
    description: string;
    result: HistoricalBacktestResult | undefined;
  }>;
  selectedStrategyDescription: string;
  strategyTuningControls?: ReactNode;
  heatmapData: Array<{
    withdrawalRate: number;
    capeBucket: string;
    successRate: number;
    sampleCount: number;
  }>;
  heatmapStatus: "idle" | "loading" | "ready" | "error";
  heatmapError: string | null;
  heatmapWithdrawalRates: number[];
  heatmapCapeBuckets: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export function AnalysisTabs(props: AnalysisTabsProps) {
  const { activeTab, onTabChange } = props;
  const [coreView, setCoreView] = useState<(typeof CORE_VIEWS)[number]["id"]>(
    "historical",
  );
  const [stressView, setStressView] = useState<
    (typeof STRESS_VIEWS)[number]["id"]
  >("heatmap");
  const worstCaseFloorWithdrawal = useMemo(
    () =>
      props.backtestResult && props.backtestResult.worstCasePath.length > 0
        ? Math.min(
            ...props.backtestResult.worstCasePath.map((point) => point.withdrawal),
          )
        : null,
    [props.backtestResult],
  );
  const worstCaseCut = useMemo(() => {
    if (
      !props.backtestResult ||
      worstCaseFloorWithdrawal === null ||
      props.backtestResult.initialWithdrawal <= 0
    ) {
      return null;
    }

    return Math.max(
      0,
      1 - worstCaseFloorWithdrawal / props.backtestResult.initialWithdrawal,
    );
  }, [props.backtestResult, worstCaseFloorWithdrawal]);
  const historicalVsMonteCarlo = useMemo(() => {
    if (!props.backtestResult || !props.monteCarloResult) {
      return null;
    }

    return {
      successRateDelta:
        props.monteCarloResult.successRate - props.backtestResult.successRate,
      terminalMedianDelta:
        props.monteCarloResult.terminalValueStats.median -
        props.backtestResult.terminalValueStats.median,
    };
  }, [props.backtestResult, props.monteCarloResult]);

  return (
    <section id="spend-analysis" className="min-w-0">
      <div className="rounded-2xl border border-border/60 bg-card/75 p-2 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
        <div role="tablist" className="grid gap-2 md:grid-cols-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-colors",
                activeTab === tab.id
                  ? "border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.08)] text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="font-medium">{tab.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {tab.description}
              </div>
            </button>
          ))}
        </div>

        {props.controls ? <div className="mt-4">{props.controls}</div> : null}

        <div className={cn("space-y-6", props.controls ? "mt-4" : "mt-6")}>
          {activeTab === "core" && (
            <>
              <SubViewSwitcher>
                <InlineViewNav
                  items={CORE_VIEWS}
                  activeItem={coreView}
                  onChange={(value) =>
                    setCoreView(value as (typeof CORE_VIEWS)[number]["id"])
                  }
                />
              </SubViewSwitcher>

              {coreView === "historical" ? (
                <ChartShell
                  eyebrow="Historical fan chart"
                  title="Historical path distribution"
                  description="The shaded bands show the middle 50% and 80% of historical outcomes, so the first thing you see is how wide the range of retirement paths becomes."
                >
                  {props.backtestStatus === "loading" && !props.backtestResult ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Running historical backtest...
                    </div>
                  ) : null}
                  {props.backtestStatus === "error" ? (
                    <ErrorAlert title="Historical backtest failed">
                      {props.backtestError}
                    </ErrorAlert>
                  ) : null}
                  {props.backtestResult ? (
                    <div className="space-y-6">
                      <HistoricalBacktestChart
                        data={props.backtestResult.percentileBand}
                        className="h-[26rem] w-full"
                        ariaLabel="Historical percentile fan chart showing the 10th to 90th percentile range and median portfolio outcomes across retirement years."
                      />
                      <div className="grid gap-4 md:grid-cols-3">
                        <StatCard
                          label="Historical success"
                          value={formatPercent(props.backtestResult.successRate, 1)}
                          description={`95% confidence: ${formatPercent(
                            props.backtestResult.confidenceInterval.low,
                            1,
                          )} to ${formatPercent(
                            props.backtestResult.confidenceInterval.high,
                            1,
                          )}.`}
                          tone={
                            props.backtestResult.successRate >= 0.9
                              ? "success"
                              : props.backtestResult.successRate >= 0.75
                                ? "warning"
                                : "danger"
                          }
                        />
                        <StatCard
                          label="First-year spending"
                          value={formatCompactCurrency(
                            props.backtestResult.initialWithdrawal,
                          )}
                          description={`At age ${props.startAge}, using ${props.selectedStrategyMeta.label.toLowerCase()}.`}
                          tone="accent"
                        />
                        <StatCard
                          label="Median ending value"
                          value={formatCompactCurrency(
                            props.backtestResult.terminalValueStats.median,
                          )}
                          description={`10th to 90th percentile: ${formatCompactCurrency(
                            props.backtestResult.terminalValueStats.p10,
                          )} to ${formatCompactCurrency(
                            props.backtestResult.terminalValueStats.p90,
                          )}.`}
                        />
                      </div>
                      <div className="rounded-xl border border-border/60 bg-card/35 p-4 text-sm text-muted-foreground">
                        Best historical start:{" "}
                        <span className="font-medium text-foreground">
                          {props.backtestResult.bestCase.startDate}
                        </span>
                        . Hardest historical start:{" "}
                        <span className="font-medium text-foreground">
                          {props.backtestResult.worstCase.startDate}
                        </span>
                        {props.backtestResult.worstCase.failureYear === null
                          ? ", which still survived the full horizon."
                          : `, which failed around year ${props.backtestResult.worstCase.failureYear}.`}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                      Historical results will appear once the worker finishes its
                      first run.
                    </div>
                  )}
                </ChartShell>
              ) : null}

              {coreView === "monte-carlo" ? (
                <ChartShell
                  eyebrow="Monte Carlo outlook"
                  title="Forward-looking probability view"
                  description={`The active strategy is also simulated with ${props.monteCarloTrials.toLocaleString()} trials in ${props.monteCarloSimulationType.replaceAll("_", " ")} mode.`}
                >
                  <div className="mb-4 rounded-xl border border-border/60 bg-card/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Monte Carlo mode
                      </p>
                      <div className="w-full sm:w-[16rem]">
                        <Select
                          id="analysis-mc-mode"
                          value={props.monteCarloSimulationType}
                          onChange={(event) =>
                            props.onMonteCarloSimulationTypeChange(event.target.value)
                          }
                        >
                          <option value="monte_carlo_parametric">Parametric</option>
                          <option value="monte_carlo_bootstrap">Bootstrap</option>
                          <option value="monte_carlo_block">Block bootstrap</option>
                          <option value="monte_carlo_regime">Regime switching</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {props.monteCarloStatus === "loading" && !props.monteCarloResult ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Running Monte Carlo simulation...
                    </div>
                  ) : null}
                  {props.monteCarloStatus === "error" ? (
                    <ErrorAlert title="Monte Carlo simulation failed">
                      {props.monteCarloError}
                    </ErrorAlert>
                  ) : null}
                  {props.monteCarloResult ? (
                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
                      <div className="space-y-6">
                        <HistoricalBacktestChart
                          data={props.monteCarloResult.percentileBand}
                          className="h-[24rem] w-full"
                          ariaLabel="Monte Carlo percentile chart showing the 10th to 90th percentile range and median portfolio outcomes across retirement years."
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                          <StatCard
                            label="Monte Carlo success"
                            value={formatPercent(
                              props.monteCarloResult.successRate,
                              1,
                            )}
                            description={`95% confidence: ${formatPercent(
                              props.monteCarloResult.confidenceInterval.low,
                              1,
                            )} to ${formatPercent(
                              props.monteCarloResult.confidenceInterval.high,
                              1,
                            )}.`}
                            tone={
                              props.monteCarloResult.successRate >= 0.9
                                ? "success"
                                : props.monteCarloResult.successRate >= 0.75
                                  ? "warning"
                                  : "danger"
                            }
                          />
                          <StatCard
                            label="Failure by year 10"
                            value={formatPercent(
                              props.monteCarloResult.failureRateByYear[9]
                                ?.cumulativeFailureRate ?? 0,
                              1,
                            )}
                            description="A direct sequence-risk read on the first decade of retirement."
                            tone="warning"
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            Sequence risk curve
                          </p>
                          <FailureRateChart
                            data={props.monteCarloResult.failureRateByYear}
                            ariaLabel="Line chart showing the cumulative probability of failure by year across Monte Carlo trials."
                          />
                        </div>
                        <div className="grid gap-4">
                          <StatCard
                            label="Median ending value"
                            value={formatCompactCurrency(
                              props.monteCarloResult.terminalValueStats.median,
                            )}
                            description={`10th to 90th percentile: ${formatCompactCurrency(
                              props.monteCarloResult.terminalValueStats.p10,
                            )} to ${formatCompactCurrency(
                              props.monteCarloResult.terminalValueStats.p90,
                            )}.`}
                          />
                          {historicalVsMonteCarlo ? (
                            <div className="rounded-xl border border-border/60 bg-card/35 p-4 text-sm text-muted-foreground">
                              Monte Carlo success is{" "}
                              <span className="font-medium text-foreground">
                                {formatPercent(
                                  Math.abs(historicalVsMonteCarlo.successRateDelta),
                                  1,
                                )}
                              </span>{" "}
                              {historicalVsMonteCarlo.successRateDelta >= 0
                                ? "higher"
                                : "lower"}{" "}
                              than historical success, and the median ending
                              value differs by{" "}
                              <span className="font-medium text-foreground">
                                {formatCompactCurrency(
                                  historicalVsMonteCarlo.terminalMedianDelta,
                                )}
                              </span>
                              .
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                      Monte Carlo results will appear once the simulation
                      completes.
                    </div>
                  )}
                </ChartShell>
              ) : null}

              {coreView === "worst-case" ? (
                <ChartShell
                  eyebrow="Behavioral reality check"
                  title="Worst-case spending path"
                  description="This view focuses on how bad the hardest historical cohort would have felt, not just whether it technically survived."
                >
                  {props.backtestStatus === "loading" && !props.backtestResult ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Running historical backtest...
                    </div>
                  ) : null}
                  {props.backtestStatus === "error" ? (
                    <ErrorAlert title="Historical backtest failed">
                      {props.backtestError}
                    </ErrorAlert>
                  ) : null}
                  {props.backtestResult ? (
                    <div className="space-y-6">
                      <WorstCaseSpendingChart
                        data={props.backtestResult.worstCasePath}
                        initialWithdrawal={props.backtestResult.initialWithdrawal}
                        className="h-[24rem] w-full"
                      />
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                          label="Worst start"
                          value={props.backtestResult.worstCase.startDate}
                          description={
                            props.backtestResult.worstCase.startingCape === null
                              ? "Starting CAPE unavailable."
                              : `Starting CAPE: ${props.backtestResult.worstCase.startingCape.toFixed(1)}.`
                          }
                          tone="warning"
                        />
                        <StatCard
                          label="Deepest cut"
                          value={
                            worstCaseCut === null
                              ? "Pending"
                              : worstCaseCut < 0.01
                                ? "None"
                                : formatPercent(worstCaseCut, 0)
                          }
                          description="Largest drop from the initial real spending level."
                          tone={
                            worstCaseCut === null
                              ? "default"
                              : worstCaseCut <= 0.1
                                ? "success"
                                : worstCaseCut <= 0.25
                                  ? "warning"
                                  : "danger"
                          }
                        />
                        <StatCard
                          label="Lowest spending"
                          value={
                            worstCaseFloorWithdrawal === null
                              ? "Pending"
                              : formatCompactCurrency(worstCaseFloorWithdrawal)
                          }
                          description="Lowest real annual withdrawal reached in the hardest cohort."
                          tone="accent"
                        />
                        <StatCard
                          label="Failure timing"
                          value={
                            props.backtestResult.worstCase.failureYear === null
                              ? "No failure"
                              : `Year ${props.backtestResult.worstCase.failureYear}`
                          }
                          description="When the worst historical cohort broke, if it broke at all."
                          tone={
                            props.backtestResult.worstCase.failureYear === null
                              ? "success"
                              : "warning"
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                      Worst-case spending details will appear once the historical
                      run completes.
                    </div>
                  )}
                </ChartShell>
              ) : null}
            </>
          )}

          {activeTab === "compare" && (
            <>
              {props.backtestStatus === "loading" ? (
                <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-muted-foreground">
                  Refreshing the strategy comparison for the latest plan inputs.
                </div>
              ) : null}
              <CompareTab
                strategyComparisonRows={props.strategyComparisonRows}
                strategyComparisonSeries={props.strategyComparisonSeries}
                comparisonSummaries={props.comparisonSummaries}
                selectedStrategy={props.selectedStrategy}
                selectedStrategyLabel={props.selectedStrategyMeta.label}
                selectedStrategyDescription={props.selectedStrategyDescription}
                strategyTuningControls={props.strategyTuningControls}
              />
            </>
          )}

          {activeTab === "stress" && (
            <>
              <SubViewSwitcher>
                <InlineViewNav
                  items={STRESS_VIEWS}
                  activeItem={stressView}
                  onChange={(value) =>
                    setStressView(value as (typeof STRESS_VIEWS)[number]["id"])
                  }
                />
              </SubViewSwitcher>
              {stressView === "heatmap" ? (
                <HeatmapTab
                  heatmapData={props.heatmapData}
                  heatmapStatus={props.heatmapStatus}
                  heatmapError={props.heatmapError}
                  selectedStrategyLabel={props.selectedStrategyMeta.label}
                  withdrawalRates={props.heatmapWithdrawalRates}
                  capeBuckets={props.heatmapCapeBuckets}
                />
              ) : null}
              {stressView === "mortality" ? (
                <MortalityTab
                  mortalityRisk={props.mortalityRisk}
                  healthStatus={props.healthStatus}
                />
              ) : null}
              {stressView === "distributions" ? (
                <DistributionsTab result={props.backtestResult} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
