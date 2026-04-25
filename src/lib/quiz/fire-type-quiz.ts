import { capRetirementDurationToAge100 } from "@/lib/calc/scenario";
import { cloneScenario, createDefaultScenario, createDefaultAccount } from "@/lib/domain";
import type { Account, EmploymentType, FilingStatus, Scenario } from "@/lib/domain/types";
import { getContributionLimits as getContributionLimitsFromTax } from "@/lib/tax/limits";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { clamp } from "@/lib/utils";

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
  /**
   * Does the primary earner's 401(k) plan support the "mega backdoor Roth"
   * path — after-tax contributions + in-plan Roth conversion or in-service
   * rollover? Only a subset of plans offer it, and it's worth asking
   * explicitly because the IRS limit is ~$46K/yr ON TOP of the regular
   * $23.5K employee deferral — materially changes the savings ceiling
   * for high earners.
   */
  megaBackdoorRothAvailable: boolean;
  /**
   * Annual contribution the user routes through the mega backdoor path.
   * Displayed and stored separately from `rothContribution` because the
   * contribution channel is different (after-tax → in-plan conversion)
   * even though the destination account type (roth_401k) is the same.
   */
  megaBackdoorRothContribution: number;
  /**
   * Does the partner's plan also offer the mega backdoor Roth path?
   * Only asked when filingStatus is married_joint/married_separate AND
   * `partnerHas401k` is true.
   */
  partnerMegaBackdoorRothAvailable: boolean;
  partnerMegaBackdoorRothContribution: number;
  partTimePreference: PartTimePreference;
  postFireIncome: number;
  postFireIncomeDuration: number | null;
  flexibility: FlexibilityLevel;
  dependents: DependentsStatus;
  riskTolerance: number;
  priority: PlanningPriority;
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
  megaBackdoorRothAvailable: false,
  megaBackdoorRothContribution: 0,
  partnerMegaBackdoorRothAvailable: false,
  partnerMegaBackdoorRothContribution: 0,
  partTimePreference: "no",
  postFireIncome: 0,
  postFireIncomeDuration: null,
  flexibility: "medium",
  dependents: "no",
  riskTolerance: 3,
  priority: "balanced_life",
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
  // Roth (401k/IRA) + Mega Backdoor Roth. The mega backdoor contribution
  // lands on the same account type (roth_401k) because that's where the
  // in-plan conversion deposits it. Summing keeps the downstream account
  // model simple; the quiz answers retain the breakdown for display and
  // for the summary step to explain which dollars came from where.
  const megaBackdoorTotal =
    (answers.megaBackdoorRothAvailable ? answers.megaBackdoorRothContribution : 0) +
    (answers.partnerMegaBackdoorRothAvailable
      ? answers.partnerMegaBackdoorRothContribution
      : 0);
  const totalRothContribution = answers.rothContribution + megaBackdoorTotal;
  if (answers.rothBalance > 0 || totalRothContribution > 0) {
    const acct = createDefaultAccount("roth_401k", "Roth (401k/IRA)");
    acct.currentBalance = answers.rothBalance;
    acct.annualContribution = totalRothContribution;
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

  // Reconciliation: the quiz asks about explicit account contributions AND
  // total spending separately. If take-home − spending > sum of contributions,
  // there's leftover money (sitting in cash, a savings account, or just
  // unaccounted). Previously we set `annualSavings = totalContributions` and
  // silently dropped the gap, which made the slider show "$80K save" when
  // the cashflow implied $109K — a confusing mismatch as soon as the user
  // moved the slider and the linked formula snapped to take-home.
  //
  // Fix: route the leftover into the taxable account (matches the Sankey's
  // default-brokerage behavior) and set annualSavings to the full taxAwareSavings
  // so the slider and the cashflow invariant agree from the first render.
  const leftover = taxAwareSavings - totalContributions;
  if (leftover > 1) {
    const taxable = accounts.find((a) => a.type === "taxable");
    if (taxable) {
      taxable.annualContribution += leftover;
    }
  }

  // After any top-up, use the reconciled total. When the user entered no
  // contributions at all, taxAwareSavings is what we just wrote to taxable.
  scenario.annualSavings =
    taxAwareSavings > 0 ? taxAwareSavings : totalContributions;

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

  // Cap the simulation horizon to age ~100 so late retirees don't
  // inherit the default-scenario's 54-year horizon and end up
  // simulated to age 119 (which breaks the Longevity tab).
  return capRetirementDurationToAge100(scenario);
}

