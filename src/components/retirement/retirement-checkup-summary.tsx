import { SectionHeading, StatCard } from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  formatCompactCurrency,
  formatPercent,
} from "@/lib/calc";
import type { RetirementCheckupSummary as RetirementCheckupSummaryData } from "@/lib/retirement";

export function RetirementCheckupSummary({
  checkup,
  description = "A current-year check on withdrawal pressure, CAPE guidance, and change since the last review.",
}: {
  checkup: RetirementCheckupSummaryData;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Retirement checkup"
          title="Current-year status"
          titleAs="h3"
          titleClassName="text-[1.9rem]"
          description={description}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Current withdrawal rate"
            value={formatPercent(checkup.currentWithdrawalRate, 2)}
            description={`Based on ${formatCompactCurrency(
              checkup.currentSpending,
            )} of annual spending and ${formatCompactCurrency(
              checkup.currentPortfolio,
            )} of portfolio value.`}
            tone={checkup.status === "on_track" ? "success" : checkup.status === "watch" ? "warning" : "danger"}
          />
          <StatCard
            label="Active strategy guidance"
            value={formatCompactCurrency(checkup.activeStrategyGuidance)}
            description="Modeled current-year spending guidance using the active withdrawal strategy."
          />
          <StatCard
            label="CAPE-guided spending"
            value={formatCompactCurrency(checkup.capeGuidedWithdrawal)}
            description={
              checkup.latestCape === null
                ? "Latest CAPE value was unavailable."
                : `Latest CAPE reading: ${checkup.latestCape.toFixed(1)}.`
            }
            tone="accent"
          />
          <StatCard
            label="Status"
            value={checkup.statusLabel}
            description={checkup.statusMessage}
            tone={checkup.status === "on_track" ? "success" : checkup.status === "watch" ? "warning" : "danger"}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
            <p className="font-medium text-foreground">Year-over-year change</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>
                Comparison window:{" "}
                <span className="font-medium text-foreground">
                  {checkup.comparisonLabel ?? "No prior snapshot yet"}
                </span>
                .
              </p>
              <p>
                Net worth change:{" "}
                <span className="font-medium text-foreground">
                  {checkup.netWorthDelta === null
                    ? "Capture a snapshot to start tracking"
                    : formatCompactCurrency(checkup.netWorthDelta)}
                </span>
                .
              </p>
              <p>
                Spending change:{" "}
                <span className="font-medium text-foreground">
                  {checkup.spendingDelta === null
                    ? "Capture a snapshot to start tracking"
                    : formatCompactCurrency(checkup.spendingDelta)}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/35 p-5">
            <p className="font-medium text-foreground">How to use this</p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>Update your current balance and current spending only.</p>
              <p>Check whether your live withdrawal rate is drifting above guidance.</p>
              <p>Capture a new snapshot to build an annual review trail over time.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
