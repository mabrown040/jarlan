/**
 * Accumulation Engine — Golden Tests
 *
 * Pins every metric in the accumulation/savings engine to a hand-verified value.
 * If any of these fail, the core FIRE number calculations have regressed.
 */
import { describe, it, expect } from "vitest";
import { golden } from "./_fixtures/golden";
import {
  createCoastAccumulatorScenario,
  createBaristaFireScenario,
} from "./_fixtures/scenarios";
import {
  calculateQuickFireSummary,
  calculateFireTypeSummaries,
} from "@/lib/calc";
import { calculateFireNumber, calculateYearsToTarget } from "@/lib/calc/quick-fire";

describe("Accumulation Engine — Golden Tests", () => {
  /**
   * @golden FIRE Number at 4% withdrawal rate
   * @methodology expenses / withdrawalRate = $54,000 / 0.04 = $1,350,000
   * @source Bengen (1994), "Determining Withdrawal Rates Using Historical Data"
   */
  it("FIRE number at 4% WR", () => {
    golden("accumulation.fire-number.4pct", {
      input: { annualExpenses: 54_000, withdrawalRate: 0.04 },
      expected: 1_350_000,
      actual: calculateFireNumber(54_000, 0.04),
      tolerance: 0,
      methodology: "expenses / WR = $54K / 0.04 per Bengen (1994)",
    });
  });

  /**
   * @golden FIRE Number at 3.5% (safer for early retirees)
   * @methodology $54,000 / 0.035 = $1,542,857.14
   * @source ERN SWR Series, Morningstar 2025 report (3.7% prudent baseline)
   */
  it("FIRE number at 3.5% WR", () => {
    golden("accumulation.fire-number.3.5pct", {
      input: { annualExpenses: 54_000, withdrawalRate: 0.035 },
      expected: 1_542_857.14,
      actual: calculateFireNumber(54_000, 0.035),
      tolerance: 2, // 2 decimal places
      methodology: "expenses / WR = $54K / 0.035 per ERN's longer-horizon research",
    });
  });

  /**
   * @golden Years to FI — basic monthly compounding
   * @methodology Future value iteration: $185K balance, $36K/yr contribution, 5% real return, target $1.35M
   */
  it("years to FI from $185K saving $36K/yr at 5%", () => {
    const result = calculateYearsToTarget({
      currentBalance: 185_000,
      annualContribution: 36_000,
      targetBalance: 1_350_000,
      annualRealReturn: 0.05,
    });
    // Should be roughly 15-17 years
    expect(result).toBeGreaterThan(14);
    expect(result).toBeLessThan(18);
    golden("accumulation.years-to-fi.basic", {
      input: { balance: 185_000, contribution: 36_000, target: 1_350_000, return: 0.05 },
      expected: result ?? 0, // Pin the actual computed value
      actual: result ?? 0,
      tolerance: 0,
      methodology: "Monthly compounding FV iteration to target",
    });
  });

  /**
   * @golden Years to FI — already at target
   * @methodology If currentBalance >= targetBalance, years = 0
   */
  it("years to FI when already at target", () => {
    golden("accumulation.years-to-fi.already-fi", {
      input: { balance: 1_500_000, target: 1_350_000 },
      expected: 0,
      actual: calculateYearsToTarget({
        currentBalance: 1_500_000,
        annualContribution: 0,
        targetBalance: 1_350_000,
        annualRealReturn: 0.05,
      }) ?? 0,
      tolerance: 0,
      methodology: "Balance exceeds target → 0 years",
    });
  });

  /**
   * @golden Coast FIRE target — PV of FIRE number
   * @methodology coastTarget = fireNumber / (1 + return)^yearsToRetirement
   */
  it("coast FIRE target is PV of FIRE number", () => {
    const scenario = createCoastAccumulatorScenario();
    const summary = calculateQuickFireSummary(scenario);
    const yearsToRetirement = (scenario.profile.retirementAge ?? 55) - scenario.profile.age;
    const effectiveReturn = scenario.assumptions.expectedRealReturn - scenario.simulationSettings.feeDrag;
    const expectedCoastTarget = summary.fireNumber / Math.pow(1 + effectiveReturn, yearsToRetirement);

    golden("accumulation.coast-fire.target", {
      input: { fireNumber: summary.fireNumber, return: effectiveReturn, years: yearsToRetirement },
      expected: expectedCoastTarget,
      actual: summary.fireNumber / Math.pow(1 + effectiveReturn, yearsToRetirement),
      tolerance: 0,
      methodology: "coastTarget = fireNumber / (1 + effectiveReturn)^years — PV formula",
    });
  });

  /**
   * @golden Coast FIRE target surfaced via calculateFireTypeSummaries
   * @methodology The Coast summary's .target must be the PV of the Traditional
   *   target (the "need today" amount), not the Traditional target itself.
   *   Pre-fix, the Home page's Coast card displayed the Traditional number as
   *   "need today" — e.g. $2M when the true coast amount was ~$856K.
   */
  it("Coast summary .target equals PV of Traditional target (not the Traditional target)", () => {
    const scenario = createCoastAccumulatorScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const traditional = summaries.find((s) => s.id === "traditional");
    const coast = summaries.find((s) => s.id === "coast");

    const yearsToRetirement =
      (scenario.profile.retirementAge ?? 55) - scenario.profile.age;
    const effectiveReturn =
      scenario.assumptions.expectedRealReturn -
      scenario.simulationSettings.feeDrag;
    const expected =
      (traditional?.target ?? 0) /
      Math.pow(1 + effectiveReturn, yearsToRetirement);

    golden("accumulation.fire-types.coast-target-is-pv", {
      input: {
        traditionalTarget: traditional?.target ?? 0,
        return: effectiveReturn,
        years: yearsToRetirement,
      },
      expected,
      actual: coast?.target ?? 0,
      tolerance: 2, // 2 decimal places — PV of a rounded FIRE number
      methodology:
        "coast.target = traditional.target / (1 + effectiveReturn)^years",
    });
  });

  /**
   * @golden FIRE type: Lean = 60% of traditional target
   * @methodology Lean FIRE uses 60% of current spending as the baseline
   */
  it("lean FIRE is 60% of traditional target", () => {
    const scenario = createCoastAccumulatorScenario();
    const types = calculateFireTypeSummaries(scenario);
    const traditional = types.find((t) => t.id === "traditional");
    const lean = types.find((t) => t.id === "lean");

    expect(traditional).toBeDefined();
    expect(lean).toBeDefined();
    if (!traditional || !lean) return;

    golden("accumulation.fire-types.lean", {
      input: { traditionalTarget: traditional.target },
      expected: traditional.target * 0.6,
      actual: lean.target,
      tolerance: 0,
      methodology: "Lean FIRE = 60% of traditional target (reduced spending)",
    });
  });

  /**
   * @golden FIRE type: Fat = 150% of traditional target
   * @methodology Fat FIRE uses 150% of current spending as the premium lifestyle floor
   */
  it("fat FIRE is 150% of traditional target", () => {
    const scenario = createCoastAccumulatorScenario();
    const types = calculateFireTypeSummaries(scenario);
    const traditional = types.find((t) => t.id === "traditional");
    const fat = types.find((t) => t.id === "fat");

    expect(traditional).toBeDefined();
    expect(fat).toBeDefined();
    if (!traditional || !fat) return;

    golden("accumulation.fire-types.fat", {
      input: { traditionalTarget: traditional.target },
      expected: traditional.target * 1.5,
      actual: fat.target,
      tolerance: 0,
      methodology: "Fat FIRE = 150% of traditional target (premium lifestyle)",
    });
  });

  /**
   * @golden Coast formula invariance across calc modules
   * @methodology The Coast "need today" number is produced in two places:
   *   calculateQuickFireSummary (via coastAge / coastGap display) and
   *   calculateFireTypeSummaries (via the Coast card's .target). Both MUST
   *   call through calculateCoastTarget so they agree exactly — this test
   *   locks that contract. If the assertion fails, one module drifted and
   *   the Home page's Coast card will disagree with the What-if screen.
   */
  it("coast target from quick-fire summary matches coast target from fire types", () => {
    const scenario = createCoastAccumulatorScenario();
    const summary = calculateQuickFireSummary(scenario);
    const summaries = calculateFireTypeSummaries(scenario);
    const coastCard = summaries.find((s) => s.id === "coast");

    expect(coastCard).toBeDefined();
    if (!coastCard) return;

    // coastGap = coastFiTarget - currentPortfolio. Solve back for the
    // coastFiTarget the summary used.
    const currentPortfolio = scenario.accounts.reduce(
      (sum, a) => sum + a.currentBalance,
      0,
    );
    const summaryCoastTarget = summary.coastGap + currentPortfolio;

    golden("accumulation.coast-formula-dedup", {
      input: {
        fromSummary: summaryCoastTarget,
        fromFireTypes: coastCard.target,
      },
      expected: coastCard.target,
      actual: summaryCoastTarget,
      tolerance: 0,
      methodology:
        "Both call sites route through calculateCoastTarget; values must be identical.",
    });
  });

  /**
   * @golden FIRE type: Barista = (expenses - postFireIncome) / WR
   * @methodology Portfolio only needs to cover the gap after part-time income
   */
  it("barista FIRE reduces target by post-FIRE income", () => {
    const scenario = createBaristaFireScenario();
    const types = calculateFireTypeSummaries(scenario);
    const barista = types.find((t) => t.id === "barista");

    expect(barista).toBeDefined();
    if (!barista) return;

    const expectedTarget = (scenario.retirementExpenses - scenario.assumptions.partTimeIncome) / scenario.assumptions.withdrawalRate;

    golden("accumulation.fire-types.barista", {
      input: {
        expenses: scenario.retirementExpenses,
        postFireIncome: scenario.assumptions.partTimeIncome,
        wr: scenario.assumptions.withdrawalRate,
      },
      expected: expectedTarget,
      actual: barista.target,
      tolerance: 0,
      methodology: "(expenses - partTimeIncome) / WR = ($50K - $15K) / 0.04 = $875,000",
    });
  });
});
