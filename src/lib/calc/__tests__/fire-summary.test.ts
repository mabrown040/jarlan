import { describe, it, expect } from "vitest";

import { calculateFireSummary } from "../fire-summary";
import { createDefaultScenario } from "@/lib/domain/defaults";

describe("calculateFireSummary", () => {
  it("detects already-FI scenario", () => {
    const s = createDefaultScenario();
    s.accounts[0].currentBalance = 3_000_000;
    s.annualExpenses = 80_000;
    s.assumptions.withdrawalRate = 0.04;
    s.assumptions.saferWithdrawalRate = 0.035;

    const summary = calculateFireSummary(s);
    expect(summary.isAlreadyFi).toBe(true);
    expect(summary.portfolioTotal).toBe(3_000_000);
    expect(summary.monthlySaferWithdrawal).toBeCloseTo(
      (3_000_000 * 0.035) / 12,
      0,
    );
    expect(summary.yearsToFire).toBe(0);
  });

  it("calculates years to FI for accumulation scenario", () => {
    const s = createDefaultScenario();
    s.profile.age = 30;
    s.profile.retirementAge = 55;
    s.accounts[0].currentBalance = 500_000;
    s.annualIncome = 150_000;
    s.annualSavings = 50_000;
    s.annualExpenses = 80_000;
    s.assumptions.withdrawalRate = 0.04;
    s.assumptions.saferWithdrawalRate = 0.035;
    s.assumptions.expectedRealReturn = 0.05;

    const summary = calculateFireSummary(s);
    expect(summary.yearsToFire).not.toBeNull();
    expect(summary.yearsToFire).toBeGreaterThan(0);
    expect(summary.yearsToFire).toBeLessThan(30); // should reach before retirement
    expect(summary.isAlreadyFi).toBe(false);
  });

  it("handles no retirement age set", () => {
    const s = createDefaultScenario();
    s.profile.retirementAge = null;
    s.accounts[0].currentBalance = 100_000;
    s.annualExpenses = 50_000;

    const summary = calculateFireSummary(s);
    expect(summary.yearsToFire).toBeNull();
    expect(summary.isAlreadyFi).toBe(false);
  });

  it("handles zero-expenses edge case", () => {
    const s = createDefaultScenario();
    s.annualExpenses = 0;
    s.accounts[0].currentBalance = 100_000;

    const summary = calculateFireSummary(s);
    // Anything divided by zero should gracefully result in Infinity or 0
    expect(summary.expenseCoverageYears).toBe(Infinity);
    expect(summary.isAlreadyFi).toBe(true); // any portfolio > 0 covers $0 expenses
  });
});
