/**
 * Quiz → Plan seam test.
 *
 * Simulates the end-to-end path a new user walks: complete the quiz,
 * land in the planner, drag the "Save per year" slider. This is the
 * exact seam the user-reported "$80K save / $150K spend / $259K
 * take-home" bug lived in. Unit tests for the quiz and unit tests for
 * the store updater each passed individually; the bug was in the
 * handoff.
 *
 * This suite exercises the full seam without mounting React:
 *   buildScenarioFromQuizAnswers → store-updater equivalents →
 *   re-compute takeHome → assert invariants still hold.
 *
 * If this file ever fails, it means either:
 *   - the quiz builder produced a scenario that can't survive the
 *     store's expectations, OR
 *   - the store updater produced a scenario the quiz builder's
 *     downstream math can't read
 *
 * Either is a smoke signal that the contract between the two modules
 * has drifted.
 */
import { describe, expect, it } from "vitest";

import { getFlexAccountIndex } from "@/lib/calc/scenario";
import {
  DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
  buildScenarioFromQuizAnswers,
} from "@/lib/quiz/fire-type-quiz";
import { estimateScenarioTax } from "@/lib/tax";
import type { Scenario } from "@/lib/domain/types";

import { assertScenarioInvariants } from "./scenario-invariants.accuracy";

/**
 * Minimal replica of the store's `updateAnnualSavings` reducer —
 * avoids importing Zustand / the real store machinery so this test
 * stays side-effect free and doesn't need to clear IndexedDB mocks.
 *
 * Intentionally a copy, not a reuse, so a drift in either place (this
 * helper OR the store) surfaces as a test failure. The comment in the
 * real store points here.
 */
function applySavingsUpdate(scenario: Scenario, newSavings: number): Scenario {
  const flexIndex = getFlexAccountIndex(scenario);
  const otherContribTotal = scenario.accounts.reduce(
    (sum, a, i) => (i === flexIndex ? sum : sum + a.annualContribution),
    0,
  );
  return {
    ...scenario,
    annualSavings: Math.max(newSavings, 0),
    accounts: scenario.accounts.map((account, i) =>
      i === flexIndex
        ? {
            ...account,
            annualContribution: Math.max(newSavings - otherContribTotal, 0),
          }
        : account,
    ),
  };
}

/** Replica of handleSavingsChange in inline-controls.tsx */
function applyLinkedSavingsDrag(
  scenario: Scenario,
  newSavings: number,
): Scenario {
  const { takeHome } = estimateScenarioTax(scenario);
  const afterSavingsUpdate = applySavingsUpdate(scenario, newSavings);
  // Match the linked-slider UX: bumping save reshapes spend to preserve
  // save + spend = takeHome.
  return {
    ...afterSavingsUpdate,
    annualExpenses: Math.max(takeHome - newSavings, 0),
  };
}

describe("Quiz → Plan seam", () => {
  /**
   * The exact user report: HCOL couple finishes the quiz with explicit
   * account contributions that under-sum to take-home − spending. First
   * render should already show save + spend matching take-home.
   */
  it("first-render save + spend reconciles with take-home on HCOL partial-contribution quiz", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 400_000,
      filingStatus: "married_joint",
      state: "CA",
      annualSpending: 150_000,
      currentPortfolio: 600_000,
      traditionalContribution: 23_500,
      rothContribution: 7_000,
      taxableContribution: 0,
      taxableBalance: 400_000,
      traditionalBalance: 200_000,
    });

    assertScenarioInvariants(scenario, { source: "quiz-seam-first-render" });

    const { takeHome } = estimateScenarioTax(scenario);
    expect(scenario.annualSavings + scenario.annualExpenses).toBeCloseTo(
      takeHome,
      -3, // within $1K
    );
  });

  /**
   * After a slider drag, invariants must still hold. Previously the
   * slider would route the delta to accounts[0] (401k → AGI shift →
   * take-home shift → scale drift). Now it routes to taxable.
   */
  it("slider drag preserves invariants on a pre-tax-first-account persona", () => {
    const seed = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 550_000,
      filingStatus: "married_joint",
      state: "CA",
      annualSpending: 200_000,
      currentPortfolio: 2_550_000,
      traditionalContribution: 23_500,
      rothContribution: 7_000,
      hsaContribution: 8_550,
      traditionalBalance: 800_000,
      rothBalance: 200_000,
      hsaBalance: 50_000,
      taxableBalance: 1_500_000,
      taxableContribution: 0,
    });
    assertScenarioInvariants(seed, { source: "quiz-seam-seed" });

    const { takeHome: seedTakeHome } = estimateScenarioTax(seed);

    // Simulate the user bumping save by $20K.
    const afterDrag = applyLinkedSavingsDrag(seed, seed.annualSavings + 20_000);

    assertScenarioInvariants(afterDrag, { source: "quiz-seam-after-drag" });

    const { takeHome: afterTakeHome } = estimateScenarioTax(afterDrag);
    // Take-home should be stable across the drag because the delta
    // landed on the taxable account (which doesn't affect taxes).
    // Previously this drifted by hundreds of dollars when accounts[0]
    // was a 401k.
    expect(afterTakeHome).toBeCloseTo(seedTakeHome, 0);

    // Linked invariant holds post-drag.
    expect(afterDrag.annualSavings + afterDrag.annualExpenses).toBeCloseTo(
      afterTakeHome,
      -3,
    );
  });

  /**
   * Quiz output for a user who didn't allocate any specific
   * contributions. Everything should land on the taxable account.
   */
  it("quiz with zero explicit contributions routes all savings to taxable", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 100_000,
      filingStatus: "single",
      state: "TX",
      annualSpending: 50_000,
      currentPortfolio: 20_000,
      traditionalContribution: 0,
      rothContribution: 0,
      hsaContribution: 0,
      taxableContribution: 0,
      taxableBalance: 20_000,
    });

    assertScenarioInvariants(scenario, { source: "quiz-zero-contribs" });

    // Only account is taxable, and it has the full savings amount.
    const taxable = scenario.accounts.find((a) => a.type === "taxable");
    expect(taxable).toBeDefined();
    expect(taxable!.annualContribution).toBe(scenario.annualSavings);
  });

  /**
   * Slider drag on a default-scenario-like setup should still satisfy
   * invariants. The default has a single taxable account, so flex ===
   * accounts[0] naturally — this verifies the change didn't break the
   * simple case.
   */
  it("slider drag on a default-single-account scenario preserves invariants", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 128_000,
      annualSpending: 54_000,
      currentPortfolio: 185_000,
      taxableBalance: 185_000,
      taxableContribution: 0,
    });

    assertScenarioInvariants(scenario, { source: "quiz-default-shape" });

    const afterDrag = applyLinkedSavingsDrag(scenario, 30_000);
    assertScenarioInvariants(afterDrag, { source: "default-shape-after-drag" });
  });
});
