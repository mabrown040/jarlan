"use client";

import {
  WithdrawalStrategyComparisonChart,
  type WithdrawalStrategyComparisonPoint,
  type WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { ChartShell, SectionHeading } from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { HistoricalBacktestResult } from "@/lib/sim/contracts";
import { formatCompactCurrency, formatPercent } from "@/lib/calc";

interface CompareTabProps {
  strategyComparisonRows: WithdrawalStrategyComparisonPoint[];
  strategyComparisonSeries: WithdrawalStrategySeries[];
  comparisonSummaries: Array<{
    type: string;
    label: string;
    description: string;
    result: HistoricalBacktestResult | undefined;
  }>;
  selectedStrategy: string;
}

function formatYearLabel(year: number) {
  return year === 0 ? "Start" : `Year ${year}`;
}

export function CompareTab({
  strategyComparisonRows,
  strategyComparisonSeries,
  comparisonSummaries,
  selectedStrategy,
}: CompareTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Which strategy fits you?</p>
        <p className="mt-1.5">
          <span className="font-medium text-foreground">Prefer steadier income?</span>{" "}
          Fixed real and Floor/Ceiling tend to smooth spending.{" "}
          <span className="font-medium text-foreground">Comfortable adjusting?</span>{" "}
          CAPE dynamic and Guyton-Klinger can improve resilience by flexing with markets.{" "}
          <span className="font-medium text-foreground">Want more up front?</span> VPW,
          Constant %, RMD, and Spending smile usually spend more early but fade more over time.
        </p>
      </div>

      {strategyComparisonRows.length > 0 ? (
        <>
          <ChartShell
            eyebrow="Strategy comparison"
            title="How spending changes under each strategy"
            description="Each line shows the median real withdrawal path for one strategy, so you can compare the tradeoff between income stability, flexibility, and ending wealth."
          >
          <WithdrawalStrategyComparisonChart
            data={strategyComparisonRows}
            series={strategyComparisonSeries}
            ariaLabel="Line chart comparing the median annual withdrawal path for each supported spending strategy."
          />
          </ChartShell>

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Decision table"
                title="Tradeoffs at a glance"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="This table matches the comparison chart and surfaces the metrics that matter when picking a withdrawal style, not just the raw survival rate."
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Strategy</th>
                      <th className="px-4 py-3 font-medium">Success</th>
                      <th className="px-4 py-3 font-medium">Avg withdrawal</th>
                      <th className="px-4 py-3 font-medium">Lowest median year</th>
                      <th className="px-4 py-3 font-medium">Highest median year</th>
                      <th className="px-4 py-3 font-medium">Spending volatility</th>
                      <th className="px-4 py-3 font-medium">Median ending value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonSummaries.map((summary) => {
                      const isActive = summary.type === selectedStrategy;

                      return (
                        <tr
                          key={summary.type}
                          className={
                            isActive
                              ? "border-t border-border/60 bg-[rgba(255,107,53,0.06)]"
                              : "border-t border-border/60"
                          }
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="min-w-[12rem]">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {summary.label}
                                </span>
                                {isActive ? (
                                  <span className="rounded-full border border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.12)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ember)]">
                                    Active
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {summary.description}
                              </p>
                            </div>
                          </td>
                          {summary.result ? (
                            <>
                              <td className="px-4 py-3">
                                {formatPercent(summary.result.successRate, 1)}
                              </td>
                              <td className="px-4 py-3">
                                {formatCompactCurrency(
                                  summary.result.withdrawalSummary.averageMedian,
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">
                                  {formatCompactCurrency(
                                    summary.result.withdrawalSummary.minMedian,
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatYearLabel(
                                    summary.result.withdrawalSummary.minMedianYear,
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">
                                  {formatCompactCurrency(
                                    summary.result.withdrawalSummary.maxMedian,
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatYearLabel(
                                    summary.result.withdrawalSummary.maxMedianYear,
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {formatCompactCurrency(
                                  summary.result.withdrawalSummary.medianStdDev,
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {formatCompactCurrency(
                                  summary.result.terminalValueStats.median,
                                )}
                              </td>
                            </>
                          ) : (
                            <td
                              className="px-4 py-3 text-muted-foreground"
                              colSpan={6}
                            >
                              Waiting for results...
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {comparisonSummaries.map((summary) => (
                  <div
                    key={summary.type}
                    className={
                      summary.type === selectedStrategy
                        ? "rounded-xl border border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.1)] p-4"
                        : "rounded-xl border border-border/60 bg-card/40 p-4"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{summary.label}</p>
                      <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {summary.type === selectedStrategy ? "Active" : "Option"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {summary.description}
                    </p>
                    {summary.result ? (
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between gap-3">
                          <span>Year-one median</span>
                          <span className="font-medium text-foreground">
                            {formatCompactCurrency(
                              summary.result.withdrawalSummary.firstYearMedian,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Lowest median year</span>
                          <span className="font-medium text-foreground">
                            {formatYearLabel(
                              summary.result.withdrawalSummary.minMedianYear,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Ending wealth</span>
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
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          Strategy comparison results will appear here once the worker
          finishes its first run.
        </div>
      )}
    </div>
  );
}
