import type { ShillerMonthlyRecord } from "@/lib/data";
import type { Scenario, WithdrawalStrategyType } from "@/lib/domain/types";

const defaultCapeParams = {
  a: 0.0175,
  b: 0.5,
} as const;

const defaultGkParams = {
  guardrailWidth: 0.2,
  adjustmentSize: 0.1,
  suspendCapPreservationYears: 15,
} as const;

const defaultFloorCeiling = {
  floor: 30_000,
  ceiling: 80_000,
} as const;

const defaultSpendingDeclineRate = 0.0125;

const rmdDivisors = new Map<number, number>([
  [60, 37.7],
  [61, 36.8],
  [62, 35.8],
  [63, 34.9],
  [64, 34.0],
  [65, 33.1],
  [66, 32.2],
  [67, 31.4],
  [68, 30.5],
  [69, 29.6],
  [70, 28.8],
  [71, 27.9],
  [72, 27.0],
  [73, 26.1],
  [74, 25.3],
  [75, 24.4],
  [76, 23.5],
  [77, 22.7],
  [78, 21.8],
  [79, 21.1],
  [80, 20.2],
  [81, 19.4],
  [82, 18.5],
  [83, 17.7],
  [84, 16.8],
  [85, 16.0],
  [86, 15.2],
  [87, 14.4],
  [88, 13.7],
  [89, 12.9],
  [90, 12.2],
  [91, 11.5],
  [92, 10.8],
  [93, 10.1],
  [94, 9.5],
  [95, 8.9],
  [96, 8.4],
  [97, 7.8],
  [98, 7.3],
  [99, 6.8],
  [100, 6.4],
]);

export interface WithdrawalStrategyMetadata {
  label: string;
  shortDescription: string;
}

export type WithdrawalValuationRecord = Pick<
  ShillerMonthlyRecord,
  "cape" | "trCape"
> | null;

export interface WithdrawalComputationContext {
  scenario: Scenario;
  currentPortfolio: number;
  currentRecord: WithdrawalValuationRecord;
  previousAnnualWithdrawal: number | null;
  previousYearInflation: number;
  previousYearRealReturn: number | null;
  initialAnnualWithdrawal: number;
  initialWithdrawalRate: number;
  yearsRemaining: number;
}

export const withdrawalStrategyMetadata: Record<
  WithdrawalStrategyType,
  WithdrawalStrategyMetadata
> = {
  fixed: {
    label: "Fixed real",
    shortDescription:
      "Keeps the real withdrawal target level every year, matching the classic 4% rule framing.",
  },
  cape_dynamic: {
    label: "CAPE dynamic",
    shortDescription:
      "Adjusts annual spending with market valuation using the Shiller CAPE ratio.",
  },
  guyton_klinger: {
    label: "Guyton-Klinger",
    shortDescription:
      "Starts from a fixed rate, then applies guardrails when the withdrawal rate drifts too far.",
  },
  vpw: {
    label: "VPW",
    shortDescription:
      "Variable percentage withdrawals based on remaining horizon and portfolio size.",
  },
  constant_pct: {
    label: "Constant percentage",
    shortDescription:
      "Withdraws a constant percentage of the current portfolio each year.",
  },
  rmd: {
    label: "RMD-based",
    shortDescription:
      "Uses age-based divisors similar to required minimum distributions.",
  },
  floor_ceiling: {
    label: "Floor and ceiling",
    shortDescription:
      "Clamps a portfolio-based withdrawal between minimum and maximum real spending bounds.",
  },
  spending_smile: {
    label: "Spending smile",
    shortDescription:
      "Models a gradual real-spending decline across retirement phases.",
  },
};

function getCapeValue(record: WithdrawalValuationRecord) {
  return record?.cape ?? record?.trCape ?? null;
}

function getYearsElapsed(context: WithdrawalComputationContext) {
  return Math.max(
    context.scenario.simulationSettings.retirementDuration - context.yearsRemaining,
    0,
  );
}

function getCurrentRetirementAge(context: WithdrawalComputationContext) {
  const retirementStartAge =
    context.scenario.profile.retirementAge ?? context.scenario.profile.age;

  return retirementStartAge + getYearsElapsed(context);
}

function getRmdDivisor(age: number) {
  if (rmdDivisors.has(age)) {
    return rmdDivisors.get(age) ?? 1;
  }

  if (age < 60) {
    return rmdDivisors.get(60) ?? 1;
  }

  return Math.max(rmdDivisors.get(100) ?? 1, 1 - (age - 100) * 0.3);
}

