import { calculateQuickFireSummary } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

export interface ScenarioVariantConfig {
  id: string;
  name: string;
  annualSavingsDelta: number;
  retirementExpenseDelta: number;
  retirementAgeDelta: number;
  realReturnDelta: number;
}

export function applyVariantToScenario(
  baseScenario: Scenario,
  variant: ScenarioVariantConfig,
) {
  const nextScenario = cloneScenario(baseScenario);
  nextScenario.name = variant.name;
  nextScenario.annualSavings = Math.max(
    baseScenario.annualSavings + variant.annualSavingsDelta,
    0,
  );
  nextScenario.accounts[0].annualContribution = Math.max(
    nextScenario.accounts[0].annualContribution + variant.annualSavingsDelta,
    0,
  );
  nextScenario.retirementExpenses = Math.max(
    baseScenario.retirementExpenses + variant.retirementExpenseDelta,
    0,
  );
  nextScenario.profile.retirementAge = Math.max(
    (baseScenario.profile.retirementAge ?? baseScenario.profile.age) +
      variant.retirementAgeDelta,
    baseScenario.profile.age,
  );
  nextScenario.assumptions.expectedRealReturn = Math.max(
    baseScenario.assumptions.expectedRealReturn + variant.realReturnDelta,
    0,
  );

  return nextScenario;
}

export function buildSensitivityAnalysis(baseScenario: Scenario) {
  const baseYearsToFi =
    calculateQuickFireSummary(baseScenario).yearsToFi ?? Number.POSITIVE_INFINITY;
  const testCases = [
    {
      label: "Save $500 more per month",
      variant: {
        id: "save-more",
        name: "Save more",
        annualSavingsDelta: 6_000,
        retirementExpenseDelta: 0,
        retirementAgeDelta: 0,
        realReturnDelta: 0,
      },
    },
    {
      label: "Spend $500 less per month in retirement",
      variant: {
        id: "spend-less",
        name: "Spend less",
        annualSavingsDelta: 0,
        retirementExpenseDelta: -6_000,
        retirementAgeDelta: 0,
        realReturnDelta: 0,
      },
    },
    {
      label: "Earn 0.5% more real return",
      variant: {
        id: "return-up",
        name: "Higher return",
        annualSavingsDelta: 0,
        retirementExpenseDelta: 0,
        retirementAgeDelta: 0,
        realReturnDelta: 0.005,
      },
    },
    {
      label: "Work one more year",
      variant: {
        id: "one-more-year",
        name: "One more year",
        annualSavingsDelta: 0,
        retirementExpenseDelta: 0,
        retirementAgeDelta: 1,
        realReturnDelta: 0,
      },
    },
  ];

  return testCases.map((testCase) => {
    const yearsToFi =
      calculateQuickFireSummary(
        applyVariantToScenario(baseScenario, testCase.variant),
      ).yearsToFi ?? Number.POSITIVE_INFINITY;

    return {
      label: testCase.label,
      yearsToFi,
      improvementYears: baseYearsToFi - yearsToFi,
    };
  });
}

export function buildOneMoreYearAnalysis(baseScenario: Scenario) {
  const baseSummary = calculateQuickFireSummary(baseScenario);
  const oneMoreYearScenario = applyVariantToScenario(baseScenario, {
    id: "one-more-year",
    name: "One more year",
    annualSavingsDelta: 0,
    retirementExpenseDelta: 0,
    retirementAgeDelta: 1,
    realReturnDelta: 0,
  });
  const nextSummary = calculateQuickFireSummary(oneMoreYearScenario);
  const baseRetirementYear =
    (baseScenario.profile.retirementAge ?? baseScenario.profile.age) -
    baseScenario.profile.age;
  const nextRetirementYear =
    (oneMoreYearScenario.profile.retirementAge ?? oneMoreYearScenario.profile.age) -
    oneMoreYearScenario.profile.age;
  const baseRetirementBalance =
    baseSummary.projection.find((point) => point.year === baseRetirementYear)?.balance ??
    baseSummary.projection.at(-1)?.balance ??
    0;
  const nextRetirementBalance =
    nextSummary.projection.find((point) => point.year === nextRetirementYear)?.balance ??
    nextSummary.projection.at(-1)?.balance ??
    0;

  return {
    extraRetirementBalance: nextRetirementBalance - baseRetirementBalance,
    yearsToFiImprovement:
      (baseSummary.yearsToFi ?? Number.POSITIVE_INFINITY) -
      (nextSummary.yearsToFi ?? Number.POSITIVE_INFINITY),
    nextSummary,
  };
}
