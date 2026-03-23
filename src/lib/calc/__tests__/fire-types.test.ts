import { describe, expect, it } from "vitest";

import { calculateFireTypeSummaries, calculateQuickFireSummary } from "@/lib/calc";
import { createDefaultScenario } from "@/lib/domain";

describe("fire type summaries", () => {
  it("generates all 5 fire type cards", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);

    expect(summaries).toHaveLength(5);
    expect(summaries.map((item) => item.id)).toEqual([
      "traditional",
      "lean",
      "fat",
      "coast",
      "barista",
    ]);
  });

  it("lean target is less than traditional and fat is more", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const traditional = summaries.find((item) => item.id === "traditional");
    const lean = summaries.find((item) => item.id === "lean");
    const fat = summaries.find((item) => item.id === "fat");

    expect(lean?.target).toBeLessThan(traditional?.target ?? 0);
    expect(fat?.target).toBeGreaterThan(traditional?.target ?? 0);
  });

  it("barista target is less than traditional when part-time income is set", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const quickSummary = calculateQuickFireSummary(scenario);
    const barista = summaries.find((item) => item.id === "barista");

    expect(barista?.target ?? 0).toBeLessThan(quickSummary.fireNumber);
  });

  it("lean is 60% of spending and fat is 150%", () => {
    const scenario = createDefaultScenario();
    const summaries = calculateFireTypeSummaries(scenario);
    const traditional = summaries.find((item) => item.id === "traditional");
    const lean = summaries.find((item) => item.id === "lean");
    const fat = summaries.find((item) => item.id === "fat");

    expect(lean?.target).toBeCloseTo((traditional?.target ?? 0) * 0.6, -2);
    expect(fat?.target).toBeCloseTo((traditional?.target ?? 0) * 1.5, -2);
  });
});
