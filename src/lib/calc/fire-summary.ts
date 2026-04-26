/**
 * FIRE summary calculator — lightweight, server-safe utility for
 * producing a snapshot of "where does this scenario stand?" that
 * the admin review panel and reply-generation pipeline can display
 * or reference without running a full simulation.
 *
 * Pure — no I/O, no side effects, no `Date.now()`.
 */

import { calculateFireNumber, calculateYearsToTarget } from "@/lib/calc/quick-fire";
import {
  getCurrentPortfolioBalance,
  getYearsUntilRetirement,
} from "@/lib/calc/scenario";
import type { Scenario } from "@/lib/domain/types";

export interface FireSummary {
  /** Total of all account balances */
  portfolioTotal: number;
  /** Annual expenses (working phase) */
  annualExpenses: number;
  /** User's stated withdrawal rate */
  withdrawalRate: number;
  /** Safer / conservative withdrawal rate */
  saferWithdrawalRate: number;
  /** Years until portfolio reaches FIRE number at current trajectory */
  yearsToFire: number | null;
  /** Portfolio already covers expenses at the safer WR */
  isAlreadyFi: boolean;
  /** Monthly safe withdrawal (portfolio × WR) */
  monthlySafeWithdrawal: number;
  /** Monthly safer withdrawal (portfolio × saferWR) */
  monthlySaferWithdrawal: number;
  /** How many years expenses the portfolio covers at safer WR */
  expenseCoverageYears: number;
}

/**
 * Compute a FIRE summary for a scenario.
 *
 * Notes:
 * - `yearsToFire` is computed from the *safer* WR target, not the
 *   user's stated WR. This avoids the situation where a user with a
 *   6 % WR shows "0 years" while the safer math says they're not there.
 * - If retirement age is not set, `yearsToFire` falls back to `null`.
 * - If the user has already passed their stated retirement age,
 *   `yearsToFire` is still computed from the *current* portfolio +
 *   savings trajectory toward the safer-FIRE-number, not the
 *   retirement-age target.
 */
export function calculateFireSummary(scenario: Scenario): FireSummary {
  const portfolioTotal = getCurrentPortfolioBalance(scenario.accounts);
  const annualExpenses = scenario.annualExpenses;
  const withdrawalRate = scenario.assumptions.withdrawalRate;
  const saferWithdrawalRate = scenario.assumptions.saferWithdrawalRate;

  const monthlySafeWithdrawal = (portfolioTotal * withdrawalRate) / 12;
  const monthlySaferWithdrawal = (portfolioTotal * saferWithdrawalRate) / 12;

  const isAlreadyFi = portfolioTotal * saferWithdrawalRate >= annualExpenses;

  const expenseCoverageYears =
    saferWithdrawalRate > 0 ? portfolioTotal / annualExpenses : 0;

  // Compute years to the *safer* FIRE number.
  const saferFireNumber = calculateFireNumber(annualExpenses, saferWithdrawalRate);
  const yearsUntilRetirement = getYearsUntilRetirement(scenario);

  let yearsToFire: number | null = null;

  if (portfolioTotal >= saferFireNumber) {
    yearsToFire = 0;
  } else if (
    yearsUntilRetirement !== null &&
    yearsUntilRetirement > 0
  ) {
    // Use the effective real return (real return minus fee drag).
    const effectiveReturn =
      scenario.assumptions.expectedRealReturn -
      (scenario.simulationSettings?.feeDrag ?? 0);

    yearsToFire = calculateYearsToTarget({
      currentBalance: portfolioTotal,
      annualContribution: scenario.annualSavings,
      targetBalance: saferFireNumber,
      annualRealReturn: effectiveReturn,
    });
  }

  return {
    portfolioTotal,
    annualExpenses,
    withdrawalRate,
    saferWithdrawalRate,
    yearsToFire,
    isAlreadyFi,
    monthlySafeWithdrawal,
    monthlySaferWithdrawal,
    expenseCoverageYears,
  };
}
