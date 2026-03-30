"use client";

import { Settings2 } from "lucide-react";

import { FieldLabel } from "@/components/form/field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
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
  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save issue"
          : "Autosave on";

  return (
    <Card>
      <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,var(--surface-highlight),transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Baseline assumptions
            </p>
            <p className="mt-2 text-lg font-medium text-foreground">
              Tune the plan behind every what-if
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              These settings change the shared retirement plan before any cards
              are layered on top.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SummaryPill>{saveStatusLabel}</SummaryPill>
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
      <CardContent className="grid gap-4 pt-6 xl:grid-cols-[1.1fr_1fr_0.9fr_1fr]">
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
          <p className="text-sm text-muted-foreground">{strategyDescription}</p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel
            htmlFor="spend-what-if-retirement-expenses"
            label="Retirement spending"
            tooltip="This is the base annual spending target before any scenario cards change it."
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
            Scenario cards can push this up or down from the baseline.
          </p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel
            htmlFor="spend-what-if-retirement-duration"
            label="Plan horizon"
            tooltip="How many retirement years the model needs to fund."
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
            Timing cards can shorten this by delaying retirement.
          </p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel
            htmlFor="spend-what-if-portfolio-mode"
            label="Portfolio framing"
            tooltip="Choose whether to test the spend plan against your FIRE target or the portfolio on your current path to retirement."
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
            Current path uses the projected portfolio at retirement. FIRE target
            stress-tests the spending plan at the chosen target size.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
