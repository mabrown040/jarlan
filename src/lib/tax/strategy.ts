import rawAcaPovertyLevels from "../../../data/aca_poverty_levels.json";
import rawTaxBrackets from "../../../data/tax_brackets.json";

import { getRetirementStartAge } from "@/lib/calc/scenario";
import { getMortalityDataset } from "@/lib/data";
import { getStateTaxPreset } from "@/lib/data/state-taxes";
import type { FilingStatus, Scenario } from "@/lib/domain/types";
import { calculateFica } from "@/lib/tax/fica";
import { get401kEmployeeLimit, getHsaLimit } from "@/lib/tax/limits";

const taxBracketDataset = rawTaxBrackets as unknown as {
  federalOrdinaryIncome: Record<FilingStatus, Array<[number, number | null]>>;
};
const acaPovertyDataset = rawAcaPovertyLevels as unknown as {
  households: Array<[number, number]>;
};

const federalBracketTops = Object.fromEntries(
  Object.entries(taxBracketDataset.federalOrdinaryIncome).map(
    ([filingStatus, brackets]) => [
      filingStatus,
      brackets.map(([rate, top]) => ({
        rate,
        top: top ?? Number.POSITIVE_INFINITY,
      })),
    ],
  ),
) as Record<FilingStatus, Array<{ rate: number; top: number }>>;

export interface RothConversionPlanRow {
  yearOffset: number;
  age: number;
  conversionAmount: number;
  taxCost: number;
  bridgeFundingNeed: number;
  availablePenaltyFreeAge: number;
}

export interface SocialSecurityClaimOption {
  claimAge: 62 | 67 | 70;
  annualBenefit: number;
  expectedLifetimeBenefit: number;
}

export interface HouseholdSocialSecurityStrategy {
  primaryClaimAge: 62 | 67 | 70;
  partnerClaimAge: 62 | 67 | 70 | null;
  combinedAnnualBenefit: number;
  combinedExpectedLifetimeBenefit: number;
}

export interface DrawdownStrategyResult {
  id: string;
  label: string;
  estimatedTenYearTaxes: number;
  endingBalance: number;
}

export interface TaxBracketBreakdownRow {
  bracket: string;
  amount: number;
}

function buildSocialSecurityClaimOptions({
  currentAge,
  healthStatus,
  benefitMap,
}: {
  currentAge: number;
  healthStatus: Scenario["profile"]["healthStatus"];
  benefitMap: Record<62 | 67 | 70, number>;
}) {
  return ([62, 67, 70] as const).map((claimAge) => {
    const annualBenefit = benefitMap[claimAge];
    let expectedLifetimeBenefit = 0;

    for (let age = claimAge; age <= 95; age += 1) {
      expectedLifetimeBenefit +=
        annualBenefit *
        getSurvivalProbability(currentAge, age, healthStatus);
    }

    return {
      claimAge,
      annualBenefit,
      expectedLifetimeBenefit,
    } satisfies SocialSecurityClaimOption;
  });
}

function getTraditionalBalance(scenario: Scenario) {
  return scenario.accounts
    .filter((account) =>
      ["traditional_401k", "traditional_ira"].includes(account.type),
    )
    .reduce((total, account) => total + account.currentBalance, 0);
}

function getTaxableBalance(scenario: Scenario) {
  return scenario.accounts
    .filter((account) => ["taxable", "cash"].includes(account.type))
    .reduce((total, account) => total + account.currentBalance, 0);
}

function getRothBalance(scenario: Scenario) {
  return scenario.accounts
    .filter((account) => ["roth_401k", "roth_ira", "hsa"].includes(account.type))
    .reduce((total, account) => total + account.currentBalance, 0);
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

function getSurvivalProbability(
  startAge: number,
  targetAge: number,
  healthStatus: Scenario["profile"]["healthStatus"],
) {
  const dataset = getMortalityDataset("v1");
  let survivalProbability = 1;

  for (let age = startAge; age < targetAge; age += 1) {
    const lookupAge = Math.min(
      Math.max(age + getHealthOffset(healthStatus), dataset.minAge),
      dataset.maxAge,
    );
    const record =
      dataset.records.find((candidate) => candidate.age === lookupAge) ??
      dataset.records.at(-1);

    survivalProbability *= 1 - (record?.blendedProbability ?? 1);
  }

  return survivalProbability;
}

export function estimateFederalTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
) {
  const brackets = federalBracketTops[filingStatus];
  let remainingIncome = Math.max(taxableIncome, 0);
  let previousTop = 0;
  let totalTax = 0;

  for (const bracket of brackets) {
    const taxableAtRate = Math.min(
      Math.max(bracket.top - previousTop, 0),
      remainingIncome,
    );

    if (taxableAtRate <= 0) {
      previousTop = bracket.top;
      continue;
    }

    totalTax += taxableAtRate * bracket.rate;
    remainingIncome -= taxableAtRate;
    previousTop = bracket.top;

    if (remainingIncome <= 0) {
      break;
    }
  }

  return totalTax;
}

