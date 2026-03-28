import { formatPercent } from "@/lib/calc";

export interface SuccessRateHeatmapCell {
  withdrawalRate: number;
  capeBucket: string;
  successRate: number;
  sampleCount: number;
}

export function SuccessRateHeatmap({
  data,
  withdrawalRates,
  capeBuckets,
}: {
  data: SuccessRateHeatmapCell[];
  withdrawalRates: number[];
  capeBuckets: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}) {
  function getCell(rate: number, capeBucket: string) {
    return (
      data.find(
        (entry) =>
          entry.withdrawalRate === rate && entry.capeBucket === capeBucket,
      ) ?? null
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-2">
        <caption className="sr-only">
          Historical success rate by withdrawal rate and starting CAPE bucket.
        </caption>
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              SWR / starting CAPE
            </th>
            {capeBuckets.map((bucket) => (
              <th
                key={bucket.id}
                scope="col"
                className="px-3 py-2 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground"
              >
                <span className="block text-foreground">{bucket.label}</span>
                <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                  {bucket.description}
                </span>
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
              {capeBuckets.map((bucket) => {
                const cell = getCell(withdrawalRate, bucket.id);
                const successRate = cell?.successRate ?? 0;
                const tone =
                  !cell || cell.sampleCount === 0
                    ? "rgba(148,163,184,0.12)"
                    : successRate >= 0.9
                    ? "rgba(34,197,94,0.18)"
                    : successRate >= 0.75
                      ? "rgba(251,191,36,0.18)"
                      : "rgba(239,68,68,0.18)";

                return (
                  <td
                    key={`${withdrawalRate}-${bucket.id}`}
                    className="rounded-xl border border-border/60 px-3 py-3 text-center text-sm text-foreground"
                    style={{ background: tone }}
                  >
                    {cell && cell.sampleCount > 0 ? (
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {formatPercent(successRate, 0)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          n={cell.sampleCount}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
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
