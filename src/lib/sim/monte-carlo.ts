import {
  getCurrentPortfolioBalance,
  getRetirementStartAge,
} from "@/lib/calc/scenario";
import { getShillerDataset, type ShillerMonthlyRecord } from "@/lib/data";
import type { AssetAllocation, CashFlowEvent, Scenario } from "@/lib/domain/types";
import type {
  HistogramBin,
  MonteCarloRequest,
  MonteCarloResult,
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

interface AnnualMarketObservation {
  year: number;
  stockReturn: number;
  bondReturn: number;
  inflation: number;
  cape: number | null;
}

interface MonteCarloPathOutcome {
  annualBalances: number[];
  annualWithdrawals: number[];
  terminalValue: number;
  success: boolean;
  failureYear: number | null;
}

interface NormalizedAllocation {
  stocks: number;
  bonds: number;
}

interface RegimeProfile {
  bull: AnnualMarketObservation[];
  bear: AnnualMarketObservation[];
  initialBullProbability: number;
  bullToBullProbability: number;
  bearToBullProbability: number;
}

let cachedAnnualObservations: AnnualMarketObservation[] | null = null;
let cachedRegimeProfile: RegimeProfile | null = null;

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

function getAnnualCashFlow(
  cashFlows: CashFlowEvent[],
  age: number,
  cumulativeInflationFactor: number,
) {
  return cashFlows.reduce((total, cashFlow) => {
    const isActive =
      age >= cashFlow.startAge &&
      (cashFlow.endAge === null || age <= cashFlow.endAge);

    if (!isActive) {
      return total;
    }

    const annualRealAmount = cashFlow.inflationAdjusted
      ? cashFlow.amount
      : cashFlow.amount / cumulativeInflationFactor;

    return total + (cashFlow.type === "income" ? annualRealAmount : -annualRealAmount);
  }, 0);
}

function buildAnnualMarketObservations() {
  if (cachedAnnualObservations) {
    return cachedAnnualObservations;
  }

  const dataset = getShillerDataset("v1");
  const recordsByYear = new Map<number, ShillerMonthlyRecord[]>();

  for (const record of dataset.records) {
    const currentYear = recordsByYear.get(record.year) ?? [];
    currentYear.push(record);
    recordsByYear.set(record.year, currentYear);
  }

  cachedAnnualObservations = [...recordsByYear.entries()]
    .sort((left, right) => left[0] - right[0])
    .flatMap(([year, records]) => {
      const sortedRecords = [...records].sort((left, right) => left.month - right.month);

      if (
        sortedRecords.length < 12 ||
        sortedRecords.some(
          (record, index) =>
            record.month !== index + 1 ||
            record.realStockReturn === null ||
            record.realBondReturn === null ||
            record.inflationRate === null,
        )
      ) {
        return [];
      }

      let stockFactor = 1;
      let bondFactor = 1;
      let inflationFactor = 1;

      for (const record of sortedRecords) {
        stockFactor *= 1 + (record.realStockReturn ?? 0);
        bondFactor *= 1 + (record.realBondReturn ?? 0);
        inflationFactor *= 1 + (record.inflationRate ?? 0);
      }

      return [
        {
          year,
          stockReturn: stockFactor - 1,
          bondReturn: bondFactor - 1,
          inflation: inflationFactor - 1,
          cape: sortedRecords[0].cape ?? sortedRecords[0].trCape ?? null,
        },
      ];
    });

  return cachedAnnualObservations;
}

function getRegimeProfile() {
  if (cachedRegimeProfile) {
    return cachedRegimeProfile;
  }

  const observations = buildAnnualMarketObservations();
  const stockMedian = percentile(
    observations.map((observation) => observation.stockReturn),
    0.5,
  );
  const bullIndices = observations
    .map((observation, index) =>
      observation.stockReturn >= stockMedian ? index : -1,
    )
    .filter((index) => index >= 0);
  const bearIndices = observations
    .map((observation, index) =>
      observation.stockReturn < stockMedian ? index : -1,
    )
    .filter((index) => index >= 0);

  let bullToBull = 0;
  let bullTransitions = 0;
  let bearToBull = 0;
  let bearTransitions = 0;

  for (let index = 0; index < observations.length - 1; index += 1) {
    const currentIsBull = observations[index].stockReturn >= stockMedian;
    const nextIsBull = observations[index + 1].stockReturn >= stockMedian;

    if (currentIsBull) {
      bullTransitions += 1;
      if (nextIsBull) {
        bullToBull += 1;
      }
    } else {
      bearTransitions += 1;
      if (nextIsBull) {
        bearToBull += 1;
      }
    }
  }

  cachedRegimeProfile = {
    bull: bullIndices.map((index) => observations[index]),
    bear: bearIndices.map((index) => observations[index]),
    initialBullProbability: bullIndices.length / Math.max(observations.length, 1),
    bullToBullProbability: bullTransitions === 0 ? 0.5 : bullToBull / bullTransitions,
    bearToBullProbability: bearTransitions === 0 ? 0.5 : bearToBull / bearTransitions,
  };

  return cachedRegimeProfile;
}

function randomChoice<T>(values: readonly T[], rng: () => number) {
  return values[Math.floor(rng() * values.length)]!;
}

function sampleStandardNormal(rng: () => number) {
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = Math.max(rng(), Number.EPSILON);

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function computeMeans(observations: AnnualMarketObservation[]) {
  return [
    average(observations.map((observation) => observation.stockReturn)),
    average(observations.map((observation) => observation.bondReturn)),
    average(observations.map((observation) => observation.inflation)),
    average(
      observations.map((observation) => observation.cape ?? 20),
    ),
  ];
}

function computeCovarianceMatrix(observations: AnnualMarketObservation[]) {
  const means = computeMeans(observations);
  const dimensions = means.length;
  const matrix = Array.from({ length: dimensions }, () =>
    Array.from({ length: dimensions }, () => 0),
  );

  for (const observation of observations) {
    const vector = [
      observation.stockReturn,
      observation.bondReturn,
      observation.inflation,
      observation.cape ?? 20,
    ];

    for (let row = 0; row < dimensions; row += 1) {
      for (let column = 0; column < dimensions; column += 1) {
        matrix[row][column] +=
          (vector[row] - means[row]) * (vector[column] - means[column]);
      }
    }
  }

  const denominator = Math.max(observations.length - 1, 1);

  for (let row = 0; row < dimensions; row += 1) {
    for (let column = 0; column < dimensions; column += 1) {
      matrix[row][column] /= denominator;
    }
  }

  return { means, matrix };
}

function choleskyDecomposition(matrix: number[][]) {
  const size = matrix.length;
  const lower = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0),
  );

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let sum = 0;

      for (let index = 0; index < column; index += 1) {
        sum += lower[row][index] * lower[column][index];
      }

      if (row === column) {
        lower[row][column] = Math.sqrt(Math.max(matrix[row][row] - sum, 0));
      } else if (lower[column][column] === 0) {
        lower[row][column] = 0;
      } else {
        lower[row][column] = (matrix[row][column] - sum) / lower[column][column];
      }
    }
  }

  return lower;
}