/* ── 2025 Standard Deductions ──────────────────────────────── */
const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  single: 14_600,
  married_joint: 29_200,
  married_separate: 14_600,
  head_of_household: 21_900,
};

/**
 * Estimate total tax burden for a scenario. Used by both the
 * plan drawer and the workspace stat cards so the calculation
 * stays consistent in one place.
 */
export function estimateScenarioTax(scenario: Scenario) {
  const grossIncome = scenario.annualIncome + (scenario.profile.partner?.annualIncome ?? 0);
  const filingStatus = scenario.profile.filingStatus;
  const employmentType = scenario.profile.employmentType ?? "w2";
  const age = scenario.profile.age;

  /* ── FICA ──────────────────────────────────────────────── */
  const fica = calculateFica(grossIncome, employmentType, filingStatus);

  /* ── Contribution-limit enforcement ────────────────────── */
  const contributionWarnings: string[] = [];
  const max401k = get401kEmployeeLimit(age);
  const maxHsa = getHsaLimit(age, filingStatus);

  let trad401kContributions = 0;
  let hsaContributions = 0;
  for (const a of scenario.accounts) {
    if (a.type === "traditional_401k") trad401kContributions += a.annualContribution;
    if (a.type === "hsa") hsaContributions += a.annualContribution;
  }

  const actual401k = Math.min(trad401kContributions, max401k);
  const actualHsa = Math.min(hsaContributions, maxHsa);
  if (trad401kContributions > max401k) {
    contributionWarnings.push(
      `401(k) contribution $${trad401kContributions.toLocaleString()} exceeds $${max401k.toLocaleString()} limit`,
    );
  }
  if (hsaContributions > maxHsa) {
    contributionWarnings.push(
      `HSA contribution $${hsaContributions.toLocaleString()} exceeds $${maxHsa.toLocaleString()} limit`,
    );
  }
  const preTaxContributions = actual401k + actualHsa;

  /* ── AGI → Taxable Income ──────────────────────────────── */
  const agi = Math.max(grossIncome - preTaxContributions - fica.employerFica, 0);
  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus];
  const taxableIncome = Math.max(agi - standardDeduction, 0);

  /* ── Federal + State ───────────────────────────────────── */
  const federalTax = estimateFederalTax(taxableIncome, filingStatus);
  const statePreset = getStateTaxPreset(scenario.profile.state);
  const stateTaxRate = statePreset?.effectiveOrdinaryRate ?? 0.05;
  const stateTax = taxableIncome * stateTaxRate;

  /* ── Totals ────────────────────────────────────────────── */
  const totalTax = federalTax + stateTax + fica.totalFica;
  const takeHome = grossIncome - totalTax;
  const actualSavings = Math.max(takeHome - scenario.annualExpenses, 0);
  const afterTaxSavingsRate = takeHome > 0 ? actualSavings / takeHome : 0;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return {
    grossIncome,
    federalTax,
    stateTax,
    fica,
    totalTax,
    takeHome,
    actualSavings,
    afterTaxSavingsRate,
    effectiveRate,
    contributionWarnings,
  };
}

export function buildFederalTaxBracketBreakdown(
  taxableIncome: number,
  filingStatus: FilingStatus,
) {
  const brackets = federalBracketTops[filingStatus];
  let remainingIncome = Math.max(taxableIncome, 0);
  let previousTop = 0;
  const rows: TaxBracketBreakdownRow[] = [];

  for (const bracket of brackets) {
    const taxableAtRate = Math.min(
      Math.max(bracket.top - previousTop, 0),
      remainingIncome,
    );

    if (taxableAtRate <= 0) {
      previousTop = bracket.top;
      continue;
    }

    rows.push({
      bracket: `${Math.round(bracket.rate * 100)}%`,
      amount: taxableAtRate,
    });
    remainingIncome -= taxableAtRate;
    previousTop = bracket.top;

    if (remainingIncome <= 0) {
      break;
    }
  }

  return rows;
}

