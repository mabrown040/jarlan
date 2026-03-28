import {
  WithdrawalStrategyComparisonChart,
  type WithdrawalStrategyComparisonPoint,
  type WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
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

export function CompareTab({
  strategyComparisonRows,
  strategyComparisonSeries,
  comparisonSummaries,
  selectedStrategy,
}: CompareTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Which strategy fits you?</p>
        <p className="mt-1.5">
          <span className="font-medium text-foreground">Predictable income?</span> Fixed real or Floor/Ceiling keep spending steady.{" "}
          <span className="font-medium text-foreground">Willing to flex?</span> CAPE dynamic and Guyton-Klinger adjust spending with markets — lower failure risk, but income varies.{" "}
          <span className="font-medium text-foreground">Maximizing early spending?</span> VPW and Constant % spend more upfront but decline over time.
        </p>
      </div>
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
  );
}
