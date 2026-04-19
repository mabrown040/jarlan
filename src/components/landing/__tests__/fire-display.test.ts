import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import type { ProjectionPoint } from "@/lib/domain/types";
import {
  deriveDisplayYearsToFi,
  deriveIncomeCardVariant,
  deriveProjectionFireYearIndex,
  derivedProjectedSpendingExplanation,
  shouldShowRaiseSavingsWarning,
} from "@/components/landing/fire-display";

function makeProjection(balances: number[], startAge: number): ProjectionPoint[] {
  return balances.map((balance, i) => ({
    year: i,
    age: startAge + i,
    balance,
    target: 0,
    contribution: 0,
    growth: 0,
    cashFlowNet: 0,
    income: 0,
    expenses: 0,
    savings: 0,
  }));
}

describe("deriveProjectionFireYearIndex", () => {
  it("returns 0 when the user is already past the FIRE target", () => {
    // Accumulator edge-case guard: the usual findIndex path filters
    // `idx > 0`, which overshoots to year 1 for past-FIRE users. This is the
    // exact bug that surfaced for the Almost-FIRE and Retired personas.
    const result = deriveProjectionFireYearIndex({
      projection: makeProjection([1_800_000, 1_900_000, 2_000_000], 48),
      traditionalTarget: 1_250_000,
      currentBalance: 1_800_000,
    });
    expect(result).toBe(0);
  });

  it("returns the first year the projection crosses the target for accumulators", () => {
    const result = deriveProjectionFireYearIndex({
      projection: makeProjection(
        [100_000, 200_000, 500_000, 1_100_000, 1_300_000, 1_600_000],
        35,
      ),
      traditionalTarget: 1_250_000,
      currentBalance: 100_000,
    });
    expect(result).toBe(4);
  });

  it("skips year 0 for accumulators (so the stat card doesn't read '0 yrs' at projection start)", () => {
    // Synthetic case: balance at year 0 equals target (e.g. target moved
    // but user already sees it as hit). Preserve the existing "don't show
    // year 0" behavior for anyone NOT genuinely past FIRE.
    const result = deriveProjectionFireYearIndex({
      projection: makeProjection([100_000, 120_000, 1_300_000], 35),
      traditionalTarget: 1_250_000,
      currentBalance: 100_000, // still accumulating
    });
    expect(result).toBe(2);
  });

  it("returns -1 when the target is non-positive", () => {
    expect(
      deriveProjectionFireYearIndex({
        projection: [],
        traditionalTarget: 0,
        currentBalance: 0,
      }),
    ).toBe(-1);
  });
});

describe("deriveDisplayYearsToFi", () => {
  it("a past-FIRE user gets 0 yrs and their current age", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.profile.age = 48;
    scenario.profile.retirementAge = 50;
    scenario.accounts[0].currentBalance = 1_800_000;
    const result = deriveDisplayYearsToFi({
      scenario,
      traditionalTarget: 1_250_000,
      projection: makeProjection([1_800_000, 1_900_000], 48),
      analyticalYearsToFi: 0,
    });
    expect(result.displayYearsToFi).toBe(0);
    expect(result.displayFireAge).toBe(48);
    expect(result.isPastFire).toBe(true);
  });

  it("falls back to ceil(analyticalYearsToFi) when projection doesn't reach target", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.profile.age = 30;
    scenario.accounts[0].currentBalance = 100_000;
    const result = deriveDisplayYearsToFi({
      scenario,
      traditionalTarget: 5_000_000,
      // All projection years well below the target — forces fallback
      projection: makeProjection([100_000, 200_000, 300_000], 30),
      analyticalYearsToFi: 28.4,
    });
    expect(result.displayYearsToFi).toBe(29);
    expect(result.displayFireAge).toBe(59);
    expect(result.isPastFire).toBe(false);
  });

  it("returns null years when projection misses AND no analytical fallback", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.profile.age = 30;
    scenario.accounts[0].currentBalance = 0;
    const result = deriveDisplayYearsToFi({
      scenario,
      traditionalTarget: 5_000_000,
      projection: makeProjection([0, 0, 0], 30),
      analyticalYearsToFi: null,
    });
    expect(result.displayYearsToFi).toBeNull();
    expect(result.displayFireAge).toBeNull();
    expect(result.isPastFire).toBe(false);
  });
});

