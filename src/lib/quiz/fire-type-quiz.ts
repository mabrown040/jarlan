import { calculateFireTypeSummaries } from "@/lib/calc";
import { cloneScenario, createDefaultScenario, createDefaultAccount } from "@/lib/domain";
import type { Account, EmploymentType, FilingStatus, FireTypeSummary, Scenario } from "@/lib/domain/types";
import { getContributionLimits as getContributionLimitsFromTax } from "@/lib/tax/limits";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { clamp, roundTo } from "@/lib/utils";

export type FireStage = "curious" | "saving" | "pre_retirement" | "retired";
export type PartTimePreference = "yes" | "maybe" | "no";
export type FlexibilityLevel = "low" | "medium" | "high";
export type DependentsStatus = "yes" | "no";
export type PlanningPriority =
  | "freedom_fast"
  | "balanced_life"
  | "premium_lifestyle";

export interface FireTypeQuizAnswers {
  stage: FireStage;
  currentAge: number;
  targetFiAge: number;
  annualIncome: number;
  filingStatus: FilingStatus;
  employmentType: EmploymentType;
  state: string;
  partnerHas401k: boolean;
  annualSpending: number;
  currentPortfolio: number;
  // Account allocation (balances — must sum to currentPortfolio)
  traditionalBalance: number;
  rothBalance: number;
  hsaBalance: number;
  taxableBalance: number;
  // Contribution allocation (must sum to annual savings)
  traditionalContribution: number;
  rothContribution: number;
  hsaContribution: number;
  taxableContribution: number;
  partTimePreference: PartTimePreference;
  postFireIncome: number;
  postFireIncomeDuration: number | null;
  flexibility: FlexibilityLevel;
  dependents: DependentsStatus;
  riskTolerance: number;
  priority: PlanningPriority;
}

export interface FireTypeRecommendation {
  id: FireTypeSummary["id"];
  label: string;
  headline: string;
  rationale: string;
  nextStep: string;
  fitSignals: string[];
  targetNumber: number;
  fullFireNumber: number;
  coastTargetToday: number;
  progressToTarget: number;
  suggestedPartTimeIncome: number;
}

/** 2025 contribution limits — age-aware, filing-status-aware.
 *  Delegates to the canonical implementation in `@/lib/tax/limits`.
 */
export function getContributionLimits(
  age: number,
  opts?: { filingStatus?: FilingStatus; partnerHas401k?: boolean },
) {
  const filingStatus = opts?.filingStatus ?? "single";
  const isMarried = filingStatus === "married_joint" || filingStatus === "married_separate";
  const partnerHas401k = isMarried && (opts?.partnerHas401k ?? false);
  const base = getContributionLimitsFromTax(age, { filingStatus, partnerHas401k });
  const is50Plus = age >= 50;
  return {
    ...base,
    megaBackdoorRoth: partnerHas401k ? 92_000 : 46_000,
    total401k: (is50Plus ? 77_500 : 70_000) * (partnerHas401k ? 2 : 1),
  };
}

/** Static reference for backward compat (under-50 single defaults) */
export const CONTRIBUTION_LIMITS = getContributionLimits(34);

export const DEFAULT_FIRE_TYPE_QUIZ_ANSWERS: FireTypeQuizAnswers = {
  stage: "saving",
  currentAge: 34,
  targetFiAge: 46,
  annualIncome: 128_000,
  filingStatus: "single",
  employmentType: "w2",
  state: "CA",
  partnerHas401k: false,
  annualSpending: 54_000,
  currentPortfolio: 185_000,
  traditionalBalance: 0,
  rothBalance: 0,
  hsaBalance: 0,
  taxableBalance: 185_000,
  traditionalContribution: 0,
  rothContribution: 0,
  hsaContribution: 0,
  taxableContribution: 0,
  partTimePreference: "maybe",
  postFireIncome: 0,
  postFireIncomeDuration: null,
  flexibility: "medium",
  dependents: "no",
  riskTolerance: 3,
  priority: "balanced_life",
};

const recommendationCopy: Record<
  FireTypeSummary["id"],
  Pick<FireTypeRecommendation, "label" | "headline" | "rationale" | "nextStep">
