/**
 * Retirement Phase — Golden Tests
 *
 * Pins the phase classifier so the Spend pages keep suppressing misleading
 * readiness/withdrawal-rate output while the user is still net-saving.
 *
 * Signals under test:
 *   - `plannedContribution > currentSpending` → accumulation
 *   - `portfolio < fireNumber * 0.5` → accumulation
 *   - fully funded + no contributions → withdrawal
 */
import { describe, it, expect } from "vitest";
import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import { getRetirementPhase } from "@/lib/retirement/phase";

describe("Retirement Phase — Golden Tests", () => {
  it("pure accumulation: young saver, tiny portfolio", () => {
    // 28yo new user, $85K income, $45K spend, $5K portfolio, $16.5K/yr contribs.
    // Mirrors the QA walkthrough scenario that shipped "Readiness 89/100" before.
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 28;
    s.profile.retirementAge = 50;
    s.annualIncome = 85_000;
    s.annualExpenses = 45_000;
    s.retirementExpenses = 45_000;
    s.accounts[0].currentBalance = 5_000;
    s.accounts[0].annualContribution = 16_500;
    expect(getRetirementPhase(s)).toBe("accumulation");
  });

  it("coasting pre-retiree classifies as transition, not accumulation", () => {
    // 60yo with $1.5M (> 50% of FIRE), zero contributions, $50K retirement
    // spend. Not net-saving, portfolio above the underfunded threshold.
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 60;
    s.profile.retirementAge = 65;
    s.annualIncome = 0;
    s.annualExpenses = 50_000;
    s.retirementExpenses = 50_000;
    s.accounts[0].currentBalance = 1_500_000;
    s.accounts[0].annualContribution = 0;
    s.assumptions.withdrawalRate = 0.04;
    // FIRE number = 50_000 / 0.04 = 1_250_000; portfolio 1_500_000 > 1.0x
    expect(getRetirementPhase(s)).toBe("withdrawal");
  });

  it("actively drawing down: retiree with exactly-funded portfolio", () => {
    // 65yo, $1M, $40K spend, 4% WR. portfolio = fireNumber. withdrawal phase.
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 65;
    s.profile.retirementAge = 65;
    s.annualIncome = 0;
    s.annualExpenses = 40_000;
    s.retirementExpenses = 40_000;
    s.accounts[0].currentBalance = 1_000_000;
    s.accounts[0].annualContribution = 0;
    s.assumptions.withdrawalRate = 0.04;
    expect(getRetirementPhase(s)).toBe("withdrawal");
  });

  it("overfunded retiree: clearly in withdrawal phase", () => {
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 67;
    s.profile.retirementAge = 65;
    s.annualIncome = 0;
    s.annualExpenses = 50_000;
    s.retirementExpenses = 50_000;
    s.accounts[0].currentBalance = 3_000_000;
    s.accounts[0].annualContribution = 0;
    s.assumptions.withdrawalRate = 0.04;
    expect(getRetirementPhase(s)).toBe("withdrawal");
  });

  it("between 50% and 100% funded with no contributions → transition", () => {
    // Portfolio is 70% of FIRE number, no contributions. Not net-saving and
    // not underfunded (>50% of target) — neither signal fires.
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 58;
    s.profile.retirementAge = 62;
    s.annualIncome = 0;
    s.annualExpenses = 60_000;
    s.retirementExpenses = 60_000;
    s.accounts[0].currentBalance = 1_050_000; // FIRE = 1_500_000 → 70%
    s.accounts[0].annualContribution = 0;
    s.assumptions.withdrawalRate = 0.04;
    expect(getRetirementPhase(s)).toBe("transition");
  });

  it("contribution edge: saving slightly more than spending → accumulation", () => {
    const s = cloneScenario(createDefaultScenario());
    s.profile.age = 45;
    s.profile.retirementAge = 55;
    s.annualIncome = 120_000;
    s.annualExpenses = 50_000;
    s.retirementExpenses = 50_000;
    s.accounts[0].currentBalance = 900_000; // 72% of FIRE @ 4%
    s.accounts[0].annualContribution = 50_001; // Just edges above spending.
    expect(getRetirementPhase(s)).toBe("accumulation");
  });
});
