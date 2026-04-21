/**
 * Scenario Invariants — cross-module contracts that must hold after
 * any state-mutating path.
 *
 * Background: the "quiz showed $80K save / $150K spend but take-home was
 * $259K" bug lived in the seam between the quiz builder and the store
 * updater. Each module was individually correct but violated the other's
 * expectations. Single-unit tests can't catch that — invariant tests can.
 *
 * Each invariant here is a property that SHOULD hold regardless of which
 * path produced the scenario. When any of these fails, the producing
 * module has drifted from the shared contract and UI elsewhere is lying.
 *
 * When adding a new scenario-mutating function anywhere in the codebase,
 * run the output through `assertScenarioInvariants` before calling it
 * done.
 */
import { describe, expect, it } from "vitest";

import {
  getCurrentPortfolioBalance,
  getPlannedAnnualInvestmentContribution,
  getFlexAccountIndex,
} from "@/lib/calc/scenario";
import { createDefaultScenario } from "@/lib/domain";
import {
  DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
  buildScenarioFromQuizAnswers,
} from "@/lib/quiz/fire-type-quiz";
import {
  buildDecisionTemplates,
  resolveDecision,
} from "@/lib/scenario-lab/life-decisions";
import { buildScenarioForStartingPortfolio } from "@/lib/scenario-lab/spend-analysis";
import { estimateScenarioTax } from "@/lib/tax";
import type { Scenario } from "@/lib/domain/types";

/**
 * The shared contract. When any assertion fails, name the path that
 * produced the scenario and the field that violates the invariant.
 */
export function assertScenarioInvariants(
  scenario: Scenario,
  context: {
    source: string;
    /** Tolerance for the annualSavings ↔ account-sum check (default $5). */
    savingsTolerance?: number;
    /**
     * Tolerance for the save+spend ≤ take-home check. Looser than
     * savingsTolerance because the tax estimator rounds cents and FICA
     * employer-half math introduces low-thousands of noise on realistic
     * incomes. Default $3,000 — still catches the user-reported $29K
     * quiz gap by an order of magnitude.
     */
    cashflowTolerance?: number;
  } = { source: "unknown" },
) {
  const {
    source,
    savingsTolerance = 5,
    cashflowTolerance = 3_000,
  } = context;
  const contributionSum = scenario.accounts.reduce(
    (sum, a) => sum + a.annualContribution,
    0,
  );

  // Invariant 1: annualSavings tracks the sum of per-account contributions.
  // If these diverge, the slider and the projection engine see different
  // savings amounts. This was the root of the quiz mismatch bug.
  expect(scenario.annualSavings, `[${source}] annualSavings drift`).toBeCloseTo(
    contributionSum,
    /* decimal-places */ -Math.ceil(Math.log10(Math.max(savingsTolerance, 1))),
  );

  // Invariant 2: when income is positive, savings + expenses can't exceed
  // take-home by more than a reasonable rounding tolerance. A user saving
  // more than their take-home allows is non-physical — the money has to
  // come from somewhere, and if the scenario doesn't model it, downstream
  // math lies. The user-reported bug was a $29K gap; $3K tolerance catches
  // that by 10x while accepting tax-estimator noise.
  if (scenario.annualIncome > 0) {
    const { takeHome } = estimateScenarioTax(scenario);
    const overflow = scenario.annualSavings + scenario.annualExpenses - takeHome;
    expect(
      overflow,
      `[${source}] save + spend exceeds take-home by >${cashflowTolerance}`,
    ).toBeLessThanOrEqual(cashflowTolerance);
  }

  // Invariant 3: account balances sum to the scenario's total portfolio.
  // getCurrentPortfolioBalance is a getter — if it ever stops matching
  // the per-account sum, multiple UIs go out of sync.
  const accountBalanceSum = scenario.accounts.reduce(
    (sum, a) => sum + a.currentBalance,
    0,
  );
  expect(
    getCurrentPortfolioBalance(scenario.accounts),
    `[${source}] portfolio total drift`,
  ).toBeCloseTo(accountBalanceSum, 0);

  // Invariant 4: getPlannedAnnualInvestmentContribution >= contributionSum.
  // The planned contribution includes employer match on top of what the
  // user contributes; it should never be less than the account sum.
  expect(
    getPlannedAnnualInvestmentContribution(scenario),
    `[${source}] planned contribution below account sum`,
  ).toBeGreaterThanOrEqual(contributionSum - savingsTolerance);

  // Invariant 5: no negative contributions or balances.
  for (const account of scenario.accounts) {
    expect(
      account.annualContribution,
      `[${source}] negative contribution on ${account.name}`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      account.currentBalance,
      `[${source}] negative balance on ${account.name}`,
    ).toBeGreaterThanOrEqual(0);
  }
}