> = {
  traditional: {
    label: "Traditional FIRE",
    headline: "Full financial independence at your current lifestyle.",
    rationale:
      "Your answers point toward complete financial independence — saving aggressively, then retiring fully on your portfolio.",
    nextStep:
      "Use the planner to dial in your savings rate, timeline, and withdrawal strategy until the plan feels bulletproof.",
  },
  lean: {
    label: "Lean FIRE",
    headline: "A leaner path gets you to freedom faster.",
    rationale:
      "You're willing to trade lifestyle flexibility for speed. A stripped-down budget means a smaller target and a shorter timeline.",
    nextStep:
      "Stress-test healthcare, housing, and emergency buffers so the lean plan still holds up when life gets expensive.",
  },
  fat: {
    label: "Fat FIRE",
    headline: "Your answers lean toward a premium retirement lifestyle.",
    rationale:
      "You want more than enough — room for travel, comfort, and optionality. That means a bigger number but a more resilient plan.",
    nextStep:
      "Model taxes, sequence-of-returns risk, and a longer timeline against your lifestyle goals in the planner.",
  },
  coast: {
    label: "Coast FIRE",
    headline: "You may already be closer to coasting than you think.",
    rationale:
      "Your portfolio is strong enough that compounding can do much of the work from here. You could shift to lower-stress work and let time finish the job.",
    nextStep:
      "Compare coasting versus a few more years of full contributions in the planner to see which timeline fits better.",
  },
  barista: {
    label: "Barista FIRE",
    headline: "Post-FIRE income dramatically lowers your target.",
    rationale:
      "You're open to earning some income later, which dramatically lowers the portfolio target while preserving flexibility and purpose.",
    nextStep:
      "Model your post-FIRE income, healthcare costs, and seasonal spending in the planner so the semi-retirement feels concrete.",
  },
};

function getSuggestedPartTimeIncome(preference: PartTimePreference) {
  if (preference === "yes") return 20_000;
  if (preference === "maybe") return 10_000;
  return 0;
}

// Map risk tolerance (1-5) to withdrawal rate
const withdrawalRateByRisk: Record<number, number> = {
  1: 0.0325, // Very cautious
  2: 0.035,  // Cautious
  3: 0.04,   // Balanced
  4: 0.0425, // Growth-oriented
  5: 0.045,  // Aggressive
};

// Map flexibility to expense growth rate (lifestyle creep)
const expenseGrowthByFlexibility: Record<FlexibilityLevel, number> = {
  high: 0,     // Willing to cut — no creep assumed
  medium: 0.005, // Some flexibility — 0.5% real creep
  low: 0.01,   // Low flexibility — 1% real creep
};

export function buildScenarioFromQuizAnswers(
  answers: FireTypeQuizAnswers,
): Scenario {
  const scenario = cloneScenario(createDefaultScenario());

  // Direct inputs
  scenario.profile.age = Math.round(clamp(answers.currentAge, 18, 80));
  scenario.profile.retirementAge = Math.round(
    clamp(answers.targetFiAge, scenario.profile.age, 90),
  );
  scenario.annualIncome = Math.max(answers.annualIncome, 0);
  scenario.profile.filingStatus = answers.filingStatus;
  scenario.profile.employmentType = answers.employmentType;
  scenario.profile.state = answers.state;
  scenario.annualExpenses = Math.max(answers.annualSpending, 0);
  scenario.retirementExpenses = Math.max(answers.annualSpending, 0);
  // Build accounts from quiz allocation (up to 3 accounts)
  const accounts: Account[] = [];
  if (answers.traditionalBalance > 0 || answers.traditionalContribution > 0) {
    const acct = createDefaultAccount("traditional_401k", "Tax-deferred (401k/IRA)");
    acct.currentBalance = answers.traditionalBalance;
    acct.annualContribution = answers.traditionalContribution;
    accounts.push(acct);
  }
  if (answers.rothBalance > 0 || answers.rothContribution > 0) {
    const acct = createDefaultAccount("roth_401k", "Roth (401k/IRA)");
    acct.currentBalance = answers.rothBalance;
    acct.annualContribution = answers.rothContribution;
    accounts.push(acct);
  }
  if (answers.hsaBalance > 0 || answers.hsaContribution > 0) {
    const acct = createDefaultAccount("hsa", "HSA");
    acct.currentBalance = answers.hsaBalance;
    acct.annualContribution = answers.hsaContribution;
    accounts.push(acct);
  }
  // Always create taxable — it's the catch-all.
  // If the user entered `currentPortfolio` but skipped the account-split
  // step, the split balances still hold their defaults and won't add up to
  // the user-entered total. When the split disagrees with the total,
  // trust the total and park the remainder in taxable so their scenario
  // reflects what they typed.
  const totalOtherBalances =
    answers.traditionalBalance + answers.rothBalance + answers.hsaBalance;
  const splitTotal = totalOtherBalances + answers.taxableBalance;
  const splitsDisagreeWithTotal =
    answers.currentPortfolio > 0 &&
    Math.abs(splitTotal - answers.currentPortfolio) > 1;
  const taxableAcct = createDefaultAccount("taxable", "Taxable brokerage");
  taxableAcct.currentBalance = splitsDisagreeWithTotal
    ? Math.max(answers.currentPortfolio - totalOtherBalances, 0)
    : answers.taxableBalance;
  taxableAcct.annualContribution = answers.taxableContribution;
  accounts.push(taxableAcct);
  scenario.accounts = accounts;

  // Compute tax-aware savings using the scenario's tax estimation
  // (Traditional 401k contributions now reduce taxable income automatically).
  // Round to whole dollars — the tax estimator returns cents, and those
  // would otherwise leak into UI inputs as "$16548.3" etc.
  const { takeHome } = estimateScenarioTax(scenario);
  const taxAwareSavings = Math.round(
    Math.max(takeHome - answers.annualSpending, 0),
  );
  const totalContributions = accounts.reduce((sum, a) => sum + a.annualContribution, 0);

  // If no contributions were allocated (user skipped the step), put all savings
  // into the taxable account as a fallback
  if (totalContributions === 0 && taxAwareSavings > 0) {
    const taxable = accounts.find((a) => a.type === "taxable");
    if (taxable) taxable.annualContribution = taxAwareSavings;
  }

  scenario.annualSavings = totalContributions > 0 ? totalContributions : taxAwareSavings;

  // Post-FIRE income (from conditional follow-up or legacy fallback)
  scenario.assumptions.partTimeIncome = answers.postFireIncome > 0
    ? answers.postFireIncome
    : getSuggestedPartTimeIncome(answers.partTimePreference);

  // Post-FIRE income duration (bridge strategy)
  scenario.assumptions.partTimeIncomeDuration = answers.postFireIncomeDuration;

  // Risk tolerance → withdrawal rate
  const wr = withdrawalRateByRisk[answers.riskTolerance] ?? 0.04;
  scenario.assumptions.withdrawalRate = wr;
  scenario.assumptions.saferWithdrawalRate = Math.max(wr - 0.005, 0.025);

  // Flexibility → expense growth (lifestyle creep)
  scenario.assumptions.expenseGrowthRate = expenseGrowthByFlexibility[answers.flexibility] ?? 0;

  // Dependents → household size
  scenario.profile.householdSize = answers.dependents === "yes" ? 3 : 1;

  return scenario;
}

