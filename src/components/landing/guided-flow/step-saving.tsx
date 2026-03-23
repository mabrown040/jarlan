"use client";

import { NumberInput } from "@/components/ui/number-input";
import { useScenarioStore } from "@/lib/store";

export function StepSaving({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { activeScenario, updateAnnualSavings } = useScenarioStore();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 text-center">
      <div className="space-y-3">
        <h2 className="font-display text-3xl tracking-[-0.03em] text-foreground md:text-4xl">
          How much can you save each year?
        </h2>
        <p className="text-muted-foreground">
          The gap between earning and spending is what fuels your freedom.
        </p>
      </div>
      <div className="w-full">
        <NumberInput
          id="wizard-savings"
          min={0}
          step={1000}
          inputMode="numeric"
          value={activeScenario.annualSavings}
          onValueChange={updateAnnualSavings}
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
          See my number
        </button>
      </div>
    </div>
  );
}
