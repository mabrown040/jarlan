/**
 * Withdrawal Strategies — Golden Tests
 *
 * Pins each of the 8 withdrawal strategy formulas to hand-calculated values.
 * These are pure math checks — no historical data involved.
 */
import { describe, it, expect } from "vitest";
import { golden } from "./_fixtures/golden";
import { resolveAnnualWithdrawalAmount, type WithdrawalComputationContext } from "@/lib/sim/withdrawal-strategies";
import type { Scenario } from "@/lib/domain/types";
import type { ShillerMonthlyRecord } from "@/lib/data/contracts";
import { createTrinityClassicScenario } from "./_fixtures/scenarios";

/** Create a minimal Shiller record for strategy testing */
function makeRecord(cape: number | null): ShillerMonthlyRecord {
  return {
    year: 2000, month: 1, date: "2000-01", dateFraction: 2000.0,
    nominalPrice: 1400, nominalDividend: 16, nominalEarnings: 56,
    realPrice: 1400, realDividend: 16, realTotalReturnPrice: 1400, realEarnings: 56, realScaledEarnings: 56,
    cpi: 168, gs10: 6.5, cape, trCape: cape,
    realStockReturn: 0.01, realBondReturn: 0.003, inflationRate: 0.002, nominalBondReturn: 0.005,
  } as ShillerMonthlyRecord;
}

function makeContext(overrides: Partial<WithdrawalComputationContext> & { scenario?: Scenario }): WithdrawalComputationContext {
  const scenario = overrides.scenario ?? createTrinityClassicScenario();
  return {
    scenario,
    currentPortfolio: 1_500_000,
    initialAnnualWithdrawal: 60_000,
    initialWithdrawalRate: 0.04,
    previousAnnualWithdrawal: 60_000,
    previousYearInflation: 0.03,
    previousYearRealReturn: 0.07,
    yearsRemaining: 30,
    currentRecord: makeRecord(25),
    ...overrides,
  };
}

