import { APP_VERSION } from "@/lib/domain/defaults";
import { parseScenario } from "@/lib/domain/schema";
import type { Scenario } from "@/lib/domain/types";

/**
 * Scenario export / import — the "take your data with you" surface.
 *
 * Format: a small envelope around the Scenario payload so the file
 * describes itself (schema version, export timestamp, app version).
 * Users can hand-edit the file if they want; import validates via
 * `parseScenario` (which runs the migration chain), so older exports
 * upgrade transparently.
 *
 * Why an envelope vs. a raw Scenario blob: the envelope future-proofs
 * multi-scenario exports, gives us a place to add non-scenario state
 * (e.g. UI preferences) later, and lets us emit a human-readable
 * comment line at the top of the file without breaking JSON.
 */

export const PORTABILITY_FORMAT_VERSION = 1;
export const PORTABILITY_MIME_TYPE = "application/json";
export const PORTABILITY_FILE_EXTENSION = "calcifer.json";

export interface PortabilityEnvelope {
  /** Stable identifier so we can detect "is this ours" on import. */
  source: "calcifer";
  /** Envelope (wrapper) version — bump if the wrapper shape changes. */
  formatVersion: typeof PORTABILITY_FORMAT_VERSION;
  /** App version at export time — diagnostic, not load-gating. */
  exportedBy: {
    appVersion: number;
    exportedAt: string;
  };
  /** One or more scenarios. A single-scenario export has length 1. */
  scenarios: Scenario[];
}

/**
 * Build an export envelope around one or more scenarios. Caller is
 * responsible for wiring this up to a download (see
 * `downloadScenarioExport`).
 */
export function buildExportEnvelope(
  scenarios: Scenario[],
): PortabilityEnvelope {
  return {
    source: "calcifer",
    formatVersion: PORTABILITY_FORMAT_VERSION,
    exportedBy: {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
    },
    scenarios,
  };
}

/**
 * Parse + validate an imported envelope. Returns a list of scenarios
 * ready to upsert, or null on any validation failure (malformed JSON,
 * wrong source, unknown format version, bad scenario shape).
 *
 * Each scenario runs through `parseScenario`, which applies the
 * migration chain — so an old v1 export imports cleanly into a v2 app.
 */
export interface ImportResult {
  scenarios: Scenario[];
  droppedCount: number;
}

export function parseImportPayload(raw: string): ImportResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { source?: unknown }).source !== "calcifer"
  ) {
    return null;
  }

  const envelope = parsed as Partial<PortabilityEnvelope>;

  // Refuse envelopes from a newer wrapper format — we don't know
  // what fields we might be silently dropping. (Same guard rail as
  // the scenario migration system has for forward-version scenarios.)
  if (
    typeof envelope.formatVersion !== "number" ||
    envelope.formatVersion > PORTABILITY_FORMAT_VERSION
  ) {
    return null;
  }

  if (!Array.isArray(envelope.scenarios)) {
    return null;
  }

  const scenarios: Scenario[] = [];
  let dropped = 0;
  for (const candidate of envelope.scenarios) {
    const validated = parseScenario(candidate);
    if (validated) {
      scenarios.push(validated);
    } else {
      dropped += 1;
    }
  }

  // Refuse wholesale-invalid files rather than silently succeeding
  // with zero scenarios — confuses users who expect import-or-error.
  if (scenarios.length === 0) return null;

  return { scenarios, droppedCount: dropped };
}

/**
 * Trigger a file download in the browser. Intentionally minimal —
 * no DOM abstraction, callable from any event handler.
 *
 * Returns void; throws if `window.URL` is unavailable (SSR context).
 * Callers should gate on a client-only environment.
 */
export function downloadScenarioExport(
  envelope: PortabilityEnvelope,
  filename?: string,
) {
  if (typeof window === "undefined") {
    throw new Error("downloadScenarioExport called in SSR context");
  }

  const suggestedName =
    filename ??
    (envelope.scenarios.length === 1
      ? `${sanitizeFilename(envelope.scenarios[0].name)}.${PORTABILITY_FILE_EXTENSION}`
      : `calcifer-export.${PORTABILITY_FILE_EXTENSION}`);

  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: PORTABILITY_MIME_TYPE,
  });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // Defer revoke until the next tick — Safari races on immediate
    // revoke and sometimes drops the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Make a human-typed scenario name safe for a filename. */
function sanitizeFilename(input: string): string {
  const stripped = input
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return stripped.length > 0 ? stripped : "calcifer-plan";
}
