/**
 * Anthropic SDK client factory.
 *
 * Server-only — never import this from a client component. The
 * ANTHROPIC_API_KEY is server-scoped (no NEXT_PUBLIC_ prefix) and
 * the SDK is not designed to run in the browser.
 *
 * Returns `null` when the key is unset so callers can gracefully
 * disable AI features. This matches the existing
 * graceful-degradation pattern of `getSupabaseServerClient()` —
 * the rest of the app keeps working when AI is not configured.
 *
 * Re-creates the client on every call rather than caching, which
 * keeps unit tests easy (no module-level state to reset between
 * tests) and avoids subtle bugs around env-var changes in dev.
 * Anthropic instantiation is cheap.
 */

import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
