import type { MortalityRiskResult } from "@/lib/sim/mortality-risk";
import { RichBrokeDeadChart } from "@/components/withdrawal/rich-broke-dead-chart";
import { ChartShell, StatCard } from "@/components/brand";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { formatPercent } from "@/lib/calc";

/* ------------------------------------------------------------------ */

interface MortalityTabProps {
  mortalityRisk: MortalityRiskResult | null;
  healthStatus: string;
}

/* ------------------------------------------------------------------ */

export function MortalityTab({
  mortalityRisk,
  healthStatus,
}: MortalityTabProps) {
  return (
    <div className="space-y-6">
      <ChartShell
        eyebrow="Mortality"
        title="Rich, broke, or dead"
        description="This view combines Monte Carlo failure timing with SSA mortality data, adjusted by the health outlook in your scenario."
      >
        {mortalityRisk ? (
          <div className="space-y-4">
            {/* Four mortality stat cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Alive at horizon"
                value={formatPercent(mortalityRisk.terminalAliveProbability, 1)}
                description="Probability that at least one planned household member is still alive at the end of the modeled retirement horizon."
              />
              <StatCard
                label="Alive and solvent"
                value={formatPercent(
                  mortalityRisk.points.at(-1)?.aliveAndSolventProbability ?? 0,
                  1,
                )}
                description="Probability of still being alive and still having portfolio assets at the horizon."
                tone="success"
              />
              <StatCard
                label="Alive and broke"
                value={formatPercent(
                  mortalityRisk.points.at(-1)?.aliveAndBrokeProbability ?? 0,
                  1,
                )}
                description="Probability of still being alive after the portfolio has already failed."
                tone="warning"
              />
              <StatCard
                label="Health assumption"
                value={healthStatus.replace("_", " ")}
                description="The mortality curve shifts about five years younger or older for below- and above-average longevity."
              />
            </div>

            {/* Rich/Broke/Dead chart */}
            <RichBrokeDeadChart
              data={mortalityRisk.points}
              ariaLabel="Stacked probability chart showing the chance of being alive and solvent, alive and broke, or dead through retirement."
            />

            {/* Mortality data table (collapsible) */}
            <CollapsibleSection
              title="Mortality Data Table"
              summary={`${mortalityRisk.points.filter(
                (point, index) =>
                  index === 0 ||
                  index === mortalityRisk.points.length - 1 ||
                  point.year % 10 === 0,
              ).length} milestone years`}
              defaultOpen={false}
            >
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Year</th>
                      <th className="px-4 py-3 font-medium">Alive</th>
                      <th className="px-4 py-3 font-medium">Alive and solvent</th>
                      <th className="px-4 py-3 font-medium">Alive and broke</th>
                      <th className="px-4 py-3 font-medium">Dead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mortalityRisk.points
                      .filter(
                        (point, index) =>
                          index === 0 ||
                          index === mortalityRisk.points.length - 1 ||
                          point.year % 10 === 0,
                      )
                      .map((point) => (
                        <tr key={point.year} className="border-t border-border/60">
                          <td className="px-4 py-3">{point.year}</td>
                          <td className="px-4 py-3">
                            {formatPercent(point.aliveProbability, 1)}
                          </td>
                          <td className="px-4 py-3">
                            {formatPercent(point.aliveAndSolventProbability, 1)}
                          </td>
                          <td className="px-4 py-3">
                            {formatPercent(point.aliveAndBrokeProbability, 1)}
                          </td>
                          <td className="px-4 py-3">
                            {formatPercent(point.deadProbability, 1)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
              The wedge usually widens toward death with money remaining. A
              lower raw success rate can still leave a small probability of
              being both alive and broke once mortality is included.
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
            The mortality-aware view appears once Monte Carlo results are
            available for the active strategy.
          </div>
        )}
      </ChartShell>
    </div>
  );
}
