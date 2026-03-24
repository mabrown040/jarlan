import { clamp, roundTo } from "@/lib/utils";

import {
  getCashFlowBreakdownAtAge,
  getCurrentPortfolioBalance,
  getNetCashFlowAtAge,
  getPlannedAnnualInvestmentContribution,
  getSavingsRate,
  getYearsUntilRetirement,
} from "@/lib/calc/scenario";
import type { ProjectionPoint, QuickFireSummary, Scenario } from "@/lib/domain/types";

export interface SavingsRateTableRow {
  savingsRate: number;
  annualExpenses: number;
  annualSavings: number;
  fireNumber: number;
  yearsToFi: number | null;
}

export function calculateFireNumber(
  annualExpenses: number,
  withdrawalRate: number,
) {
  return annualExpenses / withdrawalRate;
}

export function calculateYearsToTarget({
  currentBalance,
  annualContribution,
  targetBalance,
  annualRealReturn,
  maxYears = 80,
}: {
  currentBalance: number;
  annualContribution: number;
  targetBalance: number;
  annualRealReturn: number;
  maxYears?: number;
}) {
  if (currentBalance >= targetBalance) {
    return 0;
  }

  const monthlyReturn = annualRealReturn / 12;
  const monthlyContribution = annualContribution / 12;
  let balance = currentBalance;

  for (let month = 1; month <= maxYears * 12; month += 1) {
    balance = balance * (1 + monthlyReturn) + monthlyContribution;

    if (balance >= targetBalance) {
      return roundTo(month / 12, 1);
    }
  }

  return null;
}

export function buildProjection({
  currentBalance,
  annualContribution,
  targetBalance,
  currentAge,
  annualRealReturn,
  years,
}: {
  currentBalance: number;
  annualContribution: number;
  targetBalance: number;
  currentAge: number;
  annualRealReturn: number;
  years: number;
}): ProjectionPoint[] {
  const horizon = Math.max(1, Math.ceil(years));
  const monthlyReturn = annualRealReturn / 12;
  const monthlyContribution = annualContribution / 12;
  const projection: ProjectionPoint[] = [];
  let balance = currentBalance;

  projection.push({
    year: 0,
    age: currentAge,
    balance,
    target: targetBalance,
  });

  for (let month = 1; month <= horizon * 12; month += 1) {
    balance = balance * (1 + monthlyReturn) + monthlyContribution;

    if (month % 12 === 0) {
      projection.push({
        year: month / 12,
        age: currentAge + month / 12,
        balance: roundTo(balance, 0),
        target: targetBalance,
      });
    }
  }

  return projection;
}

/**
 * Compute the effective monthly return after subtracting fee drag.
 */
function getEffectiveMonthlyReturn(scenario: Scenario) {
  const effectiveAnnual =
    scenario.assumptions.expectedRealReturn - (scenario.simulationSettings?.feeDrag ?? 0.001);
  return effectiveAnnual / 12;
}

/**
 * Compute the monthly contribution for a given year offset, accounting for
 * income and expense growth rates. Income and expenses grow in real terms
 * each year, and savings = income - expenses, which means contributions
 * grow as income outpaces expenses.
 */
function getMonthlyContributionForYear(scenario: Scenario, yearOffset: number) {
  const incomeGrowth = 1 + (scenario.assumptions.incomeGrowthRate ?? 0);
  // Use the scenario's actual after-tax savings (set by the drawer/tax system)
  // and grow it by income growth rate. This is tax-aware because annualSavings
  // is already computed as takeHome - expenses.
  const grownSavings = scenario.annualSavings * incomeGrowth ** yearOffset;
  // Also consider explicit account contributions (may be different from savings)
  const baseContribution = getPlannedAnnualInvestmentContribution(scenario);
  const scaledContribution = baseContribution * incomeGrowth ** yearOffset;
  // Use the larger of tax-aware savings or scaled contributions
  const annualContribution = Math.max(grownSavings, scaledContribution);
  return annualContribution / 12;
}

