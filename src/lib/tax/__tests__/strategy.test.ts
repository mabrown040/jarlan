import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import {
  analyzeSocialSecurityClaiming,
  buildFederalTaxBracketBreakdown,
  buildRothConversionPlan,
  compareDrawdownStrategies,
  estimateAcaConversionRoom,
  estimateFederalTax,
  estimateScenarioTax,
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

describe("estimateScenarioTax — manual override", () => {
  it("returns calculator-estimated tax when override is null (existing behavior)", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.assumptions.taxRateOverride = null;
    const result = estimateScenarioTax(scenario);
    expect(result.isManualOverride).toBe(false);
    // Federal/state/FICA all add up to totalTax in the normal path.
    expect(
      result.federalTax + result.stateTax + result.fica.totalFica,
    ).toBeCloseTo(result.totalTax, 2);
  });

  it("short-circuits to gross × override when set, ignoring bracket math", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.annualIncome = 200_000;
    scenario.assumptions.taxRateOverride = 0.3;
    const result = estimateScenarioTax(scenario);
    expect(result.isManualOverride).toBe(true);
    expect(result.totalTax).toBeCloseTo(60_000, 2);
    expect(result.takeHome).toBeCloseTo(140_000, 2);
    expect(result.effectiveRate).toBe(0.3);
    // Federal/state/FICA contract: federal carries the lump sum so
    // (federal + state + fica) === totalTax for sankey consumers.
    expect(result.federalTax).toBeCloseTo(60_000, 2);
    expect(result.stateTax).toBe(0);
    expect(result.fica.totalFica).toBe(0);
  });

  it("override applies to household gross when partner income is set", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.annualIncome = 100_000;
    scenario.profile.partner = {
      name: "Partner",
      age: 30,
      retirementAge: null,
      annualIncome: 50_000,
      socialSecurityBenefit: {
        monthlyBenefitAt62: 0,
        monthlyBenefitAtFra: 0,
        monthlyBenefitAt70: 0,
        claimingAge: 67,
      },
    };
    scenario.assumptions.taxRateOverride = 0.25;
    const result = estimateScenarioTax(scenario);
    expect(result.grossIncome).toBe(150_000);
    expect(result.totalTax).toBeCloseTo(37_500, 2);
    expect(result.takeHome).toBeCloseTo(112_500, 2);
  });

  it("override at 0 means zero tax (edge case, no NaN)", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.assumptions.taxRateOverride = 0;
    const result = estimateScenarioTax(scenario);
    expect(result.isManualOverride).toBe(true);
    expect(result.totalTax).toBe(0);
    expect(result.takeHome).toBe(scenario.annualIncome);
    expect(result.effectiveRate).toBe(0);
  });
});
