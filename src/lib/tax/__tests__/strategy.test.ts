import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import {
  analyzeSocialSecurityClaiming,
  buildFederalTaxBracketBreakdown,
  buildRothConversionPlan,
  compareDrawdownStrategies,
  estimateAcaConversionRoom,
  estimateFederalTax,
} from "@/lib/tax";

describe("tax strategy helpers", () => {
  it("estimates federal tax progressively", () => {
    expect(estimateFederalTax(0, "single")).toBe(0);
    expect(estimateFederalTax(50_000, "single")).toBeGreaterThan(5_000);
    expect(estimateFederalTax(50_000, "single")).toBeLessThan(7_000);
  });

  it("builds a roth conversion ladder from traditional balances", () => {
    const scenario = cloneScenario(createDefaultScenario());

    scenario.profile.age = 45;
    scenario.profile.retirementAge = 45;
    scenario.retirementExpenses = 50_000;
    scenario.accounts.push({
      id: "traditional-ira",
      name: "Traditional IRA",
      type: "traditional_ira",
      currentBalance: 300_000,
      annualContribution: 0,
      assetAllocation: { stocks: 0.7, bonds: 0.3, alternatives: 0 },
      expenseRatio: 0.001,
    });

    const plan = buildRothConversionPlan(scenario);

    expect(plan.rows.length).toBeGreaterThan(0);
    expect(plan.rows[0]?.conversionAmount).toBeGreaterThan(0);
    expect(plan.totalPlannedConversions).toBeGreaterThan(0);
  });

  it("produces ACA, Social Security, and drawdown comparisons", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.profile.age = 45;
    scenario.profile.retirementAge = 45;
    scenario.profile.partner = {
      name: "Alex",
      age: 43,
      retirementAge: 45,
      healthStatus: "average",
      annualIncome: 40_000,
      socialSecurityBenefit: {
        monthlyBenefitAt62: 1_400,
        monthlyBenefitAtFra: 1_900,
        monthlyBenefitAt70: 2_300,
        claimingAge: 67,
      },
    };

    const aca = estimateAcaConversionRoom(scenario, 10_000);
    const socialSecurity = analyzeSocialSecurityClaiming(scenario);
    const drawdown = compareDrawdownStrategies(scenario);
    const bracketBreakdown = buildFederalTaxBracketBreakdown(
      100_000,
      scenario.profile.filingStatus,
    );

    expect(aca.maxMagiBeforeCliff).toBeGreaterThan(0);
    expect(aca.tradeoffPoints).toHaveLength(7);
    expect(aca.recommendedConversion).toBeGreaterThanOrEqual(0);
    expect(socialSecurity.options).toHaveLength(3);
    expect(socialSecurity.partnerOptions).toHaveLength(3);
    expect(socialSecurity.householdStrategies).toHaveLength(9);
    expect(
      socialSecurity.recommendedHouseholdStrategy?.combinedAnnualBenefit ?? 0,
    ).toBeGreaterThan(0);
    expect(drawdown).toHaveLength(3);
    expect(
      bracketBreakdown.reduce((total, row) => total + row.amount, 0),
    ).toBe(100_000);
  });
});
