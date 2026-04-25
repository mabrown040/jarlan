/**
 * POST /api/extract-scenario
 *
 * Server-side scenario extraction: takes free-text input, runs it
 * through Claude Opus 4.7 (via `extractScenario`), maps the result
 * to a full `Scenario`, validates via `parseScenario`, and returns
 * the scenario + provenance + a shareable URL.
 *
 * Currently admin-only. The public "describe your situation" entry
 * (Phase 2) will reuse the same pipeline behind a different gate.
 *
 * Pipeline (any failure short-circuits with an appropriate status):
 *   1. requireAdmin
 *   2. per-user rate limit (10/min — admin tool, slow flow)
 *   3. validate request body
 *   4. run extraction
 *   5. log ai_calls (success or failure)
 *   6. build full Scenario
 *   7. parseScenario gate
 *   8. log admin_extractions
 *   9. compose share URL from request origin
 *  10. return scenario + share URL
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminExtraction } from "@/lib/ai/admin-audit";
import { logAiCall } from "@/lib/ai/audit";
import { buildScenarioFromExtraction } from "@/lib/ai/scenario-from-extraction";
import { extractScenario } from "@/lib/ai/tools/extract-scenario";
import { parseScenario } from "@/lib/domain/schema";
import {
  RATE_LIMIT_WINDOWS,
  rateLimit,
  rateLimitResponseHeaders,
  userKey,
} from "@/lib/rate-limit";
import { buildScenarioShareUrl } from "@/lib/share/scenario-url";
import { requireAdmin } from "@/lib/supabase/admin";

const requestSchema = z.object({
  text: z.string().trim().min(20).max(50_000),
  source: z.enum(["admin_paste", "description"]).default("admin_paste"),
});

const PER_MINUTE_LIMIT = 10;

export async function POST(request: Request) {
  // 1. Auth — admin only for now.
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.status },
    );
  }

  // 2. Rate limit per-user (anti-abuse, anti-runaway-script).
  const rateResult = rateLimit(
    userKey("extract-scenario", gate.user.id),
    PER_MINUTE_LIMIT,
    RATE_LIMIT_WINDOWS.minute,
  );
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many extraction requests. Try again in a minute.",
      },
      {
        status: 429,
        headers: rateLimitResponseHeaders(rateResult, PER_MINUTE_LIMIT),
      },
    );
  }

  // 3. Validate input.
  let body: z.infer<typeof requestSchema>;
  try {
    const json = await request.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 4. Run extraction.
  const extraction = await extractScenario({
    text: body.text,
    source: body.source,
    userId: gate.user.id,
  });

  // 5. Audit the AI call when usage info is available (success or
  //    structured-output failure both give us usage; SDK throw doesn't).
  if (extraction.usage) {
    await logAiCall({
      userId: gate.user.id,
      route: "extract-scenario",
      usage: extraction.usage,
      error: extraction.ok ? null : extraction.message,
    });
  }

  if (!extraction.ok) {
    const status = extraction.error === "not_configured" ? 503 : 502;
    return NextResponse.json(
      { error: extraction.error, message: extraction.message },
      { status },
    );
  }

  // 6. Build full scenario from the flat draft.
  const sourceTag =
    body.source === "admin_paste" ? "imported" : "description";
  const built = buildScenarioFromExtraction({
    draft: extraction.extraction.draft,
    assumptions: extraction.extraction.assumptions,
    sourceText: body.text,
    sourceTag,
    modelId: extraction.usage.model,
  });

  // 7. parseScenario gate. The architecture rule: nothing AI-built
  //    reaches the user without passing schema + invariant checks.
  const validated = parseScenario(built);
  if (!validated) {
    return NextResponse.json(
      { error: "scenario_validation_failed" },
      { status: 500 },
    );
  }

  // 8. Audit admin extractions specifically (paste audit for the
  //    growth tool — only for admin_paste source; public Phase 2
  //    uses a different audit shape).
  if (body.source === "admin_paste") {
    await logAdminExtraction({
      operatorId: gate.user.id,
      sourceText: body.text,
      sourceType: "manual",
      assumptionCount: extraction.extraction.assumptions.length,
    });
  }

  // 9. Build a shareable URL from the request's own origin so it
  //    works in dev (localhost), preview deploys, and production
  //    without env-var configuration.
  const origin = new URL(request.url).origin;
  const shareUrl = buildScenarioShareUrl(`${origin}/`, validated);

  // 10. Return everything the client UI needs.
  return NextResponse.json({
    scenario: validated,
    confidence: extraction.extraction.confidence,
    notes: extraction.extraction.notes,
    shareUrl,
  });
}
