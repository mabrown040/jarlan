import { calculateQuickFireSummary } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

/* ── Parameter system ── */

export type ParamType = "currency" | "currency_signed" | "percent" | "years" | "return" | "age";

export interface DecisionParam {
  id: string;
  label: string;
  type: ParamType;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/* ── Decision template ── */

export interface LifeDecisionTemplate {
  id: string;
  emoji: string;
  category: string;
  labelTemplate: string;
  descriptionTemplate: string;
  /** Examples of what this covers */
  examples: string[];
  params: DecisionParam[];
  apply: (scenario: Scenario, values: Record<string, number>) => Scenario;
  /** Determine direction dynamically based on param values */
  getDirection: (values: Record<string, number>) => "positive" | "negative" | "neutral";
}

/* ── Resolved decision ── */

export interface LifeDecision {
  id: string;
  emoji: string;
  category: string;
  label: string;
  description: string;
  examples: string[];
  direction: "positive" | "negative" | "neutral";
  template: LifeDecisionTemplate;
  values: Record<string, number>;
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

/* ── 6 Consolidated Templates ── */

export function buildDecisionTemplates(scenario: Scenario): LifeDecisionTemplate[] {
  const income = scenario.annualIncome;
  const expenses = scenario.annualExpenses;
  const age = scenario.profile.age;
  const retAge = scenario.profile.retirementAge ?? age + 15;

  return [
    /* ── 1. Income Change ── */
    {
      id: "income-change",
      emoji: "\u{1F4BC}",
      category: "Income",
      labelTemplate: "Income changes by {amount}/yr at age {startAge}",
      descriptionTemplate: "{amount}/yr starting at age {startAge}",
      examples: ["Raise", "Pay cut", "New job", "Lose a client", "Promotion"],
      params: [
        { id: "amount", label: "Annual change", type: "currency_signed", min: -100_000, max: 200_000, step: 5000, defaultValue: Math.round(income * 0.05 / 1000) * 1000 || 15_000 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 30, step: 1, defaultValue: age },
      ],
      getDirection: (v) => v.amount > 0 ? "positive" : v.amount < 0 ? "negative" : "neutral",
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualIncome = Math.max(next.annualIncome + v.amount, 0);
          next.annualSavings = Math.max(next.annualSavings + v.amount, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(
              next.accounts[0].annualContribution + v.amount, 0,
            );
          }
        } else {
          next.cashFlows.push({
            id: `income-${Date.now()}`,
            name: v.amount >= 0 ? "Income increase" : "Income decrease",
            type: v.amount >= 0 ? "income" : "expense",
            amount: Math.abs(v.amount),
            startAge: v.startAge,
            endAge: null,
            inflationAdjusted: true,
            taxable: true,
          });
        }
        return next;
      },
    },

