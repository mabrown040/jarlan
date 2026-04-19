import { describe, expect, it } from "vitest";

import { getMortalityDataset } from "@/lib/data";
import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import { buildMortalityRiskTimeline, type MonteCarloResult } from "@/lib/sim";

describe("mortality-aware risk", () => {
  it("loads the bundled mortality dataset", () => {
    const dataset = getMortalityDataset("v1");

    expect(dataset.recordCount).toBe(102);
    expect(dataset.minAge).toBe(18);
    expect(dataset.maxAge).toBe(119);
    expect(dataset.records[0]?.age).toBe(18);
    expect(dataset.records.at(-1)?.femaleProbability).toBe(1);
  });

  it("builds a rich-broke-dead timeline from monte carlo failures", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.profile.age = 45;
    scenario.profile.retirementAge = 45;
    scenario.simulationSettings.retirementDuration = 30;

    const monteCarloResult: MonteCarloResult = {
      kind: "monte-carlo",
      successRate: 0.9,
      trials: 1000,
      confidenceInterval: { low: 0.88, high: 0.92 },
      initialWithdrawal: 60_000,
      initialWithdrawalRate: 0.04,
      terminalValueTarget: 0,
      terminalValueStats: {
        min: 0,
        p10: 250_000,
        median: 1_500_000,
        p90: 3_000_000,
        max: 6_000_000,
        average: 1_900_000,
      },
      terminalValueHistogram: [
        {
          label: "0-500000 ending value",
          start: 0,
          end: 500_000,
          count: 200,
        },
      ],
      failureYearHistogram: [
        {
          label: "1-5 yrs",
          start: 1,
          end: 5,
          count: 20,
        },
      ],
      withdrawalSummary: {
        firstYearP10: 60_000,
        firstYearMedian: 60_000,
        firstYearP90: 60_000,
        minMedian: 55_000,
        minMedianYear: 0,
        averageMedian: 60_000,
        medianStdDev: 0,
        maxMedian: 65_000,
        maxMedianYear: 29, // duration - 1 in the 30-year fixture
      },
      failureRateByYear: Array.from({ length: 30 }, (_, index) => ({
        year: index + 1,
        cumulativeFailureRate: Number(((index + 1) / 300).toFixed(4)),
      })),
      notes: [],
      percentileBand: Array.from({ length: 31 }, (_, year) => ({
        year,
        age: 45 + year,
        withdrawal: 60_000,
        p10: 250_000,
        p25: 500_000,
        p50: 1_500_000,
        p75: 2_500_000,
        p90: 3_000_000,
      })),
    };

    const risk = buildMortalityRiskTimeline({ scenario, monteCarloResult });

    expect(risk.points).toHaveLength(31);
    expect(risk.points[0]?.aliveAndSolventProbability).toBe(1);
    expect(risk.points.at(-1)?.deadProbability ?? 0).toBeGreaterThan(0);
    expect(
      risk.points.at(-1)?.aliveAndBrokeProbability ?? 0,
    ).toBeLessThanOrEqual(risk.points.at(-1)?.aliveProbability ?? 1);
  });
});
