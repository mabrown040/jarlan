import rawCountryPresets from "../../../data/country_presets.json";
import type { CurrencyCode } from "@/lib/domain/types";

export interface CountryPreset {
  code: string;
  label: string;
  currency: CurrencyCode;
  locale: string;
  stateLabel: string;
  readiness: string;
}

interface CountryPresetDataset {
  version: string;
  countries: CountryPreset[];
}

const countryPresetDataset = rawCountryPresets as CountryPresetDataset;

export function listCountryPresets() {
  return countryPresetDataset.countries;
}

export function getCountryPreset(code?: string | null) {
  return (
    countryPresetDataset.countries.find((country) => country.code === code) ??
    countryPresetDataset.countries[0]
  );
}
