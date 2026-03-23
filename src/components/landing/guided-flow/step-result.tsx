"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";

import { EnhancedStatCard, InsightProgressBar } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ProjectionChart } from "@/components/landing/projection-chart";
import {
  calculateQuickFireSummary,
  calculateFireTypeSummaries,
  formatCompactCurrency,
  formatPercent,
  formatYears,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { useDrawerStore, useScenarioStore } from "@/lib/store";

export function StepResult({ onBack }: { onBack: () => void }) {
  const { activeScenario } = useScenarioStore();
  const { open } = useDrawerStore();

  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );
  const fireTypes = useMemo(
    () => calculateFireTypeSummaries(activeScenario),
    [activeScenario],
  );
  const coastStatus = fireTypes.find((ft) => ft.id === "coast");
  const currentBalance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--ember)]">
          Your FIRE number
        </p>
        <p className="mt-2 font-display text-6xl tracking-[-0.04em] text-foreground md:text-7xl">
          {formatCompactCurrency(summary.fireNumber)}
        </p>
        <p className="mt-3 text-lg text-muted-foreground">
          {summary.yearsToFi !== null
            ? `At this pace, you could reach financial independence in about ${formatYears(summary.yearsToFi)}.`
            : "Adjust your savings or spending to see a timeline."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <EnhancedStatCard
          label="Years to FI"
          value={formatYears(summary.yearsToFi)}
          subtitle={summary.fireAge !== null ? `age ${summary.fireAge}` : undefined}
          caption={summary.fireAge !== null ? `FI around age ${summary.fireAge}` : "Adjust inputs to see a timeline"}
          tone={summary.yearsToFi !== null && summary.yearsToFi <= 10 ? "success" : "default"}
        />
        <EnhancedStatCard
          label="Coast FIRE"
          value={
            summary.coastGap <= 0
              ? "Coasting"
              : summary.coastAge !== null
                ? `Age ${Math.round(summary.coastAge)}`
                : `${formatCompactCurrency(summary.coastGap)} gap`
          }
          subtitle={summary.coastGap <= 0 ? "stop saving now" : undefined}
          insight={
            <InsightProgressBar
              progress={coastStatus?.progress ?? 0}
              label={`${formatPercent(Math.min(coastStatus?.progress ?? 0, 1), 0)} of coast target`}
              tone={coastStatus?.progress && coastStatus.progress >= 1 ? "success" : "warning"}
            />
          }
          caption="Compounding alone to your FIRE number"
          tone={coastStatus?.progress && coastStatus.progress >= 1 ? "success" : "warning"}
        />
        <EnhancedStatCard
          label="Safer target"
          value={formatCompactCurrency(summary.saferFireNumber)}
          subtitle={`at ${formatPercent(activeScenario.assumptions.saferWithdrawalRate, 1)}`}
          caption={`${formatCompactCurrency(summary.saferFireNumber - summary.fireNumber)} extra cushion`}
        />
      </div>

      <div className="rounded-xl border border-border/60 p-4">
        <ProjectionChart data={summary.projection} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => open("basics")}>
          Fine-tune in Your Plan
        </Button>
        <Button asChild variant="outline">
          <Link href={"/accumulation" as Route}>Explore the full planner</Link>
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
