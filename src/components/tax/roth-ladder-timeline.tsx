import { formatCompactCurrency } from "@/lib/calc";
import type { RothConversionPlanRow } from "@/lib/tax";

export function RothLadderTimeline({
  rows,
}: {
  rows: RothConversionPlanRow[];
}) {
  const minAge = rows[0]?.age ?? 0;
  const maxAge = Math.max(...rows.map((row) => row.availablePenaltyFreeAge), minAge);
  const totalSpan = Math.max(maxAge - minAge, 1);

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const offset = ((row.age - minAge) / totalSpan) * 100;
        const width = ((row.availablePenaltyFreeAge - row.age) / totalSpan) * 100;

        return (
          <div
            key={`${row.age}-${row.yearOffset}`}
            className="rounded-xl border border-border/60 bg-card/40 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-foreground">
                Convert at age {row.age}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatCompactCurrency(row.conversionAmount)} becomes penalty-free at{" "}
                {row.availablePenaltyFreeAge}
              </p>
            </div>
            <div className="mt-3 h-3 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  marginLeft: `${offset}%`,
                  width: `${Math.max(width, 6)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
