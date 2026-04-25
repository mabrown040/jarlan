import { describe, expect, it } from "vitest";

import { calculateFireTypeSummaries, calculateQuickFireSummary } from "@/lib/calc";
import { createDefaultScenario } from "@/lib/domain";

describe("fire type summaries", () => {
  // Note: Lean and Fat are intentionally NOT returned — they're
  // socioeconomic labels the calculator refuses to prescribe. What
  // counts as lean or fat is personal; users express that through
  // their actual retirement expenses input. See
  // `/education/what-is-fire` for the user-facing explanation.
  it("returns the single FIRE target plus Coast and Barista variants", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);

    expect(summaries).toHaveLength(3);
    expect(summaries.map((item) => item.id)).toEqual([
      "fire",
      "coast",
      "barista",
    ]);
  });

  it("barista target is less than the FIRE target when part-time income is set", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const quickSummary = calculateQuickFireSummary(scenario);
    const barista = summaries.find((item) => item.id === "barista");

    expect(barista?.target ?? 0).toBeLessThan(quickSummary.fireNumber);
  });

  /**
   * Regression guard for the Round 2 Tier 1 Coast FIRE bug: the card previously
   * displayed the FIRE target as the "need today" amount. Coast target
   * must be the present value of the FIRE number at the scenario's effective
   * real return, so a user sees the amount that — if they stopped contributing
   * today — would still compound up to FIRE by their retirement age.
   */
  it("coast target is PV of the FIRE target, not the FIRE target itself", () => {
    const scenario = createDefaultScenario();
    scenario.profile.age = 35;
    scenario.profile.retirementAge = 55;
    scenario.assumptions.expectedRealReturn = 0.05;
    // Neutralize feeDrag for a clean formula check. The implementation
    // subtracts feeDrag, so any non-zero value would shift the expected PV.
    scenario.simulationSettings.feeDrag = 0;

    const summaries = calculateFireTypeSummaries(scenario);
    const fire = summaries.find((s) => s.id === "fire");
    const coast = summaries.find((s) => s.id === "coast");

    expect(fire?.target).toBeGreaterThan(0);
    expect(coast?.target).toBeLessThan(fire?.target ?? Infinity);
    const expected = (fire?.target ?? 0) / (1 + 0.05) ** 20;
    expect(coast?.target).toBeCloseTo(expected, -2);
  });
});
