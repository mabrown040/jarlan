import { SuccessRateHeatmap } from "@/components/withdrawal/success-rate-heatmap";
import { ErrorAlert } from "@/components/ui/error-alert";

interface HeatmapTabProps {
  heatmapData: Array<{
    withdrawalRate: number;
    retirementDuration: number;
    successRate: number;
  }>;
  heatmapStatus: "idle" | "loading" | "ready" | "error";
  heatmapError: string | null;
  selectedStrategyLabel: string;
  withdrawalRates: number[];
  durations: number[];
}

export function HeatmapTab({
  heatmapData,
  heatmapStatus,
  heatmapError,
  withdrawalRates,
  durations,
}: HeatmapTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This matrix reruns the active strategy across a small retirement-duration and withdrawal-rate grid so you can see where the plan starts to break.
      </p>
      {heatmapStatus === "error" ? (
        <ErrorAlert title="Heat map failed to load">
          {heatmapError}
        </ErrorAlert>
      ) : null}
      {heatmapData.length > 0 ? (
        <SuccessRateHeatmap
          data={heatmapData}
          withdrawalRates={withdrawalRates}
          durations={durations}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
          {heatmapStatus === "loading"
            ? "Building the withdrawal-rate heat map..."
            : "Heat map results will appear once the strategy finishes its first run."}
        </div>
      )}
    </div>
  );
}
