import {
  calculateFireNumber,
  calculateQuickFireSummary,
  getCurrentPortfolioBalance,
  getRetirementStartAge,
} from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";
import { roundTo } from "@/lib/utils";

export type WhatIfPortfolioMode = "fire-target" | "current-path";

export function resolveScenarioStartingPortfolio(
  scenario: Scenario,
  portfolioMode: WhatIfPortfolioMode,
) {
  if (portfolioMode === "fire-target") {
    return calculateFireNumber(
      scenario.retirementExpenses,
      scenario.assumptions.withdrawalRate,
    );
  }

  const currentPortfolio = getCurrentPortfolioBalance(scenario.accounts);
  const retirementStartAge = getRetirementStartAge(scenario);
  const yearsUntilRetirement = Math.max(
    Math.round(retirementStartAge - scenario.profile.age),
    0,
  );

  if (yearsUntilRetirement === 0) {
    return currentPortfolio;
  }

  const projectedBalance =
    calculateQuickFireSummary(scenario).projection.find(
      (point) => point.year === yearsUntilRetirement,
    )?.balance ?? currentPortfolio;

  return Math.max(projectedBalance, 0);
}

export function buildScenarioForStartingPortfolio(
  scenario: Scenario,
  startingPortfolio: number,
) {
  const nextScenario = cloneScenario(scenario);
  const targetPortfolio = Math.max(startingPortfolio, 0);

  if (nextScenario.accounts.length === 0) {
    return nextScenario;
  }

  const currentTotal = getCurrentPortfolioBalance(nextScenario.accounts);

  if (currentTotal <= 0) {
    nextScenario.accounts[0] = {
      ...nextScenario.accounts[0],
      currentBalance: roundTo(targetPortfolio, 0),
    };

    return nextScenario;
  }

  let remainingBalance = targetPortfolio;
  nextScenario.accounts = nextScenario.accounts.map((account, index) => {
    if (index === nextScenario.accounts.length - 1) {
      return {
        ...account,
        currentBalance: roundTo(Math.max(remainingBalance, 0), 0),
      };
    }

    const scaledBalance = roundTo(
      targetPortfolio * (account.currentBalance / currentTotal),
      0,
    );
    remainingBalance -= scaledBalance;

    return {
      ...account,
      currentBalance: roundTo(Math.max(scaledBalance, 0), 0),
    };
  });

  return nextScenario;
}