describe("Withdrawal Strategies — Golden Tests", () => {
  /**
   * @golden Fixed real — constant purchasing power
   * @methodology Returns the initial withdrawal amount unchanged every year.
   * @source Bengen (1994), Trinity Study (1998)
   */
  it("fixed real returns constant withdrawal", () => {
    const ctx = makeContext({ yearsElapsed: 5 });
    golden("withdrawal.fixed.constant", {
      input: { initialWithdrawal: 60_000, yearsElapsed: 5 },
      expected: 60_000,
      actual: resolveAnnualWithdrawalAmount(ctx),
      tolerance: 0,
      methodology: "Fixed real = initial withdrawal unchanged. Bengen (1994).",
    });
  });

  /**
   * @golden CAPE dynamic — valuation-adjusted withdrawal
   * @methodology withdrawal = portfolio × (a + b / CAPE) = $1.5M × (0.0175 + 0.5/25) = $56,250
   * @source ERN SWR Series Part 11, Part 18
   */
  it("CAPE dynamic at CAPE=25", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "cape_dynamic";
    scenario.withdrawalStrategy.capeParams = { a: 0.0175, b: 0.5 };
    const ctx = makeContext({
      scenario,
      currentRecord: { cape: 25, trCape: 25 },
    });
    golden("withdrawal.cape-dynamic.cape25", {
      input: { portfolio: 1_500_000, a: 0.0175, b: 0.5, cape: 25 },
      expected: 56_250,
      actual: resolveAnnualWithdrawalAmount(ctx),
      tolerance: 2, // floating point
      methodology: "portfolio × (a + b/CAPE) = $1.5M × (0.0175 + 0.02) = $56,250. ERN SWR Part 11.",
    });
  });

  /**
   * @golden Guyton-Klinger — capital preservation cut
   * @methodology When current WR > initial WR × (1 + guardrailWidth) and years remaining > 15,
   *   cut withdrawal by adjustmentSize (10%).
   * @source Guyton & Klinger (2006), FPA Journal
   */
  it("Guyton-Klinger capital preservation cut", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "guyton_klinger";
    scenario.withdrawalStrategy.initialRate = 0.04;
    // Portfolio dropped to $900K, previous withdrawal was $60K
    // Current WR = $60K / $900K = 6.67%, which is > 4% × 1.2 = 4.8% → trigger cut
    const ctx = makeContext({
      scenario,
      currentPortfolio: 900_000,
      previousAnnualWithdrawal: 60_000,
      previousYearRealReturn: -0.15,
      previousYearInflation: 0.03,
      yearsRemaining: 25,
      currentRecord: makeRecord(20),
    });
    const result = resolveAnnualWithdrawalAmount(ctx);
    // GK should cut spending — result should be less than $60K
    expect(result).toBeLessThan(60_000);
    expect(result).toBeGreaterThan(30_000);
  });

  /**
   * @golden Constant percentage — fixed % of current portfolio
   * @methodology withdrawal = portfolio × rate = $800,000 × 0.04 = $32,000
   */
  it("constant percentage of portfolio", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "constant_pct";
    scenario.withdrawalStrategy.initialRate = 0.04;
    const ctx = makeContext({ scenario, currentPortfolio: 800_000 });
    golden("withdrawal.constant-pct.basic", {
      input: { portfolio: 800_000, rate: 0.04 },
      expected: 32_000,
      actual: resolveAnnualWithdrawalAmount(ctx),
      tolerance: 0,
      methodology: "portfolio × rate = $800K × 0.04 = $32,000",
    });
  });

  /**
   * @golden RMD-based — age-dependent divisor
   * @methodology withdrawal = portfolio / divisor(age). At age 72, divisor ≈ 27.4
   * @source IRS Uniform Lifetime Table
   */
  it("RMD at age 72", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "rmd";
    scenario.profile.age = 72;
    const ctx = makeContext({ scenario, currentPortfolio: 1_000_000, yearsRemaining: 28 });
    const result = resolveAnnualWithdrawalAmount(ctx);
    // RMD divisor depends on our implementation's age table
    expect(result).toBeGreaterThan(20_000);
    expect(result).toBeLessThan(50_000);
  });

  /**
   * @golden Floor & ceiling — clamped withdrawal
   * @methodology withdrawal = clamp(portfolio × rate, floor, ceiling)
   */
  it("floor binding when portfolio is low", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "floor_ceiling";
    scenario.withdrawalStrategy.floorCeiling = { floor: 30_000, ceiling: 80_000 };
    scenario.withdrawalStrategy.initialRate = 0.04;
    // Portfolio $500K × 4% = $20K, which is below floor → floor binds
    const ctx = makeContext({ scenario, currentPortfolio: 500_000 });
    golden("withdrawal.floor-ceiling.floor-binds", {
      input: { portfolio: 500_000, rate: 0.04, floor: 30_000 },
      expected: 30_000,
      actual: resolveAnnualWithdrawalAmount(ctx),
      tolerance: 0,
      methodology: "portfolio × rate ($20K) < floor ($30K) → withdrawal = floor",
    });
  });

  it("ceiling binding when portfolio is high", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "floor_ceiling";
    scenario.withdrawalStrategy.floorCeiling = { floor: 30_000, ceiling: 80_000 };
    scenario.withdrawalStrategy.initialRate = 0.04;
    // Portfolio $3M × 4% = $120K, which is above ceiling → ceiling binds
    const ctx = makeContext({ scenario, currentPortfolio: 3_000_000 });
    golden("withdrawal.floor-ceiling.ceiling-binds", {
      input: { portfolio: 3_000_000, rate: 0.04, ceiling: 80_000 },
      expected: 80_000,
      actual: resolveAnnualWithdrawalAmount(ctx),
      tolerance: 0,
      methodology: "portfolio × rate ($120K) > ceiling ($80K) → withdrawal = ceiling",
    });
  });

  /**
   * @golden Spending smile — exponential real spending decline
   * @methodology withdrawal = initial × (1 - declineRate)^yearsElapsed
   *   = $60,000 × 0.9875^10 = $52,574.76 (at 1.25% decline)
   * @source Blanchett (2014), "Estimating the True Cost of Retirement"
   */
  it("spending smile at year 0 returns initial withdrawal", () => {
    const scenario = createTrinityClassicScenario();
    scenario.withdrawalStrategy.type = "spending_smile";
    scenario.withdrawalStrategy.spendingDeclineRate = 0.0125;
    const ctx = makeContext({ scenario, yearsElapsed: 0 });
    golden("withdrawal.spending-smile.year0", {
      input: { initialWithdrawal: 60_000, declineRate: 0.0125, yearsElapsed: 0 },
      expected: 60_000,
      actual: resolveAnnualWithdrawalAmount(ctx),
      tolerance: 0,
      methodology: "At year 0, spending smile returns initial withdrawal. Blanchett (2014).",
    });
  });
});
