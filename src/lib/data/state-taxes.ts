import rawStateTaxes from "../../../data/state_taxes.json";

export interface StateTaxPreset {
  code: string;
  label: string;
  effectiveOrdinaryRate: number;
}

interface StateTaxDataset {
  version: string;
  states: StateTaxPreset[];
}

const stateTaxDataset = rawStateTaxes as StateTaxDataset;

export function listStateTaxPresets() {
  return stateTaxDataset.states;
}

export function getStateTaxPreset(code: string) {
  return stateTaxDataset.states.find((state) => state.code === code) ?? null;
}
