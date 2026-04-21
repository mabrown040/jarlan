import type {
  Account,
  AccountOwner,
  AccountType,
  CashFlowEvent,
  Scenario,
} from "@/lib/domain/types";

/**
 * Scenario schema version. Bump whenever the Scenario shape changes
 * in a way older persisted/shared data can't handle transparently.
 * See `runScenarioMigrations` in `@/lib/domain/migrations` for the
 * upgrade path.
 *
 * History:
 *   v1 — initial shape
 *   v2 — added `ownerId` (nullable) to enable future cloud sync
 */
export const APP_VERSION = 2;
export const DEFAULT_SCENARIO_ID = "default-firecalc-scenario";

export function createDefaultAccount(
  type: AccountType = "taxable",
  name?: string,
  owner: AccountOwner = "primary",
): Account {
  return {
    id: crypto.randomUUID(),
    name: name ?? "New account",
    type,
    owner,
    currentBalance: 0,
    annualContribution: 0,
    assetAllocation: {
      stocks: 0.8,
      bonds: 0.2,
      alternatives: 0,
    },
    expenseRatio: 0.001,
  };
}

export function createDefaultPartnerProfile() {
  return {
    name: "Partner",
    age: 34,
    retirementAge: 48,
    annualIncome: 72_000,
    healthStatus: "average" as const,
    socialSecurityBenefit: {
      monthlyBenefitAt62: 1_500,
      monthlyBenefitAtFra: 2_100,
      monthlyBenefitAt70: 2_600,
      claimingAge: 67 as const,
    },
  };
}

export function createDefaultCashFlowEvent(
  type: CashFlowEvent["type"] = "income",
): CashFlowEvent {
  return {
    id: crypto.randomUUID(),
    name: type === "income" ? "New income" : "New expense",
    type,
    amount: 0,
    startAge: 34,
    endAge: null,
    inflationAdjusted: true,
    taxable: type === "income",
  };
}

export function createDefaultScenario(): Scenario {
  const now = new Date().toISOString();

  return {
    id: DEFAULT_SCENARIO_ID,
    version: APP_VERSION,
    name: "Base case",
    createdAt: now,
    updatedAt: now,
    currency: "USD",
    profile: {
      id: "default-profile",
      name: "Planner",
      age: 34,
      retirementAge: 46,
      filingStatus: "single",
      employmentType: "w2",
      country: "US",
      state: "CA",
      householdSize: 1,
      healthStatus: "average",
    },
    accounts: [
      {
        id: "taxable-core",
        name: "Core portfolio",
        type: "taxable",
        currentBalance: 185_000,
        annualContribution: 36_000,
        assetAllocation: {
          stocks: 0.8,
          bonds: 0.2,
          alternatives: 0,
        },
        expenseRatio: 0.001,
        costBasis: 120_000,
      },
    ],
    cashFlows: [],
    annualIncome: 128_000,
    annualSavings: 36_000,
    annualExpenses: 54_000,
    retirementExpenses: 54_000,
    assumptions: {
      expectedRealReturn: 0.05,
      inflation: 0.03,
      withdrawalRate: 0.04,
      saferWithdrawalRate: 0.035,
      partTimeIncome: 15_000,
      partTimeIncomeDuration: null,
      incomeGrowthRate: 0.01,
      expenseGrowthRate: 0,
    },
    withdrawalStrategy: {
      type: "fixed",
      initialRate: 0.04,
      capeParams: {
        a: 0.0175,
        b: 0.5,
      },
      gkParams: {
        guardrailWidth: 0.2,
        adjustmentSize: 0.1,
        suspendCapPreservationYears: 15,
      },
      floorCeiling: {
        floor: 36_000,
        ceiling: 72_000,
      },
      spendingDeclineRate: 0.0125,
    },
    assetAllocationGlidepath: [
      {
        age: 34,
        allocation: {
          stocks: 0.8,
          bonds: 0.2,
          alternatives: 0,
        },
      },
      {
        age: 60,
        allocation: {
          stocks: 0.7,
          bonds: 0.3,
          alternatives: 0,
        },
      },
    ],
    simulationSettings: {
      retirementDuration: 54, // 100 - default retirement age (46) — conservative plan to age 100
      simulationType: "historical",
      monteCarloTrials: 10_000,
      rebalanceFrequency: "annually",
      finalValueTarget: 0,
      inflationModel: "fixed",
      fixedInflation: 0.03,
      feeDrag: 0.001,
    },
    socialSecurity: {
      monthlyBenefitAt62: 1_900,
      monthlyBenefitAtFra: 2_700,
      monthlyBenefitAt70: 3_350,
      claimingAge: 67,
    },
    isPersonalized: false,
    // Local-only by default. Flipped to a server-issued id when the
    // user opts into cloud sync (future work; `null` preserves the
    // "never need an account" contract for today's users).
    ownerId: null,
  };
}

export function cloneScenario(scenario: Scenario): Scenario {
  return structuredClone(scenario);
}

export function touchScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    updatedAt: new Date().toISOString(),
  };
}
