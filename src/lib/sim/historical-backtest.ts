import {
  getCurrentPortfolioBalance,
  getRetirementStartAge,
} from "@/lib/calc/scenario";
import { getShillerDataset, type ShillerMonthlyRecord } from "@/lib/data";
import type { AssetAllocation, CashFlowEvent, Scenario } from "@/lib/domain/types";
import type {
  HistoricalBacktestRequest,
  HistoricalBacktestResult,
  HistogramBin,
  PercentileBandPoint,
  SuccessRateConfidenceInterval,
  TerminalValueStats,
  WithdrawalSummary,
} from "@/lib/sim/contracts";
import {
  resolveAnnualWithdrawalAmount,
  resolveInitialAnnualWithdrawal,
  resolveInitialWithdrawalRate,
  withdrawalStrategyMetadata,
} from "@/lib/sim/withdrawal-strategies";
import { clamp, roundTo } from "@/lib/utils";

interface NormalizedAllocation {
  stocks: number;
  bonds: number;
}

interface HistoricalPathOutcome {
  startDate: string;
  annualBalances: number[];
  annualWithdrawals: number[];
  terminalValue: number;
  success: boolean;
  failureMonth: number | null;
}

function normalizeDatasetVersion(version: string) {
  return version.startsWith("shiller-monthly-")
    ? version.replace("shiller-monthly-", "")
    : version;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = (sortedValues.length - 1) * percentileValue;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = index - lowerIndex;

  return (
    sortedValues[lowerIndex] +
    (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function wilsonInterval(
  successes: number,
  total: number,
  zScore = 1.96,
): SuccessRateConfidenceInterval {
  if (total === 0) {
    return { low: 0, high: 0 };
  }

  const proportion = successes / total;
  const denominator = 1 + (zScore ** 2) / total;
  const center =
    (proportion + (zScore ** 2) / (2 * total)) / denominator;
  const margin =
    (zScore *
      Math.sqrt(
        (proportion * (1 - proportion)) / total +
          (zScore ** 2) / (4 * total ** 2),
      )) /
    denominator;

  return {
    low: clamp(center - margin, 0, 1),
    high: clamp(center + margin, 0, 1),
  };
}

function normalizeAllocation(allocation: AssetAllocation): NormalizedAllocation {
  const stocks = clamp(allocation.stocks, 0, 1);
  const bonds = clamp(allocation.bonds + allocation.alternatives, 0, 1);
  const total = stocks + bonds;

  if (total <= 0) {
    return { stocks: 0.6, bonds: 0.4 };
  }

  return {
    stocks: stocks / total,
    bonds: bonds / total,
  };
}

function getTargetAllocationForAge(
  scenario: Scenario,
  age: number,
): NormalizedAllocation {
  if (scenario.assetAllocationGlidepath.length > 0) {
    const sortedGlidepath = [...scenario.assetAllocationGlidepath].sort(
      (left, right) => left.age - right.age,
    );
    const activePoint =
      sortedGlidepath
        .filter((point) => point.age <= age)
        .at(-1) ?? sortedGlidepath[0];

    return normalizeAllocation(activePoint.allocation);
  }

  return normalizeAllocation(
    scenario.accounts[0]?.assetAllocation ?? {
      stocks: 0.8,
      bonds: 0.2,
      alternatives: 0,
    },
  );
}

function shouldRebalance(
  absoluteMonth: number,
  frequency: Scenario["simulationSettings"]["rebalanceFrequency"],
) {
  switch (frequency) {
    case "monthly":
      return true;
    case "quarterly":
      return absoluteMonth % 3 === 0;
    case "annually":
    case "threshold":
      return absoluteMonth % 12 === 0;
    default:
      return absoluteMonth % 12 === 0;
  }
}

function getMonthlyCashFlow(
  cashFlows: CashFlowEvent[],
  age: number,
  cumulativeInflationFactor: number,
) {
  return cashFlows.reduce((total, cashFlow) => {
    const isActive =
      age >= cashFlow.startAge &&
      (cashFlow.endAge === null || age <= cashFlow.endAge + 11 / 12);

    if (!isActive) {
      return total;
    }

    const annualRealAmount = cashFlow.inflationAdjusted
      ? cashFlow.amount
      : cashFlow.amount / cumulativeInflationFactor;
    const monthlyAmount = annualRealAmount / 12;

    return total + (cashFlow.type === "income" ? monthlyAmount : -monthlyAmount);
  }, 0);
}

function simulateHistoricalPath({
  scenario,
  records,
  startIndex,
}: {
  scenario: Scenario;
  records: ShillerMonthlyRecord[];
  startIndex: number;
}): HistoricalPathOutcome {
  const startingBalance = getCurrentPortfolioBalance(scenario.accounts);
  const retirementStartAge = getRetirementStartAge(scenario);
  const retirementDurationYears = scenario.simulationSettings.retirementDuration;
  const terminalValueTarget =
    startingBalance * scenario.simulationSettings.finalValueTarget;
  const monthlyFeeDrag = scenario.simulationSettings.feeDrag / 12;
  const initialAnnualWithdrawal = resolveInitialAnnualWithdrawal(
    scenario,
    startingBalance,
  );
  const initialWithdrawalRate = resolveInitialWithdrawalRate(
    scenario,
    startingBalance,
  );
  let targetAllocation = getTargetAllocationForAge(scenario, retirementStartAge);
  let stockBalance = startingBalance * targetAllocation.stocks;
  let bondBalance = startingBalance * targetAllocation.bonds;
  let cumulativeInflationFactor = 1;
  const annualBalances = [roundTo(startingBalance)];
  const annualWithdrawals = [roundTo(initialAnnualWithdrawal)];
  let failureMonth: number | null = null;
  let currentAnnualWithdrawal = initialAnnualWithdrawal;
  let yearInflationFactor = 1;
  let yearReturnFactor = 1;
  let previousYearInflation = 0;
  let previousYearRealReturn: number | null = null;

  for (
    let absoluteMonth = 1;
    absoluteMonth <= retirementDurationYears * 12;
    absoluteMonth += 1
  ) {
    const record = records[startIndex + absoluteMonth - 1];

    if (
      !record ||
      record.realStockReturn === null ||
      record.realBondReturn === null ||
      record.inflationRate === null
    ) {
      throw new Error(
        `Historical dataset is missing returns for ${records[startIndex + absoluteMonth - 1]?.date ?? "an unknown month"}.`,
      );
    }

    const balanceBeforeReturns = stockBalance + bondBalance;
    stockBalance *= 1 + record.realStockReturn;
    bondBalance *= 1 + record.realBondReturn;

    if (monthlyFeeDrag > 0) {
      const feeFactor = Math.max(0, 1 - monthlyFeeDrag);
      stockBalance *= feeFactor;
      bondBalance *= feeFactor;
    }

    cumulativeInflationFactor *= 1 + record.inflationRate;
    yearInflationFactor *= 1 + record.inflationRate;
    const balanceAfterReturns = stockBalance + bondBalance;

    if (balanceBeforeReturns > 0) {
      yearReturnFactor *= balanceAfterReturns / balanceBeforeReturns;
    }

    const age = retirementStartAge + (absoluteMonth - 1) / 12;
    const monthlyCashFlow = getMonthlyCashFlow(
      scenario.cashFlows,
      age,
      cumulativeInflationFactor,
    );
    const netWithdrawal = currentAnnualWithdrawal / 12 - monthlyCashFlow;
    let totalBalance = stockBalance + bondBalance;

    if (netWithdrawal > 0) {
      if (totalBalance <= netWithdrawal) {
        stockBalance = 0;
        bondBalance = 0;
        failureMonth = absoluteMonth;
        totalBalance = 0;
      } else {
        const stockShare = stockBalance / totalBalance;
        stockBalance -= netWithdrawal * stockShare;
        bondBalance -= netWithdrawal * (1 - stockShare);
        totalBalance = stockBalance + bondBalance;
      }
    } else if (netWithdrawal < 0) {
      const depositAmount = Math.abs(netWithdrawal);
      targetAllocation = getTargetAllocationForAge(scenario, age);
      stockBalance += depositAmount * targetAllocation.stocks;
      bondBalance += depositAmount * targetAllocation.bonds;
      totalBalance = stockBalance + bondBalance;
    }

    if (failureMonth === null && shouldRebalance(absoluteMonth, scenario.simulationSettings.rebalanceFrequency)) {
      targetAllocation = getTargetAllocationForAge(scenario, age + 1 / 12);
      stockBalance = totalBalance * targetAllocation.stocks;
      bondBalance = totalBalance * targetAllocation.bonds;
    }

    if (absoluteMonth % 12 === 0) {
      annualBalances.push(roundTo(stockBalance + bondBalance));

      previousYearInflation = yearInflationFactor - 1;
      previousYearRealReturn = yearReturnFactor - 1;

      const nextYearRecord = records[startIndex + absoluteMonth] ?? record;
      currentAnnualWithdrawal = resolveAnnualWithdrawalAmount({
        scenario,
        currentPortfolio: stockBalance + bondBalance,
        currentRecord: nextYearRecord,
        previousAnnualWithdrawal: currentAnnualWithdrawal,
        previousYearInflation,
        previousYearRealReturn,
        initialAnnualWithdrawal,
        initialWithdrawalRate,
        yearsRemaining: retirementDurationYears - absoluteMonth / 12,
      });
      annualWithdrawals.push(roundTo(currentAnnualWithdrawal));
      yearInflationFactor = 1;
      yearReturnFactor = 1;
    }

    if (failureMonth !== null) {
      break;
    }
  }

  while (annualBalances.length < retirementDurationYears + 1) {
    annualBalances.push(0);
  }

  while (annualWithdrawals.length < retirementDurationYears + 1) {
    annualWithdrawals.push(failureMonth === null ? roundTo(currentAnnualWithdrawal) : 0);
  }

  const terminalValue = roundTo(stockBalance + bondBalance);

  return {
    startDate: records[startIndex].date,
    annualBalances,
    annualWithdrawals,
    terminalValue,
    success: failureMonth === null && terminalValue >= terminalValueTarget,
    failureMonth,
  };
}

function buildPercentileBand(
  paths: HistoricalPathOutcome[],
  retirementStartAge: number,
): PercentileBandPoint[] {
  return paths[0].annualBalances.map((_, year) => {
    const balancesAtYear = paths.map((path) => path.annualBalances[year]);
    const withdrawalsAtYear = paths.map((path) => path.annualWithdrawals[year] ?? 0);

    return {
      year,
      age: roundTo(retirementStartAge + year, 1),
      withdrawal: roundTo(percentile(withdrawalsAtYear, 0.5)),
      p10: roundTo(percentile(balancesAtYear, 0.1)),
      p25: roundTo(percentile(balancesAtYear, 0.25)),
      p50: roundTo(percentile(balancesAtYear, 0.5)),
      p75: roundTo(percentile(balancesAtYear, 0.75)),
      p90: roundTo(percentile(balancesAtYear, 0.9)),
    };
  });
}

function buildTerminalValueStats(paths: HistoricalPathOutcome[]): TerminalValueStats {
  const terminalValues = paths.map((path) => path.terminalValue);

  return {
    min: roundTo(percentile(terminalValues, 0)),
    p10: roundTo(percentile(terminalValues, 0.1)),
    median: roundTo(percentile(terminalValues, 0.5)),
    p90: roundTo(percentile(terminalValues, 0.9)),
    max: roundTo(percentile(terminalValues, 1)),
    average: roundTo(average(terminalValues)),
  };
}

function buildHistogram(values: number[], labelSuffix: string): HistogramBin[] {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [
      {
        start: roundTo(min),
        end: roundTo(max),
        label: `${roundTo(min)} ${labelSuffix}`,
        count: values.length,
      },
    ];
  }

  const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(values.length / 2))));
  const binWidth = (max - min) / binCount;

  return Array.from({ length: binCount }, (_, index) => {
    const start = min + binWidth * index;
    const end = index === binCount - 1 ? max : start + binWidth;
    const count = values.filter((value) =>
      index === binCount - 1
        ? value >= start && value <= end
        : value >= start && value < end,
    ).length;

    return {
      start: roundTo(start),
      end: roundTo(end),
      label: `${roundTo(start)}-${roundTo(end)} ${labelSuffix}`,
      count,
    };
  });
}

