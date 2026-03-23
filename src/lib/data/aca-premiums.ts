import rawAcaPremiums from "../../../data/aca_premiums.json";

interface AcaPremiumDataset {
  version: string;
  defaultState: string;
  stateBenchmarks: Record<string, Record<string, number>>;
}

const acaPremiumDataset = rawAcaPremiums as AcaPremiumDataset;

const ageBands = [35, 45, 55] as const;

function getNearestAgeBand(age: number) {
  return [...ageBands].sort(
    (left, right) => Math.abs(left - age) - Math.abs(right - age),
  )[0];
}

export function estimateBenchmarkPremiumForState(state: string, age: number) {
  const benchmarkRows =
    acaPremiumDataset.stateBenchmarks[state] ??
    acaPremiumDataset.stateBenchmarks[acaPremiumDataset.defaultState];
  const nearestAge = getNearestAgeBand(age);

  return benchmarkRows[String(nearestAge)] ?? benchmarkRows["45"] ?? 9_000;
}
