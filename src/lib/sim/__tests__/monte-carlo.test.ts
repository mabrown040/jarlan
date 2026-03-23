import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import { runMonteCarloSimulation } from "@/lib/sim";

function createRetirementFixtureScenario() {
  const scenario = cloneScenario(createDefaultScenario());

  scenario.profile.age = 45;
  scenario.profile.retirementAge = 45;
  scenario.accounts[0].currentBalance = 1_500_000;
  scenario.accounts[0].annualContribution = 0;
  scenario.annualSavings = 0;
  scenario.retirementExpenses = 60_000;
  scenario.annualExpenses = 60_000;
  scenario.simulationSettings.retirementDuration = 30;
  scenario.simulationSettings.finalValueTarget = 0;
  scenario.simulationSettings.monteCarloTrials = 400;

  return scenario;
}

function createSeededRng(seed = 123456789) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("monte carlo simulation", () => {
  it("runs deterministic parametric simulations with a seeded rng", () => {
    const result = runMonteCarloSimulation(
      {
        kind: "monte-carlo",
        scenario: createRetirementFixtureScenario(),
        mode: "parametric",
        trials: 400,
      },
      { rng: createSeededRng(42) },
    );

    expect(result.trials).toBe(400);
    expect(result.percentileBand).toHaveLength(31);
    expect(result.failureRateByYear).toHaveLength(30);
    expect(result.successRate).toBeCloseTo(0.9175, 4);
    expect(result.terminalValueStats.median).toBeGreaterThan(1_000_000);
  });

  it("runs deterministic bootstrap simulations with monotonic failure rates", () => {
    const result = runMonteCarloSimulation(
      {
        kind: "monte-carlo",
        scenario: createRetirementFixtureScenario(),
        mode: "bootstrap",
        trials: 400,
      },
      { rng: createSeededRng(31415) },
    );

    expect(result.percentileBand[0]?.p50).toBe(1_500_000);
    expect(result.successRate).toBeCloseTo(0.955, 4);
    expect(result.failureRateByYear[9]?.cumulativeFailureRate).toBeLessThanOrEqual(
      result.failureRateByYear.at(-1)?.cumulativeFailureRate ?? 1,
    );
    expect(result.withdrawalSummary.firstYearMedian).toBe(60_000);
  });
});
