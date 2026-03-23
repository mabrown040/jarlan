import { describe, expect, it } from "vitest";

import { cloneScenario, createDefaultScenario } from "@/lib/domain";
import { runHistoricalBacktest } from "@/lib/sim";
import {
  resolveAnnualWithdrawalAmount,
  resolveInitialAnnualWithdrawal,
  resolveInitialWithdrawalRate,
} from "@/lib/sim/withdrawal-strategies";

describe("withdrawal strategies", () => {
  it("keeps fixed real spending constant", () => {
    const scenario = cloneScenario(createDefaultScenario());

    expect(resolveInitialAnnualWithdrawal(scenario, 1_500_000)).toBe(54_000);
    expect(resolveInitialWithdrawalRate(scenario, 1_350_000)).toBe(0.04);
    expect(
      resolveAnnualWithdrawalAmount({
        scenario,
        currentPortfolio: 1_200_000,
        currentRecord: null,
        previousAnnualWithdrawal: 54_000,
        previousYearInflation: 0.03,
        previousYearRealReturn: -0.08,
        initialAnnualWithdrawal: 54_000,
        initialWithdrawalRate: 0.04,
        yearsRemaining: 30,
      }),
    ).toBe(54_000);
  });

  it("uses the CAPE formula for dynamic withdrawals", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.withdrawalStrategy.type = "cape_dynamic";

    const withdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 1_500_000,
      currentRecord: {
        cape: 25,
        trCape: null,
      },
      previousAnnualWithdrawal: null,
      previousYearInflation: 0,
      previousYearRealReturn: null,
      initialAnnualWithdrawal: 54_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 30,
    });

    expect(withdrawal).toBeCloseTo(56_250, 2);
  });

  it("applies Guyton-Klinger skip-inflation and capital preservation cuts", () => {
    const scenario = cloneScenario(createDefaultScenario());
    scenario.withdrawalStrategy.type = "guyton_klinger";

    const withdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 900_000,
      currentRecord: null,
      previousAnnualWithdrawal: 60_000,
      previousYearInflation: 0.05,
      previousYearRealReturn: -0.1,
      initialAnnualWithdrawal: 60_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 20,
    });

    expect(withdrawal).toBeCloseTo(51_428.57, 2);
  });

  it("supports VPW, constant-percentage, and RMD formulas", () => {
    const scenario = cloneScenario(createDefaultScenario());

    scenario.withdrawalStrategy.type = "vpw";
    const vpwWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 1_200_000,
      currentRecord: null,
      previousAnnualWithdrawal: 54_000,
      previousYearInflation: 0.03,
      previousYearRealReturn: 0.04,
      initialAnnualWithdrawal: 54_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 30,
    });

    expect(vpwWithdrawal).toBeCloseTo(
      1_200_000 /
        ((1 -
          (1 + scenario.assumptions.expectedRealReturn) ** -30) /
          scenario.assumptions.expectedRealReturn),
      6,
    );

    scenario.withdrawalStrategy.type = "constant_pct";
    const constantPctWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 800_000,
      currentRecord: null,
      previousAnnualWithdrawal: 54_000,
      previousYearInflation: 0.03,
      previousYearRealReturn: 0.04,
      initialAnnualWithdrawal: 54_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 30,
    });

    expect(constantPctWithdrawal).toBe(32_000);

    scenario.profile.age = 72;
    scenario.profile.retirementAge = 72;
    scenario.simulationSettings.retirementDuration = 20;
    scenario.withdrawalStrategy.type = "rmd";
    const rmdWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 1_000_000,
      currentRecord: null,
      previousAnnualWithdrawal: 54_000,
      previousYearInflation: 0.03,
      previousYearRealReturn: 0.04,
      initialAnnualWithdrawal: 54_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 20,
    });

    expect(rmdWithdrawal).toBeCloseTo(37_037.04, 2);
  });

  it("applies floor-and-ceiling and spending-smile adjustments", () => {
    const scenario = cloneScenario(createDefaultScenario());

    scenario.withdrawalStrategy.type = "floor_ceiling";
    scenario.withdrawalStrategy.floorCeiling = {
      floor: 30_000,
      ceiling: 80_000,
    };

    const flooredWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 500_000,
      currentRecord: null,
      previousAnnualWithdrawal: 54_000,
      previousYearInflation: 0.03,
      previousYearRealReturn: 0.04,
      initialAnnualWithdrawal: 54_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 30,
    });
    const cappedWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 3_000_000,
      currentRecord: null,
      previousAnnualWithdrawal: 54_000,
      previousYearInflation: 0.03,
      previousYearRealReturn: 0.04,
      initialAnnualWithdrawal: 54_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 30,
    });

    expect(flooredWithdrawal).toBe(30_000);
    expect(cappedWithdrawal).toBe(80_000);

    scenario.withdrawalStrategy.type = "spending_smile";
    scenario.withdrawalStrategy.spendingDeclineRate = 0.02;
    scenario.simulationSettings.retirementDuration = 30;
    const spendingSmileWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: 1_500_000,
      currentRecord: null,
      previousAnnualWithdrawal: 54_000,
      previousYearInflation: 0.03,
      previousYearRealReturn: 0.04,
      initialAnnualWithdrawal: 60_000,
      initialWithdrawalRate: 0.04,
      yearsRemaining: 20,
    });

    expect(spendingSmileWithdrawal).toBeCloseTo(60_000 * 0.98 ** 10, 6);
  });

  it("produces varying annual withdrawals in historical CAPE runs", () => {
    const scenario = cloneScenario(createDefaultScenario());

    scenario.profile.age = 45;
    scenario.profile.retirementAge = 45;
    scenario.accounts[0].currentBalance = 1_500_000;
    scenario.accounts[0].annualContribution = 0;
    scenario.annualSavings = 0;
    scenario.retirementExpenses = 60_000;
    scenario.annualExpenses = 60_000;
    scenario.simulationSettings.retirementDuration = 30;
    scenario.withdrawalStrategy.type = "cape_dynamic";

    const result = runHistoricalBacktest({
      kind: "historical",
      datasetVersion: "shiller-monthly-v1",
      scenario,
    });

    expect(result.withdrawalSummary.firstYearMedian).toBeGreaterThan(0);
    expect(result.withdrawalSummary.maxMedian).toBeGreaterThan(
      result.withdrawalSummary.minMedian,
    );
    expect(result.percentileBand.at(-1)?.withdrawal).not.toBe(
      result.percentileBand[0]?.withdrawal,
    );
  });
});
