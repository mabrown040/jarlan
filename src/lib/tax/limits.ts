import type { FilingStatus } from "@/lib/domain/types";

/** 2025 IRS contribution limits */
export const LIMITS_2025 = {
  traditional401k: { base: 23_500, catchUp50: 31_000, superCatchUp60: 34_750 },
  rothIra: { base: 7_000, catchUp50: 8_000 },
  hsa: { individual: 4_300, family: 8_550, catchUp55: 1_000 },
  total401k: { base: 70_000, catchUp50: 77_500 },
} as const;

export function get401kEmployeeLimit(age: number): number {
  if (age >= 60 && age <= 63) return LIMITS_2025.traditional401k.superCatchUp60;
  if (age >= 50) return LIMITS_2025.traditional401k.catchUp50;
  return LIMITS_2025.traditional401k.base;
}

export function getRothIraLimit(age: number): number {
  return age >= 50 ? LIMITS_2025.rothIra.catchUp50 : LIMITS_2025.rothIra.base;
}

export function getHsaLimit(age: number, filingStatus: FilingStatus): number {
  const base = filingStatus === "married_joint" ? LIMITS_2025.hsa.family : LIMITS_2025.hsa.individual;
  return base + (age >= 55 ? LIMITS_2025.hsa.catchUp55 : 0);
}

export function getContributionLimits(age: number, opts: { filingStatus: FilingStatus; partnerHas401k?: boolean }) {
  const isMarried = opts.filingStatus === "married_joint";
  const personal401k = get401kEmployeeLimit(age);
  const personalIra = getRothIraLimit(age);
  const personalHsa = getHsaLimit(age, opts.filingStatus);
  return {
    traditional401k: opts.partnerHas401k ? personal401k * 2 : personal401k,
    rothIra: isMarried ? personalIra * 2 : personalIra,
    hsa: personalHsa,
    personal401kLimit: personal401k,
    personalIraLimit: personalIra,
    isMarried,
    partnerHas401k: opts.partnerHas401k ?? false,
  };
}
