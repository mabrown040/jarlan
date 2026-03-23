import { expect } from "vitest";

/**
 * A single golden-test result, recorded for the accuracy report.
 */
export interface GoldenTestResult {
  id: string;
  input: Record<string, unknown>;
  expected: number | string;
  actual: number | string;
  tolerance: number;
  methodology: string;
  status: "pass" | "fail";
}

/** Module-level registry — accumulated during a test run. */
const registry: GoldenTestResult[] = [];

/**
 * Pin a metric to a known-correct value.
 *
 * - Runs the assertion (throws on mismatch).
 * - Records the result so the report generator can read it.
 *
 * @example
 * golden("accumulation.fire-number.4pct", {
 *   input: { annualExpenses: 54_000, withdrawalRate: 0.04 },
 *   expected: 1_350_000,
 *   actual: calculateFireNumber(54_000, 0.04),
 *   tolerance: 0,
 *   methodology: "expenses / WR per Bengen (1994)",
 * });
 */
export function golden(
  id: string,
  opts: {
    input: Record<string, unknown>;
    expected: number;
    actual: number;
    tolerance?: number;
    methodology: string;
  },
) {
  const tol = opts.tolerance ?? 0;
  let status: "pass" | "fail" = "pass";

  try {
    if (tol === 0) {
      expect(opts.actual).toBe(opts.expected);
    } else {
      expect(opts.actual).toBeCloseTo(opts.expected, tol);
    }
  } catch (err) {
    status = "fail";
    // Re-throw so Vitest marks the test as failed
    registry.push({
      id,
      input: opts.input,
      expected: opts.expected,
      actual: opts.actual,
      tolerance: tol,
      methodology: opts.methodology,
      status,
    });
    throw err;
  }

  registry.push({
    id,
    input: opts.input,
    expected: opts.expected,
    actual: opts.actual,
    tolerance: tol,
    methodology: opts.methodology,
    status,
  });
}

/**
 * Variant for non-numeric comparisons or range checks.
 * Just records the result — assertion is done inline by the caller.
 */
export function goldenRecord(
  id: string,
  opts: {
    input: Record<string, unknown>;
    expected: string;
    actual: string;
    methodology: string;
    status: "pass" | "fail";
  },
) {
  registry.push({ ...opts, id, tolerance: 0 });
}

/** Read all recorded results (for the report generator). */
export function getGoldenResults(): readonly GoldenTestResult[] {
  return registry;
}
