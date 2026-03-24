"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronDown, SlidersHorizontal, Settings2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { NumberInput } from "@/components/ui/number-input";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { useDrawerStore } from "@/lib/store/use-drawer-store";
import { getCurrentPortfolioBalance } from "@/lib/calc";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { cn } from "@/lib/utils";

/* ── Reusable slider field ─────────────────────────────────── */
function SliderField({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  format,
  inputWidth = "w-20",
  isPercent = false,
  linked = false,
  linkedFlash = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  format: (v: number) => string;
  inputWidth?: string;
  isPercent?: boolean;
  linked?: boolean;
  linkedFlash?: boolean;
}) {
  const displayValue = isPercent ? value * 100 : value;
  const displayStep = isPercent ? step * 100 : step;
  const displayMin = isPercent ? min * 100 : min;
  const displayMax = isPercent ? max * 100 : max;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
          {linked && (
            <span className="ml-1 text-[9px] font-normal lowercase tracking-normal text-[var(--ember)]/60">
              ↔ linked
            </span>
          )}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-bold tabular-nums transition-colors duration-200",
            linkedFlash ? "text-[var(--ember)]" : "text-foreground",
          )}
        >
          {format(value)}
        </span>
      </div>
      <Slider
        value={[isPercent ? value * 100 : value]}
        min={displayMin}
        max={displayMax}
        step={displayStep}
        onValueChange={([v]) => onValueChange(isPercent ? v / 100 : v)}
      />
      <NumberInput
        value={displayValue}
        onValueChange={(v) => onValueChange(isPercent ? v / 100 : v)}
        min={displayMin}
        max={displayMax}
        step={displayStep}
        className={cn("h-7 text-xs", inputWidth)}
      />
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export function InlineControls() {
  const [expanded, setExpanded] = useState(true);
  const [lastChanged, setLastChanged] = useState<"spending" | "savings" | null>(null);

  const scenario = useScenarioStore((s) => s.activeScenario);
  const updateRetirementAge = useScenarioStore((s) => s.updateRetirementAge);
  const updateAnnualSavings = useScenarioStore((s) => s.updateAnnualSavings);
  const updateExpectedRealReturn = useScenarioStore((s) => s.updateExpectedRealReturn);
  const updateExpenses = useScenarioStore((s) => s.updateExpenses);
  const updateCurrentBalance = useScenarioStore((s) => s.updateCurrentBalance);

  const drawerStore = useDrawerStore();

  // Derived values
  const retireAt = scenario.profile.retirementAge ?? scenario.profile.age + 15;
  const savings = scenario.annualSavings;
  const realReturn = scenario.assumptions.expectedRealReturn;
  const expenses = scenario.annualExpenses;
  const portfolioBalance = getCurrentPortfolioBalance(scenario.accounts);
  const grossIncome = scenario.annualIncome;
  const hasIncome = grossIncome > 0;

  // Tax-aware take-home for linked spending ↔ savings
  const taxInfo = useMemo(() => estimateScenarioTax(scenario), [scenario]);
  const takeHome = taxInfo.takeHome;

  // Linked handlers: changing spending updates savings and vice versa
  const handleExpenseChange = useCallback(
    (v: number) => {
      updateExpenses(v);
      if (hasIncome) {
        const newSavings = Math.max(takeHome - v, 0);
        updateAnnualSavings(newSavings);
        setLastChanged("spending");
        setTimeout(() => setLastChanged(null), 600);
      }
    },
    [updateExpenses, updateAnnualSavings, hasIncome, takeHome],
  );

  const handleSavingsChange = useCallback(
    (v: number) => {
      updateAnnualSavings(v);
      if (hasIncome) {
        const newExpenses = Math.max(takeHome - v, 0);
        updateExpenses(newExpenses);
        setLastChanged("savings");
        setTimeout(() => setLastChanged(null), 600);
      }
    },
    [updateAnnualSavings, updateExpenses, hasIncome, takeHome],
  );

  // Dynamic slider max for portfolio
  const fireNumber = expenses > 0 ? expenses / (scenario.assumptions.withdrawalRate || 0.04) : 2_000_000;
  const portfolioMax = Math.max(portfolioBalance * 2, fireNumber * 1.5, 500_000);

  // Summary text for collapsed state
  const summaryText = `Retire at ${retireAt} · ${formatCompactCurrency(savings)}/yr savings · ${formatPercent(realReturn)} return · ${formatCompactCurrency(expenses)} spending · ${formatCompactCurrency(portfolioBalance)} saved`;

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
      {/* ── Header ── */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-3"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--ember)]" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/80">
            Tune your plan
          </span>
          {hasIncome && (
            <span className="text-[10px] text-muted-foreground">
              · {formatCompactCurrency(takeHome)} take-home
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              drawerStore.open();
            }}
            className="flex items-center gap-1 text-[10px] font-medium text-[var(--ember)] hover:underline"
          >
            <Settings2 className="h-3 w-3" />
            All settings
          </button>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* ── Collapsed summary ── */}
      {!expanded && (
        <div className="border-t border-border/40 px-5 py-2">
          <p className="truncate text-xs text-muted-foreground">{summaryText}</p>
        </div>
      )}

      {/* ── Expanded controls ── */}
      {expanded && (
        <div className="border-t border-border/40 px-5 pb-5 pt-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-5">
            <SliderField
              label="Retire at"
              value={retireAt}
              min={scenario.profile.age}
              max={85}
              step={1}
              onValueChange={updateRetirementAge}
              format={(v) => `Age ${Math.round(v)}`}
              inputWidth="w-16"
            />
            <SliderField
              label="Save per year"
              value={savings}
              min={0}
              max={hasIncome ? takeHome : 500_000}
              step={1000}
              onValueChange={handleSavingsChange}
              format={formatCompactCurrency}
              linked={hasIncome}
              linkedFlash={lastChanged === "spending"}
            />
            <SliderField
              label="Real return"
              value={realReturn}
              min={0}
              max={0.15}
              step={0.005}
              onValueChange={updateExpectedRealReturn}
              format={(v) => formatPercent(v)}
              isPercent
              inputWidth="w-16"
            />
            <SliderField
              label="Spend per year"
              value={expenses}
              min={0}
              max={hasIncome ? takeHome : 500_000}
              step={1000}
              onValueChange={handleExpenseChange}
              format={formatCompactCurrency}
              linked={hasIncome}
              linkedFlash={lastChanged === "savings"}
            />
            <SliderField
              label="Saved so far"
              value={portfolioBalance}
              min={0}
              max={portfolioMax}
              step={5000}
              onValueChange={updateCurrentBalance}
              format={formatCompactCurrency}
            />
          </div>
        </div>
      )}
    </div>
  );
}
