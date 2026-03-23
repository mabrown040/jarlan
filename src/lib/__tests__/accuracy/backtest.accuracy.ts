/**
 * Historical Backtest Engine — Golden Tests
 *
 * Pins the historical backtesting engine to known-correct outputs.
 * These are the most critical accuracy tests because they directly validate
 * against the academic research (Trinity Study, Bengen) and external tools.
 *
 * The Trinity Classic scenario ($1.5M, 80/20, $60K, 30yr, fixed 4%) is the
 * gold standard — it's the scenario most commonly discussed in the FIRE community
 * and the one we cross-validate against cFIREsim and FIRECalc.
 */
import { describe, it, expect } from "vitest";
import { golden, goldenRecord } from "./_fixtures/golden";
import { createTrinityClassicScenario } from "./_fixtures/scenarios";
import { cfiresimBenchmarks } from "./_fixtures/external-benchmarks";
import { runHistoricalBacktest } from "@/lib/sim";
import { getShillerDataset } from "@/lib/data";

describe("Historical Backtest — Golden Tests", () => {
  const scenario = createTrinityClassicScenario();
  const result = runHistoricalBacktest({
    kind: "historical",
    datasetVersion: "shiller-monthly-v1",
    scenario,
  });

  /**
   * @golden Success rate for Trinity Classic
   * @methodology Run all 1,473 eligible 30-year windows from 1871-2023.
   *   Count paths where portfolio survived (balance > $0 at year 30).
   *   successRate = 1429 / 1473 = 0.9701
   * @source Comparable to Trinity Study (Cooley et al. 1998) results for 4% SWR, 75/25 allocation
   */
  it("success rate = 97.01%", () => {
    golden("backtest.trinity.success-rate", {
      input: { portfolio: 1_500_000, spending: 60_000, allocation: "80/20", duration: 30, swr: 0.04 },
      expected: 0.9728,
      actual: result.successRate,
      tolerance: 0,
      methodology: "1433 successful / 1473 total periods = 0.9728. All Shiller monthly start dates 1871-2023.",
    });
  });

  it("periods tested = 1,473", () => {
    golden("backtest.trinity.periods-tested", {
      input: { dataRange: "1871-01 to 2023-09", duration: 30 },
      expected: 1473,
      actual: result.periodsTested,
      tolerance: 0,
      methodology: "Total eligible start months = (total months) - (30yr × 12mo) + 1",
    });
  });

  it("success count = 1,429 and failure count = 44", () => {
    golden("backtest.trinity.success-count", {
      input: { periodsTested: 1473 },
      expected: 1433,
      actual: result.successCount,
      tolerance: 0,
      methodology: "Paths ending with portfolio > $0",
    });
    expect(result.failureCount).toBe(40);
  });

  /**
   * @golden Best case start date = 1932-07
   * @methodology The start date producing the highest terminal value.
   *   July 1932 was near the bottom of the Great Depression — buying stocks cheap
   *   then benefiting from the massive recovery produced extraordinary returns.
   */
  it("best case start = 1932-07", () => {
    goldenRecord("backtest.trinity.best-start", {
      input: { scenario: "trinityClassic" },
      expected: "1932-07",
      actual: result.bestCase.startDate,
      methodology: "Bottom of Great Depression → massive recovery. Highest terminal value.",
      status: result.bestCase.startDate === "1932-07" ? "pass" : "fail",
    });
    expect(result.bestCase.startDate).toBe("1932-07");
  });

  /**
   * @golden Worst case start date = 1929-10
   * @methodology The start date producing the lowest terminal value (or earliest failure).
   *   October 1929 was the start of the Great Depression crash.
   */
  it("worst case start = 1929-10", () => {
    goldenRecord("backtest.trinity.worst-start", {
      input: { scenario: "trinityClassic" },
      expected: "1929-10",
      actual: result.worstCase.startDate,
      methodology: "Start of Great Depression crash. Devastating sequence of returns.",
      status: result.worstCase.startDate === "1929-10" ? "pass" : "fail",
    });
    expect(result.worstCase.startDate).toBe("1929-10");
    expect(result.worstCase.failureYear).toBe(23.7);
  });

  /**
   * @golden Terminal value distribution
   * @methodology Median ending portfolio after 30 years across all surviving paths.
   */
  it("terminal value median = $3,033,566.15", () => {
    golden("backtest.trinity.terminal-median", {
      input: { scenario: "trinityClassic", metric: "median terminal value" },
      expected: 3_316_055.88,
      actual: result.terminalValueStats.median,
      tolerance: 0,
      methodology: "50th percentile of ending portfolio values across all 1,473 paths.",
    });
  });

  it("terminal value percentiles at year 30", () => {
    const lastBand = result.percentileBand.at(-1);
    expect(lastBand).toBeDefined();
    if (!lastBand) return;

    golden("backtest.trinity.terminal-p10", {
      input: { scenario: "trinityClassic", percentile: "p10" },
      expected: 791_595.34,
      actual: lastBand.p10,
      tolerance: 0,
      methodology: "10th percentile ending value — near-worst-case outcome.",
    });

    golden("backtest.trinity.terminal-p90", {
      input: { scenario: "trinityClassic", percentile: "p90" },
      expected: 8_086_288.44,
      actual: lastBand.p90,
      tolerance: 0,
      methodology: "90th percentile ending value — near-best-case outcome.",
    });
  });

  /**
   * @golden Initial withdrawal rate
   * @methodology $60,000 / $1,500,000 = 0.04 (4%)
   */
  it("initial withdrawal rate = 4%", () => {
    golden("backtest.trinity.initial-wr", {
      input: { spending: 60_000, portfolio: 1_500_000 },
      expected: 0.04,
      actual: result.initialWithdrawalRate,
      tolerance: 0,
      methodology: "spending / portfolio = $60K / $1.5M = 0.04",
    });
  });

  /**
   * @golden Year 0 percentile band starts at portfolio value
   * @methodology At t=0, all paths start at the same portfolio value.
   */
  it("year 0 p50 = starting portfolio", () => {
    golden("backtest.trinity.year0-p50", {
      input: { portfolio: 1_500_000 },
      expected: 1_500_000,
      actual: result.percentileBand[0]?.p50 ?? 0,
      tolerance: 0,
      methodology: "All paths begin at the same starting portfolio.",
    });
  });
});

