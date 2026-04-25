/**
 * Zod schemas used as structured-output formats for the extraction
 * call. The Anthropic SDK's `zodOutputFormat()` helper converts
 * these to JSON Schema and validates the model's output against
 * them client-side.
 *
 * Field-level bounds (`.min(18).max(100)`, etc.) are enforced
 * client-side by the SDK — the API itself only sees a basic JSON
 * Schema. That's fine: any out-of-bounds value the model produces
 * will fail Zod validation locally and surface as `parsed_output:
 * null`, which the caller treats as `invalid_output`.
 */

import { z } from "zod";

const scenarioDraftSchema = z.object({
  age: z.number().int().min(18).max(100).nullable(),
  retirementAge: z.number().int().min(18).max(100).nullable(),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "state must be a 2-letter uppercase US code")
    .nullable(),
  filingStatus: z
    .enum(["single", "married_joint", "married_separate", "head_of_household"])
    .nullable(),
  employmentType: z.enum(["w2", "self_employed", "1099"]).nullable(),
  householdSize: z.number().int().min(1).max(10).nullable(),
  annualIncome: z.number().nonnegative().max(50_000_000).nullable(),
  annualSavings: z.number().nonnegative().max(50_000_000).nullable(),
  annualExpenses: z.number().nonnegative().max(50_000_000).nullable(),
  retirementExpenses: z.number().nonnegative().max(50_000_000).nullable(),
  taxablePortfolio: z.number().nonnegative().max(1_000_000_000).nullable(),
  traditionalRetirementBalance: z
    .number()
    .nonnegative()
    .max(1_000_000_000)
    .nullable(),
  rothRetirementBalance: z
    .number()
    .nonnegative()
    .max(1_000_000_000)
    .nullable(),
  hsaBalance: z.number().nonnegative().max(10_000_000).nullable(),
  withdrawalRate: z.number().min(0.01).max(0.2).nullable(),
  expectedRealReturn: z.number().min(-0.1).max(0.2).nullable(),
});

// `value` is constrained to JSON primitives because structured-output
// JSON Schema doesn't support `unknown` cleanly. The full
// `AssumptionLog` type still uses `unknown` — primitives are a
// strict subset of unknown, so the cast in extract-scenario.ts
// is sound.
const assumptionLogEntrySchema = z.object({
  field: z.string().min(1).max(100),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  reason: z.string().min(1).max(500),
  confidence: z.enum(["high", "medium", "low"]),
  source: z.enum(["derived", "default", "inferred"]),
});

// Reddit-ready reply, split into three parts so the server can
// assemble the final message with a hardcoded disclosure (no risk
// of model drift on the boilerplate). Caps mirror the prompt's
// length guidance with generous headroom — the model can overshoot
// without hitting the schema cap.
const replyDraftSchema = z.object({
  summary: z.string().max(300),
  body: z.string().max(2500),
  assumptionsLine: z.string().max(400),
});

export const extractionResultSchema = z.object({
  draft: scenarioDraftSchema,
  assumptions: z.array(assumptionLogEntrySchema).max(50),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().max(1000).optional(),
  replyDraft: replyDraftSchema,
});

export type ExtractionResultParsed = z.infer<typeof extractionResultSchema>;
