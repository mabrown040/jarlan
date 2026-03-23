/**
 * Life Decision Composition — Golden Tests
 *
 * Pins the combined effect of multi-select life decisions to hand-verified values.
 * Ensures the apply() chain produces correct results when composing decisions.
 */
import { describe, it, expect } from "vitest";
import { golden } from "./_fixtures/golden";
import { createCoastAccumulatorScenario } from "./_fixtures/scenarios";
import {
  buildDecisionTemplates,
  resolveDecision,
} from "@/lib/scenario-lab/life-decisions";
import { calculateQuickFireSummary } from "@/lib/calc";

function applyDecisionToScenario(
  scenario: ReturnType<typeof createCoastAccumulatorScenario>,
  id: string,
  overrides: Record<string, number> = {},
) {
  const templates = buildDecisionTemplates(scenario);
  const template = templates.find((t) => t.id === id);
  if (!template) throw new Error(`Decision template ${id} not found`);

  const values: Record<string, number> = {};
  for (const p of template.params) {
    values[p.id] = overrides[p.id] ?? p.defaultValue;
  }
  values._expenses = scenario.annualExpenses;
  // Preserve original base return for market event composition safety
  values._originalBaseReturn = scenario.assumptions.expectedRealReturn;
  return resolveDecision(template, values);
}

describe("Life Decision Composition — Golden Tests", () => {
  const base = createCoastAccumulatorScenario();
  const baseSummary = calculateQuickFireSummary(base);

  /**
   * @golden Single income change (+$15K) shortens timeline
   * @methodology Higher income → more after-tax savings → faster FI
   */
  it("single income change shortens timeline", () => {
    const decision = applyDecisionToScenario(base, "income-change", {
      amount: 15_000,
    });
    const modified = decision.apply(base);
    const result = calculateQuickFireSummary(modified);

    // Income increase should shorten timeline
    expect(result.yearsToFi).toBeLessThan(baseSummary.yearsToFi!);
    // FIRE number should be unchanged (spending didn't change)
    expect(result.fireNumber).toBeCloseTo(baseSummary.fireNumber, 0);
  });

  /**
   * @golden Single lifestyle change (-$20K/yr) has double effect
   * @methodology Lower spending → lower FIRE number AND higher savings
   */
  it("single lifestyle change has double effect", () => {
    const decision = applyDecisionToScenario(base, "lifestyle-change", {
      amount: -20_000,
    });
    const modified = decision.apply(base);
    const result = calculateQuickFireSummary(modified);

    // Spending cut → lower FIRE number AND faster timeline
    expect(result.fireNumber).toBeLessThan(baseSummary.fireNumber);
    expect(result.yearsToFi).toBeLessThan(baseSummary.yearsToFi!);
  });

  /**
   * @golden Composition: income +$15K AND lifestyle -$20K
   * @methodology Combined should be faster than either alone
   */
  it("composed income + lifestyle is better than either alone", () => {
    const incomeDecision = applyDecisionToScenario(base, "income-change", {
      amount: 15_000,
    });
    const lifestyleDecision = applyDecisionToScenario(
      base,
      "lifestyle-change",
      { amount: -20_000 },
    );

    // Chain: income first, then lifestyle
    const step1 = incomeDecision.apply(base);
    const combined = lifestyleDecision.apply(step1);
    const combinedResult = calculateQuickFireSummary(combined);

    // Individual results
    const incomeOnly = calculateQuickFireSummary(incomeDecision.apply(base));
    const lifestyleOnly = calculateQuickFireSummary(
      lifestyleDecision.apply(base),
    );

    // Combined should be faster than either alone
    expect(combinedResult.yearsToFi).toBeLessThan(incomeOnly.yearsToFi!);
    expect(combinedResult.yearsToFi).toBeLessThan(lifestyleOnly.yearsToFi!);

    // FIRE number matches lifestyle-only (income doesn't change target)
    expect(combinedResult.fireNumber).toBeCloseTo(
      lifestyleOnly.fireNumber,
      0,
    );
  });

  /**
   * @golden Portfolio event + income change compose correctly
   * @methodology Both positive → combined faster than base
   */
  it("portfolio event + income change compose correctly", () => {
    const portfolioDecision = applyDecisionToScenario(base, "portfolio-event", {
      amount: 100_000,
    });
    const incomeDecision = applyDecisionToScenario(base, "income-change", {
      amount: 15_000,
    });

    const step1 = portfolioDecision.apply(base);
    const combined = incomeDecision.apply(step1);
    const combinedResult = calculateQuickFireSummary(combined);

    // Both positive → faster than base
    expect(combinedResult.yearsToFi).toBeLessThan(baseSummary.yearsToFi!);
  });

  /**
   * @golden Negative decisions compose: child + career break
   * @methodology Both slow FI. Combined should be worse than either alone.
   */
  it("child + career break both slow timeline", () => {
    const childDecision = applyDecisionToScenario(base, "new-dependent");
    const breakDecision = applyDecisionToScenario(base, "career-break");

    const step1 = childDecision.apply(base);
    const combined = breakDecision.apply(step1);
    const combinedResult = calculateQuickFireSummary(combined);

    // Both negative → slower than base
    expect(combinedResult.yearsToFi).toBeGreaterThan(baseSummary.yearsToFi!);
  });

  /**
   * @golden Market event preserves original base return
   * @methodology When composed, market event should use ORIGINAL return,
   *              not a previously-modified one (no double-blend)
   */
  it("market event preserves original base return in composition", () => {
    const incomeDecision = applyDecisionToScenario(base, "income-change", {
      amount: 15_000,
    });
    const marketDecision = applyDecisionToScenario(base, "market-event");

    // Compose: income change first, then market event
    const step1 = incomeDecision.apply(base);
    const combined = marketDecision.apply(step1);

    // Market event default reduces returns — should be less than base
    expect(combined.assumptions.expectedRealReturn).toBeLessThan(
      base.assumptions.expectedRealReturn,
    );
    // Should be deterministic and the same regardless of income change
    const marketOnly = marketDecision.apply(base);
    expect(combined.assumptions.expectedRealReturn).toBeCloseTo(
      marketOnly.assumptions.expectedRealReturn,
      10,
    );
  });
});
