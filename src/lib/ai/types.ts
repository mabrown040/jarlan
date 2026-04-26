/**
 * Types shared across the AI infrastructure (extraction, future
 * chat). Kept in one file because they're small and tightly
 * coupled — split when one of them grows.
 */

import type { AssumptionLog } from "@/lib/domain/types";

export type ReplyStyle = "concise" | "thorough" | "questioning";

/**
 * Token + cost telemetry for a single Anthropic API call.
 * Persisted to the `ai_calls` audit table.
 */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  durationMs: number;
  model: string;
}

/**
 * Flat shape the extraction model produces. Easy for the model to
 * emit, deliberately simpler than the full nested `Scenario`. The
 * application layer (route handler) maps this to `Partial<Scenario>`
 * and merges with defaults before running through `parseScenario`.
 *
 * Every field is nullable — the model uses `null` for unknown,
 * never invents values. Account balances are aggregated by
 * tax-treatment bucket (taxable / traditional / Roth / HSA)
 * because the application layer can produce sensible default
 * account structures from those four numbers.
 */
export interface ScenarioDraft {
  age: number | null;
  retirementAge: number | null;
  state: string | null; // 2-letter US state code
  filingStatus:
    | "single"
    | "married_joint"
    | "married_separate"
    | "head_of_household"
    | null;
  employmentType: "w2" | "self_employed" | "1099" | null;
  householdSize: number | null;
  annualIncome: number | null;
  annualSavings: number | null;
  annualExpenses: number | null;
  retirementExpenses: number | null;
  taxablePortfolio: number | null;
  traditionalRetirementBalance: number | null;
  rothRetirementBalance: number | null;
  hsaBalance: number | null;
  withdrawalRate: number | null;
  expectedRealReturn: number | null;
}

/**
 * Reddit-ready reply the operator can post on the source thread.
 * The whole point of the admin tool: a draft scenario without a
 * post-able message is just data; with the message, it's a growth
 * lever.
 *
 * The model produces just the analytical body. The server-side
 * `assembleReplyMessage()` (in `reply-template.ts`) appends the
 * share URL and a fixed disclosure to produce the final text.
 * Hardcoding the boilerplate eliminates risk that the model
 * drifts on link formatting or disclosure wording.
 *
 * Empty `body` signals the model declined to draft a reply
 * (input too thin, off-topic, distress signal).
 */
export interface ReplyDraft {
  /** 1-line operator-only TL;DR (not part of the public reply). */
  summary: string;
  /**
   * 120–200 word reply body — acknowledgment + analysis only.
   * The server appends the share link and disclosure after.
   * Empty string when the model declined to draft.
   */
  body: string;
  /**
   * Optional 1-sentence lead-in to the share URL that names 1–2
   * specific assumptions the OP should verify in the tool.
   * Server places it immediately before the URL. Empty string
   * when no assumptions are noteworthy enough to flag.
   */
  assumptionsLine: string;
}

/**
 * Result the model returns. `draft` populates what it could; every
 * non-trivial field gets an entry in `assumptions` explaining why.
 * `confidence` is the overall extraction confidence (worst-case
 * across the populated fields). `notes` is for caveats the user
 * should know but that don't fit anywhere else (e.g., "user
 * mentioned a recent divorce that may affect filing status").
 */
export interface ExtractionResult {
  draft: ScenarioDraft;
  assumptions: AssumptionLog[];
  confidence: "high" | "medium" | "low";
  notes?: string;
  replyDraft: ReplyDraft;
}

/**
 * Discriminated result type for `extractScenario()`. Callers
 * pattern-match on `ok` — usage is included in both branches so
 * the route handler can log `ai_calls` rows for failures too.
 */
export type ExtractScenarioResult =
  | { ok: true; extraction: ExtractionResult; usage: AiUsage }
  | {
      ok: false;
      error: "not_configured" | "api_error" | "invalid_output";
      message: string;
      usage?: AiUsage;
    };

/**
 * Inputs to `extractScenario()`. `userId` is forwarded to the audit
 * logger; `null` for anonymous-route variants.
 */
export interface ExtractScenarioInput {
  text: string;
  source: "description" | "admin_paste";
  userId?: string | null;
  replyStyle?: ReplyStyle;
}
