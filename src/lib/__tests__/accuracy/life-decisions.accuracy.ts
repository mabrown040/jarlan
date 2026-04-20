/**
 * Life Decision Composition — Golden Tests
 *
 * Pins the combined effect of multi-select life decisions to hand-verified values.
 * Ensures the apply() chain produces correct results when composing decisions.
 */
import { describe, it, expect } from "vitest";
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

  /**
   * @golden Career break with partner income: displayed Income column = breakIncome
   *
   * The Coast Accumulator scenario is 28yo, age-55 target, $35K expenses.
   * Running a 10-year break at age 30 with $40K "partner income" should
   * make the Year-by-year Income column report exactly $40K during the
   * break years — not $0 (old single-CF bug) and not "full salary" (base
   * income CF). Savings should reduce to breakIncome − expenses.
   */
  it("career break: Income column shows breakIncome during break years", () => {
    const decision = applyDecisionToScenario(base, "career-break", {
      duration: 10,
      startAge: 30,
      breakIncome: 40_000,
      growsWithRaises: 0,
    });
    const modified = decision.apply(base);
    const summary = calculateQuickFireSummary(modified);

    // Display layer uses start-of-year age to pick up active CFs. A break
    // starting at age 30 shows up beginning with the row whose start-of-year
    // age is 30 — i.e. projection year 3 in Coast (base age 28 → 28+3-1=30).
    const breakRow = summary.projection.find((p) => Math.floor(p.age) === 31);
    expect(breakRow).toBeDefined();
    expect(breakRow!.income).toBe(40_000);
    // Savings = breakIncome − expenses (~$35K with 1% creep for one year).
    expect(breakRow!.savings).toBeGreaterThan(3_000);
    expect(breakRow!.savings).toBeLessThan(7_000);
  });

  /**
   * @golden Career break with "grows with raises" scales income over time
   *
   * Same setup but with raises enabled. Break income should grow at the
   * scenario's incomeGrowthRate (default 1% real for this fixture), so the
   * last break year's displayed income is materially higher than the first.
   */
  it("career break raises: income grows year over year during break", () => {
    const decision = applyDecisionToScenario(base, "career-break", {
      duration: 10,
      startAge: 30,
      breakIncome: 40_000,
      growsWithRaises: 1,
    });
    const modified = decision.apply(base);
    const summary = calculateQuickFireSummary(modified);

    // First displayable break row = start-of-year age 30 (projection year 3)
    const firstBreakRow = summary.projection.find(
      (p) => Math.floor(p.age) === 31,
    );
    const lastBreakRow = summary.projection.find(
      (p) => Math.floor(p.age) === 40,
    );
    expect(firstBreakRow).toBeDefined();
    expect(lastBreakRow).toBeDefined();
    // With raises on, the final break year income strictly exceeds the first.
    // `.income` is optional on ProjectionPoint; fallback to 0 keeps the TS
    // signature for `toBeGreaterThan(number)` happy.
    expect(lastBreakRow!.income ?? 0).toBeGreaterThan(firstBreakRow!.income ?? 0);
    // And the first-break row matches the flat baseline ($40K) — growth
    // hasn't compounded yet at that point.
    expect(firstBreakRow!.income).toBe(40_000);
  });

  /**
   * @golden Career break with zero breakIncome: Income column = $0
   *
   * No partner income / no severance. The Income column should reflect
   * that, and the Savings column should be strongly negative because the
   * portfolio alone has to cover expenses.
   */
  it("career break with no income: Income = 0 and savings negative", () => {
    const decision = applyDecisionToScenario(base, "career-break", {
      duration: 3,
      startAge: 30,
      breakIncome: 0,
      growsWithRaises: 0,
    });
    const modified = decision.apply(base);
    const summary = calculateQuickFireSummary(modified);

    // Display-row age 31 (start-of-year 30) is the first break row
    const breakRow = summary.projection.find((p) => Math.floor(p.age) === 31);
    expect(breakRow).toBeDefined();
    expect(breakRow!.income).toBe(0);
    // Savings = 0 − expenses ≈ −$35K
    expect(breakRow!.savings).toBeLessThan(-30_000);
  });

  /**
   * @golden Order independence: income then lifestyle == lifestyle then income
   *
   * The Save What-if UI applies decisions in template-registration order.
   * If a user toggles A then B vs. B then A, the combined summary MUST be
   * identical — otherwise the outcome depends on UI click order, which is
   * a correctness bug. Tests commutativity for monotonic decisions.
   */
  it("order-independent: income + lifestyle compose the same either way", () => {
    const incomeDecision = applyDecisionToScenario(base, "income-change", {
      amount: 15_000,
    });
    const lifestyleDecision = applyDecisionToScenario(
      base,
      "lifestyle-change",
      { amount: -10_000 },
    );

    const aThenB = lifestyleDecision.apply(incomeDecision.apply(base));
    const bThenA = incomeDecision.apply(lifestyleDecision.apply(base));

    const summaryAB = calculateQuickFireSummary(aThenB);
    const summaryBA = calculateQuickFireSummary(bThenA);

    // yearsToFi is optional on the summary, coerce with nullish fallback
    // so toBeCloseTo sees a real number.
    expect(summaryAB.yearsToFi ?? -1).toBeCloseTo(summaryBA.yearsToFi ?? -1, 5);
    expect(summaryAB.fireNumber).toBeCloseTo(summaryBA.fireNumber, 0);
  });

  /**
   * @golden Four-way stack produces finite, sensible results
   *
   * Real users select 3–4 decisions at once. Stack the four most common
   * (income, lifestyle, portfolio, market) and assert the output is
   * finite (no NaN/Infinity leak through the compose chain) and in a
   * plausible range.
   */
  it("four-way stack yields finite summary with sensible bounds", () => {
    const decisions = [
      applyDecisionToScenario(base, "income-change", { amount: 15_000 }),
      applyDecisionToScenario(base, "lifestyle-change", { amount: -10_000 }),
      applyDecisionToScenario(base, "portfolio-event", { amount: 100_000 }),
      applyDecisionToScenario(base, "market-event"),
    ];

    const combined = decisions.reduce(
      (scenario, decision) => decision.apply(scenario),
      base,
    );
    const result = calculateQuickFireSummary(combined);

    expect(Number.isFinite(result.fireNumber)).toBe(true);
    expect(Number.isFinite(result.yearsToFi ?? 0)).toBe(true);
    expect(result.fireNumber).toBeGreaterThan(0);
    // yearsToFi bounded: base coast is ~27 yrs to age 55; the stack has
    // two positives (income, portfolio) vs. two negatives (lifestyle cut
    // is positive, market event drags returns). Should land plausibly
    // inside [0, 60] and certainly not negative or absurdly large.
    expect(result.yearsToFi ?? 0).toBeGreaterThanOrEqual(0);
    expect(result.yearsToFi ?? 0).toBeLessThan(60);
  });

  /**
   * @golden All six decision types stack without crashing or NaN
   *
   * The Save What-if UI lets users select every decision simultaneously.
   * This test pins that the full 6-decision stack produces a valid
   * summary — catches any regression where two decisions' effects
   * combine to divide by zero, produce Infinity, or overflow the
   * projection horizon.
   */
  it("six-way stack: all decision types compose without NaN", () => {
    const decisions = [
      applyDecisionToScenario(base, "income-change", { amount: 10_000 }),
      applyDecisionToScenario(base, "lifestyle-change", { amount: -5_000 }),
      applyDecisionToScenario(base, "new-dependent"),
      applyDecisionToScenario(base, "portfolio-event", { amount: 50_000 }),
      applyDecisionToScenario(base, "career-break", {
        duration: 2,
        startAge: 32,
        breakIncome: 30_000,
        growsWithRaises: 0,
      }),
      applyDecisionToScenario(base, "market-event"),
    ];

    const combined = decisions.reduce(
      (scenario, decision) => decision.apply(scenario),
      base,
    );
    const result = calculateQuickFireSummary(combined);

    expect(Number.isFinite(result.fireNumber)).toBe(true);
    expect(Number.isNaN(result.yearsToFi ?? 0)).toBe(false);
    // Projection array populated end-to-end — no early exit from a div0.
    expect(result.projection.length).toBeGreaterThan(0);
    result.projection.forEach((point, idx) => {
      expect(Number.isFinite(point.balance), `projection[${idx}].balance`).toBe(
        true,
      );
    });
  });

  /**
   * @golden Offsetting decisions net out toward baseline
   *
   * Applying income +$20K and lifestyle +$20K (spending up by $20K) should
   * roughly cancel — the extra income offsets the extra spending, so the
   * timeline should be close to base (within a couple years). Not exact
   * because tax takes a bite out of the raise, but directionally close.
   */
  it("offsetting income and lifestyle nets near baseline", () => {
    const incomeUp = applyDecisionToScenario(base, "income-change", {
      amount: 20_000,
    });
    const spendingUp = applyDecisionToScenario(base, "lifestyle-change", {
      amount: 20_000,
    });

    const combined = spendingUp.apply(incomeUp.apply(base));
    const result = calculateQuickFireSummary(combined);

    // yearsToFi change should be small relative to the individual effects.
    // Spending +$20K alone would meaningfully push FI later (higher FIRE
    // number + lower savings). Income +$20K partially offsets via savings
    // but the higher spending also raised the FIRE target — net should be
    // slightly worse than base but not catastrophically so.
    const spendingOnly = calculateQuickFireSummary(spendingUp.apply(base));
    // Combined should be materially better than spending-up alone (income
    // is doing work), and the gap between combined and base should be
    // smaller than the gap between spending-up and base.
    const baseYears = baseSummary.yearsToFi ?? 0;
    const combinedYears = result.yearsToFi ?? 0;
    const spendingOnlyYears = spendingOnly.yearsToFi ?? 0;
    expect(Math.abs(combinedYears - baseYears)).toBeLessThan(
      Math.abs(spendingOnlyYears - baseYears),
    );
  });
});
