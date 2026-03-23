import { describe, expect, it } from "vitest";

import { calculateFireTypeSummaries, calculateQuickFireSummary } from "@/lib/calc";
import { createDefaultScenario } from "@/lib/domain";

describe("calculator performance budgets", () => {
  it("keeps quick-fire summaries comfortably under interactive budgets", () => {
    const scenario = createDefaultScenario();
    const start = performance.now();

    for (let index = 0; index < 1_000; index += 1) {
      calculateQuickFireSummary(scenario);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(150);
  });

  it("keeps fire-type aggregation lightweight", () => {
    const scenario = createDefaultScenario();
    const start = performance.now();

    for (let index = 0; index < 1_000; index += 1) {
      calculateFireTypeSummaries(scenario);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