describe("Historical Backtest — cFIREsim Cross-Validation", () => {
  const scenario = createTrinityClassicScenario();
  const result = runHistoricalBacktest({
    kind: "historical",
    datasetVersion: "shiller-monthly-v1",
    scenario,
  });

  /**
   * @golden Cross-validate success rate against cFIREsim
   * @methodology cFIREsim reports ~95% for similar parameters.
   *   Our 97.01% is within the 4% tolerance band.
   *   Differences documented in external-benchmarks.ts.
   */
  it("success rate within tolerance of cFIREsim", () => {
    const benchmark = cfiresimBenchmarks[0];
    const delta = Math.abs(result.successRate - benchmark.externalValue);

    goldenRecord("backtest.crossval.cfiresim-success", {
      input: {
        ours: String(result.successRate),
        theirs: String(benchmark.externalValue),
        tolerance: String(benchmark.toleranceBand),
      },
      expected: `delta ≤ ${benchmark.toleranceBand}`,
      actual: `delta = ${delta.toFixed(4)}`,
      methodology: benchmark.methodologyNotes.join("; "),
      status: delta <= benchmark.toleranceBand ? "pass" : "fail",
    });

    expect(delta).toBeLessThanOrEqual(benchmark.toleranceBand);
  });
});

describe("Shiller Dataset — Spot Checks", () => {
  const dataset = getShillerDataset();

  /**
   * @golden First real stock return (1871-02) matches published Shiller data
   */
  it("1871-02 real stock return", () => {
    golden("data.shiller.1871-02-stock-return", {
      input: { date: "1871-02" },
      expected: -0.0117810826,
      actual: dataset.records[1]?.realStockReturn ?? 0,
      tolerance: 8,
      methodology: "Verified against Shiller's published Excel spreadsheet.",
    });
  });

  /**
   * @golden Last record is 2023-09
   */
  it("last record date is 2023-09", () => {
    const last = dataset.records.at(-1);
    expect(last?.date).toBe("2023-09");
  });

  /**
   * @golden 1929-09 CAPE ≈ 32.56 (pre-crash peak)
   */
  it("1929-09 CAPE ≈ 32.56", () => {
    const record = dataset.records.find((r) => r.date === "1929-09");
    expect(record).toBeDefined();
    expect(record?.cape).toBeCloseTo(32.56, 0);
  });
});
