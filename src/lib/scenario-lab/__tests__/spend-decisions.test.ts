import { describe, expect, it } from "vitest";

import { getCurrentPortfolioBalance } from "@/lib/calc";
import { createDefaultScenario } from "@/lib/domain";
import {
  buildScenarioForStartingPortfolio,
  resolveScenarioStartingPortfolio,
} from "@/lib/scenario-lab/spend-analysis";
import {
  buildSpendDecisionTemplates,
  resolveSpendDecision,
} from "@/lib/scenario-lab/spend-decisions";

describe("spend what-if decisions", () => {
  it("changes retirement spending without mutating working-year expenses", () => {
    const scenario = createDefaultScenario();
    const template = buildSpendDecisionTemplates(scenario).find(
      (decision) => decision.id === "retirement-spending",
    );

    expect(template).toBeDefined();

    const decision = resolveSpendDecision(
      template!,
      { amount: -6_000 },
      scenario,
    );
    const nextScenario = decision.apply(scenario);

    expect(decision.direction).toBe("positive");
    expect(nextScenario.retirementExpenses).toBe(scenario.retirementExpenses - 6_000);
    expect(nextScenario.annualExpenses).toBe(scenario.annualExpenses);
  });

  it("delays retirement and shortens the funded retirement horizon", () => {
    const scenario = createDefaultScenario();
    const template = buildSpendDecisionTemplates(scenario).find(
      (decision) => decision.id === "retirement-timing",
    );

    expect(template).toBeDefined();

    const decision = resolveSpendDecision(template!, { years: 2 }, scenario);
    const nextScenario = decision.apply(scenario);

    expect(nextScenario.profile.retirementAge).toBe(
      (scenario.profile.retirementAge ?? scenario.profile.age) + 2,
    );
    expect(nextScenario.simulationSettings.retirementDuration).toBe(
      scenario.simulationSettings.retirementDuration - 2,
    );
  });

  it("adds bridge income on top of the baseline assumptions", () => {
    const scenario = createDefaultScenario();
    scenario.assumptions.partTimeIncome = 5_000;
    scenario.assumptions.partTimeIncomeDuration = 2;

    const template = buildSpendDecisionTemplates(scenario).find(
      (decision) => decision.id === "bridge-income",
    );

    expect(template).toBeDefined();

    const decision = resolveSpendDecision(
      template!,
      { amount: 12_000, duration: 4 },
      scenario,
    );
    const nextScenario = decision.apply(scenario);

    expect(nextScenario.assumptions.partTimeIncome).toBe(17_000);
    expect(nextScenario.assumptions.partTimeIncomeDuration).toBe(4);
  });

  it("switches the scenario to guardrails when selected", () => {
    const scenario = createDefaultScenario();
    scenario.withdrawalStrategy.type = "fixed";

    const template = buildSpendDecisionTemplates(scenario).find(
      (decision) => decision.id === "guardrails-strategy",
    );

    expect(template).toBeDefined();

    const decision = resolveSpendDecision(template!, {}, scenario);
    const nextScenario = decision.apply(scenario);

    expect(decision.direction).toBe("positive");
    expect(nextScenario.withdrawalStrategy.type).toBe("guyton_klinger");
    expect(nextScenario.withdrawalStrategy.gkParams).toEqual({
      guardrailWidth: 0.2,
      adjustmentSize: 0.1,
      suspendCapPreservationYears: 15,
    });
  });

  it("treats a lower ending-wealth target as a positive durability lever", () => {
    const scenario = createDefaultScenario();
    scenario.simulationSettings.finalValueTarget = 1;

    const template = buildSpendDecisionTemplates(scenario).find(
      (decision) => decision.id === "legacy-target",
    );

    expect(template).toBeDefined();

    const decision = resolveSpendDecision(template!, { target: 0.25 }, scenario);
    const nextScenario = decision.apply(scenario);

    expect(decision.direction).toBe("positive");
    expect(nextScenario.simulationSettings.finalValueTarget).toBe(0.25);
  });
});

describe("spend what-if portfolio helpers", () => {
  it("projects the current path balance to retirement", () => {
    const scenario = createDefaultScenario();
    const currentPortfolio = getCurrentPortfolioBalance(scenario.accounts);
    const projectedPortfolio = resolveScenarioStartingPortfolio(
      scenario,
      "current-path",
    );

    expect(projectedPortfolio).toBeGreaterThan(currentPortfolio);
  });

  it("rescales account balances to a target starting portfolio", () => {
    const scenario = createDefaultScenario();
    const nextScenario = buildScenarioForStartingPortfolio(scenario, 1_500_000);

    expect(getCurrentPortfolioBalance(nextScenario.accounts)).toBe(1_500_000);
  });
});
