/**
 * Mortality Risk — Golden Tests
 *
 * Pins the rich/broke/dead decomposition and verifies SSA mortality data.
 * The mortality overlay is what makes Calcifer unique — showing users they are
 * more likely to die with money than to run out of it.
 *
 * @source SSA 2025 Trustees Report, Table 4c6
 */
import { describe, it, expect } from "vitest";
import { getMortalityDataset } from "@/lib/data";
import { buildMortalityRiskTimeline, type MonteCarloResult } from "@/lib/sim";
import { cloneScenario, createDefaultScenario } from "@/lib/domain";

/** Create a synthetic Monte Carlo result for mortality testing */
function makeMockMonteCarloResult(duration: number): MonteCarloResult {
  return {
    kind: "monte-carlo",
    successRate: 0.9,
    trials: 1000,
    confidenceInterval: { low: 0.88, high: 0.92 },
    initialWithdrawal: 60_000,
    initialWithdrawalRate: 0.04,
    terminalValueTarget: 0,
    terminalValueStats: {
      min: 0, p10: 250_000, median: 1_500_000, p90: 3_000_000, max: 6_000_000, average: 1_900_000,
    },
    terminalValueHistogram: [{ label: "0-500K", start: 0, end: 500_000, count: 200 }],
    failureYearHistogram: [{ label: "1-5 yrs", start: 1, end: 5, count: 20 }],
    withdrawalSummary: {
      firstYearP10: 60_000, firstYearMedian: 60_000, firstYearP90: 60_000,
      minMedian: 55_000, minMedianYear: 0,
      averageMedian: 60_000, medianStdDev: 0,
      maxMedian: 65_000, maxMedianYear: duration - 1,
    },
    failureRateByYear: Array.from({ length: duration }, (_, i) => ({
      year: i + 1,
      cumulativeFailureRate: Number(((i + 1) / (duration * 10)).toFixed(4)),
    })),
    notes: [],
    percentileBand: Array.from({ length: duration + 1 }, (_, year) => ({
      year, age: 45 + year, withdrawal: 60_000,
      p10: 250_000, p25: 500_000, p50: 1_500_000, p75: 2_500_000, p90: 3_000_000,
    })),
  };
}

describe("Mortality Data — SSA Spot Checks", () => {
  const dataset = getMortalityDataset();

  /**
   * @golden Age 65 male mortality ≈ 1.4%
   * @source SSA Period Life Table 2025
   */
  it("age 65 male mortality probability", () => {
    const record = dataset.records.find((r) => r.age === 65);
    expect(record).toBeDefined();
    if (record) {
      expect(record.maleProbability).toBeGreaterThan(0.005);
      expect(record.maleProbability).toBeLessThan(0.03);
    }
  });

  /**
   * @golden Age 75 male mortality ≈ 3.4%
   */
  it("age 75 male mortality probability", () => {
    const record = dataset.records.find((r) => r.age === 75);
    expect(record).toBeDefined();
    if (record) {
      expect(record.maleProbability).toBeGreaterThan(0.015);
      expect(record.maleProbability).toBeLessThan(0.06);
    }
  });

  /**
   * @golden Age 85 male mortality ≈ 9.8%
   */
  it("age 85 male mortality probability", () => {
    const record = dataset.records.find((r) => r.age === 85);
    expect(record).toBeDefined();
    if (record) {
      expect(record.maleProbability).toBeGreaterThan(0.05);
      expect(record.maleProbability).toBeLessThan(0.15);
    }
  });
});

describe("Rich/Broke/Dead Decomposition — Invariants", () => {
  const scenario = cloneScenario(createDefaultScenario());
  scenario.profile.age = 45;
  scenario.profile.retirementAge = 45;
  scenario.simulationSettings.retirementDuration = 30;

  const risk = buildMortalityRiskTimeline({
    scenario,
    monteCarloResult: makeMockMonteCarloResult(30),
  });

  /**
   * @golden At year 0: alive and solvent = 100%
   * @methodology At the start of retirement, you are alive and have your full portfolio.
   */
  it("year 0: aliveAndSolvent = 1.0", () => {
    expect(risk.points[0]?.aliveAndSolventProbability).toBe(1);
  });

  /**
   * @golden Probabilities sum to 1.0 at every year
   * @methodology The four states (alive+solvent, alive+broke, dead) are exhaustive and exclusive.
   *   Note: dead includes both "dead with money" and "dead broke".
   */
  it("aliveAndSolvent + aliveAndBroke + dead ≈ 1.0 at every year", () => {
    for (const point of risk.points) {
      const sum =
        point.aliveAndSolventProbability +
        point.aliveAndBrokeProbability +
        point.deadProbability;
      expect(sum).toBeCloseTo(1.0, 3);
    }
  });

  /**
   * @golden Dead probability increases over time
   * @methodology People die — the dead probability must grow.
   */
  it("dead probability increases over time", () => {
    const firstDead = risk.points[0]?.deadProbability ?? 0;
    const lastDead = risk.points.at(-1)?.deadProbability ?? 0;
    expect(lastDead).toBeGreaterThan(firstDead);
  });

  /**
   * @golden Timeline has correct length
   */
  it("timeline has duration + 1 points", () => {
    expect(risk.points).toHaveLength(31);
  });
});
