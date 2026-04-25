/**
 * Maps the AI's flat `ScenarioDraft` extraction into a full `Scenario`
 * by layering the extracted fields on top of `createDefaultScenario()`
 * and synthesizing accounts from the four balance buckets.
 *
 * Pure — no I/O, no side effects, no `Date.now()`. Tested in isolation.
 *
 * The caller (route handler) MUST run the result through
 * `parseScenario()` before persisting or returning it. This module
 * doesn't validate; it constructs.
 */

import { cloneScenario, createDefaultScenario } from "@/lib/domain/defaults";
import type {
  Account,
  AssumptionLog,
  Scenario,
  ScenarioMetaSource,
} from "@/lib/domain/types";

import type { ScenarioDraft } from "./types";

const DEFAULT_ASSET_ALLOCATION = {
  stocks: 0.8,
  bonds: 0.2,
  alternatives: 0,
} as const;

const DEFAULT_EXPENSE_RATIO = 0.001;

// Mirrors the cap on `ScenarioMeta.sourceText` in the Zod schema.
const MAX_SOURCE_TEXT_BYTES = 50_000;

interface BuildScenarioFromExtractionParams {
  draft: ScenarioDraft;
  assumptions: AssumptionLog[];
  sourceText: string;
  sourceTag: ScenarioMetaSource;
  modelId: string;
}

export function buildScenarioFromExtraction(
  params: BuildScenarioFromExtractionParams,
): Scenario {
  const base = cloneScenario(createDefaultScenario());
  const { draft } = params;

  // Profile fields
  if (draft.age !== null) base.profile.age = draft.age;
  if (draft.retirementAge !== null) base.profile.retirementAge = draft.retirementAge;
  if (draft.state !== null) base.profile.state = draft.state;
  if (draft.filingStatus !== null) base.profile.filingStatus = draft.filingStatus;
  if (draft.employmentType !== null) {
    base.profile.employmentType = draft.employmentType;
  }
  if (draft.householdSize !== null) base.profile.householdSize = draft.householdSize;

  // Income / savings / expenses
  if (draft.annualIncome !== null) base.annualIncome = draft.annualIncome;
  if (draft.annualSavings !== null) base.annualSavings = draft.annualSavings;
  if (draft.annualExpenses !== null) {
    base.annualExpenses = draft.annualExpenses;
    // If retirementExpenses wasn't extracted, mirror annualExpenses
    // (the existing default behavior — same value for both phases).
    if (draft.retirementExpenses === null) {
      base.retirementExpenses = draft.annualExpenses;
    }
  }
  if (draft.retirementExpenses !== null) {
    base.retirementExpenses = draft.retirementExpenses;
  }

  // Assumption knobs
  if (draft.withdrawalRate !== null) {
    base.assumptions.withdrawalRate = draft.withdrawalRate;
    // Keep saferWithdrawalRate 0.5pp below user-stated WR, floored at
    // 0.01 (the schema's minimum). This preserves the "safer rate is
    // a little more conservative" relationship without overriding it
    // with a hard default if the user explicitly chose a lower WR.
    base.assumptions.saferWithdrawalRate = Math.max(
      0.01,
      draft.withdrawalRate - 0.005,
    );
  }
  if (draft.expectedRealReturn !== null) {
    base.assumptions.expectedRealReturn = draft.expectedRealReturn;
  }

  // Build accounts from the four balance buckets. If none are
  // populated, keep the default account (placeholder) so the
  // schema's "min(1) account" invariant is preserved.
  const accounts = buildAccountsFromDraft(draft);
  if (accounts.length > 0) {
    if (draft.annualSavings !== null && draft.annualSavings > 0) {
      // Concentrate the contribution in the first account. The user
      // can re-allocate on the review screen.
      accounts[0]!.annualContribution = draft.annualSavings;
    }
    base.accounts = accounts;
  }

  base.meta = {
    source: params.sourceTag,
    sourceText: params.sourceText.slice(0, MAX_SOURCE_TEXT_BYTES),
    assumptionsLog: params.assumptions,
    createdBy: "ai",
    createdByModel: params.modelId,
  };

  // Anything that came from extraction is, by definition, personalized
  // — flip the flag so the UI doesn't surface "you're seeing defaults"
  // banners on a scenario built from the user's own description.
  base.isPersonalized = true;

  return base;
}

function buildAccountsFromDraft(draft: ScenarioDraft): Account[] {
  const accounts: Account[] = [];

  if (
    draft.taxablePortfolio !== null &&
    draft.taxablePortfolio > 0
  ) {
    accounts.push(
      makeAccount("Taxable brokerage", "taxable", draft.taxablePortfolio),
    );
  }

  if (
    draft.traditionalRetirementBalance !== null &&
    draft.traditionalRetirementBalance > 0
  ) {
    accounts.push(
      makeAccount(
        "Traditional 401(k)",
        "traditional_401k",
        draft.traditionalRetirementBalance,
      ),
    );
  }

  if (
    draft.rothRetirementBalance !== null &&
    draft.rothRetirementBalance > 0
  ) {
    accounts.push(
      makeAccount("Roth IRA", "roth_ira", draft.rothRetirementBalance),
    );
  }

  if (draft.hsaBalance !== null && draft.hsaBalance > 0) {
    accounts.push(makeAccount("HSA", "hsa", draft.hsaBalance));
  }

  return accounts;
}

function makeAccount(
  name: string,
  type: Account["type"],
  currentBalance: number,
): Account {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    currentBalance,
    annualContribution: 0,
    assetAllocation: { ...DEFAULT_ASSET_ALLOCATION },
    expenseRatio: DEFAULT_EXPENSE_RATIO,
  };
}
