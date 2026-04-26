/**
 * Second-pass reply generation tool. Takes the original text + computed
 * FIRE summary + assumptions + style, and produces a Reddit-ready reply
 * body that references actual calculated numbers.
 *
 * Uses a cheaper model than extraction (Sonnet vs Opus) because the hard
 * reasoning (scenario construction) is already done. This is a pure
 * writing task.
 */

import { calculateCallCostUsd } from "@/lib/ai/audit";
import { getAnthropicClient } from "@/lib/ai/client";
import { GENERATE_REPLY_SYSTEM_PROMPT } from "@/lib/ai/prompts/generate-reply";
import type {
  AiUsage,
  ReplyStyle,
} from "@/lib/ai/types";
import type { AssumptionLog } from "@/lib/domain/types";

import type { FireSummary } from "@/lib/calc/fire-summary";

const REPLY_MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 2_048;

export interface GenerateReplyParams {
  originalText: string;
  fireSummary: FireSummary;
  assumptions: AssumptionLog[];
  style: ReplyStyle;
}

export interface GenerateReplyResult {
  ok: true;
  body: string;
  assumptionsLine: string;
  usage: AiUsage;
} | {
  ok: false;
  message: string;
}

export async function generateReply(
  params: GenerateReplyParams,
): Promise<GenerateReplyResult> {
  const client = getAnthropicClient();
  if (!client) {
    return {
      ok: false,
      message: "ANTHROPIC_API_KEY is not set on the server",
    };
  }

  const startedAt = Date.now();

  // Build a compact assumptions summary for the prompt.
  const notableAssumptions = params.assumptions
    .filter((a) => a.confidence === "low" || a.confidence === "medium")
    .slice(0, 5);

  const assumptionsBlock = notableAssumptions.length
    ? `Notable assumptions (${notableAssumptions.length} flagged):\n${notableAssumptions
        .map((a) => `- ${a.field}: ${JSON.stringify(a.value)} (${a.source}) — ${a.reason}`)
        .join("\n")}`
    : "No notable assumptions — all fields were directly stated.";

  const fireSummaryBlock = `FIRE Summary:
- Portfolio: $${params.fireSummary.portfolioTotal.toLocaleString()}
- Annual expenses: $${params.fireSummary.annualExpenses.toLocaleString()}
- Withdrawal rate: ${(params.fireSummary.withdrawalRate * 100).toFixed(1)}%
- Safer WR: ${(params.fireSummary.saferWithdrawalRate * 100).toFixed(1)}%
- Already FI: ${params.fireSummary.isAlreadyFi ? "yes" : "no"}
- Years to FI: ${params.fireSummary.yearsToFire !== null ? params.fireSummary.yearsToFire.toFixed(1) : "N/A (no retirement age set)"}
- Monthly safe withdrawal: $${Math.round(params.fireSummary.monthlySafeWithdrawal).toLocaleString()}
- Monthly safer withdrawal: $${Math.round(params.fireSummary.monthlySaferWithdrawal).toLocaleString()}`;

  try {
    const response = await client.messages.create({
      model: REPLY_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: GENERATE_REPLY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Style: ${params.style}\n\n${fireSummaryBlock}\n\n${assumptionsBlock}\n\nOriginal post:\n${params.originalText.slice(0, 10_000)}`,
        },
      ],
    });

    const content = response.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    const usage = buildUsage(response.usage, Date.now() - startedAt);

    // Generate assumptionsLine from the most notable assumption.
    const topAssumption = notableAssumptions[0];
    const assumptionsLine = topAssumption
      ? `I had to guess your ${topAssumption.field.replace("profile.", "").replace("assumptions.", "")} — easy to fix in the tool.`
      : "";

    return {
      ok: true,
      body: content,
      assumptionsLine,
      usage,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}

interface SdkUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

function buildUsage(usage: SdkUsage, durationMs: number): AiUsage {
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    model: REPLY_MODEL,
    costUsd: calculateCallCostUsd({
      model: REPLY_MODEL,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
    }),
    durationMs,
  };
}
