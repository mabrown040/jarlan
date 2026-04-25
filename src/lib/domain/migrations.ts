import type { Scenario } from "@/lib/domain/types";
import { APP_VERSION } from "@/lib/domain/defaults";

/**
 * Forward-migrate a persisted/shared scenario to the current
 * `APP_VERSION`. Called by `parseScenario` so every code path that
 * loads a Scenario — IndexedDB draft hydration, share-URL decode,
 * tests, fixtures — sees the same upgrade path.
 *
 * Design:
 * - Each migration is a function `vN_to_vN+1(input: any): any` that
 *   accepts the PRIOR shape and returns the NEXT shape.
 * - Migrations run in order; a v1 scenario going to v3 runs v1→v2
 *   then v2→v3 automatically.
 * - Unknown/future versions (APP_VERSION + 1) are rejected by
 *   returning null so the caller falls back to the default scenario
 *   instead of running ancient code against new data.
 * - Migrations are pure — no IO, no store access — so they stay
 *   testable and SSR-safe.
 *
 * When adding a new migration: bump `APP_VERSION` in defaults.ts,
 * append a new function to `migrations` array, and write a unit test
 * pinning the transform on a fixture.
 */

type ScenarioMigration = (input: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, ScenarioMigration> = {
  /**
   * v1 → v2: adds `ownerId: null` so future cloud-sync code can
   * discriminate between local-only scenarios (null) and synced ones.
   * Existing data is always local, so null is the right default.
   */
  1: (input) => ({
    ...input,
    ownerId: null,
    version: 2,
  }),
  /**
   * v2 → v3: adds `assumptions.taxRateOverride: null` so the new
   * manual tax-rate override field is explicit on every scenario.
   * Null = "off, use calculator's estimate" — the existing behavior
   * for everyone before this migration.
   */
  2: (input) => {
    const assumptions =
      typeof input.assumptions === "object" && input.assumptions !== null
        ? (input.assumptions as Record<string, unknown>)
        : {};
    return {
      ...input,
      assumptions: {
        ...assumptions,
        taxRateOverride: null,
      },
      version: 3,
    };
  },
  /**
   * v3 → v4: adds optional `meta` field for AI-feature provenance
   * (source, raw text, assumptions log). Legacy scenarios have no
   * provenance to record, so `meta` is left undefined — AI-generated
   * scenarios (chat edits, description extraction) populate it
   * explicitly when they're built.
   */
  3: (input) => ({
    ...input,
    version: 4,
  }),
};

export function runScenarioMigrations(
  input: Record<string, unknown>,
): Record<string, unknown> | null {
  const inputVersion = typeof input.version === "number" ? input.version : 1;

  // Refuse forward-versioned data — a v3 scenario opened in a v2 app
  // could silently drop fields or run bad math. Caller should treat
  // null as "fall back to default + notify user."
  if (inputVersion > APP_VERSION) return null;

  let state: Record<string, unknown> = { ...input };
  let version = inputVersion;

  while (version < APP_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      // Gap in the migration chain — bug. Log and refuse to silently
      // corrupt data.
      if (typeof console !== "undefined") {
        console.warn(
          `[scenario migration] no handler for v${version} → v${version + 1}; refusing to load`,
        );
      }
      return null;
    }
    state = migrate(state);
    version += 1;
  }

  return state;
}

/**
 * Test-only helper: given a current-version scenario, strip fields
 * added in versions > target to simulate an older scenario. Used by
 * the migration tests to round-trip new → old → new and assert
 * equivalence.
 */
export function downgradeScenarioForTest(
  scenario: Scenario,
  targetVersion: number,
): Record<string, unknown> {
  const { ...copy } = scenario as unknown as Record<string, unknown>;
  // Strip fields added in versions strictly newer than the target.
  if (targetVersion < 4) {
    delete copy.meta;
  }
  if (
    targetVersion < 3 &&
    typeof copy.assumptions === "object" &&
    copy.assumptions !== null
  ) {
    const assumptions = {
      ...(copy.assumptions as Record<string, unknown>),
    };
    delete assumptions.taxRateOverride;
    copy.assumptions = assumptions;
  }
  if (targetVersion < 2) {
    delete copy.ownerId;
  }
  copy.version = targetVersion;
  return copy;
}