function resolveConfiguredInitialRate(scenario: Scenario, startingPortfolio: number) {
  if (scenario.withdrawalStrategy.initialRate !== undefined) {
    return scenario.withdrawalStrategy.initialRate;
  }

  if (startingPortfolio > 0 && scenario.retirementExpenses > 0) {
    return scenario.retirementExpenses / startingPortfolio;
  }

  return scenario.assumptions.withdrawalRate;
}

export function resolveInitialAnnualWithdrawal(
  scenario: Scenario,
  startingPortfolio: number,
) {
  if (scenario.retirementExpenses > 0) {
    return scenario.retirementExpenses;
  }

  return startingPortfolio * resolveConfiguredInitialRate(scenario, startingPortfolio);
}

export function resolveInitialWithdrawalRate(
  scenario: Scenario,
  startingPortfolio: number,
) {
  if (startingPortfolio <= 0) {
    return 0;
  }

  return resolveInitialAnnualWithdrawal(scenario, startingPortfolio) / startingPortfolio;
}

export function resolveAnnualWithdrawalAmount(
  context: WithdrawalComputationContext,
) {
  const {
    scenario,
    currentPortfolio,
    currentRecord,
    previousAnnualWithdrawal,
    previousYearInflation,
    previousYearRealReturn,
    initialAnnualWithdrawal,
    initialWithdrawalRate,
    yearsRemaining,
  } = context;

  if (currentPortfolio <= 0) {
    return 0;
  }

  switch (scenario.withdrawalStrategy.type) {
    case "fixed":
      return initialAnnualWithdrawal;
    case "cape_dynamic": {
      const cape = getCapeValue(currentRecord);

      if (cape === null || cape <= 0) {
        return initialAnnualWithdrawal;
      }

      const params = scenario.withdrawalStrategy.capeParams ?? defaultCapeParams;
      return Math.max(0, currentPortfolio * (params.a + params.b / cape));
    }
    case "guyton_klinger": {
      if (previousAnnualWithdrawal === null) {
        return initialAnnualWithdrawal;
      }

      const params = scenario.withdrawalStrategy.gkParams ?? defaultGkParams;
      const inflationFactor = Math.max(1 + previousYearInflation, 1);
      let proposedWithdrawal = previousAnnualWithdrawal;
      let currentWithdrawalRate = proposedWithdrawal / currentPortfolio;

      if (
        previousYearRealReturn !== null &&
        previousYearRealReturn < 0 &&
        currentWithdrawalRate > initialWithdrawalRate
      ) {
        proposedWithdrawal = previousAnnualWithdrawal / inflationFactor;
        currentWithdrawalRate = proposedWithdrawal / currentPortfolio;
      }

      if (
        yearsRemaining > params.suspendCapPreservationYears &&
        currentWithdrawalRate >
          initialWithdrawalRate * (1 + params.guardrailWidth)
      ) {
        proposedWithdrawal *= 1 - params.adjustmentSize;
        currentWithdrawalRate = proposedWithdrawal / currentPortfolio;
      }

      if (currentWithdrawalRate < initialWithdrawalRate * (1 - params.guardrailWidth)) {
        proposedWithdrawal *= 1 + params.adjustmentSize;
      }

      return Math.max(0, proposedWithdrawal);
    }
    case "vpw": {
      if (yearsRemaining <= 1) {
        return currentPortfolio;
      }

      const expectedRealReturn = scenario.assumptions.expectedRealReturn;

      if (expectedRealReturn <= 0) {
        return currentPortfolio / yearsRemaining;
      }

      const annuityFactor =
        (1 - (1 + expectedRealReturn) ** -yearsRemaining) / expectedRealReturn;

      return Math.max(0, currentPortfolio / annuityFactor);
    }
    case "constant_pct":
      return Math.max(0, currentPortfolio * initialWithdrawalRate);
    case "rmd": {
      const divisor = getRmdDivisor(Math.round(getCurrentRetirementAge(context)));
      return Math.max(0, currentPortfolio / Math.max(divisor, 1));
    }
    case "floor_ceiling": {
      const params = scenario.withdrawalStrategy.floorCeiling ?? defaultFloorCeiling;
      const rawWithdrawal = currentPortfolio * initialWithdrawalRate;

      return Math.min(Math.max(rawWithdrawal, params.floor), params.ceiling);
    }
    case "spending_smile": {
      const yearsElapsed = getYearsElapsed(context);
      const declineRate =
        scenario.withdrawalStrategy.spendingDeclineRate ?? defaultSpendingDeclineRate;
      return Math.max(0, initialAnnualWithdrawal * (1 - declineRate) ** yearsElapsed);
    }
    default:
      return initialAnnualWithdrawal;
  }
}