describe("shouldShowRaiseSavingsWarning", () => {
  function makeScenario(overrides: {
    age: number;
    retirementAge: number | null;
  }) {
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = overrides.age;
    s.profile.retirementAge = overrides.retirementAge;
    return s;
  }

  it("fires when accumulating user's projected FI is past their target retirement age", () => {
    expect(
      shouldShowRaiseSavingsWarning({
        scenario: makeScenario({ age: 28, retirementAge: 50 }),
        phase: "accumulation",
        isPastFire: false,
        displayFireAge: 56,
      }),
    ).toBe(true);
  });

  it("is silent for past-FIRE users even if their projected FI > retirementAge", () => {
    // Guard for the Already-Retired regression: a 65yo retiree had
    // displayFireAge=66 (off-by-one) with retireAge=65 and saw "Raise savings
    // or push the target". Even without the display fix, the phase guard
    // should suppress this warning.
    expect(
      shouldShowRaiseSavingsWarning({
        scenario: makeScenario({ age: 65, retirementAge: 65 }),
        phase: "withdrawal",
        isPastFire: true,
        displayFireAge: 66,
      }),
    ).toBe(false);
  });

  it("is silent for users in withdrawal phase", () => {
    expect(
      shouldShowRaiseSavingsWarning({
        scenario: makeScenario({ age: 60, retirementAge: 65 }),
        phase: "withdrawal",
        isPastFire: false,
        displayFireAge: 70,
      }),
    ).toBe(false);
  });

  it("is silent when projected FI age is on or before the target retirement age", () => {
    expect(
      shouldShowRaiseSavingsWarning({
        scenario: makeScenario({ age: 28, retirementAge: 50 }),
        phase: "accumulation",
        isPastFire: false,
        displayFireAge: 46,
      }),
    ).toBe(false);
  });

  it("is silent when displayFireAge is null (never projected to hit FI)", () => {
    expect(
      shouldShowRaiseSavingsWarning({
        scenario: makeScenario({ age: 28, retirementAge: 50 }),
        phase: "accumulation",
        isPastFire: false,
        displayFireAge: null,
      }),
    ).toBe(false);
  });

  it("is silent when the user hasn't set a retirement age", () => {
    expect(
      shouldShowRaiseSavingsWarning({
        scenario: makeScenario({ age: 28, retirementAge: null }),
        phase: "accumulation",
        isPastFire: false,
        displayFireAge: 56,
      }),
    ).toBe(false);
  });
});

describe("deriveIncomeCardVariant", () => {
  it("returns 'retirement' for withdrawal-phase users with no income", () => {
    // Matches the Already-Retired persona: 65yo, $0 income, portfolio funded.
    const s = cloneScenario(createDefaultScenario());
    s.annualIncome = 0;
    expect(deriveIncomeCardVariant(s, "withdrawal")).toBe("retirement");
  });

  it("returns 'accumulation' for earners still contributing", () => {
    const s = cloneScenario(createDefaultScenario());
    s.annualIncome = 150_000;
    expect(deriveIncomeCardVariant(s, "accumulation")).toBe("accumulation");
  });

  it("keeps 'accumulation' for a high earner past the FIRE number (withdrawal phase, but still working)", () => {
    // Almost-FIRE-style scenario: portfolio past target, but they still have
    // a paycheck. Hiding the take-home/tax tiles here would throw away the
    // info they use to decide when to pull the trigger.
    const s = cloneScenario(createDefaultScenario());
    s.annualIncome = 150_000;
    expect(deriveIncomeCardVariant(s, "withdrawal")).toBe("accumulation");
  });

  it("keeps 'accumulation' for a retiree in transition phase", () => {
    // Transition phase = funded between 50-100% of FIRE, no contributions.
    // Not yet fully retired in the signal sense — keep accumulation tiles.
    const s = cloneScenario(createDefaultScenario());
    s.annualIncome = 0;
    expect(deriveIncomeCardVariant(s, "transition")).toBe("accumulation");
  });
});

describe("derivedProjectedSpendingExplanation", () => {
  it("returns null when expense growth is zero", () => {
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 35;
    s.profile.retirementAge = 55;
    s.retirementExpenses = 70_000;
    s.assumptions.expenseGrowthRate = 0;
    expect(derivedProjectedSpendingExplanation(s)).toBeNull();
  });

  it("returns null when no retirement-age gap to compound over", () => {
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 55;
    s.profile.retirementAge = 55;
    s.assumptions.expenseGrowthRate = 0.01;
    expect(derivedProjectedSpendingExplanation(s)).toBeNull();
  });

  it("projects real-dollar retirement spending over the horizon", () => {
    // Matches Dual Income: $70K today, 1% real creep, 15 yrs → ~$81K.
    // This is the sub-line that explains the "FIRE number = $2M, not $1.75M"
    // mystery.
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 35;
    s.profile.retirementAge = 50;
    s.retirementExpenses = 70_000;
    s.assumptions.expenseGrowthRate = 0.01;
    const result = derivedProjectedSpendingExplanation(s);
    expect(result).not.toBeNull();
    expect(result!.todaySpending).toBe(70_000);
    expect(result!.yearsUntilRetirement).toBe(15);
    expect(result!.expenseGrowthRate).toBeCloseTo(0.01, 5);
    expect(result!.projectedSpending).toBeCloseTo(70_000 * 1.01 ** 15, 0);
  });

  it("returns null when divergence is under 2% (avoids cluttering short horizons)", () => {
    // 3 years at 0.5% creep → 1.5% divergence, under the threshold.
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 47;
    s.profile.retirementAge = 50;
    s.retirementExpenses = 70_000;
    s.assumptions.expenseGrowthRate = 0.005;
    expect(derivedProjectedSpendingExplanation(s)).toBeNull();
  });
});
