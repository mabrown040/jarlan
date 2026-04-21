import type { Account, AccountOwner, Scenario } from "@/lib/domain/types";

export function getCurrentPortfolioBalance(accounts: Account[]) {
  return accounts.reduce((total, account) => total + account.currentBalance, 0);
}

export function getAnnualContributionTotal(accounts: Account[]) {
  return accounts.reduce((total, account) => total + account.annualContribution, 0);
}

export function getHouseholdAnnualIncome(scenario: Scenario) {
  return scenario.annualIncome + (scenario.profile.partner?.annualIncome ?? 0);
}

function getAccountOwnerAnnualIncome(
  scenario: Scenario,
  owner: AccountOwner | undefined,
) {
  switch (owner) {
    case "partner":
      return scenario.profile.partner?.annualIncome ?? 0;
    case "joint":
      return getHouseholdAnnualIncome(scenario);
    case "primary":
    default:
      return scenario.annualIncome;
  }
}

export function getEmployerMatchContribution(
  account: Account,
  annualIncome: number,
) {
  if (!account.employerMatch || annualIncome <= 0) {
    return 0;
  }

  const cappedEmployeeContribution = Math.min(
    account.annualContribution,
    annualIncome * account.employerMatch.upTo,
  );

  return cappedEmployeeContribution * account.employerMatch.percentage;
}

export function getEmployerMatchTotal(scenario: Scenario) {
  return scenario.accounts.reduce(
    (total, account) =>
      total +
      getEmployerMatchContribution(
        account,
        getAccountOwnerAnnualIncome(scenario, account.owner),
      ),
    0,
  );
}

export function getNetCashFlowAtAge(scenario: Scenario, age: number) {
  // Use floor(age) so cash flows align to year boundaries, not fractional months.
  // A CF starting at age 35 should activate at the START of the year the user turns 35.
  const yearAge = Math.floor(age);
  return scenario.cashFlows.reduce((total, cashFlow) => {
    const isActive =
      yearAge >= cashFlow.startAge &&
      (cashFlow.endAge === null || yearAge < cashFlow.endAge);

    if (!isActive) {
      return total;
    }

    return total + (cashFlow.type === "income" ? cashFlow.amount : -cashFlow.amount);
  }, 0);
}

/**
 * Compute the real-dollar value of a single cash flow at a given year offset.
 *
 * Rules:
 *   - `inflationAdjusted: true`  → real-dollar amount stays constant
 *   - `inflationAdjusted: false` → nominal amount stays constant; its real
 *     value erodes by `(1 + inflation)^yearsElapsed`
 *   - Name `"Career break income (raises)"` (an opt-in from the What-if card)
 *     additionally scales the real amount by the scenario's real income
 *     growth rate per year since the break started, matching how the base
 *     salary grows in non-break years.
 */
function computeRealAmount(
  cashFlow: Scenario["cashFlows"][number],
  scenario: Scenario,
  yearsElapsed: number,
) {
  const inflation = scenario.assumptions.inflation ?? 0;
  let real = cashFlow.inflationAdjusted
    ? cashFlow.amount
    : cashFlow.amount / (1 + inflation) ** Math.max(yearsElapsed, 0);
  if (cashFlow.name === "Career break income (raises)") {
    const growth = scenario.assumptions.incomeGrowthRate ?? 0;
    // Age-of-break years since the CF started, so raises compound during
    // the break rather than from the scenario epoch.
    const yearsIntoBreak = Math.max(
      Math.floor(yearsElapsed) - (cashFlow.startAge - scenario.profile.age),
      0,
    );
    real *= (1 + growth) ** yearsIntoBreak;
  }
  return real;
}

/**
 * Real-dollar variant of {@link getNetCashFlowAtAge} that respects each cash
 * flow's `inflationAdjusted` flag and the "Career break income (raises)"
 * growth convention. Shared by the accumulation projection.
 */
export function getRealNetCashFlowAtAge(
  scenario: Scenario,
  age: number,
  yearsElapsed: number,
) {
  const yearAge = Math.floor(age);
  return scenario.cashFlows.reduce((total, cashFlow) => {
    const isActive =
      yearAge >= cashFlow.startAge &&
      (cashFlow.endAge === null || yearAge < cashFlow.endAge);
    if (!isActive) return total;
    const realAmount = computeRealAmount(cashFlow, scenario, yearsElapsed);
    return total + (cashFlow.type === "income" ? realAmount : -realAmount);
  }, 0);
}

