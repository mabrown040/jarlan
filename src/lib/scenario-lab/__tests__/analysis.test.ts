import { describe, expect, it } from "vitest";

import { createDefaultScenario } from "@/lib/domain";
import {
  applyVariantToScenario,
  buildOneMoreYearAnalysis,
  buildSensitivityAnalysis,
} from "@/lib/scenario-lab/analysis";

describe("scenario lab analysis", () => {
  it("applies variant deltas to the base scenario", () => {
    const scenario = createDefaultScenario();
    const variant = applyVariantToScenario(scenario, {
      id: "test",
      name: "Test variant",
      annualSavingsDelta: 6_000,
      retirementExpenseDelta: -6_000,
      retirementAgeDelta: 1,
      realReturnDelta: 0.005,
    });

    expect(variant.annualSavings).toBe(scenario.annualSavings + 6_000);
    expect(variant.retirementExpenses).toBe(scenario.retirementExpenses - 6_000);
    expect(variant.profile.retirementAge).toBe((scenario.profile.retirementAge ?? 0) + 1);
    expect(variant.assumptions.expectedRealReturn).toBeCloseTo(
      scenario.assumptions.expectedRealReturn + 0.005,
      6,
    );
  });

  it("builds sensitivity and one-more-year outputs", () => {
    const scenario = createDefaultScenario();

    expect(buildSensitivityAnalysis(scenario)).toHaveLength(4);
    expect(buildOneMoreYearAnalysis(scenario).extraRetirementBalance).toBeGreaterThan(0);
  });
});
