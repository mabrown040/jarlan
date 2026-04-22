import { describe, expect, it } from "vitest";

import { calculateFireTypeSummaries, calculateQuickFireSummary } from "@/lib/calc";
import { createDefaultScenario } from "@/lib/domain";

/**
 * These are regression-budget tests, NOT hard latency guarantees.
 * They catch catastrophic slowdowns (e.g. accidentally introducing
 * an O(n²) algorithm) — not pixel-precise perf tuning.
 *
 * Budgets intentionally generous to accommodate shared-runner noise
 * (laptop under load, CI containers, etc). If something here fails,
 * it's a real 3–5x regression worth investigating.
 */
describe("calculator performance budgets", () => {
  it("keeps quick-fire summaries comfortably under interactive budgets", () => {
    const scenario = createDefaultScenario();
    const start = performance.now();

    for (let index = 0; index < 1_000; index += 1) {
      calculateQuickFireSummary(scenario);
    }

    const elapsed = performance.now() - start;
    // 300ms for 1000 runs = 0.3ms/call — slack for GC + dev-machine
    // noise. Interactive input → <200ms p50 in practice.
    expect(elapsed).toBeLessThan(300);
  });

  it("keeps fire-type aggregation lightweight", () => {
    const scenario = createDefaultScenario();
    const start = performance.now();

    for (let index = 0; index < 1_000; index += 1) {
      calculateFireTypeSummaries(scenario);
    }

    const elapsed = performance.now() - start;
    // fire-type aggregation runs calculateQuickFireSummary 5 times
    // (one per FIRE type), so ~5x the single-summary budget. Extra
    // headroom because this test runs after the quick-fire budget
    // already tested the inner loop — we're guarding for algorithmic
    // regressions, not microseconds.
    expect(elapsed).toBeLessThan(1200);
  });
});
