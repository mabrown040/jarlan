"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Settings2, SlidersHorizontal } from "lucide-react";

import { FieldLabel } from "@/components/form/field-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { formatPercent } from "@/lib/calc";
import type { Scenario } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export type SpendControlFocusArea = "core" | "compare" | "stress";
type ControlKey = "strategy" | "withdrawal" | "horizon";

function SummaryPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export function SpendQuickControls({
  saveStatus,
  strategy,
  strategyDescription,
  strategyOptions,
  withdrawalRate,
  stockAllocation,
  retirementDuration,
  finalValueTarget,
  rebalanceFrequency,
  onStrategyChange,
  onWithdrawalRateChange,
  onRetirementDurationChange,
  onStockAllocationChange,
  onFinalValueTargetChange,
  onRebalanceFrequencyChange,
  onOpenAdvancedSettings,
  children,
  className,
}: {
  saveStatus: "idle" | "saving" | "saved" | "error";
  strategy: string;
  strategyLabel: string;
  strategyDescription: string;
  strategyOptions: Array<{ value: string; label: string }>;
  withdrawalRate: number;
  stockAllocation: number;
  retirementDuration: number;
  finalValueTarget: number;
  rebalanceFrequency: Scenario["simulationSettings"]["rebalanceFrequency"];
  onStrategyChange: (value: string) => void;
  onWithdrawalRateChange: (value: number) => void;
  onRetirementDurationChange: (value: number) => void;
  onStockAllocationChange: (value: number) => void;
  onFinalValueTargetChange: (value: number) => void;
  onRebalanceFrequencyChange: (
    value: Scenario["simulationSettings"]["rebalanceFrequency"],
  ) => void;
  onOpenAdvancedSettings: () => void;
  children?: ReactNode;
  className?: string;
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

  function renderControl(control: ControlKey) {
    switch (control) {
      case "withdrawal":
        return (
          <div
            key={control}
            className="h-full rounded-2xl border border-border/60 bg-card/35 p-3.5"
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
            <div className="mt-2">
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
            <div className="mt-2 max-w-[7rem]">
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
          </div>
        );
      case "strategy":
        return (
          <div
            key={control}
            className="h-full rounded-2xl border border-border/60 bg-card/35 p-3.5"
          >
            <FieldLabel
              htmlFor="spend-strategy"
              label="Strategy"
              tooltip="The spending rule that determines how income changes over time."
            />
            <div className="mt-2">
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
            <p className="mt-2 text-sm text-muted-foreground">{strategyDescription}</p>
          </div>
        );
      case "horizon":
        return (
          <div
            key={control}
            className="rounded-2xl border border-border/60 bg-card/35 p-3.5"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <FieldLabel
                  htmlFor="spend-retirement-duration"
                  label="Plan horizon"
                  tooltip="How many retirement years to model."
                />
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
              <div className="space-y-1.5">
                <FieldLabel
                  htmlFor="spend-terminal-target"
                  label="Terminal target"
                  tooltip="0% means survival only. 100% means preserve full starting portfolio."
                />
                <Select
                  id="spend-terminal-target"
                  value={String(finalValueTarget)}
                  onChange={(event) =>
                    onFinalValueTargetChange(Number(event.target.value))
                  }
                >
                  <option value="0">Survival only</option>
                  <option value="0.25">Preserve 25%</option>
                  <option value="1">Preserve 100%</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel
                  htmlFor="spend-rebalance"
                  label="Rebalancing"
                  tooltip="How often to reset stock/bond mix to the target."
                />
                <Select
                  id="spend-rebalance"
                  value={rebalanceFrequency}
                  onChange={(event) =>
                    onRebalanceFrequencyChange(
                      event.target.value as Scenario["simulationSettings"]["rebalanceFrequency"],
                    )
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </Select>
              </div>
            </div>
            <div className="mt-3 border-t border-border/50 pt-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel
                    htmlFor="spend-stock-allocation"
                    label="Stock allocation"
                    tooltip="The rest goes to bonds."
                  />
                  <span className="text-sm font-medium text-foreground">
                    {formatPercent(stockAllocation, 0)} stocks
                  </span>
                </div>
                <Slider
                  id="spend-stock-allocation"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[stockAllocation]}
                  onValueChange={([nextValue]) => onStockAllocationChange(nextValue)}
                />
              </div>
            </div>
          </div>
        );
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,var(--surface-highlight),transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="size-4 text-[var(--ember)]" />
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Tune spend plan
            </p>
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
      </CardHeader>

      {expanded ? (
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-3 lg:grid-cols-2">
            <div>{renderControl("strategy")}</div>
            <div>
              {children ? (
                <div className="rounded-2xl border border-border/60 bg-card/35 p-3.5">
                  {children}
                </div>
              ) : (
                renderControl("withdrawal")
              )}
            </div>
          </div>
          <div>{renderControl("horizon")}</div>
        </CardContent>
      ) : null}
    </Card>
  );
}
