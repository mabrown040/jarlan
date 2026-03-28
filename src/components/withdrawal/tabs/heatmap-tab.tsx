import { SuccessRateHeatmap } from "@/components/withdrawal/success-rate-heatmap";
import { ErrorAlert } from "@/components/ui/error-alert";

interface HeatmapTabProps {
  heatmapData: Array<{
    withdrawalRate: number;
    capeBucket: string;
    successRate: number;
    sampleCount: number;
  }>;
  heatmapStatus: "idle" | "loading" | "ready" | "error";
  heatmapError: string | null;
  selectedStrategyLabel: string;
  withdrawalRates: number[];
  capeBuckets: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}

export function HeatmapTab({
  heatmapData,
  heatmapStatus,
  heatmapError,
  selectedStrategyLabel,
  withdrawalRates,
  capeBuckets,
}: HeatmapTabProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Valuation-aware stress map</p>
        <p className="mt-1.5">
          Each row reruns <span className="font-medium text-foreground">{selectedStrategyLabel}</span>{" "}
          at a different starting withdrawal rate. Each column groups historical cohorts by the
          market valuation they started with, so you can see how much more fragile a plan becomes
          when retirement begins in an expensive market.
        </p>
      </div>
      {heatmapStatus === "error" ? (
        <ErrorAlert title="Heat map failed to load">
          {heatmapError}
        </ErrorAlert>
      ) : null}
      {heatmapData.length > 0 ? (
        <SuccessRateHeatmap
          data={heatmapData}
          withdrawalRates={withdrawalRates}
          capeBuckets={capeBuckets}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          {heatmapStatus === "loading"
            ? "Building the valuation stress map..."
            : "Heat map results will appear once the strategy finishes its first run."}
        </div>
      )}
    </div>
  );
}
