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
  return scenario.cashFlows.reduce((total, cashFlow) => {
    const isActive =
      age >= cashFlow.startAge &&
      (cashFlow.endAge === null || age <= cashFlow.endAge);

    if (!isActive) {
      return total;
    }

    return total + (cashFlow.type === "income" ? cashFlow.amount : -cashFlow.amount);
  }, 0);
}

/**
 * Split cash flows at a given age into income vs expense totals.
 * Also tracks "lost income" from career breaks separately so the display
 * layer can show income=$0 instead of expenses=$300K+.
 */
export function getCashFlowBreakdownAtAge(
  scenario: Scenario,
  age: number,
): { income: number; expense: number; lostIncome: number; net: number } {
  let income = 0;
  let expense = 0;
  let lostIncome = 0;
  for (const cf of scenario.cashFlows) {
    const isActive =
      age >= cf.startAge && (cf.endAge === null || age <= cf.endAge);
    if (!isActive) continue;
    if (cf.type === "income") {
      income += cf.amount;
    } else {
      // Career break "net cost" CFs represent lost income + lost savings,
      // not actual spending increases. Track them separately.
      if (cf.name === "Career break net cost") {
        lostIncome += cf.amount;
      }
      expense += cf.amount;
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

export function getYearsUntilRetirement(scenario: Scenario) {
  if (scenario.profile.retirementAge === null) {
    return null;
  }

  return Math.max(scenario.profile.retirementAge - scenario.profile.age, 0);
}

export function getRetirementStartAge(scenario: Scenario) {
  return scenario.profile.retirementAge ?? scenario.profile.age;
}

export function getSavingsRate(scenario: Scenario) {
  const householdAnnualIncome = getHouseholdAnnualIncome(scenario);

  if (householdAnnualIncome <= 0) {
    return 0;
  }

  return getAnnualContributionTotal(scenario.accounts) / householdAnnualIncome;
}
