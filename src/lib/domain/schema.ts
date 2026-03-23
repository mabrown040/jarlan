import { z } from "zod";

import {
  accountOwners,
  accountTypes,
  filingStatuses,
  inflationModels,
  rebalanceFrequencies,
  simulationTypes,
  withdrawalStrategyTypes,
} from "@/lib/domain/types";
import type { Scenario } from "@/lib/domain/types";

const socialSecuritySchema = z.object({
  monthlyBenefitAt62: z.number().nonnegative(),
  monthlyBenefitAtFra: z.number().nonnegative(),
  monthlyBenefitAt70: z.number().nonnegative(),
  claimingAge: z.union([z.literal(62), z.literal(67), z.literal(70)]),
});

const assetAllocationSchema = z.object({
  stocks: z.number().min(0).max(1),
  bonds: z.number().min(0).max(1),
  alternatives: z.number().min(0).max(1),
});

const rothConversionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  amount: z.number().nonnegative(),
  taxPaid: z.number().nonnegative(),
});

const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(accountTypes),
  owner: z.enum(accountOwners).optional(),
  currentBalance: z.number().nonnegative(),
  annualContribution: z.number().nonnegative(),
  employerMatch: z
    .object({
      percentage: z.number().min(0).max(1),
      upTo: z.number().nonnegative(),
    })
    .optional(),
  assetAllocation: assetAllocationSchema,
  expenseRatio: z.number().min(0).max(1),
  costBasis: z.number().nonnegative().optional(),
  rothContributions: z.number().nonnegative().optional(),
  rothConversions: z.array(rothConversionSchema).optional(),
});

const userProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().min(18).max(100),
  retirementAge: z.number().int().min(18).max(100).nullable(),
  filingStatus: z.enum(filingStatuses),
  country: z.string().min(2).optional(),
  state: z.string().min(1),
  householdSize: z.number().int().min(1).max(10),
  healthStatus: z.enum(["below_average", "average", "above_average"]),
  partner: z
    .object({
      name: z.string().min(1),
      age: z.number().int().min(18).max(100),
      retirementAge: z.number().int().min(18).max(100).nullable(),
      annualIncome: z.number().nonnegative().optional(),
      healthStatus: z.enum(["below_average", "average", "above_average"]).optional(),
      socialSecurityBenefit: socialSecuritySchema,
    })
    .optional(),
});

const cashFlowEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["income", "expense"]),
  amount: z.number().nonnegative(),
  startAge: z.number().int().min(0).max(100),
  endAge: z.number().int().min(0).max(120).nullable(),
  inflationAdjusted: z.boolean(),
  taxable: z.boolean(),
});

const glidepathPointSchema = z.object({
  age: z.number().int().min(0).max(120),
  allocation: assetAllocationSchema,
});

const withdrawalStrategySchema = z.object({
  type: z.enum(withdrawalStrategyTypes),
  initialRate: z.number().min(0).max(1).optional(),
  capeParams: z
    .object({
      a: z.number(),
      b: z.number(),
    })
    .optional(),
  gkParams: z
    .object({
      guardrailWidth: z.number().min(0).max(1),
      adjustmentSize: z.number().min(0).max(1),
      suspendCapPreservationYears: z.number().int().min(0).max(100),
    })
    .optional(),
  floorCeiling: z
    .object({
      floor: z.number().nonnegative(),
      ceiling: z.number().nonnegative(),
    })
    .optional(),
  spendingDeclineRate: z.number().min(0).max(1).optional(),
});

const simulationSettingsSchema = z.object({
  retirementDuration: z.number().int().min(1).max(80),
  simulationType: z.enum(simulationTypes),
  monteCarloTrials: z.number().int().min(100).max(100_000),
  rebalanceFrequency: z.enum(rebalanceFrequencies),
  finalValueTarget: z.number().min(0).max(10),
  inflationModel: z.enum(inflationModels),
  fixedInflation: z.number().min(0).max(1),
  feeDrag: z.number().min(0).max(1),
});

const scenarioAssumptionsSchema = z.object({
  expectedRealReturn: z.number().min(-1).max(1),
  inflation: z.number().min(0).max(1),
  withdrawalRate: z.number().min(0.01).max(0.2),
  saferWithdrawalRate: z.number().min(0.01).max(0.2),
  partTimeIncome: z.number().nonnegative(),
  incomeGrowthRate: z.number().min(0).max(0.1).default(0.01),
  expenseGrowthRate: z.number().min(0).max(0.1).default(0),
});

export const scenarioSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().min(1),
  name: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  currency: z.enum(["USD", "CAD", "GBP", "EUR", "AUD"]),
  profile: userProfileSchema,
  accounts: z.array(accountSchema).min(1),
  cashFlows: z.array(cashFlowEventSchema),
  annualIncome: z.number().nonnegative(),
  annualSavings: z.number().nonnegative(),
  annualExpenses: z.number().nonnegative(),
  retirementExpenses: z.number().nonnegative(),
  assumptions: scenarioAssumptionsSchema,
  withdrawalStrategy: withdrawalStrategySchema,
  assetAllocationGlidepath: z.array(glidepathPointSchema),
  simulationSettings: simulationSettingsSchema,
  socialSecurity: socialSecuritySchema,
});

export function parseScenario(input: unknown): Scenario | null {
  const result = scenarioSchema.safeParse(input);
  return result.success ? result.data : null;
}
