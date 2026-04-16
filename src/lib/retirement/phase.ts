import {
  calculateFireNumber,
  getAnnualContributionTotal,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import type { Scenario } from "@/lib/domain/types";

export type RetirementPhase = "accumulation" | "transition" | "withdrawal";

/**
 * Classify where a scenario sits on the accumulation → withdrawal axis so the
 * Spend pages can suppress misleading readiness/checkup output.
 *
 * Signals:
 *   - `accumulation` when the user is still net-saving (planned contributions
 *     exceed retirement spending) OR their portfolio is less than half the
 *     FIRE number. Either signal alone is sufficient; this catches both the
 *     "young saver" and the "overspending retiree with a huge gap" cases.
 *   - `withdrawal` when the user has no contributions AND a portfolio at or
 *     above the FIRE number.
 *   - `transition` otherwise — portfolio between 50% and FIRE number with
 *     mixed signals.
 *
 * We intentionally ignore `profile.retirementAge` here because users often set
 * aspirational ages; using it would misclassify a 28-year-old with age 30 set
 * as already retired.
 */
export function getRetirementPhase(scenario: Scenario): RetirementPhase {
  const portfolio = getCurrentPortfolioBalance(scenario.accounts);
  const plannedContribution = getAnnualContributionTotal(scenario.accounts);
  const retirementSpending = scenario.retirementExpenses;
  const fireNumber = calculateFireNumber(
    retirementSpending,
    scenario.assumptions.withdrawalRate,
  );

  const isNetSaving =
    plannedContribution > 0 && plannedContribution > retirementSpending;
  const isUnderfunded = fireNumber > 0 && portfolio < fireNumber * 0.5;

  if (isNetSaving || isUnderfunded) {
    return "accumulation";
  }

  const isFunded = fireNumber > 0 && portfolio >= fireNumber;
  const hasNoContributions = plannedContribution <= 0;
  if (isFunded && hasNoContributions) {
    return "withdrawal";
  }

  return "transition";
}

export function isAccumulationPhase(scenario: Scenario): boolean {
  return getRetirementPhase(scenario) === "accumulation";
}