    /* ── 2. Lifestyle Change ── */
    {
      id: "lifestyle-change",
      emoji: "\u{1F3E0}",
      category: "Expenses",
      labelTemplate: "Spending changes by {amount}/yr at age {startAge}",
      descriptionTemplate: "{amount}/yr in expenses starting at age {startAge}",
      examples: ["Move cheaper", "Downsize", "Lifestyle upgrade", "Pay off debt", "New hobby"],
      params: [
        { id: "amount", label: "Annual change", type: "currency_signed", min: -50_000, max: 50_000, step: 1000, defaultValue: Math.round(expenses * -0.2 / 1000) * 1000 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 30, step: 1, defaultValue: age },
      ],
      getDirection: (v) => v.amount < 0 ? "positive" : v.amount > 0 ? "negative" : "neutral",
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualExpenses = Math.max(next.annualExpenses + v.amount, 0);
          next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
          next.annualSavings = Math.max(next.annualSavings - v.amount, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(
              next.accounts[0].annualContribution - v.amount, 0,
            );
          }
        } else {
          next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
          if (v.amount > 0) {
            next.cashFlows.push({
              id: `lifestyle-${Date.now()}`,
              name: "Expense increase",
              type: "expense",
              amount: v.amount,
              startAge: v.startAge,
              endAge: null,
              inflationAdjusted: true,
              taxable: false,
            });
          }
        }
        return next;
      },
    },

    /* ── 3. New Dependent ── */
    {
      id: "new-dependent",
      emoji: "\u{1F476}",
      category: "Expenses",
      labelTemplate: "New dependent: {cost}/yr for {duration} at age {startAge}",
      descriptionTemplate: "+{cost}/yr for {duration} starting at age {startAge}",
      examples: ["Child", "Aging parent", "Supporting a partner", "Pet"],
      params: [
        { id: "cost", label: "Annual cost", type: "currency", min: 2000, max: 60_000, step: 1000, defaultValue: Math.round(expenses * 0.18 / 1000) * 1000 || 18_000 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 20, step: 1, defaultValue: age + 1 },
        { id: "duration", label: "Duration", type: "years", min: 1, max: 30, step: 1, defaultValue: 18 },
      ],
      getDirection: () => "negative",
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualExpenses += v.cost;
          next.annualSavings = Math.max(next.annualSavings - v.cost, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(
              next.accounts[0].annualContribution - v.cost, 0,
            );
          }
        }
        next.cashFlows.push({
          id: `dependent-${Date.now()}`,
          name: "Dependent expenses",
          type: "expense",
          amount: v.cost,
          startAge: Math.max(v.startAge, s.profile.age),
          endAge: v.startAge + v.duration,
          inflationAdjusted: true,
          taxable: false,
        });
        return next;
      },
    },

    /* ── 4. Portfolio Event ── */
    {
      id: "portfolio-event",
      emoji: "\u{1F4B0}",
      category: "Portfolio",
      labelTemplate: "{amount} at age {atAge}",
      descriptionTemplate: "One-time {amount} portfolio event at age {atAge}",
      examples: ["Inheritance", "Home purchase", "Sell a business", "Legal settlement", "Insurance payout", "Gift"],
      params: [
        { id: "amount", label: "Amount", type: "currency_signed", min: -500_000, max: 2_000_000, step: 10_000, defaultValue: 100_000 },
        { id: "atAge", label: "At age", type: "age", min: age, max: age + 40, step: 1, defaultValue: age },
      ],
      getDirection: (v) => v.amount > 0 ? "positive" : v.amount < 0 ? "negative" : "neutral",
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.atAge <= s.profile.age) {
          if (next.accounts[0]) {
            next.accounts[0].currentBalance = Math.max(
              next.accounts[0].currentBalance + v.amount, 0,
            );
          }
        } else {
          next.cashFlows.push({
            id: `portfolio-${Date.now()}`,
            name: v.amount >= 0 ? "Windfall" : "Major expense",
            type: v.amount >= 0 ? "income" : "expense",
            amount: Math.abs(v.amount),
            startAge: v.atAge,
            endAge: v.atAge + 1,
            inflationAdjusted: false,
            taxable: v.amount > 0,
          });
        }
        return next;
      },
    },

    /* ── 5. Career Break ── */
    {
      id: "career-break",
      emoji: "\u{2708}\u{FE0F}",
      category: "Income",
      labelTemplate: "Take {duration} off at age {startAge}",
      descriptionTemplate: "{duration} with no income starting at age {startAge}",
      examples: ["Sabbatical", "Parental leave", "Health recovery", "Travel year", "Grad school"],
      params: [
        { id: "duration", label: "Time off", type: "years", min: 0.25, max: 5, step: 0.25, defaultValue: 1 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
      ],
      getDirection: () => "negative",
      apply: (s, v) => {
        const next = cloneScenario(s);
        const annualCost = s.annualExpenses;
        if (v.startAge <= s.profile.age) {
          // Immediate: deduct the full cost from portfolio
          const cost = Math.round(annualCost * v.duration);
          if (next.accounts[0]) {
            next.accounts[0].currentBalance = Math.max(
              next.accounts[0].currentBalance - cost, 0,
            );
          }
        } else {
          // Future: model as expense + lost savings
          next.cashFlows.push({
            id: `break-expense-${Date.now()}`,
            name: "Career break living costs",
            type: "expense",
            amount: annualCost,
            startAge: v.startAge,
            endAge: v.startAge + v.duration,
            inflationAdjusted: true,
            taxable: false,
          });
        }
        return next;
      },
    },

    /* ── 6. Market Outlook ── */
    {
      id: "market-outlook",
      emoji: "\u{1F4C8}",
      category: "Market",
      labelTemplate: "Returns at {returnRate}, inflation at {inflation}",
      descriptionTemplate: "Adjust market assumptions: {returnRate} real return, {inflation} inflation",
      examples: ["Bull market", "Bear market", "Stagflation", "Golden era", "Lost decade"],
      params: [
        { id: "returnRate", label: "Real return", type: "return", min: 0.02, max: 0.12, step: 0.005, defaultValue: scenario.assumptions.expectedRealReturn },
        { id: "inflation", label: "Inflation", type: "return", min: 0.01, max: 0.08, step: 0.005, defaultValue: scenario.assumptions.inflation },
      ],
      getDirection: (v) => {
        const baseReturn = scenario.assumptions.expectedRealReturn;
        return v.returnRate > baseReturn ? "positive" : v.returnRate < baseReturn ? "negative" : "neutral";
      },
      apply: (s, v) => {
        const next = cloneScenario(s);
        next.assumptions.expectedRealReturn = v.returnRate;
        next.assumptions.inflation = v.inflation;
        return next;
      },
    },
  ];
}

