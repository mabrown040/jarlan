import { formatCompactCurrency, formatCurrency } from "@/lib/calc/format";
import { calculateFireNumber } from "@/lib/calc/quick-fire";
import { getCurrentPortfolioBalance, getYearsUntilRetirement } from "@/lib/calc/scenario";
import type { FireTypeSummary, Scenario } from "@/lib/domain/types";
import { clamp } from "@/lib/utils";

function createSummary(
  id: FireTypeSummary["id"],
  label: string,
  target: number,
  currentPortfolio: number,
  description: string,
  status: string,
) {
  return {
    id,
    label,
    target,
    progress: clamp(currentPortfolio / Math.max(target, 1), 0, 1.5),
    description,
    status,
  } satisfies FireTypeSummary;
}

export function calculateFireTypeSummaries(scenario: Scenario): FireTypeSummary[] {
  const currentPortfolio = getCurrentPortfolioBalance(scenario.accounts);
  // Project retirement spending forward for expense growth (lifestyle creep)
  const yearsToRet = Math.max(
    (scenario.profile.retirementAge ?? scenario.profile.age) - scenario.profile.age,
    0,
  );
  const expGrowth = 1 + (scenario.assumptions.expenseGrowthRate ?? 0);
  const spending = scenario.retirementExpenses * expGrowth ** yearsToRet;
  const wr = scenario.assumptions.withdrawalRate;

  // Traditional: your actual spending
  const traditionalTarget = calculateFireNumber(spending, wr);

  // Lean: 60% of your spending — a stripped-down budget
  const leanSpending = Math.round(spending * 0.6);
  const leanTarget = calculateFireNumber(leanSpending, wr);

  // Fat: 150% of your spending — premium lifestyle
  const fatSpending = Math.round(spending * 1.5);
  const fatTarget = calculateFireNumber(fatSpending, wr);

  // Coast: compounding alone reaches your FIRE number by retirement
  const yearsUntilRetirement = getYearsUntilRetirement(scenario) ?? 0;
  const coastBalance =
    currentPortfolio *
    (1 + scenario.assumptions.expectedRealReturn) ** yearsUntilRetirement;

  // Barista: part-time income covers part of spending
  const partTimeIncome = scenario.assumptions.partTimeIncome;
  const baristaSpending = Math.max(spending - partTimeIncome, 0);
  const baristaTarget = calculateFireNumber(baristaSpending, wr);

  return [
    createSummary(
      "traditional",
      "Traditional FIRE",
      traditionalTarget,
      currentPortfolio,
      "Full financial independence at your current spending level.",
      `Target based on ${formatCurrency(spending)}/yr at a ${(wr * 100).toFixed(0)}% withdrawal rate.`,
    ),
    createSummary(
      "lean",
      "Lean FIRE",
      leanTarget,
      currentPortfolio,
      `FI on a stripped-down budget — about 60% of your current spending (${formatCompactCurrency(leanSpending)}/yr).`,
      currentPortfolio >= leanTarget
        ? "You've already crossed the Lean FIRE line."
        : `${formatCompactCurrency(leanTarget - currentPortfolio)} to go.`,
    ),
    createSummary(
      "fat",
      "Fat FIRE",
      fatTarget,
      currentPortfolio,
      `FI with 50% more room — about ${formatCompactCurrency(fatSpending)}/yr for a premium lifestyle.`,
      currentPortfolio >= fatTarget
        ? "You've reached Fat FIRE territory."
        : `${formatCompactCurrency(fatTarget - currentPortfolio)} to go.`,
    ),
    {
      ...createSummary(
        "coast",
        "Coast FIRE",
        traditionalTarget,
        currentPortfolio,
        "Enough invested today that compounding alone reaches your full FIRE number by retirement.",
        coastBalance >= traditionalTarget
          ? `Compounding alone reaches ${formatCompactCurrency(coastBalance)} by retirement.`
          : `Compounding alone leaves a gap of ${formatCompactCurrency(traditionalTarget - coastBalance)} by retirement.`,
      ),
      progress: clamp(coastBalance / Math.max(traditionalTarget, 1), 0, 1.5),
    },
    createSummary(
      "barista",
      "Barista FIRE",
      baristaTarget,
      currentPortfolio,
      `Portfolio covers most spending while ${formatCompactCurrency(partTimeIncome)}/yr of post-FIRE income handles the rest.`,
      partTimeIncome > 0
        ? `Only need ${formatCompactCurrency(baristaSpending)}/yr from your portfolio.`
        : "Set a post-FIRE income in Your Plan to see a reduced target.",
    ),
  ];
}
