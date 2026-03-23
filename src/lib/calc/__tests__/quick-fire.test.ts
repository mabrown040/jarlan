import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import {
  buildSavingsRateTable,
  calculateFireNumber,
  calculateQuickFireSummary,
  calculateYearsToTarget,
} from "@/lib/calc";

describe("quick fire calculations", () => {
  it("calculates a fire number from spending and withdrawal rate", () => {
    expect(calculateFireNumber(54_000, 0.04)).toBe(1_350_000);
  });

  it("projects years to target with contributions and growth", () => {
    const years = calculateYearsToTarget({
      currentBalance: 185_000,
      annualContribution: 36_000,
      targetBalance: 1_350_000,
      annualRealReturn: 0.05,
    });

    expect(years).not.toBeNull();
    expect(years).toBeGreaterThan(10);
    expect(years).toBeLessThan(25);
  });

  it("builds a quick summary from the default scenario", () => {
    const summary = calculateQuickFireSummary(createDefaultScenario());

    expect(summary.fireNumber).toBe(1_350_000);
    expect(summary.saferFireNumber).toBeGreaterThan(summary.fireNumber);
    expect(summary.savingsRate).toBeCloseTo(36_000 / 128_000, 5);
    expect(summary.projection.length).toBeGreaterThan(10);
  });

  it("builds a savings rate table that improves as savings increase", () => {
    const table = buildSavingsRateTable(120_000, 0.04, 0.05);

    expect(table).toHaveLength(7);
    expect(table[0].yearsToFi).not.toBeNull();
    expect(table.at(-1)?.yearsToFi ?? Number.POSITIVE_INFINITY).toBeLessThan(
      table[0].yearsToFi ?? Number.POSITIVE_INFINITY,
    );
  });

  it("uses account contributions, employer match, and recurring cash flows in the summary projection", () => {
    const baseScenario = createDefaultScenario();
    const richerScenario = cloneScenario(createDefaultScenario());

    richerScenario.accounts[0].employerMatch = {
      percentage: 1,
      upTo: 0.05,
    };
    richerScenario.accounts.push({
      id: "roth-ira",
      name: "Roth IRA",
      type: "roth_ira",
      currentBalance: 25_000,
      annualContribution: 7_000,
      assetAllocation: {
        stocks: 1,
        bonds: 0,
        alternatives: 0,
      },
      expenseRatio: 0.001,
    });
    richerScenario.cashFlows.push({
      id: "rental-income",
      name: "Rental income",
      type: "income",
      amount: 6_000,
      startAge: richerScenario.profile.age,
      endAge: richerScenario.profile.age + 5,
      inflationAdjusted: true,
      taxable: true,
    });

    const baseSummary = calculateQuickFireSummary(baseScenario);
    const richerSummary = calculateQuickFireSummary(richerScenario);

    expect(richerSummary.yearsToFi ?? Number.POSITIVE_INFINITY).toBeLessThan(
      baseSummary.yearsToFi ?? Number.POSITIVE_INFINITY,
    );
    expect(richerSummary.projection[1]?.balance ?? 0).toBeGreaterThan(
      baseSummary.projection[1]?.balance ?? 0,
    );
  });
});
