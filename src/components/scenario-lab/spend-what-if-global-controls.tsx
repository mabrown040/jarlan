"use client";

import { useState } from "react";
import { ChevronDown, Settings2, SlidersHorizontal } from "lucide-react";

import { FieldLabel } from "@/components/form/field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { formatCompactCurrency } from "@/lib/calc";
import { cn } from "@/lib/utils";
import type { WhatIfPortfolioMode } from "@/lib/scenario-lab/spend-analysis";

function SummaryPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export function SpendWhatIfGlobalControls({
  saveStatus,
  strategy,
  strategyLabel,
  strategyDescription,
  strategyOptions,
  retirementExpenses,
  retirementDuration,
  portfolioMode,
  onStrategyChange,
  onRetirementExpensesChange,
  onRetirementDurationChange,
  onPortfolioModeChange,
  onOpenAdvancedSettings,
}: {
  saveStatus: "idle" | "saving" | "saved" | "error";
  strategy: string;
  strategyLabel: string;
  strategyDescription: string;
  strategyOptions: Array<{ value: string; label: string }>;
  retirementExpenses: number;
  retirementDuration: number;
  portfolioMode: WhatIfPortfolioMode;
  onStrategyChange: (value: string) => void;
  onRetirementExpensesChange: (value: number) => void;
  onRetirementDurationChange: (value: number) => void;
  onPortfolioModeChange: (value: WhatIfPortfolioMode) => void;
  onOpenAdvancedSettings: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save issue"
          : "Autosave on";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,var(--surface-highlight),transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="size-4 text-[var(--ember)]" />
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Shared plan setup
              </p>
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                The plan every scenario starts from
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep this baseline simple. Use the scenario cards for real
                retirement choices, and only change these inputs when every
                what-if should start from a different plan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SummaryPill>{saveStatusLabel}</SummaryPill>
              <SummaryPill>{strategyLabel}</SummaryPill>
              <SummaryPill>
                {`${formatCompactCurrency(retirementExpenses)}/yr spending`}
              </SummaryPill>
              <SummaryPill>{`${retirementDuration} yr horizon`}</SummaryPill>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? "Hide baseline plan" : "Edit baseline plan"}
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
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-1.5">
            <FieldLabel
              htmlFor="spend-what-if-portfolio-mode"
              label="Portfolio framing"
              tooltip="Choose whether to test the retirement plan against the portfolio on your current path or the FIRE target implied by your withdrawal rate."
            />
            <div
              id="spend-what-if-portfolio-mode"
              className="inline-flex w-full items-center gap-1 rounded-full border border-border/60 bg-card/35 p-1"
            >
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full px-3 py-2 text-sm transition-colors",
                  portfolioMode === "current-path"
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onPortfolioModeChange("current-path")}
              >
                Current path
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-full px-3 py-2 text-sm transition-colors",
                  portfolioMode === "fire-target"
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onPortfolioModeChange("fire-target")}
              >
                FIRE target
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Current path uses the portfolio you are projected to retire with.
              FIRE target stress-tests the plan at the target size your current
              withdrawal rate implies.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              When to use this
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Leave these alone if you are mainly comparing retirement choices.
              Come back here only when the underlying plan itself should change
              before every scenario runs.
            </p>
          </div>
        </div>

        {expanded ? (
          <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr_0.95fr]">
            <div className="space-y-1.5">
              <FieldLabel
                htmlFor="spend-what-if-strategy"
                label="Strategy"
                tooltip="This is the base spending rule every scenario starts from."
              />
              <Select
                id="spend-what-if-strategy"
                value={strategy}
                onChange={(event) => onStrategyChange(event.target.value)}
              >
                {strategyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <p className="text-sm text-muted-foreground">
                {strategyDescription}
              </p>
            </div>

            <div className="space-y-1.5">
              <FieldLabel
                htmlFor="spend-what-if-retirement-expenses"
                label="Retirement spending"
                tooltip="This is the base annual retirement spending target before any scenario cards change it."
              />
              <NumberInput
                id="spend-what-if-retirement-expenses"
                value={retirementExpenses}
                min={0}
                step={1_000}
                inputMode="numeric"
                onValueChange={onRetirementExpensesChange}
              />
              <p className="text-sm text-muted-foreground">
                Cards above can push this retirement spending target up or down.
              </p>
            </div>

            <div className="space-y-1.5">
              <FieldLabel
                htmlFor="spend-what-if-retirement-duration"
                label="Plan horizon"
                tooltip="How many retirement years the plan needs to fund."
              />
              <NumberInput
                id="spend-what-if-retirement-duration"
                value={retirementDuration}
                min={10}
                max={60}
                step={1}
                inputMode="numeric"
                onValueChange={onRetirementDurationChange}
              />
              <p className="text-sm text-muted-foreground">
                Timing cards can shorten this if retirement starts later.
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