export function buildRothConversionPlan(
  scenario: Scenario,
  targetBracketRate = 0.12,
) {
  const traditionalBalance = getTraditionalBalance(scenario);
  const taxableBalance = getTaxableBalance(scenario);
  const retirementAge = getRetirementStartAge(scenario);
  const bracketTop =
    federalBracketTops[scenario.profile.filingStatus].find(
      (bracket) => bracket.rate === targetBracketRate,
    )?.top ?? federalBracketTops[scenario.profile.filingStatus][1].top;
  const rows: RothConversionPlanRow[] = [];
  let remainingTraditional = traditionalBalance;
  let remainingBridge = taxableBalance;

  // Cap the loop at the IRS RMD age (73) rather than 59.5. For early
  // retirees the ladder is a 5-year bridge to penalty-free withdrawals;
  // for 60+ retirees it's a bracket-fill strategy to pre-empt RMDs
  // (they can already pull from Traditional without penalty). Same code
  // path serves both — just a wider window.
  for (
    let yearOffset = 0;
    yearOffset < 20 && remainingTraditional > 0 && retirementAge + yearOffset < 73;
    yearOffset += 1
  ) {
    const age = retirementAge + yearOffset;
    const bridgeFundingNeed = Math.max(scenario.retirementExpenses, 0);
    const conversionAmount = Math.min(Math.max(bracketTop, 0), remainingTraditional);
    const taxCost =
      estimateFederalTax(conversionAmount, scenario.profile.filingStatus) -
      estimateFederalTax(0, scenario.profile.filingStatus);

    remainingTraditional -= conversionAmount;
    remainingBridge = Math.max(remainingBridge - bridgeFundingNeed, 0);
    rows.push({
      yearOffset,
      age,
      conversionAmount,
      taxCost,
      bridgeFundingNeed,
      availablePenaltyFreeAge: age + 5,
    });
  }

  return {
    rows,
    bracketTop,
    remainingTraditional,
    remainingBridge,
    totalPlannedConversions: rows.reduce(
      (total, row) => total + row.conversionAmount,
      0,
    ),
  };
}

export function estimateAcaConversionRoom(scenario: Scenario, benchmarkPremium = 9_000) {
  const householdSize = Math.max(scenario.profile.householdSize, 1);
  const povertyLevel =
    acaPovertyDataset.households.find(([size]) => size === householdSize)?.[1] ??
    acaPovertyDataset.households.at(-1)?.[1] ??
    0;
  const maxMagiBeforeCliff = povertyLevel * 4;
  const rothPlan = buildRothConversionPlan(scenario);
  const firstYearConversion = rothPlan.rows[0]?.conversionAmount ?? 0;
  const projectedMagi = firstYearConversion;
  const roomRemaining = Math.max(maxMagiBeforeCliff - projectedMagi, 0);
  const baselinePremiumShare = 0;
  const expectedPremiumShare =
    projectedMagi <= maxMagiBeforeCliff
      ? Math.min(projectedMagi * 0.085, benchmarkPremium)
      : benchmarkPremium;
  const maxModeledConversion = Math.max(maxMagiBeforeCliff, rothPlan.bracketTop);
  const tradeoffPoints = Array.from({ length: 7 }, (_, index) => {
    const conversionAmount = (maxModeledConversion / 6) * index;
    const modeledMagi = conversionAmount;
    const premiumShare =
      modeledMagi <= maxMagiBeforeCliff
        ? Math.min(modeledMagi * 0.085, benchmarkPremium)
        : benchmarkPremium;
    const taxCost = estimateFederalTax(
      conversionAmount,
      scenario.profile.filingStatus,
    );
    const netConversionValue =
      conversionAmount -
      taxCost -
      Math.max(premiumShare - baselinePremiumShare, 0);

    return {
      conversionAmount,
      magi: modeledMagi,
      premiumShare,
      taxCost,
      netConversionValue,
    };
  });
  const recommendedPoint =
    [...tradeoffPoints].sort(
      (left, right) => right.netConversionValue - left.netConversionValue,
    )[0] ?? tradeoffPoints[0];

  return {
    povertyLevel,
    maxMagiBeforeCliff,
    projectedMagi,
    roomRemaining,
    benchmarkPremium,
    expectedPremiumShare,
    tradeoffPoints,
    recommendedConversion: recommendedPoint?.conversionAmount ?? 0,
  };
}

