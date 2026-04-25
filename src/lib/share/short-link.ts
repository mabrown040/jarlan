/**
 * Short-link service for shareable scenarios.
 *
 * The existing `buildScenarioShareUrl()` produces a long URL that
 * includes the entire compressed scenario as a query param —
 * great for offline/local-only use, terrible to paste in a Reddit
 * reply (it's ~3KB of base64 noise that looks auto-generated).
 *
 * This module trades the self-contained property for cleanliness:
 * the scenario lives in `public.share_links`, the URL is just
 * `/s/abc123`. The recipient hits that, the server looks up by
 * short_id, and redirects to the existing `/?scenario=...` page
 * which already knows how to hydrate the scenario into the
 * client store.
 *
 * `createShortLink()` returns `null` (gracefully) when Supabase
 * isn't configured — caller is expected to fall back to the long
 * URL so the feature degrades to "still works, just ugly."
 */

import { parseScenario } from "@/lib/domain/schema";
import type { Scenario } from "@/lib/domain/types";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

const SHORT_ID_LENGTH = 10;

// Drop look-alike characters (0/O, 1/l/I) from the alphabet so a
// short_id read aloud or hand-copied from a screenshot stays
// unambiguous. ~58^10 ≈ 4×10^17 entropy — still well past
// brute-force territory.
const SHORT_ID_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a URL-safe random short ID. Uses Web Crypto so it
 * works in both the Node server runtime and the Edge runtime.
 */
export function generateShortId(length: number = SHORT_ID_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += SHORT_ID_ALPHABET[bytes[i]! % SHORT_ID_ALPHABET.length];
  }
  return result;
}

export interface CreateShortLinkResult {
  shortId: string;
  shortUrl: string;
}

interface CreateShortLinkParams {
  scenario: Scenario;
  origin: string;
  createdBy?: string | null;
}

/**
 * Persist a scenario behind a short URL. Returns null when
 * Supabase isn't configured or the insert fails — caller should
 * fall back to the long compressed-in-URL link.
 */
export async function createShortLink(
  params: CreateShortLinkParams,
): Promise<CreateShortLinkResult | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    if (typeof console !== "undefined") {
      console.warn(
        "[share_links] supabase service client unavailable — falling back to long URL",
      );
    }
    return null;
  }

  const shortId = generateShortId();

  // The generated `Database` types haven't been regenerated to
  // include `share_links` yet (separate task). Cast to a minimal
  // local shape so we keep type-safety on the row.
  type ShareLinksInsertableRow = {
    short_id: string;
    scenario_data: Scenario;
    created_by: string | null;
  };
  type ShareLinksTable = {
    insert: (
      row: ShareLinksInsertableRow,
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await (
    supabase.from("share_links") as unknown as ShareLinksTable
  ).insert({
    short_id: shortId,
    scenario_data: params.scenario,
    created_by: params.createdBy ?? null,
  });

  if (error) {
    if (typeof console !== "undefined") {
      console.warn("[share_links] insert failed", error.message);
    }
    return null;
  }

  return {
    shortId,
    shortUrl: `${params.origin}/s/${shortId}`,
  };
}

/**
 * Look up a scenario by its short_id. Returns null when the row
 * isn't found, Supabase isn't configured, or the stored data
 * fails `parseScenario` (e.g., the scenario shape changed and
 * the stored blob is now invalid — graceful 404 instead of
 * crashing).
 *
 * Side-effect: increments `view_count` fire-and-forget so the
 * operator can see how many people clicked through. Never blocks
 * the user-facing redirect on this update.
 */
export async function getScenarioByShortId(
  shortId: string,
): Promise<Scenario | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  type ShareLinksRow = {
    scenario_data: unknown;
    view_count: number;
  };
  type ShareLinksTable = {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: ShareLinksRow | null;
          error: unknown;
        }>;
      };
    };
    update: (row: { view_count: number }) => {
      eq: (column: string, value: string) => Promise<unknown>;
    };
  };

  const table = supabase.from("share_links") as unknown as ShareLinksTable;

  const { data, error } = await table
    .select("scenario_data, view_count")
    .eq("short_id", shortId)
    .maybeSingle();

  if (error || !data) return null;

  // Fire-and-forget view-count bump. Don't await — recipient
  // experience must not block on a write.
  void table
    .update({ view_count: data.view_count + 1 })
    .eq("short_id", shortId);

  return parseScenario(data.scenario_data);
}
