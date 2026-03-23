"use client";

import { NumberInput } from "@/components/ui/number-input";
import { useScenarioStore } from "@/lib/store";
import { useMemo } from "react";
import { getCurrentPortfolioBalance } from "@/lib/calc";

export function StepSaved({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { activeScenario, updateCurrentBalance } = useScenarioStore();
  const balance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 text-center">
      <div className="space-y-3">
        <h2 className="font-display text-3xl tracking-[-0.03em] text-foreground md:text-4xl">
          How much have you saved?
        </h2>
        <p className="text-muted-foreground">
          Include all investment accounts — 401(k), IRA, taxable brokerage.
        </p>
      </div>
      <div className="w-full">
        <NumberInput
          id="wizard-balance"
          min={0}
          step={5000}
          inputMode="numeric"
          value={balance}
          onValueChange={updateCurrentBalance}
          className="text-center text-2xl"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border/60 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
