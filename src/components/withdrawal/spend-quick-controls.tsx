"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Settings2, SlidersHorizontal } from "lucide-react";

import { FieldLabel } from "@/components/form/field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { formatCompactCurrency, formatPercent } from "@/lib/calc";
import type { Scenario } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type SpendControlFocusArea = "core" | "compare" | "stress";

type PortfolioMode = "fire-target" | "current";
type ControlKey = "withdrawal" | "strategy" | "horizon" | "monte-carlo";

const FOCUS_CONFIG = {
  core: {
    label: "Core outlook",
    title: "Change the levers that matter most",
    description:
      "These are the knobs most likely to move the fan chart, Monte Carlo view, and worst-case story.",
    recommended:
      "Start with withdrawal rate, strategy, and horizon. They change the answer fastest.",
    controls: ["withdrawal", "strategy", "horizon", "monte-carlo"] as ControlKey[],
  },
  compare: {
    label: "Strategy comparison",
    title: "Change the levers that matter most",
    description:
      "Use a few high-leverage inputs to make the tradeoff table feel exploratory instead of buried in settings.",
    recommended:
      "Start with strategy, withdrawal rate, and horizon to see the comparison table reshuffle.",
    controls: ["strategy", "withdrawal", "horizon", "monte-carlo"] as ControlKey[],
  },
  stress: {
    label: "Stress test",
    title: "Change the levers that matter most",
    description:
      "Keep the assumptions that most affect valuation sensitivity and failure pressure close at hand.",
    recommended:
      "Start with withdrawal rate, strategy, and Monte Carlo mode when you want a harsher read.",
    controls: ["withdrawal", "strategy", "monte-carlo", "horizon"] as ControlKey[],
  },
} as const;

function simulationTypeLabel(
  simulationType: Scenario["simulationSettings"]["simulationType"],
) {
  switch (simulationType) {
    case "monte_carlo_bootstrap":
      return "Bootstrap";
    case "monte_carlo_block":
      return "Block bootstrap";
    case "monte_carlo_regime":
      return "Regime switching";
    case "historical":
      return "Historical";
    case "monte_carlo_parametric":
    default:
      return "Parametric";
  }
}

function terminalTargetLabel(finalValueTarget: number) {
  if (finalValueTarget >= 1) {
    return "Preserve 100%";
  }

  if (finalValueTarget >= 0.25) {
    return "Preserve 25%";
  }

  return "Survival only";
}

function SummaryPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export function SpendQuickControls({
  focusArea,
  saveStatus,
  portfolioMode,
  currentBalance,
  fireTarget,
  strategy,
  strategyLabel,
  strategyDescription,
  strategyOptions,
  withdrawalRate,
  stockAllocation,
  retirementDuration,
  finalValueTarget,
  monteCarloTrials,
  monteCarloSimulationType,
  rebalanceFrequency,
  onPortfolioModeChange,
  onStrategyChange,
  onWithdrawalRateChange,
  onRetirementDurationChange,
  onSimulationTypeChange,
  onOpenAdvancedSettings,
  children,
  className,
}: {
  focusArea: SpendControlFocusArea;
  saveStatus: "idle" | "saving" | "saved" | "error";
  portfolioMode: PortfolioMode;
  currentBalance: number;
  fireTarget: number;
  strategy: string;
  strategyLabel: string;
  strategyDescription: string;
  strategyOptions: Array<{ value: string; label: string }>;
  withdrawalRate: number;
  stockAllocation: number;
  retirementDuration: number;
  finalValueTarget: number;
  monteCarloTrials: number;
  monteCarloSimulationType: Scenario["simulationSettings"]["simulationType"];
  rebalanceFrequency: Scenario["simulationSettings"]["rebalanceFrequency"];
  onPortfolioModeChange: (mode: PortfolioMode) => void;
  onStrategyChange: (value: string) => void;
  onWithdrawalRateChange: (value: number) => void;
  onRetirementDurationChange: (value: number) => void;
  onSimulationTypeChange: (
    value: Scenario["simulationSettings"]["simulationType"],
  ) => void;
  onOpenAdvancedSettings: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const focusConfig = FOCUS_CONFIG[focusArea];
  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save issue"
          : "Autosave on";

  function renderControl(control: ControlKey) {
    switch (control) {
      case "withdrawal":
        return (
          <div
            key={control}
            className="rounded-2xl border border-border/60 bg-card/35 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <FieldLabel
                htmlFor="spend-withdrawal-rate"
                label="Withdrawal rate"
                tooltip="Lower rates generally improve durability for longer retirements."
              />
              <span className="text-sm font-medium text-foreground">
                {formatPercent(withdrawalRate, 1)}
              </span>
            </div>
            <div className="mt-3">
              <Slider
                id="spend-withdrawal-rate"
                min={2.5}
                max={6}
                step={0.1}
                value={[withdrawalRate * 100]}
                onValueChange={([nextValue]) =>
                  onWithdrawalRateChange(nextValue / 100)
                }
              />
            </div>
            <div className="mt-3 max-w-[7rem]">
              <NumberInput
                value={withdrawalRate * 100}
                min={2.5}
                max={6}
                step={0.1}
                inputMode="decimal"
                onValueChange={(nextValue) =>
                  onWithdrawalRateChange(nextValue / 100)
                }
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Lower rates usually improve durability fastest and make the biggest
              visible difference across the charts.
            </p>
          </div>
        );
      case "strategy":
        return (
          <div
            key={control}
            className="rounded-2xl border border-border/60 bg-card/35 p-4"
          >
            <FieldLabel
              htmlFor="spend-strategy"
              label="Strategy"
              tooltip="The spending rule that determines how income changes over time."
            />
            <div className="mt-3">
              <Select
                id="spend-strategy"
                value={strategy}
                onChange={(event) => onStrategyChange(event.target.value)}
              >
                {strategyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{strategyLabel}.</span>{" "}
              {focusArea === "compare"
                ? "Comparison still runs every strategy; this keeps the rest of the page anchored to the one you care about most."
                : strategyDescription}
            </p>
          </div>
        );
      case "horizon":
        return (
          <div
            key={control}
            className="rounded-2xl border border-border/60 bg-card/35 p-4"
          >
            <FieldLabel
              htmlFor="spend-retirement-duration"
              label="Plan horizon"
              tooltip="How many retirement years to model in the backtest and Monte Carlo."
            />
            <div className="mt-3">
              <NumberInput
                id="spend-retirement-duration"
                value={retirementDuration}
                min={10}
                max={60}
                step={1}
                inputMode="numeric"
                onValueChange={onRetirementDurationChange}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Longer horizons are harder to sustain, but they are the safer way
              to model early retirement.
            </p>
          </div>
        );
      case "monte-carlo":
        return (
          <div
            key={control}
            className="rounded-2xl border border-border/60 bg-card/35 p-4"
          >
            <FieldLabel
              htmlFor="spend-mc-mode"
              label="Monte Carlo mode"
              tooltip="How forward-looking simulations draw future returns."
            />
            <div className="mt-3">
              <Select
                id="spend-mc-mode"
                value={monteCarloSimulationType}
                onChange={(event) =>
                  onSimulationTypeChange(
                    event.target.value as Scenario["simulationSettings"]["simulationType"],
                  )
                }
              >
                <option value="monte_carlo_parametric">Parametric</option>
                <option value="monte_carlo_bootstrap">Bootstrap</option>
                <option value="monte_carlo_block">Block bootstrap</option>
                <option value="monte_carlo_regime">Regime switching</option>
              </Select>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Samples future returns from the configured averages and
              volatility assumptions using {monteCarloTrials.toLocaleString()}{" "}
              trials.
            </p>
          </div>
        );
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,var(--surface-highlight),transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="size-4 text-[var(--ember)]" />
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Tune your spend plan
              </p>
              <SummaryPill>{focusConfig.label}</SummaryPill>
            </div>
            <div>
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                {focusConfig.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {focusConfig.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SummaryPill>{saveStatusLabel}</SummaryPill>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? "Hide controls" : "Show controls"}
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  expanded ? "rotate-180" : undefined,
                )}
              />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenAdvancedSettings}
            >
              <Settings2 className="size-4" />
              Advanced settings
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SummaryPill>
            {portfolioMode === "fire-target" ? "FIRE target lens" : "Current portfolio lens"}
          </SummaryPill>
          <SummaryPill>{strategyLabel}</SummaryPill>
          <SummaryPill>{formatPercent(withdrawalRate, 1)} withdrawal</SummaryPill>
          <SummaryPill>{retirementDuration} yr horizon</SummaryPill>
          {focusArea !== "compare" ? (
            <SummaryPill>{simulationTypeLabel(monteCarloSimulationType)}</SummaryPill>
          ) : null}
        </div>
      </CardHeader>

      {expanded ? (
        <CardContent className="space-y-5 pt-6">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Recommended here
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {focusConfig.recommended}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Test portfolio
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch between your target retirement portfolio and the balance you
              have actually saved today.
            </p>
            <div className="mt-4 inline-flex w-full flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/70 p-1">
              {([
                {
                  id: "fire-target",
                  label: `FIRE target (${formatCompactCurrency(fireTarget)})`,
                },
                {
                  id: "current",
                  label: `Current portfolio (${formatCompactCurrency(currentBalance)})`,
                },
              ] as const).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-left text-sm transition-colors",
                    portfolioMode === mode.id
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => onPortfolioModeChange(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {focusConfig.controls.map((control) => renderControl(control))}
          </div>

          {children ? (
            <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
              {children}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm text-muted-foreground">
              Advanced settings still control stock mix, rebalancing, terminal
              value target, supplemental income, fees, and the rest of the
              scenario.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <SummaryPill>{formatPercent(stockAllocation, 0)} stocks</SummaryPill>
              <SummaryPill>{terminalTargetLabel(finalValueTarget)}</SummaryPill>
              <SummaryPill>{rebalanceFrequency} rebalance</SummaryPill>
              <SummaryPill>{simulationTypeLabel(monteCarloSimulationType)}</SummaryPill>
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