export function analyzeSocialSecurityClaiming(scenario: Scenario) {
  const benefitMap = {
    62: scenario.socialSecurity.monthlyBenefitAt62 * 12,
    67: scenario.socialSecurity.monthlyBenefitAtFra * 12,
    70: scenario.socialSecurity.monthlyBenefitAt70 * 12,
  } as const;
  const options = buildSocialSecurityClaimOptions({
    currentAge: scenario.profile.age,
    healthStatus: scenario.profile.healthStatus,
    benefitMap,
  });

  const sortedOptions = [...options].sort(
    (left, right) => right.expectedLifetimeBenefit - left.expectedLifetimeBenefit,
  );

  const breakEven62Vs67 =
    benefitMap[67] === benefitMap[62]
      ? 67
      : 62 +
        (benefitMap[67] * (67 - 62)) / Math.max(benefitMap[67] - benefitMap[62], 1);
  const breakEven67Vs70 =
    benefitMap[70] === benefitMap[67]
      ? 70
      : 67 +
        (benefitMap[70] * (70 - 67)) / Math.max(benefitMap[70] - benefitMap[67], 1);
  const partnerBenefitMap = scenario.profile.partner
    ? {
        62: scenario.profile.partner.socialSecurityBenefit.monthlyBenefitAt62 * 12,
        67: scenario.profile.partner.socialSecurityBenefit.monthlyBenefitAtFra * 12,
        70: scenario.profile.partner.socialSecurityBenefit.monthlyBenefitAt70 * 12,
      }
    : null;
  const partnerOptions = partnerBenefitMap
    ? buildSocialSecurityClaimOptions({
        currentAge: scenario.profile.partner?.age ?? scenario.profile.age,
        healthStatus: scenario.profile.partner?.healthStatus ?? "average",
        benefitMap: partnerBenefitMap,
      })
    : [];
  const recommendedPartnerClaimAge =
    [...partnerOptions].sort(
      (left, right) => right.expectedLifetimeBenefit - left.expectedLifetimeBenefit,
    )[0]?.claimAge ?? null;
  const householdStrategies = partnerOptions.length
    ? options.flatMap((primaryOption) =>
        partnerOptions.map((partnerOption) => ({
          primaryClaimAge: primaryOption.claimAge,
          partnerClaimAge: partnerOption.claimAge,
          combinedAnnualBenefit:
            primaryOption.annualBenefit + partnerOption.annualBenefit,
          combinedExpectedLifetimeBenefit:
            primaryOption.expectedLifetimeBenefit +
            partnerOption.expectedLifetimeBenefit,
        })),
      )
    : [
        {
          primaryClaimAge: sortedOptions[0]?.claimAge ?? 67,
          partnerClaimAge: null,
          combinedAnnualBenefit: sortedOptions[0]?.annualBenefit ?? 0,
          combinedExpectedLifetimeBenefit:
            sortedOptions[0]?.expectedLifetimeBenefit ?? 0,
        },
      ];
  const recommendedHouseholdStrategy = [...householdStrategies].sort(
    (left, right) =>
      right.combinedExpectedLifetimeBenefit - left.combinedExpectedLifetimeBenefit,
  )[0];

  return {
    options,
    recommendedClaimAge: sortedOptions[0]?.claimAge ?? 67,
    partnerOptions,
    recommendedPartnerClaimAge,
    householdStrategies,
    recommendedHouseholdStrategy,
    breakEven62Vs67,
    breakEven67Vs70,
  };
}

export function compareDrawdownStrategies(scenario: Scenario) {
  const strategies = [
    { id: "taxable_first", label: "Taxable → Traditional → Roth" },
    { id: "traditional_first", label: "Traditional first" },
    { id: "bracket_fill", label: "Bracket fill then taxable" },
  ] as const;
  const bracketTop = federalBracketTops[scenario.profile.filingStatus][1].top;

  return strategies.map((strategy) => {
    let taxable = getTaxableBalance(scenario);
    let traditional = getTraditionalBalance(scenario);
    let roth = getRothBalance(scenario);
    let totalTaxes = 0;

    for (let year = 0; year < 10; year += 1) {
      let spendingNeed = scenario.retirementExpenses;
      let traditionalWithdrawal = 0;

      if (strategy.id === "taxable_first") {
        const fromTaxable = Math.min(taxable, spendingNeed);
        taxable -= fromTaxable;
        spendingNeed -= fromTaxable;
        traditionalWithdrawal = Math.min(traditional, spendingNeed);
      }

      if (strategy.id === "traditional_first") {
        traditionalWithdrawal = Math.min(traditional, spendingNeed);
      }

      if (strategy.id === "bracket_fill") {
        traditionalWithdrawal = Math.min(traditional, bracketTop);
        const extraTaxable = Math.min(
          taxable,
          Math.max(spendingNeed - traditionalWithdrawal, 0),
        );
        taxable -= extraTaxable;
        spendingNeed -= extraTaxable;
      }

      traditional -= traditionalWithdrawal;
      spendingNeed = Math.max(spendingNeed - traditionalWithdrawal, 0);
      totalTaxes += estimateFederalTax(
        traditionalWithdrawal,
        scenario.profile.filingStatus,
      );

      if (spendingNeed > 0) {
        const rothWithdrawal = Math.min(roth, spendingNeed);
        roth -= rothWithdrawal;
        spendingNeed -= rothWithdrawal;
      }
    }

    return {
      id: strategy.id,
      label: strategy.label,
      estimatedTenYearTaxes: totalTaxes,
      endingBalance: taxable + traditional + roth,
    } satisfies DrawdownStrategyResult;
  });
}
