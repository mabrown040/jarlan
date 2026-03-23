import rawShillerDataset from "../../../data/shiller.json";

import type { ShillerDataset } from "@/lib/data/contracts";

const shillerDataset = rawShillerDataset as ShillerDataset;

export function getShillerDataset(expectedVersion?: string) {
  if (expectedVersion && expectedVersion !== shillerDataset.version) {
    throw new Error(
      `Unsupported Shiller dataset version "${expectedVersion}". Available version: ${shillerDataset.version}.`,
    );
  }

  return shillerDataset;
}
