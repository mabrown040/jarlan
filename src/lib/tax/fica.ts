/**
 * FICA / Payroll Tax Calculator
 *
 * Computes Social Security + Medicare taxes for W-2 employees
 * and self-employed / 1099 workers.
 *
 * 2025 rates and thresholds per IRS Publication 15 / Schedule SE.
 */

import type { FilingStatus } from "@/lib/domain/types";

/* ── 2025 FICA rates and thresholds ────────────────────────── */
const SS_RATE = 0.062; // 6.2%
const SS_WAGE_BASE = 168_600; // 2025
const MEDICARE_RATE = 0.0145; // 1.45%
const ADDITIONAL_MEDICARE_RATE = 0.009; // 0.9%
const ADDITIONAL_MEDICARE_THRESHOLDS: Record<FilingStatus, number> = {
  single: 200_000,
  married_joint: 250_000,
  married_separate: 125_000,
  head_of_household: 200_000,
};

export type EmploymentType = "w2" | "self_employed" | "1099";

export interface FicaResult {
  socialSecurity: number;
  medicare: number;
  totalFica: number;
  /** For self-employed: 50% of SE tax is deductible from AGI */
  employerFica: number;
}

/**
 * Calculate FICA / payroll taxes.
 *
 * - W-2: employee pays half, employer pays half (we compute employee share only)
 * - Self-employed / 1099: pays both halves (employee + employer)
 */
export function calculateFica(
  grossIncome: number,
  employmentType: EmploymentType,
  filingStatus: FilingStatus,
): FicaResult {
  const multiplier = employmentType === "w2" ? 1 : 2;

  // Social Security: 6.2% up to wage base (×2 for SE)
  const ssWages = Math.min(grossIncome, SS_WAGE_BASE);
  const socialSecurity = ssWages * SS_RATE * multiplier;

  // Medicare: 1.45% on all wages (×2 for SE) + 0.9% additional on high earners (employee-only)
  const baseMedicare = grossIncome * MEDICARE_RATE * multiplier;
  const threshold = ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus] ?? 200_000;
  const additionalMedicare =
    Math.max(grossIncome - threshold, 0) * ADDITIONAL_MEDICARE_RATE;
  const medicare = baseMedicare + additionalMedicare;

  const totalFica = socialSecurity + medicare;

  // For SE: 50% of SE tax is deductible from AGI
  const employerFica = employmentType !== "w2" ? totalFica / 2 : 0;

  return { socialSecurity, medicare, totalFica, employerFica };
}
