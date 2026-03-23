/**
 * Canonical test scenarios for the accuracy verification system.
 *
 * Each scenario has:
 *   - A fixed ID (no randomness — deterministic across runs)
 *   - A clear purpose (documented in JSDoc)
 *   - Pinned field values matching the golden tests
 *
 * When adding a new scenario, follow the naming convention:
 *   create{Name}Scenario() → returns a Scenario with fixed values.
 */

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

/**
 * Trinity Classic — the baseline cross-validation scenario.
 *
 * Matches the most common parameters used in cFIREsim and FIRECalc:
 *   $1.5M portfolio, 80/20 stocks/bonds, $60K annual spending,
 *   30-year horizon, fixed real withdrawal at 4%.
 *
 * This is the scenario we compare against external tools.
 */
export function createTrinityClassicScenario(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.id = "golden-trinity-classic";
  s.name = "Trinity Classic";
  s.profile.age = 45;
  s.profile.retirementAge = 45;
  s.accounts[0].currentBalance = 1_500_000;
  s.accounts[0].annualContribution = 0;
  s.annualSavings = 0;
  s.annualExpenses = 60_000;
  s.retirementExpenses = 60_000;
  s.annualIncome = 0;
  s.assumptions.withdrawalRate = 0.04;
  s.assumptions.partTimeIncome = 0;
  s.withdrawalStrategy.type = "fixed";
  s.withdrawalStrategy.initialRate = 0.04;
  s.assetAllocationGlidepath = [
    { age: 45, allocation: { stocks: 0.8, bonds: 0.2, alternatives: 0 } },
  ];
  s.simulationSettings.retirementDuration = 30;
  s.simulationSettings.rebalanceFrequency = "annually";
  s.simulationSettings.finalValueTarget = 0;
  s.simulationSettings.feeDrag = 0;
  return s;
}

/**
 * Early Retiree — aggressive FIRE at 35 with long horizon.
 *
 * Tests the accumulation engine with a young person saving aggressively
 * and the backtest engine with a 65-year retirement (ERN-recommended).
 */
export function createEarlyRetireeScenario(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.id = "golden-early-retiree";
  s.name = "Early Retiree";
  s.profile.age = 35;
  s.profile.retirementAge = 35;
  s.accounts[0].currentBalance = 1_000_000;
  s.accounts[0].annualContribution = 0;
  s.annualSavings = 0;
  s.annualExpenses = 40_000;
  s.retirementExpenses = 40_000;
  s.annualIncome = 0;
  s.assumptions.withdrawalRate = 0.035;
  s.assumptions.partTimeIncome = 0;
  s.assetAllocationGlidepath = [
    { age: 35, allocation: { stocks: 0.9, bonds: 0.1, alternatives: 0 } },
  ];
  s.simulationSettings.retirementDuration = 65;
  s.simulationSettings.finalValueTarget = 0;
  s.simulationSettings.feeDrag = 0.001;
  return s;
}

/**
 * Conservative Retiree — traditional retirement at 65.
 *
 * Tests a lower-risk 50/50 portfolio with a shorter horizon.
 */
export function createConservativeRetireeScenario(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.id = "golden-conservative";
  s.name = "Conservative Retiree";
  s.profile.age = 65;
  s.profile.retirementAge = 65;
  s.accounts[0].currentBalance = 2_000_000;
  s.accounts[0].annualContribution = 0;
  s.annualSavings = 0;
  s.annualExpenses = 70_000;
  s.retirementExpenses = 70_000;
  s.annualIncome = 0;
  s.assumptions.withdrawalRate = 0.035;
  s.assumptions.partTimeIncome = 0;
  s.assetAllocationGlidepath = [
    { age: 65, allocation: { stocks: 0.5, bonds: 0.5, alternatives: 0 } },
  ];
  s.simulationSettings.retirementDuration = 30;
  s.simulationSettings.finalValueTarget = 0;
  s.simulationSettings.feeDrag = 0.001;
  return s;
}

/**
 * Coast Accumulator — young person computing coast FIRE.
 *
 * Tests Coast FIRE calculation: $50K saved at age 28,
 * compounding at 5% real until retirement at 55.
 */
export function createCoastAccumulatorScenario(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.id = "golden-coast";
  s.name = "Coast Accumulator";
  s.profile.age = 28;
  s.profile.retirementAge = 55;
  s.accounts[0].currentBalance = 50_000;
  s.accounts[0].annualContribution = 24_000;
  s.annualIncome = 85_000;
  s.annualSavings = 24_000;
  s.annualExpenses = 35_000;
  s.retirementExpenses = 35_000;
  s.assumptions.expectedRealReturn = 0.05;
  s.assumptions.withdrawalRate = 0.04;
  s.assumptions.partTimeIncome = 0;
  return s;
}

/**
 * Barista FIRE — portfolio + part-time income.
 *
 * Tests the Barista FIRE number calculation where post-FIRE
 * income reduces the required portfolio.
 */
export function createBaristaFireScenario(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.id = "golden-barista";
  s.name = "Barista FIRE";
  s.profile.age = 40;
  s.profile.retirementAge = 40;
  s.accounts[0].currentBalance = 800_000;
  s.accounts[0].annualContribution = 0;
  s.annualIncome = 0;
  s.annualSavings = 0;
  s.annualExpenses = 50_000;
  s.retirementExpenses = 50_000;
  s.assumptions.withdrawalRate = 0.04;
  s.assumptions.partTimeIncome = 15_000;
  return s;
}

/**
 * Tax Heavy — high earner for tax bracket testing.
 *
 * Tests federal tax estimation with a $300K income.
 */
export function createTaxHeavyScenario(): Scenario {
  const s = cloneScenario(createDefaultScenario());
  s.id = "golden-tax-heavy";
  s.name = "Tax Heavy";
  s.profile.age = 40;
  s.profile.retirementAge = 50;
  s.profile.filingStatus = "married_joint";
  s.accounts[0].currentBalance = 600_000;
  s.accounts[0].annualContribution = 50_000;
  s.annualIncome = 300_000;
  s.annualSavings = 50_000;
  s.annualExpenses = 100_000;
  s.retirementExpenses = 100_000;
  return s;
}
