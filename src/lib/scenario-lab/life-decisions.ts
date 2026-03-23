import { calculateQuickFireSummary } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

/**
 * Life decision scenarios — real-life choices mapped to financial impact.
 * Each decision modifies the scenario in a specific way and computes
 * the delta on FIRE number and years to FI.
 */

export interface LifeDecision {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Whether this scenario accelerates (+) or delays (-) FIRE */
  direction: "positive" | "negative" | "mixed";
  /** Apply this decision to a scenario and return the modified version */
  apply: (scenario: Scenario) => Scenario;
}

export interface LifeDecisionResult {
  decision: LifeDecision;
  baseYearsToFi: number | null;
  newYearsToFi: number | null;
  deltaYears: number;
  baseFireNumber: number;
  newFireNumber: number;
  deltaFireNumber: number;
}

/**
 * Build the list of life decisions personalized to the user's scenario.
 * Some amounts scale with income/spending for relevance.
 */
export function buildLifeDecisions(scenario: Scenario): LifeDecision[] {
  const income = scenario.annualIncome;
  const expenses = scenario.annualExpenses;
  const raiseAmount = Math.round(income * 0.05 / 1000) * 1000 || 15_000; // ~5% raise
  const sideHustleAmount = 12_000;
  const childCost = Math.round(expenses * 0.18 / 1000) * 1000 || 18_000;
  const moveDiscount = Math.round(expenses * 0.20 / 1000) * 1000;

  return [
    {
      id: "raise",
      label: `Get a ${formatK(raiseAmount)} raise`,
      emoji: "\u{1F4B0}",
      description: `+${formatK(raiseAmount)}/yr income, same spending`,
      direction: "positive",
      apply: (s) => {
        const next = cloneScenario(s);
        next.annualIncome += raiseAmount;
        next.annualSavings += raiseAmount;
        if (next.accounts[0]) next.accounts[0].annualContribution += raiseAmount;
        return next;
      },
    },
    {
      id: "side-hustle",
      label: "Start a side hustle",
      emoji: "\u{1F680}",
      description: `+$${(sideHustleAmount / 1000).toFixed(0)}K/yr savings`,
      direction: "positive",
      apply: (s) => {
        const next = cloneScenario(s);
        next.annualSavings += sideHustleAmount;
        if (next.accounts[0]) next.accounts[0].annualContribution += sideHustleAmount;
        return next;
      },
    },
    {
      id: "move-cheaper",
      label: "Move somewhere 20% cheaper",
      emoji: "\u{1F3E0}",
      description: `-${formatK(moveDiscount)}/yr expenses`,
      direction: "positive",
      apply: (s) => {
        const next = cloneScenario(s);
        next.annualExpenses = Math.max(next.annualExpenses - moveDiscount, 0);
        next.retirementExpenses = Math.max(next.retirementExpenses - moveDiscount, 0);
        next.annualSavings += moveDiscount;
        if (next.accounts[0]) next.accounts[0].annualContribution += moveDiscount;
        return next;
      },
    },
    {
      id: "market-drop",
      label: "Market returns drop to 5%",
      emoji: "\u{1F4C9}",
      description: "Lower real return assumption",
      direction: "negative",
      apply: (s) => {
        const next = cloneScenario(s);
        next.assumptions.expectedRealReturn = 0.05;
        return next;
      },
    },
    {
      id: "child",
      label: "Have a child",
      emoji: "\u{1F476}",
      description: `+${formatK(childCost)}/yr expenses`,
      direction: "negative",
      apply: (s) => {
        const next = cloneScenario(s);
        next.annualExpenses += childCost;
        next.retirementExpenses += childCost;
        next.annualSavings = Math.max(next.annualSavings - childCost, 0);
        if (next.accounts[0]) {
          next.accounts[0].annualContribution = Math.max(next.accounts[0].annualContribution - childCost, 0);
        }
        return next;
      },
    },
    {
      id: "inherit",
      label: "Receive $100K inheritance",
      emoji: "\u{1F381}",
      description: "+$100K one-time to portfolio",
      direction: "positive",
      apply: (s) => {
        const next = cloneScenario(s);
        if (next.accounts[0]) next.accounts[0].currentBalance += 100_000;
        return next;
      },
    },
    {
      id: "sabbatical",
      label: "Take a sabbatical year",
      emoji: "\u{2708}\u{FE0F}",
      description: "1 year of $0 savings",
      direction: "negative",
      apply: (s) => {
        const next = cloneScenario(s);
        // Model as: lose one year of savings, but don't change ongoing rate
        // Reduce portfolio by one year's worth of expenses (net cost of the year off)
        if (next.accounts[0]) {
          next.accounts[0].currentBalance = Math.max(
            next.accounts[0].currentBalance - next.annualExpenses,
            0,
          );
        }
        return next;
      },
    },
    {
      id: "downshift",
      label: "Cut spending by 10%",
      emoji: "\u{2702}\u{FE0F}",
      description: `Save ${formatK(Math.round(expenses * 0.1 / 1000) * 1000)} more per year`,
      direction: "positive",
      apply: (s) => {
        const cut = Math.round(s.annualExpenses * 0.1 / 1000) * 1000;
        const next = cloneScenario(s);
        next.annualExpenses = Math.max(next.annualExpenses - cut, 0);
        next.retirementExpenses = Math.max(next.retirementExpenses - cut, 0);
        next.annualSavings += cut;
        if (next.accounts[0]) next.accounts[0].annualContribution += cut;
        return next;
      },
    },
  ];
}

/**
 * Compute the impact of each life decision on the user's scenario.
 */
export function evaluateLifeDecisions(scenario: Scenario): LifeDecisionResult[] {
  const baseSummary = calculateQuickFireSummary(scenario);
  const decisions = buildLifeDecisions(scenario);

  return decisions.map((decision) => {
    const modified = decision.apply(scenario);
    const newSummary = calculateQuickFireSummary(modified);

    return {
      decision,
      baseYearsToFi: baseSummary.yearsToFi,
      newYearsToFi: newSummary.yearsToFi,
      deltaYears: (baseSummary.yearsToFi ?? Infinity) - (newSummary.yearsToFi ?? Infinity),
      baseFireNumber: baseSummary.fireNumber,
      newFireNumber: newSummary.fireNumber,
      deltaFireNumber: newSummary.fireNumber - baseSummary.fireNumber,
    };
  });
}

function formatK(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}
