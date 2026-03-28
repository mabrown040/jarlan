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
  );
}
