import rawMortalityDataset from "../../../data/mortality.json";

import type { MortalityDataset, MortalityDatasetRaw } from "@/lib/data/contracts";

const rawDataset = rawMortalityDataset as MortalityDatasetRaw;

const mortalityDataset: MortalityDataset = {
  ...rawDataset,
  records: rawDataset.records.map(([age, maleProbability, femaleProbability]) => ({
    age,
    maleProbability,
    femaleProbability,
    blendedProbability: (maleProbability + femaleProbability) / 2,
  })),
};

export function getMortalityDataset(expectedVersion?: string) {
  if (expectedVersion && expectedVersion !== mortalityDataset.version) {
    throw new Error(
      `Unsupported mortality dataset version "${expectedVersion}". Available version: ${mortalityDataset.version}.`,
    );
  }

  return mortalityDataset;
}
