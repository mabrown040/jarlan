import { describe, expect, it } from "vitest";

import { calculateFireTypeSummaries, calculateQuickFireSummary } from "@/lib/calc";
import { createDefaultScenario } from "@/lib/domain";

describe("fire type summaries", () => {
  it("generates all 5 fire type cards", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);

    expect(summaries).toHaveLength(5);
    expect(summaries.map((item) => item.id)).toEqual([
      "traditional",
      "lean",
      "fat",
      "coast",
      "barista",
    ]);
  });

  it("lean target is less than traditional and fat is more", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const traditional = summaries.find((item) => item.id === "traditional");
    const lean = summaries.find((item) => item.id === "lean");
    const fat = summaries.find((item) => item.id === "fat");

    expect(lean?.target).toBeLessThan(traditional?.target ?? 0);
    expect(fat?.target).toBeGreaterThan(traditional?.target ?? 0);
  });

  it("barista target is less than traditional when part-time income is set", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const quickSummary = calculateQuickFireSummary(scenario);
    const barista = summaries.find((item) => item.id === "barista");

    expect(barista?.target ?? 0).toBeLessThan(quickSummary.fireNumber);
  });

  it("lean is 60% of spending and fat is 150%", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const traditional = summaries.find((item) => item.id === "traditional");
    const lean = summaries.find((item) => item.id === "lean");
    const fat = summaries.find((item) => item.id === "fat");

    expect(lean?.target).toBeCloseTo((traditional?.target ?? 0) * 0.6, -2);
    expect(fat?.target).toBeCloseTo((traditional?.target ?? 0) * 1.5, -2);
  });

  /**
   * Regression guard for the Round 2 Tier 1 Coast FIRE bug: the card previously
   * displayed Traditional FIRE's target as the "need today" amount. Coast target
   * must be the present value of the FIRE number at the scenario's effective
   * real return, so a user sees the amount that — if they stopped contributing
   * today — would still compound up to FIRE by their retirement age.
   */
  it("coast target is PV of traditional target, not traditional target itself", () => {
    const scenario = createDefaultScenario();
    scenario.profile.age = 35;
    scenario.profile.retirementAge = 55;
    scenario.assumptions.expectedRealReturn = 0.05;
    // Neutralize feeDrag for a clean formula check. The implementation
    // subtracts feeDrag, so any non-zero value would shift the expected PV.
    scenario.simulationSettings.feeDrag = 0;

    const summaries = calculateFireTypeSummaries(scenario);
    const traditional = summaries.find((s) => s.id === "traditional");
    const coast = summaries.find((s) => s.id === "coast");

    expect(traditional?.target).toBeGreaterThan(0);
    expect(coast?.target).toBeLessThan(traditional?.target ?? Infinity);
    const expected = (traditional?.target ?? 0) / (1 + 0.05) ** 20;
    expect(coast?.target).toBeCloseTo(expected, -2);
  });
});
