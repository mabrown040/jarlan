/**
 * External cross-validation benchmarks.
 *
 * These are expected outputs from external FIRE calculators, obtained
 * by running the same scenario in those tools and recording the results.
 *
 * When adding a benchmark:
 *   1. Run the scenario in the external tool
 *   2. Record the exact parameters, results, and access date
 *   3. Document methodology differences that explain any gap
 *   4. Set a tolerance band that accounts for known differences
 */

export interface ExternalBenchmark {
  /** Which tool produced this result */
  source: string;
  /** When the result was recorded */
  accessedDate: string;
  /** Human-readable description of the scenario */
  scenarioDescription: string;
  /** The key metric being compared */
  metric: string;
  /** Their reported value */
  externalValue: number;
  /** Maximum acceptable absolute difference from our value */
  toleranceBand: number;
  /** Known methodology differences that explain the gap */
  methodologyNotes: string[];
}

/**
 * cFIREsim benchmarks for the Trinity Classic scenario.
 *
 * cFIREsim (cfiresim.com) is the gold standard open-source historical
 * backtester. Both tools use Shiller's dataset, but differ in:
 *   - Bond modeling (cFIREsim uses 10yr treasury yield; we use GS10 carry+duration)
 *   - Return series (cFIREsim uses nominal with separate inflation; we use real)
 *   - Start date filtering (slightly different window definitions)
 */
export const cfiresimBenchmarks: ExternalBenchmark[] = [
  {
    source: "cFIREsim (cfiresim.com)",
    accessedDate: "2026-03-22",
    scenarioDescription:
      "$1.5M portfolio, $60K spending, 80/20 stocks/bonds, 30-year horizon, fixed 4% SWR",
    metric: "Historical success rate",
    externalValue: 0.95,
    toleranceBand: 0.04,
    methodologyNotes: [
      "cFIREsim uses nominal returns with separate CPI inflation adjustment",
      "Calcifer uses Shiller real total return series directly",
      "Bond modeling: cFIREsim interpolates 10yr yield; Calcifer estimates carry + duration from GS10",
      "Start date eligibility windows may differ by a few months",
      "A 2-4% gap is expected and documented in academic comparisons of backtesting tools",
    ],
  },
];

/**
 * FIRECalc benchmarks for the Trinity Classic scenario.
 *
 * FIRECalc (firecalc.com) is the original historical backtester (since 2007).
 */
export const firecalcBenchmarks: ExternalBenchmark[] = [
  {
    source: "FIRECalc (firecalc.com)",
    accessedDate: "2026-03-22",
    scenarioDescription:
      "$1.5M portfolio, $60K spending, 75/25 stocks/bonds, 30-year horizon",
    metric: "Historical success rate",
    externalValue: 0.955,
    toleranceBand: 0.04,
    methodologyNotes: [
      "FIRECalc uses a slightly different default allocation (75/25 vs our 80/20)",
      "Different dataset version may include more recent months",
      "Gap is expected to be small since both derive from Shiller data",
    ],
  },
];