function buildWithdrawalSummary(paths: HistoricalPathOutcome[]): WithdrawalSummary {
  const firstYearWithdrawals = paths.map((path) => path.annualWithdrawals[0] ?? 0);
  const medianWithdrawalsByYear = paths[0].annualWithdrawals.map((_, year) =>
    percentile(
      paths.map((path) => path.annualWithdrawals[year] ?? 0),
      0.5,
    ),
  );

  return {
    firstYearP10: roundTo(percentile(firstYearWithdrawals, 0.1)),
    firstYearMedian: roundTo(percentile(firstYearWithdrawals, 0.5)),
    firstYearP90: roundTo(percentile(firstYearWithdrawals, 0.9)),
    minMedian: roundTo(Math.min(...medianWithdrawalsByYear)),
    averageMedian: roundTo(average(medianWithdrawalsByYear)),
    maxMedian: roundTo(Math.max(...medianWithdrawalsByYear)),
  };
}

export function runHistoricalBacktest(
  request: HistoricalBacktestRequest,
): HistoricalBacktestResult {
  const startingBalance = getCurrentPortfolioBalance(request.scenario.accounts);

  if (startingBalance <= 0) {
    throw new Error("Historical backtesting requires a positive starting portfolio.");
  }

  const dataset = getShillerDataset(normalizeDatasetVersion(request.datasetVersion));
  const records = dataset.records;
  const retirementDurationMonths =
    request.scenario.simulationSettings.retirementDuration * 12;
  const eligibleStartIndices: number[] = [];

  for (let index = 1; index <= records.length - retirementDurationMonths; index += 1) {
    const startDate = records[index]?.date;

    if (!startDate) {
      continue;
    }

    if (request.startDate && startDate < request.startDate) {
      continue;
    }

    if (request.endDate && startDate > request.endDate) {
      continue;
    }

    eligibleStartIndices.push(index);
  }

  if (eligibleStartIndices.length === 0) {
    throw new Error("No historical periods are available for the selected range.");
  }

  const paths = eligibleStartIndices.map((startIndex) =>
    simulateHistoricalPath({
      scenario: request.scenario,
      records,
      startIndex,
    }),
  );
  const successCount = paths.filter((path) => path.success).length;
  const failureCount = paths.length - successCount;
  const retirementStartAge = getRetirementStartAge(request.scenario);
  const withdrawalSummary = buildWithdrawalSummary(paths);
  const initialWithdrawal = withdrawalSummary.firstYearMedian;
  const initialWithdrawalRate =
    startingBalance > 0 ? initialWithdrawal / startingBalance : 0;
  const terminalValueStats = buildTerminalValueStats(paths);
  const terminalValueHistogram = buildHistogram(
    paths.map((path) => path.terminalValue),
    "ending value",
  );
  const failureYearHistogram = buildHistogram(
    paths
      .filter((path) => path.failureMonth !== null)
      .map((path) => (path.failureMonth ?? 0) / 12),
    "yrs",
  );
  const bestCase = [...paths].sort(
    (left, right) => right.terminalValue - left.terminalValue,
  )[0];
  const worstCase = [...paths].sort((left, right) => {
    if (left.terminalValue !== right.terminalValue) {
      return left.terminalValue - right.terminalValue;
    }

    if (left.failureMonth !== right.failureMonth) {
      return (left.failureMonth ?? Number.POSITIVE_INFINITY) -
        (right.failureMonth ?? Number.POSITIVE_INFINITY);
    }

    return left.startDate.localeCompare(right.startDate);
  })[0];
  const notes = [
    "Returns are modeled in real dollars, so reported balances and withdrawals stay in constant purchasing-power terms.",
    "Stock returns come directly from the Shiller real total return series.",
    `Bond returns currently use a GS10 carry-plus-duration approximation (${dataset.methodology.bondDurationYears} year duration assumption).`,
    `${withdrawalStrategyMetadata[request.scenario.withdrawalStrategy.type].label} spending rules are applied at annual boundaries and spread evenly across each month of the following year.`,
  ];

  if (request.scenario.simulationSettings.rebalanceFrequency === "threshold") {
    notes.push(
      "Threshold rebalancing currently falls back to annual rebalancing in this first historical engine.",
    );
  }

  if (request.scenario.withdrawalStrategy.type === "cape_dynamic") {
    notes.push(
      "Because CAPE varies by historical start date, the first-year withdrawal summary reflects the median across all tested cohorts rather than a single fixed amount.",
    );
  }

  if (request.startDate || request.endDate) {
    notes.push("The tested start-date range was filtered from the full dataset.");
  }

  return {
    kind: "historical",
    successRate: roundTo(successCount / paths.length, 4),
    periodsTested: paths.length,
    successCount,
    failureCount,
    confidenceInterval: wilsonInterval(successCount, paths.length),
    datasetVersion: `shiller-monthly-${dataset.version}`,
    startDateRange: {
      start: records[eligibleStartIndices[0]].date,
      end: records[eligibleStartIndices.at(-1) ?? eligibleStartIndices[0]].date,
    },
    initialWithdrawal: roundTo(initialWithdrawal),
    initialWithdrawalRate: roundTo(initialWithdrawalRate, 4),
    terminalValueTarget: roundTo(
      startingBalance * request.scenario.simulationSettings.finalValueTarget,
    ),
    bestCase: {
      startDate: bestCase.startDate,
      terminalValue: bestCase.terminalValue,
      success: bestCase.success,
      failureYear:
        bestCase.failureMonth === null
          ? null
          : roundTo(bestCase.failureMonth / 12, 1),
    },
    worstCase: {
      startDate: worstCase.startDate,
      terminalValue: worstCase.terminalValue,
      success: worstCase.success,
      failureYear:
        worstCase.failureMonth === null
          ? null
          : roundTo(worstCase.failureMonth / 12, 1),
    },
    terminalValueStats,
    terminalValueHistogram,
    failureYearHistogram,
    withdrawalSummary,
    notes,
    percentileBand: buildPercentileBand(paths, retirementStartAge),
  };
}