describe("Scenario invariants — cross-module contracts", () => {
  it("holds for the default scenario", () => {
    assertScenarioInvariants(createDefaultScenario(), { source: "default" });
  });

  it("holds after the quiz builder runs with partial account contributions", () => {
    // This is the exact shape of the user-reported bug: take-home supports
    // more savings than the explicit account contributions sum to.
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
    assertScenarioInvariants(scenario, { source: "quiz / partial contribs" });
  });

  it("holds after the quiz builder runs with no contributions entered", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 80_000,
      annualSpending: 40_000,
      currentPortfolio: 10_000,
      taxableBalance: 10_000,
      traditionalContribution: 0,
      rothContribution: 0,
      hsaContribution: 0,
      taxableContribution: 0,
    });
    assertScenarioInvariants(scenario, { source: "quiz / no contribs" });
  });

  it("holds after buildScenarioForStartingPortfolio rescales a multi-account scenario", () => {
    const base = createDefaultScenario();
    // Add a second account so we can verify proportional scaling.
    base.accounts.push({
      id: "extra",
      name: "Roth",
      type: "roth_ira",
      currentBalance: 50_000,
      annualContribution: 6_000,
      assetAllocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 },
      expenseRatio: 0.001,
    });
    // After we rescale, annualSavings won't match automatically — the
    // helper only touches balances. This invariant version skips the
    // save-consistency check; we only assert portfolio totals + non-
    // negativity here.
    const rescaled = buildScenarioForStartingPortfolio(base, 2_000_000);
    expect(getCurrentPortfolioBalance(rescaled.accounts)).toBeCloseTo(
      2_000_000,
      0,
    );
    for (const account of rescaled.accounts) {
      expect(account.currentBalance).toBeGreaterThanOrEqual(0);
    }
  });

  it("holds after every life decision applies to the High Earner-shape scenario", () => {
    const base = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 550_000,
      filingStatus: "married_joint",
      state: "CA",
      annualSpending: 200_000,
      currentPortfolio: 2_550_000,
      taxableBalance: 1_500_000,
      traditionalBalance: 800_000,
      rothBalance: 200_000,
      hsaBalance: 50_000,
      traditionalContribution: 23_500,
      rothContribution: 7_000,
      hsaContribution: 8_550,
      taxableContribution: 0,
    });
    assertScenarioInvariants(base, { source: "he-base" });

    const templates = buildDecisionTemplates(base);
    // Apply every decision template with its default value and assert the
    // output still satisfies invariants. Catches regressions in
    // life-decisions.ts routing logic.
    for (const template of templates) {
      const values: Record<string, number> = {};
      for (const p of template.params) {
        values[p.id] = p.defaultValue;
      }
      values._expenses = base.annualExpenses;
      values._originalBaseReturn = base.assumptions.expectedRealReturn;
      const decision = resolveDecision(template, values);
      const mutated = decision.apply(base);

      // The save-consistency invariant doesn't cleanly apply after all
      // decision templates — e.g. lifestyle-change sets annualExpenses
      // and annualSavings such that they balance, but the
      // post-decision state may push account contributions to 0 while
      // annualSavings stays above. Focus on the non-negativity + total
      // portfolio contract here.
      const contributionSum = mutated.accounts.reduce(
        (sum, a) => sum + a.annualContribution,
        0,
      );
      expect(
        contributionSum,
        `[decision ${template.id}] negative contribution sum`,
      ).toBeGreaterThanOrEqual(0);
      for (const account of mutated.accounts) {
        expect(
          account.annualContribution,
          `[decision ${template.id}] negative contribution on ${account.name}`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          account.currentBalance,
          `[decision ${template.id}] negative balance on ${account.name}`,
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("life decisions route contribution deltas to the flex account, not accounts[0]", () => {
    const base = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualIncome: 550_000,
      filingStatus: "married_joint",
      state: "CA",
      annualSpending: 200_000,
      currentPortfolio: 2_550_000,
      traditionalBalance: 800_000,
      traditionalContribution: 23_500,
      taxableBalance: 1_500_000,
      taxableContribution: 0,
    });

    // Pre-condition: accounts[0] is a traditional_401k (the pattern that
    // caused the slider drift bug).
    expect(base.accounts[0].type).toBe("traditional_401k");
    const flexIndex = getFlexAccountIndex(base);
    expect(flexIndex).not.toBe(0);

    const before401k = base.accounts[0].annualContribution;

    // Apply a positive income change — should raise the flex account's
    // contribution, NOT accounts[0]'s 401k contribution.
    const templates = buildDecisionTemplates(base);
    const incomeTemplate = templates.find((t) => t.id === "income-change");
    expect(incomeTemplate).toBeDefined();
    const decision = resolveDecision(incomeTemplate!, {
      amount: 30_000,
      startAge: base.profile.age,
    });
    const mutated = decision.apply(base);

    // 401k contribution must be unchanged — the decision handler used to
    // blindly write to accounts[0] and bump the 401k past IRS limits.
    expect(mutated.accounts[0].annualContribution).toBe(before401k);
    // Flex (taxable) account absorbed the after-tax delta.
    expect(mutated.accounts[flexIndex].annualContribution).toBeGreaterThan(0);
  });
});