/* ── Resolve template + values → LifeDecision ── */

export function resolveDecision(
  template: LifeDecisionTemplate,
  values: Record<string, number>,
): LifeDecision {
  return {
    id: template.id,
    emoji: template.emoji,
    category: template.category,
    label: interpolate(template.labelTemplate, template.params, values),
    description: interpolate(template.descriptionTemplate, template.params, values),
    examples: template.examples,
    direction: template.getDirection(values),
    template,
    values,
    apply: (scenario) => template.apply(scenario, values),
  };
}

/* ── Build with defaults ── */

export function buildLifeDecisions(scenario: Scenario): LifeDecision[] {
  return buildDecisionTemplates(scenario).map((template) => {
    const defaults: Record<string, number> = {};
    for (const param of template.params) {
      defaults[param.id] = param.defaultValue;
    }
    return resolveDecision(template, defaults);
  });
}

/* ── Evaluate all ── */

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

/* ── Evaluate single ── */

export function evaluateSingleDecision(
  scenario: Scenario,
  decision: LifeDecision,
): LifeDecisionResult {
  const baseSummary = calculateQuickFireSummary(scenario);
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
}

/* ── Helpers ── */

function interpolate(
  template: string,
  params: DecisionParam[],
  values: Record<string, number>,
): string {
  let result = template;
  for (const param of params) {
    const val = values[param.id] ?? param.defaultValue;
    let formatted: string;

    switch (param.type) {
      case "currency":
        formatted = formatK(val);
        break;
      case "currency_signed":
        formatted = (val >= 0 ? "+" : "") + formatK(val);
        break;
      case "percent":
        formatted = `${Math.round(val * 100)}%`;
        break;
      case "years":
        if (val < 1) formatted = `${Math.round(val * 12)} months`;
        else formatted = val === 1 ? "1 year" : `${val} years`;
        break;
      case "return":
        formatted = `${(val * 100).toFixed(1)}%`;
        break;
      case "age":
        formatted = String(Math.round(val));
        break;
      default:
        formatted = String(val);
    }

    result = result.replaceAll(`{${param.id}}`, formatted);
  }
  return result;
}

function formatK(n: number): string {
  if (n < 0) return `-${formatK(Math.abs(n))}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}
