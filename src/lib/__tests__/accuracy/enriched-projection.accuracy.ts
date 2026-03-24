/**
 * Enriched Projection — Golden Tests
 *
 * Pins the enriched per-year data (income, expenses, savings, growth)
 * returned by buildScenarioProjection() to verify correctness.
 *
 * These tests ensure that:
 * 1. Year 0 shows base income/expenses/savings
 * 2. Growth = balance change - contributions - cash flows
 * 3. Income/expenses grow at the configured rates
 * 4. Career break years show correct income=$0 and expenses=base
 * 5. Cash flow events appear at the correct year (no off-by-one)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { golden } from "./_fixtures/golden";
import { createCoastAccumulatorScenario } from "./_fixtures/scenarios";
import { cloneScenario } from "@/lib/domain";
import { buildScenarioProjection, calculateFireNumber } from "@/lib/calc/quick-fire";

describe("Enriched Projection — Golden Tests", () => {
  let scenario: ReturnType<typeof createCoastAccumulatorScenario>;
  let projection: ReturnType<typeof buildScenarioProjection>;

  beforeAll(() => {
    scenario = createCoastAccumulatorScenario();
    // Coast: age 28, retire 55, income 85K, expenses 35K, savings 24K, portfolio 50K, 5% return
    const targetBalance = calculateFireNumber(scenario.annualExpenses, scenario.assumptions.withdrawalRate);
    // Use 27 years (retire at 55, start at 28)
    projection = buildScenarioProjection({ scenario, targetBalance, years: 27 });
  });

  /**
   * @golden Year 0 shows base scenario values
   */
  it("year 0 income matches scenario", () => {
    golden("enriched.year0.income", {
      input: { annualIncome: scenario.annualIncome },
      actual: projection[0].income ?? 0,
      expected: 85_000,
      tolerance: 0,
      methodology: "Year 0 income should equal scenario.annualIncome",
    });
  });

  it("year 0 expenses matches scenario", () => {
    golden("enriched.year0.expenses", {
      input: { annualExpenses: scenario.annualExpenses },
      actual: projection[0].expenses ?? 0,
      expected: 35_000,
      tolerance: 0,
      methodology: "Year 0 expenses should equal scenario.annualExpenses",
    });
  });

  it("year 0 savings matches scenario", () => {
    golden("enriched.year0.savings", {
      input: { annualSavings: scenario.annualSavings },
      actual: projection[0].savings ?? 0,
      expected: 24_000,
      tolerance: 0,
      methodology: "Year 0 savings should equal scenario.annualSavings",
    });
  });

  /**
   * @golden Growth accounting identity: sum(growth) = final_balance - start_balance - sum(contributions) - sum(cashFlows)
   */
  it("growth accounting identity holds", () => {
    const totalGrowth = projection.reduce((sum, p) => sum + (p.growth ?? 0), 0);
    const totalContributions = projection.reduce((sum, p) => sum + (p.contribution ?? 0), 0);
    const totalCashFlows = projection.reduce((sum, p) => sum + (p.cashFlowNet ?? 0), 0);
    const startBalance = projection[0].balance;
    const endBalance = projection[projection.length - 1].balance;

    const expectedGrowth = endBalance - startBalance - totalContributions - totalCashFlows;
    // Allow rounding tolerance of $100
    expect(Math.abs(totalGrowth - expectedGrowth)).toBeLessThan(100);
  });

  /**
   * @golden Career break at age 33 (year 5) shows income=$0 in that year
   */
  it("career break year shows zero income", () => {
    const s = cloneScenario(scenario);
    s.cashFlows.push({
      id: "test-break",
      name: "Career break net cost",
      type: "expense",
      amount: Math.round(s.annualExpenses + s.annualSavings),
      startAge: 33,
      endAge: 34,
      inflationAdjusted: true,
      taxable: false,
    });
    const tb = calculateFireNumber(s.annualExpenses, s.assumptions.withdrawalRate);
    const proj = buildScenarioProjection({ scenario: s, targetBalance: tb, years: 27 });
    // The break is at age 33. Display data uses yearStartAge, so the row with
    // yearStartAge=33 has p.age=34 (yearNum=6). Find it by checking year offset.
    // Break at age 33, start age 28 → year 6 (yearStartAge = 28+6-1 = 33)
    const breakYear = proj.find(p => p.year === 6);
    expect(breakYear).toBeDefined();
    expect(breakYear!.income).toBe(0);
  });

  it("career break year shows normal expenses", () => {
    const s = cloneScenario(scenario);
    s.cashFlows.push({
      id: "test-break",
      name: "Career break net cost",
      type: "expense",
      amount: Math.round(s.annualExpenses + s.annualSavings),
      startAge: 33,
      endAge: 34,
      inflationAdjusted: true,
      taxable: false,
    });
    const tb = calculateFireNumber(s.annualExpenses, s.assumptions.withdrawalRate);
    const proj = buildScenarioProjection({ scenario: s, targetBalance: tb, years: 27 });
    const breakYear = proj.find(p => Math.round(p.age) === 33);
    expect(breakYear).toBeDefined();
    // Expenses should be ~base expenses (35K, maybe slight growth), NOT inflated by break cost
    expect(breakYear!.expenses).toBeGreaterThan(34_000);
    expect(breakYear!.expenses).toBeLessThan(38_000);
  });

  it("year after career break shows normal income", () => {
    const s = cloneScenario(scenario);
    s.cashFlows.push({
      id: "test-break",
      name: "Career break net cost",
      type: "expense",
      amount: Math.round(s.annualExpenses + s.annualSavings),
      startAge: 33,
      endAge: 34,
      inflationAdjusted: true,
      taxable: false,
    });
    const tb = calculateFireNumber(s.annualExpenses, s.assumptions.withdrawalRate);
    const proj = buildScenarioProjection({ scenario: s, targetBalance: tb, years: 27 });
    // Year after break: yearNum=7, yearStartAge=34, break ended (endAge=34, < not <=)
    const afterBreak = proj.find(p => p.year === 7);
    expect(afterBreak).toBeDefined();
    // Income should be back to ~85K+ (with growth over 6 years)
    expect(afterBreak!.income).toBeGreaterThan(84_000);
    expect(afterBreak!.income).toBeLessThan(95_000);
  });

  /**
   * @golden New dependent expense CF appears at correct year
   */
  it("expense cash flow appears at start year, not one year late", () => {
    const s = cloneScenario(scenario);
    s.cashFlows.push({
      id: "test-baby",
      name: "Child expenses",
      type: "expense",
      amount: 18_000,
      startAge: 31,
      endAge: 49,
      inflationAdjusted: true,
      taxable: false,
    });
    const tb = calculateFireNumber(s.annualExpenses, s.assumptions.withdrawalRate);
    const proj = buildScenarioProjection({ scenario: s, targetBalance: tb, years: 27 });
    // Baby at age 31: yearStartAge=31 is yearNum=4 (28+4-1=31), p.age=32
    // Before baby: yearNum=3 (yearStartAge=30), p.age=31
    const beforeBaby = proj.find(p => p.year === 3);
    const babyYear = proj.find(p => p.year === 4);

    expect(beforeBaby).toBeDefined();
    expect(babyYear).toBeDefined();
    // Before baby: expenses should be ~35K (base only)
    expect(beforeBaby!.expenses).toBeGreaterThan(34_000);
    expect(beforeBaby!.expenses).toBeLessThan(38_000);
    // Baby year: expenses should be ~53K (35K base + 18K dependent)
    expect(babyYear!.expenses).toBeGreaterThan(50_000);
    expect(babyYear!.expenses).toBeLessThan(58_000);
  });
});