/**
 * True when the scenario has an active "Career break net cost" cash flow at
 * the given age. The projection uses this to zero out the normal monthly
 * contribution during break years (the user isn't earning the base salary
 * that funds `annualSavings`).
 */
export function isOnCareerBreakAtAge(scenario: Scenario, age: number): boolean {
  const yearAge = Math.floor(age);
  for (const cf of scenario.cashFlows) {
    if (cf.name !== "Career break net cost") continue;
    const active =
      yearAge >= cf.startAge && (cf.endAge === null || yearAge < cf.endAge);
    if (active) return true;
  }
  return false;
}

/**
 * Split cash flows at a given age into income vs expense totals.
 * Also tracks "lost income" from career breaks separately so the display
 * layer can show income=$0 instead of expenses=$300K+.
 */
export function getCashFlowBreakdownAtAge(
  scenario: Scenario,
  age: number,
  // Optional year offset used to apply each CF's `inflationAdjusted` flag
  // (and the "raises" growth convention) to its displayed real-dollar
  // amount. When omitted, amounts are returned as stored for backwards
  // compatibility.
  yearsElapsed?: number,
): { income: number; expense: number; lostIncome: number; net: number } {
  let income = 0;
  let expense = 0;
  let lostIncome = 0;
  const yearAge = Math.floor(age);
  const applyRealDollars = yearsElapsed !== undefined;
  for (const cf of scenario.cashFlows) {
    const isActive =
      yearAge >= cf.startAge && (cf.endAge === null || yearAge < cf.endAge);
    if (!isActive) continue;
    const realAmount = applyRealDollars
      ? computeRealAmount(cf, scenario, yearsElapsed)
      : cf.amount;
    if (cf.type === "income") {
      income += realAmount;
    } else {
      // Career break "net cost" CFs represent lost income + lost savings,
      // not actual spending increases. Track them separately.
      if (cf.name === "Career break net cost") {
        lostIncome += realAmount;
      }
      expense += realAmount;
    }
  }
  return { income, expense, lostIncome, net: income - expense };
}

export function getPlannedAnnualInvestmentContribution(scenario: Scenario) {
  return getAnnualContributionTotal(scenario.accounts) + getEmployerMatchTotal(scenario);
}

export function getPrimaryAccount(scenario: Scenario) {
  return scenario.accounts[0];
}

/**
 * Return the index of the account that should absorb discretionary
 * cashflow changes — raises, lifestyle cuts, inheritances, slider drags.
 *
 * Picks the first `taxable` account when present; falls back to `accounts[0]`
 * when no taxable account exists (legacy behavior for edge scenarios).
 *
 * Rationale: routing changes blindly into `accounts[0]` is wrong when
 * `accounts[0]` is a pre-tax 401k or HSA. Bumping a 401k contribution past
 * the IRS limit is nonsensical, AND changes pre-tax contributions ripple
 * into AGI → federal tax → take-home, which breaks any UI that uses
 * take-home as a slider max (the "Save per year" slider thumb drift bug).
 *
 * The taxable brokerage is the natural destination for discretionary
 * cashflow: no contribution cap, no tax-side-effects, matches the Sankey's
 * default-brokerage treatment of uninvested leftover.
 */
export function getFlexAccountIndex(scenario: Scenario): number {
  const taxableIndex = scenario.accounts.findIndex((a) => a.type === "taxable");
  return taxableIndex >= 0 ? taxableIndex : 0;
}

export function getYearsUntilRetirement(scenario: Scenario) {
  if (scenario.profile.retirementAge === null) {
    return null;
  }

  return Math.max(scenario.profile.retirementAge - scenario.profile.age, 0);
}

export function getRetirementStartAge(scenario: Scenario) {
  return scenario.profile.retirementAge ?? scenario.profile.age;
}

export function syncScenarioRollups(scenario: Scenario): Scenario {
  const next = { ...scenario };
  next.annualSavings = getAnnualContributionTotal(scenario.accounts);
  return next;
}

export function getSavingsRate(scenario: Scenario) {
  const householdAnnualIncome = getHouseholdAnnualIncome(scenario);

  if (householdAnnualIncome <= 0) {
    return 0;
  }

  return getAnnualContributionTotal(scenario.accounts) / householdAnnualIncome;
}
