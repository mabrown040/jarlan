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
import { runScenarioMigrations } from "@/lib/domain/migrations";

const socialSecuritySchema = z.object({
  monthlyBenefitAt62: z.number().nonnegative(),
  monthlyBenefitAtFra: z.number().nonnegative(),
  monthlyBenefitAt70: z.number().nonnegative(),
  claimingAge: z.union([z.literal(62), z.literal(67), z.literal(70)]),
  ssaImportedAt: z.string().optional(),
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
  employmentType: z.enum(["w2", "self_employed", "1099"]).default("w2"),
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
  partTimeIncomeDuration: z.number().int().min(1).max(50).nullable().default(null),
  incomeGrowthRate: z.number().min(0).max(0.1).default(0.01),
  expenseGrowthRate: z.number().min(0).max(0.1).default(0),
  // Bounds: 0% to 70%. 70% is a deliberately generous ceiling — the
  // theoretical max for a high-income earner in CA + NYC + AMT is
  // around 55-60%, so 70% gives headroom without enabling clearly-
  // wrong inputs. Default(null) means migrating data without the
  // field gets it set to null (= "off").
  taxRateOverride: z.number().min(0).max(0.7).nullable().default(null),
});

const assumptionLogSchema = z.object({
  field: z.string().min(1).max(200),
  value: z.unknown(),
  reason: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.enum(["derived", "default", "inferred"]),
});

const scenarioMetaSchema = z.object({
  source: z.enum(["manual", "quiz", "description", "chat", "imported"]),
  // 50KB cap on raw source text — mirrors the paste cap from the
  // chat architecture doc and protects against payload bombs in
  // shared/imported scenarios. The 512KB scenario-level cap in
  // share-URL serialization is the outer guard.
  sourceText: z.string().max(50_000).optional(),
  assumptionsLog: z.array(assumptionLogSchema).max(200).optional(),
  createdBy: z.enum(["user", "ai"]).optional(),
  createdByModel: z.string().min(1).max(100).optional(),
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
  // Optional: set `true` once the user has personalized the defaults (via
  // quiz completion, drawer edits, etc.). Preserved through share-URL
  // serialization so recipients see the same "personalized vs default"
  // state as the sender.
  isPersonalized: z.boolean().optional(),
  /**
   * Owner identifier for cloud sync. `null` (or undefined for legacy
   * v1 data) = local-only. Added in schema v2. The migration ensures
   * older data always surfaces with ownerId explicitly null.
   */
  ownerId: z.string().nullable().optional(),
  /**
   * Provenance metadata for AI-aware features. Added in schema v4.
   * Optional for legacy and non-AI scenarios.
   */
  meta: scenarioMetaSchema.optional(),
});

export function parseScenario(input: unknown): Scenario | null {
  if (!input || typeof input !== "object") return null;

  // Run the version-migration chain first so older persisted/shared
  // scenarios upgrade transparently. Returns null on forward-version
  // refusal (e.g. v3 scenario loaded by v2 app).
  const migrated = runScenarioMigrations(input as Record<string, unknown>);
  if (!migrated) return null;

  const result = scenarioSchema.safeParse(migrated);
  return result.success ? result.data : null;
}
