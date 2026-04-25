import { describe, it, expect } from "vitest";

import { calculateCallCostUsd } from "../audit";

describe("calculateCallCostUsd", () => {
  it("computes cost for claude-opus-4-7 input + output at published rates", () => {
    // 1M input @ $5/M + 1M output @ $25/M = $30
    expect(
      calculateCallCostUsd({
        model: "claude-opus-4-7",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBeCloseTo(30, 6);
  });

  it("applies the 0.1x cache-read multiplier", () => {
    // 1M cache reads on opus-4-7 @ 0.1× $5/M = $0.50
    expect(
      calculateCallCostUsd({
        model: "claude-opus-4-7",
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 1_000_000,
        cacheWriteTokens: 0,
      }),
    ).toBeCloseTo(0.5, 6);
  });

  it("applies the 1.25x cache-write multiplier (5-min TTL)", () => {
    // 1M cache writes on opus-4-7 @ 1.25× $5/M = $6.25
    expect(
      calculateCallCostUsd({
        model: "claude-opus-4-7",
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 1_000_000,
      }),
    ).toBeCloseTo(6.25, 6);
  });

  it("uses sonnet-4-6 rates ($3 input, $15 output)", () => {
    expect(
      calculateCallCostUsd({
        model: "claude-sonnet-4-6",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBeCloseTo(18, 6);
  });

  it("uses haiku-4-5 rates ($1 input, $5 output)", () => {
    expect(
      calculateCallCostUsd({
        model: "claude-haiku-4-5",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBeCloseTo(6, 6);
  });

  it("returns 0 for unknown models without throwing", () => {
    // Unknown model means the audit row still gets logged; cost
    // shows 0 until the rates table is updated.
    expect(
      calculateCallCostUsd({
        model: "gpt-99",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBe(0);
  });

  it("computes a realistic mixed-token call", () => {
    // Realistic extraction call: ~3K input, ~500 output, no cache
    // Expected: 3K/1M × $5 + 500/1M × $25 = $0.015 + $0.0125 = $0.0275
    expect(
      calculateCallCostUsd({
        model: "claude-opus-4-7",
        inputTokens: 3000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).toBeCloseTo(0.0275, 6);
  });
});
