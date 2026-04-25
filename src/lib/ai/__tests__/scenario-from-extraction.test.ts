import { describe, it, expect } from "vitest";

import { buildScenarioFromExtraction } from "../scenario-from-extraction";
import type { ScenarioDraft } from "../types";
import type { AssumptionLog } from "@/lib/domain/types";
import { parseScenario } from "@/lib/domain/schema";

const EMPTY_DRAFT: ScenarioDraft = {
  age: null,
  retirementAge: null,
  state: null,
  filingStatus: null,
  employmentType: null,
  householdSize: null,
  annualIncome: null,
  annualSavings: null,
  annualExpenses: null,
  retirementExpenses: null,
  taxablePortfolio: null,
  traditionalRetirementBalance: null,
  rothRetirementBalance: null,
  hsaBalance: null,
  withdrawalRate: null,
  expectedRealReturn: null,
};

const SAMPLE_ASSUMPTIONS: AssumptionLog[] = [
  {
    field: "profile.age",
    value: 35,
    reason: "stated explicitly",
    confidence: "high",
    source: "derived",
  },
];

describe("buildScenarioFromExtraction", () => {
  it("produces a Scenario that passes parseScenario when the draft is empty", () => {
    const result = buildScenarioFromExtraction({
      draft: EMPTY_DRAFT,
      assumptions: [],
      sourceText: "I want to retire someday.",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(parseScenario(result)).not.toBeNull();
    // Falls back to the default account (schema requires min 1)
    expect(result.accounts.length).toBeGreaterThan(0);
  });

  it("applies stated profile and income fields to the base scenario", () => {
    const result = buildScenarioFromExtraction({
      draft: {
        ...EMPTY_DRAFT,
        age: 35,
        retirementAge: 50,
        state: "CA",
        filingStatus: "single",
        employmentType: "w2",
        householdSize: 1,
        annualIncome: 150_000,
        annualSavings: 40_000,
        annualExpenses: 60_000,
      },
      assumptions: SAMPLE_ASSUMPTIONS,
      sourceText: "I'm 35 in California, $150K W-2.",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.profile.age).toBe(35);
    expect(result.profile.retirementAge).toBe(50);
    expect(result.profile.state).toBe("CA");
    expect(result.profile.filingStatus).toBe("single");
    expect(result.profile.employmentType).toBe("w2");
    expect(result.annualIncome).toBe(150_000);
    expect(result.annualSavings).toBe(40_000);
    expect(result.annualExpenses).toBe(60_000);
    // retirementExpenses defaults to annualExpenses when not stated
    expect(result.retirementExpenses).toBe(60_000);
  });

  it("creates one account per non-zero balance bucket", () => {
    const result = buildScenarioFromExtraction({
      draft: {
        ...EMPTY_DRAFT,
        taxablePortfolio: 50_000,
        traditionalRetirementBalance: 200_000,
        rothRetirementBalance: 30_000,
        hsaBalance: 10_000,
      },
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.accounts).toHaveLength(4);
    const types = result.accounts.map((a) => a.type);
    expect(types).toContain("taxable");
    expect(types).toContain("traditional_401k");
    expect(types).toContain("roth_ira");
    expect(types).toContain("hsa");
  });

  it("skips empty balance buckets", () => {
    const result = buildScenarioFromExtraction({
      draft: {
        ...EMPTY_DRAFT,
        taxablePortfolio: 50_000,
        traditionalRetirementBalance: 0, // explicitly zero
        rothRetirementBalance: null, // unknown
        hsaBalance: null,
      },
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.type).toBe("taxable");
  });

  it("concentrates annualSavings as contribution on the first extracted account", () => {
    const result = buildScenarioFromExtraction({
      draft: {
        ...EMPTY_DRAFT,
        taxablePortfolio: 50_000,
        traditionalRetirementBalance: 200_000,
        annualSavings: 30_000,
      },
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.accounts[0]!.annualContribution).toBe(30_000);
    expect(result.accounts[1]!.annualContribution).toBe(0);
  });

  it("populates Scenario.meta with provenance, source text, and assumptions (model entries preserved)", () => {
    const result = buildScenarioFromExtraction({
      draft: { ...EMPTY_DRAFT, age: 35 },
      assumptions: SAMPLE_ASSUMPTIONS,
      sourceText: "I'm 35 years old",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.meta).toBeDefined();
    expect(result.meta!.source).toBe("imported");
    expect(result.meta!.sourceText).toBe("I'm 35 years old");
    expect(result.meta!.createdBy).toBe("ai");
    expect(result.meta!.createdByModel).toBe("claude-opus-4-7");
    // The model's assumption entries are preserved in the log,
    // alongside the server-side default-source entries (those are
    // tested separately).
    expect(result.meta!.assumptionsLog).toEqual(
      expect.arrayContaining(SAMPLE_ASSUMPTIONS),
    );
  });

  it("appends default-source assumptions for fields the AI did not populate", () => {
    const result = buildScenarioFromExtraction({
      draft: { ...EMPTY_DRAFT, age: 35 },
      assumptions: [],
      sourceText: "I'm 35.",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    const log = result.meta!.assumptionsLog ?? [];
    const defaultEntries = log.filter((a) => a.source === "default");

    // Every null draft field should produce one default entry — except
    // for `age` (which the user provided as 35) and the explicitly
    // skipped fields (employmentType, retirementExpenses).
    const fields = defaultEntries.map((e) => e.field);
    expect(fields).toContain("profile.retirementAge");
    expect(fields).toContain("profile.state");
    expect(fields).toContain("profile.filingStatus");
    expect(fields).toContain("profile.householdSize");
    expect(fields).toContain("annualIncome");
    expect(fields).toContain("annualSavings");
    expect(fields).toContain("annualExpenses");
    expect(fields).toContain("assumptions.withdrawalRate");
    expect(fields).toContain("assumptions.expectedRealReturn");
    expect(fields).toContain("accounts");
    // age was extracted (35) — should NOT have a default entry
    expect(fields).not.toContain("profile.age");
    // Every default entry has confidence "low"
    for (const entry of defaultEntries) {
      expect(entry.confidence).toBe("low");
    }
  });

  it("does not log a default for a field the AI populated", () => {
    const result = buildScenarioFromExtraction({
      draft: {
        ...EMPTY_DRAFT,
        age: 35,
        state: "CA",
        annualIncome: 150_000,
        withdrawalRate: 0.04,
      },
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    const fields = (result.meta!.assumptionsLog ?? [])
      .filter((a) => a.source === "default")
      .map((e) => e.field);

    expect(fields).not.toContain("profile.age");
    expect(fields).not.toContain("profile.state");
    expect(fields).not.toContain("annualIncome");
    expect(fields).not.toContain("assumptions.withdrawalRate");
  });

  it("does not flag accounts as default when at least one balance bucket was extracted", () => {
    const result = buildScenarioFromExtraction({
      draft: { ...EMPTY_DRAFT, taxablePortfolio: 50_000 },
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    const accountsEntry = (result.meta!.assumptionsLog ?? []).find(
      (a) => a.field === "accounts" && a.source === "default",
    );
    expect(accountsEntry).toBeUndefined();
  });

  it("caps oversized sourceText at 50KB to match the schema", () => {
    const huge = "a".repeat(60_000);
    const result = buildScenarioFromExtraction({
      draft: EMPTY_DRAFT,
      assumptions: [],
      sourceText: huge,
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.meta!.sourceText!.length).toBe(50_000);
  });

  it("derives saferWithdrawalRate as 0.5pp below an extracted withdrawalRate", () => {
    const result = buildScenarioFromExtraction({
      draft: { ...EMPTY_DRAFT, withdrawalRate: 0.04 },
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.assumptions.withdrawalRate).toBe(0.04);
    expect(result.assumptions.saferWithdrawalRate).toBeCloseTo(0.035, 4);
  });

  it("flags the result as personalized so default-mode banners stay hidden", () => {
    const result = buildScenarioFromExtraction({
      draft: EMPTY_DRAFT,
      assumptions: [],
      sourceText: "...",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    expect(result.isPersonalized).toBe(true);
  });

  it("scenarios with extracted fields round-trip through parseScenario cleanly", () => {
    const result = buildScenarioFromExtraction({
      draft: {
        ...EMPTY_DRAFT,
        age: 35,
        retirementAge: 50,
        state: "CA",
        annualIncome: 150_000,
        annualExpenses: 60_000,
        taxablePortfolio: 50_000,
        traditionalRetirementBalance: 200_000,
        withdrawalRate: 0.04,
      },
      assumptions: SAMPLE_ASSUMPTIONS,
      sourceText: "I'm 35 in CA, make $150K, save $40K, spend $60K. $250K invested.",
      sourceTag: "imported",
      modelId: "claude-opus-4-7",
    });

    const parsed = parseScenario(result);
    expect(parsed).not.toBeNull();
    expect(parsed!.profile.age).toBe(35);
    expect(parsed!.meta!.source).toBe("imported");
  });
});
