/**
 * US household financial benchmarks for comparison features.
 * Hardcoded from federal data sources — update annually when new data releases.
 *
 * Sources:
 *  - Personal savings rate: Bureau of Economic Analysis (BEA), 2024 annual average
 *  - Median household income: US Census Bureau, 2023 ACS
 *  - Median net worth: Federal Reserve Survey of Consumer Finances (SCF), 2022
 *  - Retirement savings: Federal Reserve SCF, 2022
 *  - Average retirement age: Gallup, 2024
 *
 * Last updated: 2026-03-23
 */

export const US_BENCHMARKS = {
  /** BEA personal savings rate — 2024 annual average */
  savingsRate: 0.046,

  /** Census 2023 ACS */
  medianHouseholdIncome: 80_610,

  /** Federal Reserve SCF 2022, by age bracket */
  medianNetWorth: {
    under35: 39_000,
    "35-44": 135_600,
    "45-54": 247_200,
    "55-64": 364_500,
    all: 192_700,
  } as Record<string, number>,

  /** Federal Reserve SCF 2022 */
  medianRetirementSavings: 87_000,

  /** Gallup 2024 */
  averageRetirementAge: 62,

  /** Data vintage for attribution */
  source: "BEA 2024, Census 2023, Federal Reserve SCF 2022, Gallup 2024",
} as const;

/**
 * Get the age-appropriate median net worth benchmark.
 */
export function getMedianNetWorthForAge(age: number): {
  median: number;
  bracket: string;
} {
  if (age < 35) return { median: US_BENCHMARKS.medianNetWorth.under35, bracket: "under 35" };
  if (age < 45) return { median: US_BENCHMARKS.medianNetWorth["35-44"], bracket: "35–44" };
  if (age < 55) return { median: US_BENCHMARKS.medianNetWorth["45-54"], bracket: "45–54" };
  if (age < 65) return { median: US_BENCHMARKS.medianNetWorth["55-64"], bracket: "55–64" };
  return { median: US_BENCHMARKS.medianNetWorth.all, bracket: "all ages" };
}

/**
 * Estimate a rough percentile based on portfolio vs age-bracket median.
 * Uses a simple log-normal approximation — not exact, but directionally correct.
 */
export function estimateNetWorthPercentile(portfolio: number, age: number): number {
  const { median } = getMedianNetWorthForAge(age);
  if (median <= 0 || portfolio <= 0) return 50;

  // Log-normal approximation: if you're at Nx the median, your percentile is roughly:
  // P ≈ 50 + 50 * tanh(ln(portfolio/median) / 2)
  const ratio = Math.log(portfolio / median) / 2;
  const percentile = 50 + 50 * Math.tanh(ratio);
  return Math.round(Math.min(Math.max(percentile, 1), 99));
}