function calculateScenarioYearsToTarget(
  scenario: Scenario,
  targetBalance: number,
  maxYears = 80,
) {
  const currentBalance = getCurrentPortfolioBalance(scenario.accounts);

  if (currentBalance >= targetBalance) {
    return 0;
  }

  const monthlyReturn = getEffectiveMonthlyReturn(scenario);
  let balance = currentBalance;

  for (let month = 1; month <= maxYears * 12; month += 1) {
    const yearOffset = (month - 1) / 12;
    const age = scenario.profile.age + yearOffset;
    const monthlyContribution = getMonthlyContributionForYear(scenario, Math.floor(yearOffset));
    const monthlyCashFlow = getNetCashFlowAtAge(scenario, age) / 12;
    balance = balance * (1 + monthlyReturn) + monthlyContribution + monthlyCashFlow;

    if (balance >= targetBalance) {
      return roundTo(month / 12, 1);
    }
  }

  return null;
}

export function buildScenarioProjection({
  scenario,
  targetBalance,
  years,
}: {
  scenario: Scenario;
  targetBalance: number;
  years: number;
}) {
  const horizon = Math.max(1, Math.ceil(years));
  const monthlyReturn = getEffectiveMonthlyReturn(scenario);
  const incomeGrowthRate = scenario.assumptions.incomeGrowthRate ?? 0;
  const expenseGrowthRate = scenario.assumptions.expenseGrowthRate ?? 0;
  const projection: ProjectionPoint[] = [];
  let balance = getCurrentPortfolioBalance(scenario.accounts);

  // Year 0: compute current income/expenses
  const year0CfBreakdown = getCashFlowBreakdownAtAge(scenario, scenario.profile.age);
  const year0OnBreak = year0CfBreakdown.lostIncome > 0;
  const year0DisplayIncome = year0OnBreak
    ? year0CfBreakdown.income
    : scenario.annualIncome + year0CfBreakdown.income;
  const year0OtherExpenseCFs = year0CfBreakdown.expense - year0CfBreakdown.lostIncome;
  const year0DisplayExpenses = year0OnBreak
    ? scenario.annualExpenses + year0OtherExpenseCFs
    : scenario.annualExpenses + year0CfBreakdown.expense;
  projection.push({
    year: 0,
    age: scenario.profile.age,
    balance,
    target: targetBalance,
    contribution: 0,
    growth: 0,
    cashFlowNet: year0CfBreakdown.net,
    income: year0DisplayIncome,
    expenses: year0DisplayExpenses,
    savings: scenario.annualSavings,
  });

  // Track yearly accumulations
  let yearContributions = 0;
  let yearCashFlows = 0;
  let startOfYearBalance = balance;

  for (let month = 1; month <= horizon * 12; month += 1) {
    const yearOffset = (month - 1) / 12;
    const age = scenario.profile.age + yearOffset;
    const monthlyContribution = getMonthlyContributionForYear(scenario, Math.floor(yearOffset));
    const monthlyCashFlow = getNetCashFlowAtAge(scenario, age) / 12;
    balance = balance * (1 + monthlyReturn) + monthlyContribution + monthlyCashFlow;

    yearContributions += monthlyContribution;
    yearCashFlows += monthlyCashFlow;

    if (month % 12 === 0) {
      const yearNum = month / 12;
      const yearAge = scenario.profile.age + yearNum;
      const yearGrowth = balance - startOfYearBalance - yearContributions - yearCashFlows;

      // Compute income/expenses for this year using the START of the year age.
      // Year N runs from age (base+N-1) to age (base+N). Cash flows active
      // during the year should use the start-of-year age for display.
      const yearStartAge = scenario.profile.age + yearNum - 1;
      const cfBreakdown = getCashFlowBreakdownAtAge(scenario, yearStartAge);
      const grownIncome = scenario.annualIncome * (1 + incomeGrowthRate) ** yearNum;
      const grownExpenses = scenario.annualExpenses * (1 + expenseGrowthRate) ** yearNum;

      // Career break handling: the "Career break net cost" CF bundles
      // lost income + lost savings into one expense CF. For display:
      // - Income = just breakIncome (from income CFs), not grownIncome
      // - Expenses = base expenses + OTHER expense CFs (baby, etc.) but
      //   excluding the career break "net cost" CF itself
      const onCareerBreak = cfBreakdown.lostIncome > 0;
      const displayIncome = onCareerBreak
        ? cfBreakdown.income  // Just break income (e.g., $0 or severance)
        : grownIncome + cfBreakdown.income;
      const otherExpenseCFs = cfBreakdown.expense - cfBreakdown.lostIncome;
      const displayExpenses = onCareerBreak
        ? grownExpenses + otherExpenseCFs  // Base + baby/other CFs, minus break net cost
        : grownExpenses + cfBreakdown.expense;

      projection.push({
        year: yearNum,
        age: yearAge,
        balance: roundTo(balance, 0),
        target: targetBalance,
        contribution: roundTo(yearContributions, 0),
        growth: roundTo(yearGrowth, 0),
        cashFlowNet: roundTo(yearCashFlows, 0),
        income: roundTo(displayIncome, 0),
        expenses: roundTo(displayExpenses, 0),
        savings: roundTo(yearContributions + yearCashFlows, 0),
      });

      // Reset accumulators for next year
      yearContributions = 0;
      yearCashFlows = 0;
      startOfYearBalance = balance;
    }
  }

  return projection;
}