function createParametricSampler(
  observations: AnnualMarketObservation[],
  rng: () => number,
) {
  const { means, matrix } = computeCovarianceMatrix(observations);
  const lower = choleskyDecomposition(matrix);

  return () => {
    const standardNormals = means.map(() => sampleStandardNormal(rng));
    const sample = means.map((mean, row) => {
      let value = mean;

      for (let column = 0; column <= row; column += 1) {
        value += lower[row][column] * standardNormals[column];
      }

      return value;
    });

    return {
      year: 0,
      stockReturn: Math.max(sample[0], -0.99),
      bondReturn: Math.max(sample[1], -0.99),
      inflation: Math.max(sample[2], -0.99),
      cape: Math.max(sample[3], 5),
    } satisfies AnnualMarketObservation;
  };
}

function createObservationSampler(
  mode: MonteCarloRequest["mode"],
  rng: () => number,
) {
  const observations = buildAnnualMarketObservations();
  const blockLength = 5;
  let blockStart = 0;
  let blockOffset = blockLength;
  const regimeProfile = getRegimeProfile();
  let currentIsBull = rng() < regimeProfile.initialBullProbability;
  const sampleParametric = createParametricSampler(observations, rng);

  return () => {
    switch (mode) {
      case "parametric":
        return sampleParametric();
      case "bootstrap":
        return randomChoice(observations, rng);
      case "block-bootstrap":
        if (blockOffset >= blockLength) {
          blockStart = Math.floor(rng() * (observations.length - blockLength));
          blockOffset = 0;
        }

        blockOffset += 1;
        return observations[blockStart + blockOffset - 1];
      case "regime-switching": {
        const samplePool = currentIsBull ? regimeProfile.bull : regimeProfile.bear;
        const observation = randomChoice(samplePool, rng);
        const bullProbability = currentIsBull
          ? regimeProfile.bullToBullProbability
          : regimeProfile.bearToBullProbability;

        currentIsBull = rng() < bullProbability;
        return observation;
      }
      default:
        return randomChoice(observations, rng);
    }
  };
}

