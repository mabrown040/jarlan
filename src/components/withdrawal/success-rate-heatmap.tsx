import { formatPercent } from "@/lib/calc";

export interface SuccessRateHeatmapCell {
  withdrawalRate: number;
  retirementDuration: number;
  successRate: number;
}

export function SuccessRateHeatmap({
  data,
  withdrawalRates,
  durations,
}: {
  data: SuccessRateHeatmapCell[];
  withdrawalRates: number[];
  durations: number[];
}) {
  function getCell(rate: number, duration: number) {
    return (
      data.find(
        (entry) =>
          entry.withdrawalRate === rate && entry.retirementDuration === duration,
      ) ?? null
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-2">
        <caption className="sr-only">
          Historical success rate by withdrawal rate and retirement duration.
        </caption>
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              SWR / years
            </th>
            {durations.map((duration) => (
              <th
                key={duration}
                scope="col"
                className="px-3 py-2 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground"
              >
                {duration}y
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {withdrawalRates.map((withdrawalRate) => (
            <tr key={withdrawalRate}>
              <th
                scope="row"
                className="rounded-xl border border-border/60 bg-card/40 px-3 py-3 text-left text-sm font-medium text-foreground"
              >
                {formatPercent(withdrawalRate, 1)}
              </th>
              {durations.map((duration) => {
                const cell = getCell(withdrawalRate, duration);
                const successRate = cell?.successRate ?? 0;
                const tone =
                  successRate >= 0.9
                    ? "rgba(34,197,94,0.18)"
                    : successRate >= 0.75
                      ? "rgba(251,191,36,0.18)"
                      : "rgba(239,68,68,0.18)";

                return (
                  <td
                    key={`${withdrawalRate}-${duration}`}
                    className="rounded-xl border border-border/60 px-3 py-3 text-center text-sm text-foreground"
                    style={{ background: tone }}
                  >
                    {cell ? formatPercent(successRate, 0) : "..."}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