export function calculateQuickFireSummary(scenario: Scenario): QuickFireSummary {
  const currentBalance = getCurrentPortfolioBalance(scenario.accounts);
  // If expenses grow in real terms (lifestyle creep), project forward to retirement
  const yearsToRetirement = Math.max(
    (scenario.profile.retirementAge ?? scenario.profile.age) - scenario.profile.age,
    0,
  );
  const expenseGrowth = 1 + (scenario.assumptions.expenseGrowthRate ?? 0);
  const projectedRetirementExpenses =
    scenario.retirementExpenses * expenseGrowth ** yearsToRetirement;
  const fireNumber = calculateFireNumber(
    projectedRetirementExpenses,
    scenario.assumptions.withdrawalRate,
  );
  const saferFireNumber = calculateFireNumber(
    projectedRetirementExpenses,
    scenario.assumptions.saferWithdrawalRate,
  );
  const yearsToFi = calculateScenarioYearsToTarget(scenario, fireNumber);
  const projectionYears = clamp(
    Math.max(
      12,
      (scenario.profile.retirementAge ?? scenario.profile.age + 12) -
        scenario.profile.age,
      Math.ceil(yearsToFi ?? 0) + 5,
    ),
    12,
    60,
  );

  // Coast FIRE target: the amount you need TODAY so that compounding alone
  // reaches the FIRE number by your target retirement age.
  const effectiveReturn =
    scenario.assumptions.expectedRealReturn - scenario.simulationSettings.feeDrag;
  const coastFiTarget =
    yearsToRetirement > 0 && effectiveReturn > 0
      ? fireNumber / (1 + effectiveReturn) ** yearsToRetirement
      : fireNumber;

  // Coast age: when does your accumulating portfolio reach the coastFiTarget?
  // Once it does, you can stop saving — compounding alone finishes the job by retirement.
  const coastAge =
    currentBalance >= coastFiTarget
      ? scenario.profile.age // already coasting
      : scenario.assumptions.expectedRealReturn > 0
        ? calculateScenarioYearsToTarget(scenario, coastFiTarget) !== null
          ? roundTo(
              scenario.profile.age +
                (calculateScenarioYearsToTarget(scenario, coastFiTarget) ?? 0),
              1,
            )
          : null
        : null;

  return {
    fireNumber,
    saferFireNumber,
    yearsToFi,
    fireAge: yearsToFi === null ? null : roundTo(scenario.profile.age + yearsToFi, 1),
    coastGap: coastFiTarget - currentBalance,
    coastAge,
    savingsRate: getSavingsRate(scenario),
    projection: buildScenarioProjection({
      scenario,
      targetBalance: fireNumber,
      years: projectionYears,
    }),
  };
}

export function buildSavingsRateTable(
  annualIncome: number,
  withdrawalRate: number,
  annualRealReturn: number,
) {
  if (annualIncome <= 0) {
    return [] satisfies SavingsRateTableRow[];
  }

  const rates = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

  return rates.map((savingsRate) => {
    const annualSavings = annualIncome * savingsRate;
    const annualExpenses = annualIncome - annualSavings;
    const fireNumber = calculateFireNumber(annualExpenses, withdrawalRate);

    return {
      savingsRate,
      annualExpenses,
      annualSavings,
      fireNumber,
      yearsToFi: calculateYearsToTarget({
        currentBalance: 0,
        annualContribution: annualSavings,
        targetBalance: fireNumber,
        annualRealReturn,
      }),
    };
  });
}
