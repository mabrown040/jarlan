"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LoaderCircle } from "lucide-react";

import type { HistoricalBacktestResult } from "@/lib/sim/contracts";
import { HistoricalBacktestChart } from "@/components/withdrawal/historical-backtest-chart";
import { WorstCaseSpendingChart } from "@/components/withdrawal/worst-case-spending-chart";
import {
  ChartShell,
  EnhancedStatCard,
  InsightMiniTable,
  InsightProgressBar,
  SectionHeading,
  StatCard,
} from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ErrorAlert } from "@/components/ui/error-alert";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from "@/lib/calc";

interface HistoricalTabProps {
  result: HistoricalBacktestResult | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  selectedStrategyMeta: { label: string };
  startAge: number;
}

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
  const worstCaseRows = useMemo(
    () =>
      result?.worstCasePath.filter(
        (point, index) =>
          index === 0 ||
          index === result.worstCasePath.length - 1 ||
          point.year % 5 === 0,
      ) ?? [],
    [result],
  );
  const worstCaseMinWithdrawal = useMemo(
    () =>
      result && result.worstCasePath.length > 0
        ? Math.min(...result.worstCasePath.map((point) => point.withdrawal))
        : null,
    [result],
  );
  const worstCaseCut = useMemo(() => {
    if (!result || worstCaseMinWithdrawal === null || result.initialWithdrawal <= 0) {
      return null;
    }

    return Math.max(0, 1 - worstCaseMinWithdrawal / result.initialWithdrawal);
  }, [result, worstCaseMinWithdrawal]);

  return (
    <div className="space-y-6">
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
            } onward, starting retirement at age ${startAge}.`}
          />
        </CardHeader>
        <CardContent className="space-y-5">
          {status === "loading" ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {result ? "Refreshing historical backtest..." : "Running historical backtest..."}
            </div>
          ) : null}
          {status === "error" ? (
            <ErrorAlert title="Historical backtest failed">
              {error}
            </ErrorAlert>
          ) : null}

          {result ? (
            <>
              {result.initialWithdrawalRate > 0.06 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-100">
                  This strategy starts around{" "}
                  <span className="font-medium">
                    {formatPercent(result.initialWithdrawalRate, 1)}
                  </span>{" "}
                  of the initial portfolio. That is far above classic
                  early-retirement baselines, so a poor success rate is expected
                  rather than a sign that the engine is broken.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <EnhancedStatCard
                  label="Success rate"
                  value={formatPercent(result.successRate, 1)}
                  tone={
                    result.successRate >= 0.9
                      ? "success"
                      : result.successRate >= 0.75
                        ? "warning"
                        : "accent"
                  }
                  insight={
                    <InsightProgressBar
                      progress={result.successRate}
                      label={`${result.successCount} of ${result.periodsTested} periods survived`}
                      tone={
                        result.successRate >= 0.9
                          ? "success"
                          : result.successRate >= 0.75
                            ? "warning"
                            : "accent"
                      }
                    />
                  }
                  caption={`95% confidence: ${formatPercent(
                    result.confidenceInterval.low,
                    1,
                  )}-${formatPercent(result.confidenceInterval.high, 1)}`}
                  learnMore={{
                    title: "What is success rate?",
                    content:
                      "The percentage of historical retirement periods where the portfolio survived the full duration. Each period starts in a different month from 1871 to present, using actual stock and bond returns. A 95%+ rate is generally considered robust.",
                  }}
                />
                <EnhancedStatCard
                  label="First-year withdrawal"
                  value={formatCompactCurrency(result.initialWithdrawal)}
                  tone="accent"
                  insight={
                    <InsightMiniTable
                      rows={[
                        {
                          label: "Withdrawal rate",
                          value: formatPercent(result.initialWithdrawalRate, 2),
                        },
                        { label: "Strategy", value: selectedStrategyMeta.label },
                      ]}
                    />
                  }
                  caption="Initial annual income from your portfolio."
                  learnMore={{
                    title: "How is this calculated?",
                    content: (
                      <>
                        <p>
                          The starting withdrawal comes from your selected rule.
                          Some rules keep real spending level, some react to
                          valuation or portfolio size, and others deliberately
                          step spending down over time.
                        </p>
                        <Link
                          href="/education/withdrawal-strategies"
                          className="mt-3 inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          Learn how each withdrawal strategy works →
                        </Link>
                      </>
                    ),
                  }}
                />
                <EnhancedStatCard
                  label="Median ending value"
                  value={formatCompactCurrency(result.terminalValueStats.median)}
                  insight={
                    <InsightMiniTable
                      rows={[
                        {
                          label: "10th percentile",
                          value: formatCompactCurrency(result.terminalValueStats.p10),
                        },
                        {
                          label: "50th percentile",
                          value: formatCompactCurrency(result.terminalValueStats.median),
                        },
                        {
                          label: "90th percentile",
                          value: formatCompactCurrency(result.terminalValueStats.p90),
                        },
                      ]}
                    />
                  }
                  caption="Portfolio value at end of retirement period."
                  learnMore={{
                    title: "Terminal value distribution",
                    content:
                      "Most historical periods leave a significant estate. The wide range between p10 and p90 reflects sequence-of-returns risk; the same average return can produce very different outcomes depending on the order of good and bad years.",
                  }}
                />
                <EnhancedStatCard
                  label="Spending band"
                  value={formatCompactCurrency(result.withdrawalSummary.averageMedian)}
                  subtitle="/yr avg"
                  insight={
                    <InsightMiniTable
                      rows={[
                        {
                          label: "Lowest median year",
                          value: `${formatCompactCurrency(
                            result.withdrawalSummary.minMedian,
                          )} in year ${result.withdrawalSummary.minMedianYear}`,
                        },
                        {
                          label: "Highest median year",
                          value: `${formatCompactCurrency(
                            result.withdrawalSummary.maxMedian,
                          )} in year ${result.withdrawalSummary.maxMedianYear}`,
                        },
                      ]}
                    />
                  }
                  caption="Range of annual spending across the median path."
                  learnMore={{
                    title: "Why does spending vary?",
                    content: (
                      <>
                        <p>
                          Dynamic rules trade steadier income for adaptability.
                          A wider band means the plan is asking your household
                          to absorb more spending changes when markets or
                          valuations move.
                        </p>
                        <Link
                          href="/education/withdrawal-strategies"
                          className="mt-3 inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          See the strategy tradeoffs →
                        </Link>
                      </>
                    ),
                  }}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] p-5 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Best historical start</p>
                  <p className="mt-2">
                    Starting in{" "}
                    <span className="font-medium text-foreground">
                      {result.bestCase.startDate}
                    </span>{" "}
                    left a terminal value of{" "}
                    <span className="font-medium text-foreground">
                      {formatCompactCurrency(result.bestCase.terminalValue)}
                    </span>
                    .
                  </p>
                  <p className="mt-2">
                    {result.bestCase.startingCape === null
                      ? "Starting CAPE unavailable for that cohort."
                      : `That cohort began near a CAPE of ${result.bestCase.startingCape.toFixed(1)}.`}
                  </p>
                </div>

                <div className="rounded-2xl border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] p-5 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Hardest historical start</p>
                  <p className="mt-2">
                    The most punishing cohort began in{" "}
                    <span className="font-medium text-foreground">
                      {result.worstCase.startDate}
                    </span>
                    {result.worstCase.failureYear === null
                      ? " and still survived the full horizon."
                      : ` and failed around year ${result.worstCase.failureYear}.`}
                  </p>
                  <p className="mt-2">
                    {result.worstCase.startingCape === null
                      ? "Starting CAPE unavailable for that cohort."
                      : `That cohort began near a CAPE of ${result.worstCase.startingCape.toFixed(1)}.`}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.95fr]">
        <ChartShell
          eyebrow="Historical fan chart"
          title="Historical path distribution"
          description="The shaded bands show the middle 50% and 80% of historical outcomes, so you can see how wide the range of real portfolio paths becomes over time."
        >
          {result ? (
            <HistoricalBacktestChart
              data={result.percentileBand}
              ariaLabel="Historical percentile fan chart showing the 10th to 90th percentile range and median portfolio outcomes across retirement years."
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
              Historical results will appear here once the worker finishes its
              first run.
            </div>
          )}
        </ChartShell>

        <ChartShell
          eyebrow="Behavioral reality check"
          title="Worst-case spending path"
          description="A mathematically safe plan can still feel impossible. This panel shows how the harshest historical cohort would have changed your real spending over time."
        >
          {result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  label="Worst start"
                  value={result.worstCase.startDate}
                  description={
                    result.worstCase.startingCape === null
                      ? "Starting CAPE unavailable."
                      : `Starting CAPE: ${result.worstCase.startingCape.toFixed(1)}.`
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
                  description="Largest drop from the initial real spending level in the worst historical cohort."
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
                  label="Lowest spending year"
                  value={
                    worstCaseMinWithdrawal === null
                      ? "Pending"
                      : formatCompactCurrency(worstCaseMinWithdrawal)
                  }
                  description="The lowest real annual withdrawal reached along that worst-case path."
                  tone="accent"
                />
                <StatCard
                  label="Failure timing"
                  value={
                    result.worstCase.failureYear === null
                      ? "No failure"
                      : `Year ${result.worstCase.failureYear}`
                  }
                  description="How long the worst historical cohort lasted before depletion, if it depleted at all."
                  tone={result.worstCase.failureYear === null ? "success" : "warning"}
                />
              </div>

              <WorstCaseSpendingChart
                data={result.worstCasePath}
                initialWithdrawal={result.initialWithdrawal}
              />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
              Worst-case spending details will appear once the historical run
              completes.
            </div>
          )}
        </ChartShell>
      </div>

      <CollapsibleSection
        title="Historical detail tables"
        summary={
          result
            ? `${backtestRows.length} percentile checkpoints and ${worstCaseRows.length} worst-case checkpoints`
            : "Waiting for backtest results"
        }
        defaultOpen={false}
      >
        {result ? (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                Percentile portfolio milestones
              </p>
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
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                Worst-case spending milestones
              </p>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Year</th>
                      <th className="px-4 py-3 font-medium">Age</th>
                      <th className="px-4 py-3 font-medium">Withdrawal</th>
                      <th className="px-4 py-3 font-medium">Portfolio value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {worstCaseRows.map((row) => (
                      <tr key={row.year} className="border-t border-border/60">
                        <td className="px-4 py-3">{row.year}</td>
                        <td className="px-4 py-3">{row.age}</td>
                        <td className="px-4 py-3">
                          {formatCurrency(row.withdrawal)}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(row.portfolioValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            Historical detail tables will appear once the backtest completes.
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
