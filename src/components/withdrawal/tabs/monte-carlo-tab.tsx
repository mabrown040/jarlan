"use client";

import { useMemo } from "react";
import { LoaderCircle } from "lucide-react";

import type {
  MonteCarloResult,
  HistoricalBacktestResult,
} from "@/lib/sim/contracts";
import { HistoricalBacktestChart } from "@/components/withdrawal/historical-backtest-chart";
import { FailureRateChart } from "@/components/withdrawal/failure-rate-chart";
import { HistogramChart } from "@/components/charts/histogram-chart";
import { ChartShell, StatCard } from "@/components/brand";
import { ErrorAlert } from "@/components/ui/error-alert";
import { formatCompactCurrency, formatPercent } from "@/lib/calc";

/* ------------------------------------------------------------------ */

interface MonteCarloTabProps {
  monteCarloResult: MonteCarloResult | null;
  historicalResult: HistoricalBacktestResult | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  monteCarloSimulationType: string;
  trials: number;
}

/* ------------------------------------------------------------------ */

export function MonteCarloTab({
  monteCarloResult,
  historicalResult,
  status,
  error,
  monteCarloSimulationType,
  trials,
}: MonteCarloTabProps) {
  const historicalVsMonteCarlo = useMemo(() => {
    if (!historicalResult || !monteCarloResult) return null;
    return {
      successRateDelta:
        monteCarloResult.successRate - historicalResult.successRate,
      terminalMedianDelta:
        monteCarloResult.terminalValueStats.median -
        historicalResult.terminalValueStats.median,
    };
  }, [historicalResult, monteCarloResult]);

  return (
    <div className="space-y-6">
      <ChartShell
        eyebrow="Forward-looking"
        title="Forward-looking Monte Carlo"
        description={`The active strategy is also simulated with ${trials.toLocaleString()} trials in ${monteCarloSimulationType.replaceAll("_", " ")} mode.`}
      >
        {status === "loading" && !monteCarloResult ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Running Monte Carlo simulation...
          </div>
        ) : null}
        {status === "error" ? (
          <ErrorAlert title="Monte Carlo simulation failed">
            {error}
          </ErrorAlert>
        ) : null}
        {monteCarloResult ? (
          <div className="space-y-4">
            {/* Four MC stat cards */}
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
                description={`Cumulative failure by year ${monteCarloResult.failureRateByYear.length}: ${formatPercent(
                  monteCarloResult.failureRateByYear.at(-1)
                    ?.cumulativeFailureRate ?? 0,
                  1,
                )}.`}
              />
            </div>

            {/* MC percentile paths chart */}
            <HistoricalBacktestChart
              data={monteCarloResult.percentileBand}
              ariaLabel="Monte Carlo percentile chart showing 10th percentile, median, and 90th percentile portfolio outcomes across retirement years."
            />

            {/* MC vs Historical comparison callout */}
            {historicalVsMonteCarlo ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Historical vs Monte Carlo success rate
                  </p>
                  <p className="mt-2">
                    Historical: {formatPercent(historicalResult?.successRate ?? 0, 1)}.
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
                    {formatCompactCurrency(historicalResult?.terminalValueStats.median ?? 0)}.
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

            {/* Sequence risk + MC histogram (2 columns) */}
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

            {/* MC methodology notes */}
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
          </div>
        ) : null}
        {!monteCarloResult && status !== "loading" && status !== "error" ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            Monte Carlo results will appear once the simulation completes.
          </div>
        ) : null}
      </ChartShell>
    </div>
  );
}
