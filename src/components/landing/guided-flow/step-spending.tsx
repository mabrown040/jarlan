"use client";

import { useState } from "react";
import { NumberInput } from "@/components/ui/number-input";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function StepSpending({ onNext }: { onNext: () => void }) {
  const { activeScenario, updateExpenses } = useScenarioStore();
  const [mode, setMode] = useState<"annual" | "monthly">("monthly");

  const value =
    mode === "monthly"
      ? Math.round(activeScenario.annualExpenses / 12)
      : activeScenario.annualExpenses;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-8 text-center">
      <div className="space-y-3">
        <h2 className="font-display text-3xl tracking-[-0.03em] text-foreground md:text-4xl">
          How much do you spend?
        </h2>
        <p className="text-muted-foreground">
          This is the single biggest lever in your FIRE plan.
        </p>
      </div>
      <div className="w-full space-y-3">
        <div className="flex justify-center">
          <div className="inline-flex rounded-full border border-border/60 bg-background/70 p-1 text-sm">
            {(["monthly", "annual"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={cn(
                  "rounded-full px-4 py-1.5 transition-colors",
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode(m)}
              >
                {m === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
        </div>
        <NumberInput
          id="wizard-expenses"
          min={0}
          step={mode === "monthly" ? 100 : 1000}
          inputMode="numeric"
          value={value}
          onValueChange={(v) =>
            updateExpenses(mode === "monthly" ? v * 12 : v)
          }
          className="text-center text-2xl"
        />
      </div>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Continue
      </button>
    </div>
  );
}
