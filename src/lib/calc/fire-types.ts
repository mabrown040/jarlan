import { formatCompactCurrency, formatCurrency } from "@/lib/calc/format";
import {
  calculateCoastTarget,
  calculateFireNumber,
  getEffectiveRealReturn,
} from "@/lib/calc/quick-fire";
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

/**
 * Compute the user's FIRE target and the two structural variations
 * (Coast, Barista) that are distinct *strategies*, not spending-level
 * labels.
 *
 * Deliberately NOT returning Lean / Fat variants. Those are
 * socioeconomic labels — what counts as "lean" or "fat" is deeply
 * personal, and the calculator shouldn't prescribe them. Users who
 * want to explore a lower or higher spending level just change their
 * retirement expenses directly and watch the one FIRE target update.
 * The Lean / Fat articles under /education still exist as reference
 * material for anyone who wants to know what those community terms
 * mean, but we don't surface them as planning buckets.
 */
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

  // The FIRE target — expenses × (1 / WR). The "25x rule" when WR = 4%.
  const fireTarget = calculateFireNumber(spending, wr);

  // Coast FIRE — two related numbers:
  //   - coastTarget: the balance you'd need TODAY so pure compounding at the
  //     scenario's effective real return reaches the FIRE number by retirement.
  //     This is what the card renders as "need $X today".
  //   - coastBalance: what the user's CURRENT portfolio would grow to by
  //     retirement if they stopped contributing now. Used for the status
  //     message ("compounding alone reaches $Y by retirement").
  // Shared formula lives in quick-fire.ts so this module and
  // calculateQuickFireSummary can't drift.
  const yearsUntilRetirement = getYearsUntilRetirement(scenario) ?? 0;
  const coastTarget = calculateCoastTarget(
    fireTarget,
    yearsUntilRetirement,
    getEffectiveRealReturn(scenario),
  );
  const coastBalance =
    currentPortfolio *
    (1 + scenario.assumptions.expectedRealReturn) ** yearsUntilRetirement;

  // Barista: part-time income covers part of spending
  const partTimeIncome = scenario.assumptions.partTimeIncome;
  const duration = scenario.assumptions.partTimeIncomeDuration;
  const realReturn = scenario.assumptions.expectedRealReturn;
  let baristaTarget: number;
  if (duration === null || duration === undefined) {
    // Indefinite: simple formula — income offsets spending forever
    const baristaSpending = Math.max(spending - partTimeIncome, 0);
    baristaTarget = calculateFireNumber(baristaSpending, wr);
  } else {
    // Bridge: need enough for reduced withdrawal during bridge + full withdrawal after
    // fireTarget minus present value of the income subsidy over the bridge period
    const annualSubsidy = Math.min(partTimeIncome, spending);
    const r = Math.max(realReturn, 0.001); // avoid division by zero
    const pvSubsidy = annualSubsidy * ((1 - (1 + r) ** -duration) / r);
    baristaTarget = Math.max(fireTarget - pvSubsidy, 0);
  }
  const baristaSpending = duration === null || duration === undefined
    ? Math.max(spending - partTimeIncome, 0)
    : spending;

  return [
    createSummary(
      "fire",
      "FIRE",
      fireTarget,
      currentPortfolio,
      "Full financial independence at your current spending level.",
      `Target based on ${formatCurrency(spending)}/yr at a ${(wr * 100).toFixed(0)}% withdrawal rate.`,
    ),
    {
      ...createSummary(
        "coast",
        "Coast FIRE",
        // The "need today" number — present value of the FIRE target,
        // discounted back at the effective real return. When the user
        // already has this much, they can stop contributing today.
        coastTarget,
        currentPortfolio,
        "Enough invested today that compounding alone reaches your full FIRE number by retirement.",
        coastBalance >= fireTarget
          ? `Compounding alone reaches ${formatCompactCurrency(coastBalance)} by retirement.`
          : `Compounding alone leaves a gap of ${formatCompactCurrency(fireTarget - coastBalance)} by retirement.`,
      ),
      // Progress toward the coast target — how close the current portfolio is
      // to the "you can stop saving today" threshold. Equivalent to
      // coastBalance/fireTarget mathematically but expressed against the
      // number we actually display on the card.
      progress: clamp(currentPortfolio / Math.max(coastTarget, 1), 0, 1.5),
    },
    createSummary(
      "barista",
      "Barista FIRE",
      baristaTarget,
      currentPortfolio,
      duration !== null && duration !== undefined && partTimeIncome > 0
        ? `Work part-time earning ${formatCompactCurrency(partTimeIncome)}/yr for ${duration} years, then live fully off portfolio.`
        : `Portfolio covers most spending while ${formatCompactCurrency(partTimeIncome)}/yr of post-FIRE income handles the rest.`,
      partTimeIncome > 0
        ? duration !== null && duration !== undefined
          ? `Need ${formatCompactCurrency(baristaTarget)} — subsidized by ${formatCompactCurrency(partTimeIncome)}/yr for ${duration} years.`
          : `Only need ${formatCompactCurrency(baristaSpending)}/yr from your portfolio.`
        : "Set a post-FIRE income in Your Plan to see a reduced target.",
    ),
  ];
}
