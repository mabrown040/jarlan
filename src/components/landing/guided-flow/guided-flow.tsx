"use client";

import { useState } from "react";
import { StepSpending } from "./step-spending";
import { StepSaved } from "./step-saved";
import { StepSaving } from "./step-saving";
import { StepResult } from "./step-result";

const STEPS = ["spending", "saved", "saving", "result"] as const;

export function GuidedFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      {/* Progress dots */}
      <div className="mb-10 flex justify-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === stepIndex
                ? "w-8 bg-primary"
                : i < stepIndex
                  ? "w-2 bg-primary/40"
                  : "w-2 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[24rem]">
        {step === "spending" && <StepSpending onNext={next} />}
        {step === "saved" && <StepSaved onNext={next} onBack={back} />}
        {step === "saving" && <StepSaving onNext={next} onBack={back} />}
        {step === "result" && <StepResult onBack={back} />}
      </div>
    </section>
  );
}
