"use client";

import { useMemo } from "react";
import { LoaderCircle } from "lucide-react";

import type { HistoricalBacktestResult } from "@/lib/sim/contracts";
import { HistoricalBacktestChart } from "@/components/withdrawal/historical-backtest-chart";
import {
  ChartShell,
  EnhancedStatCard,
  InsightMiniTable,
  InsightProgressBar,
  SectionHeading,
} from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ErrorAlert } from "@/components/ui/error-alert";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/calc";

/* ------------------------------------------------------------------ */

interface HistoricalTabProps {
  result: HistoricalBacktestResult | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  selectedStrategyMeta: { label: string };
  startAge: number;
}

/* ------------------------------------------------------------------ */

export function HistoricalTab({
  result,
  status,
  error,
  selectedStrategyMeta,
  startAge,
}: HistoricalTabProps) {
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

  return (
    <div className="space-y-6">
      {/* Strategy summary heading */}
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
          {status === "loading" && !result ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Running historical backtest...
            </div>
          ) : null}
          {status === "error" ? (
            <ErrorAlert title="Historical backtest failed">
              {error}
            </ErrorAlert>
          ) : null}

          {/* Four EnhancedStatCard cards */}
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

      {/* Hero chart — historical path distribution */}
      <ChartShell
        eyebrow="Path distribution"
        title="Historical path distribution"
        description="The chart tracks the 10th, 50th, and 90th percentile portfolio path across the tested historical cohorts for the active strategy."
      >
        {result ? (
          <HistoricalBacktestChart
            data={result.percentileBand}
            ariaLabel="Historical percentile chart showing 10th percentile, median, and 90th percentile portfolio outcomes across retirement years."
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            Historical results will appear here once the worker finishes its
            first run.
          </div>
        )}
      </ChartShell>

      {/* Year-by-year percentile table (collapsible) */}
      <CollapsibleSection
        title="Year-by-Year Percentile Table"
        summary={
          result
            ? `${backtestRows.length} milestone years for ${selectedStrategyMeta.label}`
            : "Waiting for backtest results"
        }
        defaultOpen={false}
      >
        {result ? (
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
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            Percentile table will appear once the historical run completes.
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
