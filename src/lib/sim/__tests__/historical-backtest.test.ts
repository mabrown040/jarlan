import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import { getShillerDataset } from "@/lib/data";
import { runHistoricalBacktest } from "@/lib/sim";

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

  return scenario;
}

describe("historical data and backtesting", () => {
  it("loads the normalized Shiller dataset", () => {
    const dataset = getShillerDataset("v1");

    expect(dataset.recordCount).toBe(1833);
    expect(dataset.startDate).toBe("1871-01");
    expect(dataset.endDate).toBe("2023-09");
    expect(dataset.records[1]?.realStockReturn).toBeCloseTo(-0.0117810826, 8);
  });

  it("runs a deterministic historical backtest for a retirement fixture", () => {
    const result = runHistoricalBacktest({
      kind: "historical",
      datasetVersion: "shiller-monthly-v1",
      scenario: createRetirementFixtureScenario(),
    });

    expect(result.successRate).toBe(0.9701);
    expect(result.periodsTested).toBe(1473);
    expect(result.successCount).toBe(1429);
    expect(result.failureCount).toBe(44);
    expect(result.initialWithdrawalRate).toBe(0.04);
    expect(result.bestCase.startDate).toBe("1932-07");
    expect(result.worstCase.startDate).toBe("1929-10");
    expect(result.worstCase.failureYear).toBe(23.2);
    expect(result.terminalValueStats.median).toBe(3033566.15);
    expect(result.percentileBand[0]?.p50).toBe(1500000);
    expect(result.percentileBand.at(-1)?.p10).toBe(753128.46);
    expect(result.percentileBand.at(-1)?.p50).toBe(3033566.15);
    expect(result.percentileBand.at(-1)?.p90).toBe(7616769.63);
  });
});
