/**
 * Savings Rate vs. Time to FI table builder.
 *
 * Used by both the Learn article (/education/savings-rate)
 * and referenced from the What-if page.
 *
 * Inspired by the "Shockingly Simple Math" concept — shows how
 * savings rate directly determines time to financial independence.
 */
import { calculateFireNumber, calculateYearsToTarget } from "./quick-fire";

export const SAVINGS_RATE_ROWS = [0.046, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

export interface SavingsRateRow {
  rate: number;
  annualExpenses: number;
  fireNumber: number;
  yearsToFi: number | null;
}

/**
 * Build a table of savings rates with corresponding expenses,
 * FIRE numbers, and years to FI — personalized to the user's
 * actual income, current balance, and assumptions.
 */
export function buildSavingsRateTableRows(
  annualIncome: number,
  withdrawalRate: number,
  annualRealReturn: number,
  currentBalance: number,
): SavingsRateRow[] {
  if (annualIncome <= 0) return [];

  return SAVINGS_RATE_ROWS.map((rate) => {
    const annualSavings = annualIncome * rate;
    const annualExpenses = annualIncome - annualSavings;
    const fireNumber = calculateFireNumber(annualExpenses, withdrawalRate);
    const yearsToFi = calculateYearsToTarget({
      currentBalance,
      annualContribution: annualSavings,
      targetBalance: fireNumber,
      annualRealReturn,
    });

    return {
      rate,
      annualExpenses,
      fireNumber,
      yearsToFi,
    };
  });
}
