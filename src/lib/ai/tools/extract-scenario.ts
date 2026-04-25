/**
 * Scenario extraction tool. Calls Claude Opus 4.7 with structured
 * output, validates the result against a Zod schema, and returns
 * a discriminated `ExtractScenarioResult`.
 *
 * Used by:
 *   - `/admin/scenario-from-text` (admin growth tool)
 *   - `/api/extract-scenario` (public "describe your situation"
 *     onboarding — Phase 2)
 *
 * Both share this code path — the only differences live at the
 * route layer (auth gate, rate limit shape, audit table).
 *
 * The pasted text is wrapped in <user_supplied_content> tags. The
 * system prompt explicitly tells the model that everything inside
 * those tags is data, not instructions. This is defense-in-depth
 * against prompt injection: even a "successful" injection can only
 * produce a `Scenario` shape that still has to pass `parseScenario`
 * + `assertScenarioInvariants` before it touches the user's plan.
 */

import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { calculateCallCostUsd } from "@/lib/ai/audit";
import { getAnthropicClient } from "@/lib/ai/client";
import { EXTRACT_SCENARIO_SYSTEM_PROMPT } from "@/lib/ai/prompts/extract-scenario";
import { extractionResultSchema } from "@/lib/ai/schemas/extract-scenario";
import type {
  AiUsage,
  ExtractScenarioInput,
  ExtractScenarioResult,
  ExtractionResult,
} from "@/lib/ai/types";

const EXTRACTION_MODEL = "claude-opus-4-7";
const MAX_OUTPUT_TOKENS = 16_000;
const MAX_INPUT_TEXT_BYTES = 50_000; // mirrors the architecture-doc paste cap

export async function extractScenario(
  input: ExtractScenarioInput,
): Promise<ExtractScenarioResult> {
  const client = getAnthropicClient();
  if (!client) {
    return {
      ok: false,
      error: "not_configured",
      message: "ANTHROPIC_API_KEY is not set on the server",
    };
  }

  if (input.text.length > MAX_INPUT_TEXT_BYTES) {
    return {
      ok: false,
      error: "invalid_output",
      message: `input text exceeds ${MAX_INPUT_TEXT_BYTES} bytes`,
    };
  }

  const startedAt = Date.now();

  try {
    const response = await client.messages.parse({
      model: EXTRACTION_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "adaptive" },
      output_config: {
        format: zodOutputFormat(extractionResultSchema),
        effort: "high",
      },
      system: EXTRACT_SCENARIO_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<user_supplied_content>\n${input.text}\n</user_supplied_content>`,
        },
      ],
    });

    const usage = buildUsage(response.usage, Date.now() - startedAt);

    if (!response.parsed_output) {
      return {
        ok: false,
        error: "invalid_output",
        message: "model output failed schema validation",
        usage,
      };
    }

    // Cast: the Zod schema constrains `value` to JSON primitives,
    // which is a strict subset of the `unknown` field on
    // AssumptionLog. The shape is identical otherwise.
    const extraction: ExtractionResult = {
      draft: response.parsed_output.draft,
      assumptions: response.parsed_output.assumptions,
      confidence: response.parsed_output.confidence,
      notes: response.parsed_output.notes,
      replyDraft: response.parsed_output.replyDraft,
    };

    return { ok: true, extraction, usage };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: "api_error",
      message,
    };
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
    model: EXTRACTION_MODEL,
    costUsd: calculateCallCostUsd({
      model: EXTRACTION_MODEL,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
    }),
    durationMs,
  };
}
