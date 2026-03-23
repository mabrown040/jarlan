import { describe, expect, it } from "vitest";

import {
  DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
  buildScenarioFromQuizAnswers,
  getFireTypeRecommendation,
} from "@/lib/quiz/fire-type-quiz";

describe("fire type quiz", () => {
  it("recommends Coast FIRE when the current portfolio clears the coast target", () => {
    const recommendation = getFireTypeRecommendation({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      currentAge: 30,
      targetFiAge: 50,
      annualSpending: 60_000,
      currentPortfolio: 600_000,
      partTimePreference: "no",
      priority: "balanced_life",
    });

    expect(recommendation.id).toBe("coast");
    expect(recommendation.coastTargetToday).toBeLessThan(600_000);
  });

  it("recommends Barista FIRE when open to part-time work", () => {
    const recommendation = getFireTypeRecommendation({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      annualSpending: 64_000,
      currentPortfolio: 100_000,
      partTimePreference: "yes",
    });

    expect(recommendation.id).toBe("barista");
  });

  it("recommends Lean FIRE for high flexibility + speed priority", () => {
    const recommendation = getFireTypeRecommendation({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      flexibility: "high",
      priority: "freedom_fast",
      partTimePreference: "no",
    });

    expect(recommendation.id).toBe("lean");
  });

  it("recommends Fat FIRE for premium lifestyle priority", () => {
    const recommendation = getFireTypeRecommendation({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      priority: "premium_lifestyle",
      partTimePreference: "no",
    });

    expect(recommendation.id).toBe("fat");
  });

  it("defaults to Traditional FIRE for balanced answers", () => {
    const recommendation = getFireTypeRecommendation({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      partTimePreference: "no",
      priority: "balanced_life",
      flexibility: "medium",
    });

    expect(recommendation.id).toBe("traditional");
  });

  it("builds a scenario that carries the suggested part-time income", () => {
    const scenario = buildScenarioFromQuizAnswers({
      ...DEFAULT_FIRE_TYPE_QUIZ_ANSWERS,
      partTimePreference: "yes",
      currentPortfolio: 250_000,
    });

    expect(scenario.assumptions.partTimeIncome).toBe(20_000);
    expect(scenario.accounts[0]?.currentBalance).toBe(250_000);
  });
});