function pickRecommendationId(
  answers: FireTypeQuizAnswers,
  fullFireNumber: number,
  coastTargetToday: number,
): FireTypeSummary["id"] {
  const yearsToFi = Math.max(answers.targetFiAge - answers.currentAge, 0);

  // Coast: strong portfolio + enough time for compounding
  if (
    answers.currentPortfolio >= coastTargetToday &&
    answers.priority !== "premium_lifestyle" &&
    yearsToFi >= 5
  ) {
    return "coast";
  }

  // Barista: open to part-time work
  if (answers.partTimePreference === "yes") {
    return "barista";
  }

  // Fat: wants premium lifestyle
  if (answers.priority === "premium_lifestyle") {
    return "fat";
  }

  // Lean: high flexibility + wants speed
  if (
    answers.flexibility === "high" &&
    answers.priority === "freedom_fast"
  ) {
    return "lean";
  }

  // Traditional: the balanced default
  return "traditional";
}

function buildFitSignals(
  answers: FireTypeQuizAnswers,
  recommendationId: FireTypeSummary["id"],
  coastTargetToday: number,
) {
  const signals: string[] = [];

  signals.push(
    `Target spending is ${Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(answers.annualSpending)} per year.`,
  );

  if (answers.currentPortfolio >= coastTargetToday) {
    signals.push(
      "Your current portfolio is strong enough to support a Coast FIRE option.",
    );
  } else {
    signals.push(
      `Current portfolio progress is ${Math.round(
        (answers.currentPortfolio / Math.max(answers.annualSpending / 0.04, 1)) *
          100,
      )}% of a full FIRE number.`,
    );
  }

  if (recommendationId === "barista") {
    signals.push("Post-FIRE income materially lowers the required portfolio.");
  }

  if (answers.dependents === "yes") {
    signals.push("Dependents usually increase the value of flexibility and margin.");
  }

  return signals.slice(0, 3);
}

export function getFireTypeRecommendation(
  answers: FireTypeQuizAnswers,
): FireTypeRecommendation {
  const scenario = buildScenarioFromQuizAnswers(answers);
  const summaries = calculateFireTypeSummaries(scenario);
  const fullFireNumber = scenario.retirementExpenses / 0.04;
  const yearsToFi = Math.max(answers.targetFiAge - answers.currentAge, 1);
  const coastTargetToday = fullFireNumber / 1.05 ** yearsToFi;
  const recommendationId = pickRecommendationId(
    answers,
    fullFireNumber,
    coastTargetToday,
  );
  const summary =
    summaries.find((item) => item.id === recommendationId) ?? summaries[0];
  const copy = recommendationCopy[recommendationId];

  return {
    id: recommendationId,
    label: copy.label,
    headline: copy.headline,
    rationale: copy.rationale,
    nextStep: copy.nextStep,
    fitSignals: buildFitSignals(answers, recommendationId, coastTargetToday),
    targetNumber: roundTo(summary.target, 0),
    fullFireNumber: roundTo(fullFireNumber, 0),
    coastTargetToday: roundTo(coastTargetToday, 0),
    progressToTarget: clamp(
      answers.currentPortfolio / Math.max(summary.target, 1),
      0,
      1.5,
    ),
    suggestedPartTimeIncome: getSuggestedPartTimeIncome(
      answers.partTimePreference,
    ),
  };
}
