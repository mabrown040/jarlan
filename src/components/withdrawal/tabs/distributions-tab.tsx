import { formatCompactCurrency } from "@/lib/calc/format";
import type { HistoricalBacktestResult } from "@/lib/sim/contracts";
import { HistogramChart } from "@/components/charts/histogram-chart";

interface DistributionsTabProps {
  result: HistoricalBacktestResult | null;
}

export function DistributionsTab({ result }: DistributionsTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These histograms show how often the active strategy finishes with different ending balances, and when failing paths tend to break.
      </p>
      {result ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Historical terminal value histogram
            </p>
            <HistogramChart
              // Reformat bin labels from the engine (raw
              // "3896708.51-7793417.01 ending value") to compact
              // currency ("$3.9M–$7.8M") so the x-axis is human-
              // readable. Engine keeps numeric `start`/`end` for
              // downstream consumers; only the display layer
              // reformats here.
              data={result.terminalValueHistogram.map((bin) => ({
                label: `${formatCompactCurrency(bin.start)}–${formatCompactCurrency(bin.end)}`,
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
                // Years-to-failure: round the bin ends to whole
                // years — fractional years (e.g. "25.25–28.84 yrs")
                // imply precision the underlying Shiller month
                // resolution doesn't support.
                data={result.failureYearHistogram.map((bin) => ({
                  label: `${Math.round(bin.start)}–${Math.round(bin.end)} yrs`,
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
  );
}
