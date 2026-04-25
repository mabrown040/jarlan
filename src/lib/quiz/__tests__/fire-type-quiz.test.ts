import { describe, expect, it } from "vitest";

import {
  DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
  buildScenarioFromQuizAnswers,
} from "@/lib/quiz/fire-type-quiz";

describe("fire type quiz", () => {
  it("builds a scenario that carries the suggested part-time income", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      partTimePreference: "yes",
      currentPortfolio: 250_000,
    });

    expect(scenario.assumptions.partTimeIncome).toBe(20_000);
    expect(scenario.accounts[0]?.currentBalance).toBe(250_000);
  });

  /**
   * Regression for the "quiz shows $80K save / $150K spend but take-home
   * is $259K" report. The quiz previously set annualSavings = sum of
   * explicit account contributions, silently dropping any leftover
   * take-home → spending gap. The "Tune your plan" slider then
   * mismatched the sankey/cashflow on first render, and the linked
   * spend↔save invariant snapped to a different value the moment the
   * user touched the slider. Fix: reconcile annualSavings to the
   * take-home − spending invariant and route the leftover into the
   * taxable brokerage so the cashflow adds up from the first render.
   */
  it("reconciles annualSavings with take-home when partial contributions are entered", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 400_000,
      filingStatus: "married_joint",
      state: "CA",
      annualSpending: 150_000,
      currentPortfolio: 600_000,
      taxableBalance: 400_000,
      traditionalBalance: 200_000,
      traditionalContribution: 23_500,
      rothContribution: 7_000,
      taxableContribution: 0,
    });

    const totalContributions = scenario.accounts.reduce(
      (sum, account) => sum + account.annualContribution,
      0,
    );
    // annualSavings should equal total contributions (invariant both
    // the slider and the Sankey rely on) rather than the raw sum of
    // quiz-entered contributions.
    expect(scenario.annualSavings).toBe(totalContributions);
    // And because take-home > spending + explicit contributions, the
    // taxable account must have absorbed the leftover (>0 on an account
    // the user entered as 0).
    const taxable = scenario.accounts.find((a) => a.type === "taxable");
    expect(taxable).toBeDefined();
    expect(taxable!.annualContribution).toBeGreaterThan(0);
  });

  it("leaves annualSavings untouched when spending already exceeds take-home", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 60_000,
      annualSpending: 55_000,
      currentPortfolio: 10_000,
      taxableBalance: 10_000,
      taxableContribution: 0,
    });

    // Take-home on $60K single-filer is ≲ $50K, less than $55K spending.
    // taxAwareSavings clamps to 0, so no leftover to route. Savings stays
    // at the explicit contribution sum (0 here), no negative top-up.
    expect(scenario.annualSavings).toBe(0);
    const taxable = scenario.accounts.find((a) => a.type === "taxable");
    expect(taxable?.annualContribution).toBe(0);
  });
});
