import { getRetirementStartAge } from "@/lib/calc/scenario";
import { getMortalityDataset } from "@/lib/data";
import type { Scenario } from "@/lib/domain/types";
import type { MonteCarloResult } from "@/lib/sim/contracts";
import { clamp, roundTo } from "@/lib/utils";

export interface MortalityRiskPoint {
  year: number;
  age: number;
  aliveProbability: number;
  aliveAndSolventProbability: number;
  aliveAndBrokeProbability: number;
  deadProbability: number;
}

export interface MortalityRiskResult {
  points: MortalityRiskPoint[];
  terminalAliveProbability: number;
}

function getHealthOffset(status: Scenario["profile"]["healthStatus"]) {
  switch (status) {
    case "below_average":
      return 5;
    case "above_average":
      return -5;
    case "average":
    default:
      return 0;
  }
}

function getAnnualDeathProbability(
  age: number,
  healthStatus: Scenario["profile"]["healthStatus"],
) {
  const dataset = getMortalityDataset("v1");
  const adjustedAge = Math.round(
    clamp(age + getHealthOffset(healthStatus), dataset.minAge, dataset.maxAge),
  );
  const record =
    dataset.records.find((entry) => entry.age === adjustedAge) ??
    dataset.records.at(-1);

  return record?.blendedProbability ?? 1;
}

function getHouseholdAliveProbability(scenario: Scenario, yearsIntoRetirement: number) {
  const retirementStartAge = getRetirementStartAge(scenario);
  let selfAliveProbability = 1;

  for (let step = 0; step < yearsIntoRetirement; step += 1) {
    const currentAge = retirementStartAge + step;
    selfAliveProbability *=
      1 - getAnnualDeathProbability(currentAge, scenario.profile.healthStatus);
  }

  if (!scenario.profile.partner) {
    return selfAliveProbability;
  }

  const partnerAgeAtRetirementStart =
    scenario.profile.partner.age + (retirementStartAge - scenario.profile.age);
  const partnerHealthStatus = scenario.profile.partner.healthStatus ?? "average";
  let partnerAliveProbability = 1;

  for (let step = 0; step < yearsIntoRetirement; step += 1) {
    const currentAge = partnerAgeAtRetirementStart + step;
    partnerAliveProbability *= 1 - getAnnualDeathProbability(currentAge, partnerHealthStatus);
  }

  return (
    selfAliveProbability +
    partnerAliveProbability -
    selfAliveProbability * partnerAliveProbability
  );
}

export function buildMortalityRiskTimeline({
  scenario,
  monteCarloResult,
}: {
  scenario: Scenario;
  monteCarloResult: MonteCarloResult;
}): MortalityRiskResult {
  const retirementStartAge = getRetirementStartAge(scenario);
  const points = Array.from(
    { length: scenario.simulationSettings.retirementDuration + 1 },
    (_, year) => {
      const aliveProbability = getHouseholdAliveProbability(scenario, year);
      const cumulativeFailureRate =
        year === 0
          ? 0
          : monteCarloResult.failureRateByYear[year - 1]?.cumulativeFailureRate ??
            monteCarloResult.failureRateByYear.at(-1)?.cumulativeFailureRate ??
            0;
      const aliveAndBrokeProbability = aliveProbability * cumulativeFailureRate;
      const aliveAndSolventProbability =
        aliveProbability * (1 - cumulativeFailureRate);

      return {
        year,
        age: roundTo(retirementStartAge + year, 1),
        aliveProbability: roundTo(aliveProbability, 4),
        aliveAndSolventProbability: roundTo(aliveAndSolventProbability, 4),
        aliveAndBrokeProbability: roundTo(aliveAndBrokeProbability, 4),
        deadProbability: roundTo(1 - aliveProbability, 4),
      };
    },
  );

  return {
    points,
    terminalAliveProbability: points.at(-1)?.aliveProbability ?? 0,
  };
}
