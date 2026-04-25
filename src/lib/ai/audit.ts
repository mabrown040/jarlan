/**
 * Audit logging for AI API calls. Every call to Anthropic — both
 * successes and failures — should land in `ai_calls` so we can:
 *
 *   - Enforce per-user daily token budgets (aggregate over 24h).
 *   - Track cost per route / per model.
 *   - Detect anomalies (sudden spike in tokens or costs).
 *   - Debug regressions across model versions.
 *
 * Service-role only — users never read or write this table
 * directly. Failures to log are non-fatal: they warn but don't
 * disrupt the calling flow (the user-visible operation continues).
 */

import { getSupabaseServiceClient } from "@/lib/supabase/server";

import type { AiUsage } from "./types";

/**
 * Per-1M-token costs in USD. Source: Anthropic published pricing
 * for `claude-opus-4-7` (and the cache-tier multipliers from the
 * Claude API docs). Update when migrating to a different model.
 *
 * Cache reads cost ~0.1× input. Cache writes cost ~1.25× input
 * (5-minute TTL — the SDK default).
 */
const COST_PER_MILLION_INPUT_TOKENS_USD: Record<string, number> = {
  "claude-opus-4-7": 5,
  "claude-opus-4-6": 5,
  "claude-sonnet-4-6": 3,
  "claude-haiku-4-5": 1,
};

const COST_PER_MILLION_OUTPUT_TOKENS_USD: Record<string, number> = {
  "claude-opus-4-7": 25,
  "claude-opus-4-6": 25,
  "claude-sonnet-4-6": 15,
  "claude-haiku-4-5": 5,
};

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER_5MIN = 1.25;

/**
 * Compute estimated cost for a single API call. Returns 0 for
 * unknown models rather than throwing — the audit log should still
 * record the call even if pricing data is stale.
 */
export function calculateCallCostUsd(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}): number {
  const inputRate = COST_PER_MILLION_INPUT_TOKENS_USD[params.model] ?? 0;
  const outputRate = COST_PER_MILLION_OUTPUT_TOKENS_USD[params.model] ?? 0;

  const inputCost = (params.inputTokens / 1_000_000) * inputRate;
  const outputCost = (params.outputTokens / 1_000_000) * outputRate;
  const cacheReadCost =
    (params.cacheReadTokens / 1_000_000) * inputRate * CACHE_READ_MULTIPLIER;
  const cacheWriteCost =
    (params.cacheWriteTokens / 1_000_000) *
    inputRate *
    CACHE_WRITE_MULTIPLIER_5MIN;

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

interface LogAiCallParams {
  userId: string | null;
  route: string;
  usage: AiUsage;
  toolCalls?: { name: string; count: number }[];
  error?: string | null;
}

/**
 * Persist a row to `public.ai_calls`. Non-fatal on failure: warns
 * to the server log and returns. The user-visible flow keeps
 * running.
 */
export async function logAiCall(params: LogAiCallParams): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    if (typeof console !== "undefined") {
      console.warn(
        "[ai_calls] supabase service client unavailable — skipping audit log",
      );
    }
    return;
  }

  // Cast to a relaxed shape because the generated `Database` types
  // don't yet include `ai_calls` (the migration was applied to
  // staging/prod but `database.types.ts` regeneration is a separate
  // task). Once `npx supabase gen types` is re-run, this cast can
  // come out.
  const { error } = await (
    supabase.from("ai_calls") as unknown as {
      insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    }
  ).insert({
    user_id: params.userId,
    route: params.route,
    model: params.usage.model,
    input_tokens: params.usage.inputTokens,
    output_tokens: params.usage.outputTokens,
    cache_read_tokens: params.usage.cacheReadTokens,
    cache_write_tokens: params.usage.cacheWriteTokens,
    cost_usd: params.usage.costUsd,
    duration_ms: params.usage.durationMs,
    tool_calls: params.toolCalls ?? [],
    error: params.error ?? null,
  });

  if (error && typeof console !== "undefined") {
    console.warn("[ai_calls] insert failed", error);
  }
}