function buildPercentileBand(
  paths: MonteCarloPathOutcome[],
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

function buildTerminalValueStats(paths: MonteCarloPathOutcome[]): TerminalValueStats {
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

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = average(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
}

function buildWithdrawalSummary(paths: MonteCarloPathOutcome[]): WithdrawalSummary {
  const firstYearWithdrawals = paths.map((path) => path.annualWithdrawals[0] ?? 0);
  const medianWithdrawalsByYear = paths[0].annualWithdrawals.map((_, year) =>
    percentile(
      paths.map((path) => path.annualWithdrawals[year] ?? 0),
      0.5,
    ),
  );

  const minMedian = Math.min(...medianWithdrawalsByYear);
  const maxMedian = Math.max(...medianWithdrawalsByYear);

  return {
    firstYearP10: roundTo(percentile(firstYearWithdrawals, 0.1)),
    firstYearMedian: roundTo(percentile(firstYearWithdrawals, 0.5)),
    firstYearP90: roundTo(percentile(firstYearWithdrawals, 0.9)),
    minMedian: roundTo(minMedian),
    minMedianYear: medianWithdrawalsByYear.findIndex((v) => roundTo(v, 4) === roundTo(minMedian, 4)),
    averageMedian: roundTo(average(medianWithdrawalsByYear)),
    medianStdDev: roundTo(standardDeviation(medianWithdrawalsByYear)),
    maxMedian: roundTo(maxMedian),
    maxMedianYear: medianWithdrawalsByYear.findIndex((v) => roundTo(v, 4) === roundTo(maxMedian, 4)),
  };
}

function buildFailureRateByYear(
  paths: MonteCarloPathOutcome[],
  retirementDurationYears: number,
) {
  return Array.from({ length: retirementDurationYears }, (_, index) => {
    const year = index + 1;
    const failuresByYear = paths.filter(
      (path) => path.failureYear !== null && path.failureYear <= year,
    ).length;

    return {
      year,
      cumulativeFailureRate: roundTo(failuresByYear / paths.length, 4),
    };
  });
}

function simulateMonteCarloPath({
  scenario,
  observationSampler,
}: {
  scenario: Scenario;
  observationSampler: () => AnnualMarketObservation;
}): MonteCarloPathOutcome {
  const startingBalance = getCurrentPortfolioBalance(scenario.accounts);
  const retirementStartAge = getRetirementStartAge(scenario);
  const retirementDurationYears = scenario.simulationSettings.retirementDuration;
  const terminalValueTarget =
    startingBalance * scenario.simulationSettings.finalValueTarget;
  const annualFeeDrag = scenario.simulationSettings.feeDrag;
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
  const annualWithdrawals: number[] = [];
  let failureYear: number | null = null;
  let previousAnnualWithdrawal: number | null = null;
  let previousYearInflation = 0;
  let previousYearRealReturn: number | null = null;
  let currentAnnualWithdrawal = initialAnnualWithdrawal;

  for (let year = 0; year < retirementDurationYears; year += 1) {
    const age = retirementStartAge + year;
    const observation = observationSampler();
    currentAnnualWithdrawal = resolveAnnualWithdrawalAmount({
      scenario,
      currentPortfolio: stockBalance + bondBalance,
      currentRecord: { cape: observation.cape, trCape: null },
      previousAnnualWithdrawal,
      previousYearInflation,
      previousYearRealReturn,
      initialAnnualWithdrawal,
      initialWithdrawalRate,
      yearsRemaining: retirementDurationYears - year,
    });
    annualWithdrawals.push(roundTo(currentAnnualWithdrawal));

    const balanceBeforeReturns = stockBalance + bondBalance;
    stockBalance *= 1 + observation.stockReturn;
    bondBalance *= 1 + observation.bondReturn;

    if (annualFeeDrag > 0) {
      const feeFactor = Math.max(0, 1 - annualFeeDrag);
      stockBalance *= feeFactor;
      bondBalance *= feeFactor;
    }

    const balanceAfterReturns = stockBalance + bondBalance;
    cumulativeInflationFactor *= Math.max(1 + observation.inflation, 0.01);
    let totalBalance = balanceAfterReturns;
    const annualCashFlow = getAnnualCashFlow(
      scenario.cashFlows,
      age,
      cumulativeInflationFactor,
    );
    const netWithdrawal = currentAnnualWithdrawal - annualCashFlow;

    if (netWithdrawal > 0) {
      if (totalBalance <= netWithdrawal) {
        stockBalance = 0;
        bondBalance = 0;
        totalBalance = 0;
        failureYear = year + 1;
        annualBalances.push(0);
        break;
      }

      const stockShare = totalBalance > 0 ? stockBalance / totalBalance : 0.5;
      stockBalance -= netWithdrawal * stockShare;
      bondBalance -= netWithdrawal * (1 - stockShare);
      totalBalance = stockBalance + bondBalance;
    } else if (netWithdrawal < 0) {
      const depositAmount = Math.abs(netWithdrawal);
      targetAllocation = getTargetAllocationForAge(scenario, age);
      stockBalance += depositAmount * targetAllocation.stocks;
      bondBalance += depositAmount * targetAllocation.bonds;
      totalBalance = stockBalance + bondBalance;
    }

    targetAllocation = getTargetAllocationForAge(scenario, age + 1);
    stockBalance = totalBalance * targetAllocation.stocks;
    bondBalance = totalBalance * targetAllocation.bonds;
    annualBalances.push(roundTo(stockBalance + bondBalance));
    previousAnnualWithdrawal = currentAnnualWithdrawal;
    previousYearInflation = observation.inflation;
    previousYearRealReturn =
      balanceBeforeReturns > 0
        ? balanceAfterReturns / balanceBeforeReturns - 1
        : 0;
  }

  while (annualBalances.length < retirementDurationYears + 1) {
    annualBalances.push(0);
  }

  while (annualWithdrawals.length < retirementDurationYears + 1) {
    annualWithdrawals.push(failureYear === null ? roundTo(currentAnnualWithdrawal) : 0);
  }

  const terminalValue = roundTo(stockBalance + bondBalance);

  return {
    annualBalances,
    annualWithdrawals,
    terminalValue,
    success: failureYear === null && terminalValue >= terminalValueTarget,
    failureYear,
  };
}

export function runMonteCarloSimulation(
  request: MonteCarloRequest,
  options?: { rng?: () => number },
): MonteCarloResult {
  const startingBalance = getCurrentPortfolioBalance(request.scenario.accounts);

  if (startingBalance <= 0) {
    throw new Error("Monte Carlo simulation requires a positive starting portfolio.");
  }

  const rng = options?.rng ?? Math.random;
  const retirementStartAge = getRetirementStartAge(request.scenario);
  const paths = Array.from({ length: request.trials }, () =>
    simulateMonteCarloPath({
      scenario: request.scenario,
      observationSampler: createObservationSampler(request.mode, rng),
    }),
  );
  const successCount = paths.filter((path) => path.success).length;
  const withdrawalSummary = buildWithdrawalSummary(paths);
  const initialWithdrawal = withdrawalSummary.firstYearMedian;
  const initialWithdrawalRate =
    startingBalance > 0 ? initialWithdrawal / startingBalance : 0;
  const notes = [
    `${withdrawalStrategyMetadata[request.scenario.withdrawalStrategy.type].label} spending rules are reused inside Monte Carlo so the results stay comparable to the historical engine.`,
  ];

  if (request.mode === "parametric") {
    notes.push(
      "Parametric mode samples annual stock returns, bond returns, inflation, and CAPE from a multivariate normal fit to historical annual observations.",
    );
  }

  if (request.mode === "bootstrap") {
    notes.push(
      "Bootstrap mode samples complete historical annual observations with replacement, preserving observed cross-asset and inflation relationships.",
    );
  }

  if (request.mode === "block-bootstrap") {
    notes.push(
      "Block bootstrap mode samples five-year historical blocks to preserve some multi-year sequence behavior.",
    );
  }

  if (request.mode === "regime-switching") {
    notes.push(
      "Regime-switching mode alternates between bull and bear observations using transition probabilities estimated from the historical annual series.",
    );
  }

  if (request.scenario.simulationSettings.rebalanceFrequency !== "annually") {
    notes.push(
      "Monte Carlo currently uses annual steps, so rebalancing frequency is approximated with annual rebalancing in this first release.",
    );
  }

  return {
    kind: "monte-carlo",
    successRate: roundTo(successCount / paths.length, 4),
    trials: request.trials,
    confidenceInterval: wilsonInterval(successCount, paths.length),
    initialWithdrawal: roundTo(initialWithdrawal),
    initialWithdrawalRate: roundTo(initialWithdrawalRate, 4),
    terminalValueTarget: roundTo(
      startingBalance * request.scenario.simulationSettings.finalValueTarget,
    ),
    terminalValueStats: buildTerminalValueStats(paths),
    terminalValueHistogram: buildHistogram(
      paths.map((path) => path.terminalValue),
      "ending value",
    ),
    failureYearHistogram: buildHistogram(
      paths
        .filter((path) => path.failureYear !== null)
        .map((path) => path.failureYear ?? 0),
      "yrs",
    ),
    withdrawalSummary,
    failureRateByYear: buildFailureRateByYear(
      paths,
      request.scenario.simulationSettings.retirementDuration,
    ),
    notes,
    percentileBand: buildPercentileBand(paths, retirementStartAge),
  };
}
