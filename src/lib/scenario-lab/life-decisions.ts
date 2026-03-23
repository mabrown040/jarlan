import { calculateQuickFireSummary } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

/* ── Parameter system ── */

export type ParamType = "currency" | "percent" | "years" | "return";

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
  /** Template label — use {paramId} for interpolation */
  labelTemplate: string;
  /** Template description — use {paramId} for interpolation */
  descriptionTemplate: string;
  direction: "positive" | "negative" | "mixed";
  params: DecisionParam[];
  /** Apply this decision with given param values to a scenario */
  apply: (scenario: Scenario, values: Record<string, number>) => Scenario;
}

/* ── Resolved decision (template + current param values) ── */

export interface LifeDecision {
  id: string;
  emoji: string;
  label: string;
  description: string;
  direction: "positive" | "negative" | "mixed";
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

/* ── Template definitions ── */

export function buildDecisionTemplates(scenario: Scenario): LifeDecisionTemplate[] {
  const income = scenario.annualIncome;
  const expenses = scenario.annualExpenses;

  return [
    {
      id: "raise",
      emoji: "\u{1F4B0}",
      labelTemplate: "Get a {amount} raise",
      descriptionTemplate: "+{amount}/yr income, same spending",
      direction: "positive",
      params: [
        { id: "amount", label: "Raise amount", type: "currency", min: 1000, max: 200_000, step: 1000, defaultValue: Math.round(income * 0.05 / 1000) * 1000 || 15_000 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        next.annualIncome += v.amount;
        next.annualSavings += v.amount;
        if (next.accounts[0]) next.accounts[0].annualContribution += v.amount;
        return next;
      },
    },
    {
      id: "side-hustle",
      emoji: "\u{1F680}",
      labelTemplate: "Earn {amount}/yr side income",
      descriptionTemplate: "+{amount}/yr added to savings",
      direction: "positive",
      params: [
        { id: "amount", label: "Annual income", type: "currency", min: 1000, max: 100_000, step: 1000, defaultValue: 12_000 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        next.annualSavings += v.amount;
        if (next.accounts[0]) next.accounts[0].annualContribution += v.amount;
        return next;
      },
    },
    {
      id: "move-cheaper",
      emoji: "\u{1F3E0}",
      labelTemplate: "Cut expenses by {percent}",
      descriptionTemplate: "-{savings}/yr expenses by moving or downsizing",
      direction: "positive",
      params: [
        { id: "percent", label: "Expense reduction", type: "percent", min: 0.05, max: 0.50, step: 0.05, defaultValue: 0.20 },
      ],
      apply: (s, v) => {
        const cut = Math.round(s.annualExpenses * v.percent / 1000) * 1000;
        const next = cloneScenario(s);
        next.annualExpenses = Math.max(next.annualExpenses - cut, 0);
        next.retirementExpenses = Math.max(next.retirementExpenses - cut, 0);
        next.annualSavings += cut;
        if (next.accounts[0]) next.accounts[0].annualContribution += cut;
        return next;
      },
    },
    {
      id: "market-change",
      emoji: "\u{1F4C9}",
      labelTemplate: "Market returns at {rate}",
      descriptionTemplate: "Change real return assumption to {rate}",
      direction: "mixed",
      params: [
        { id: "rate", label: "Real return", type: "return", min: 0.02, max: 0.12, step: 0.005, defaultValue: 0.05 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        next.assumptions.expectedRealReturn = v.rate;
        return next;
      },
    },
    {
      id: "child",
      emoji: "\u{1F476}",
      labelTemplate: "Have a child (+{cost}/yr)",
      descriptionTemplate: "+{cost}/yr in additional expenses",
      direction: "negative",
      params: [
        { id: "cost", label: "Annual cost", type: "currency", min: 5000, max: 50_000, step: 1000, defaultValue: Math.round(expenses * 0.18 / 1000) * 1000 || 18_000 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        next.annualExpenses += v.cost;
        next.retirementExpenses += v.cost;
        next.annualSavings = Math.max(next.annualSavings - v.cost, 0);
        if (next.accounts[0]) {
          next.accounts[0].annualContribution = Math.max(next.accounts[0].annualContribution - v.cost, 0);
        }
        return next;
      },
    },
    {
      id: "windfall",
      emoji: "\u{1F381}",
      labelTemplate: "Receive {amount} windfall",
      descriptionTemplate: "+{amount} one-time addition to portfolio",
      direction: "positive",
      params: [
        { id: "amount", label: "Amount", type: "currency", min: 10_000, max: 2_000_000, step: 10_000, defaultValue: 100_000 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (next.accounts[0]) next.accounts[0].currentBalance += v.amount;
        return next;
      },
    },
    {
      id: "sabbatical",
      emoji: "\u{2708}\u{FE0F}",
      labelTemplate: "Take {duration} off work",
      descriptionTemplate: "{duration} of $0 savings + spending from portfolio",
      direction: "negative",
      params: [
        { id: "duration", label: "Time off", type: "years", min: 0.5, max: 5, step: 0.5, defaultValue: 1 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        // Cost = expenses * duration (no income, still spending)
        const cost = Math.round(s.annualExpenses * v.duration);
        if (next.accounts[0]) {
          next.accounts[0].currentBalance = Math.max(next.accounts[0].currentBalance - cost, 0);
        }
        return next;
      },
    },
    {
      id: "spending-change",
      emoji: "\u{2702}\u{FE0F}",
      labelTemplate: "Change spending by {amount}/yr",
      descriptionTemplate: "Adjust annual expenses by {amount}",
      direction: "mixed",
      params: [
        { id: "amount", label: "Annual change", type: "currency", min: -50_000, max: 50_000, step: 1000, defaultValue: Math.round(expenses * -0.1 / 1000) * 1000 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        next.annualExpenses = Math.max(next.annualExpenses + v.amount, 0);
        next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
        next.annualSavings = Math.max(next.annualSavings - v.amount, 0);
        if (next.accounts[0]) {
          next.accounts[0].annualContribution = Math.max(next.accounts[0].annualContribution - v.amount, 0);
        }
        return next;
      },
    },
  ];
}

/* ── Resolve a template + values into a usable LifeDecision ── */

export function resolveDecision(
  template: LifeDecisionTemplate,
  values: Record<string, number>,
): LifeDecision {
  return {
    id: template.id,
    emoji: template.emoji,
    label: interpolate(template.labelTemplate, template.params, values),
    description: interpolate(template.descriptionTemplate, template.params, values),
    direction: template.direction,
    template,
    values,
    apply: (scenario) => template.apply(scenario, values),
  };
}

/* ── Build all decisions with default values ── */

export function buildLifeDecisions(scenario: Scenario): LifeDecision[] {
  return buildDecisionTemplates(scenario).map((template) => {
    const defaults: Record<string, number> = {};
    for (const param of template.params) {
      defaults[param.id] = param.defaultValue;
    }
    return resolveDecision(template, defaults);
  });
}

/* ── Evaluate all decisions ── */

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

/* ── Evaluate a single decision (for real-time updates) ── */

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
      case "percent":
        formatted = `${Math.round(val * 100)}%`;
        break;
      case "years":
        formatted = val === 1 ? "1 year" : `${val} years`;
        break;
      case "return":
        formatted = `${(val * 100).toFixed(1)}%`;
        break;
      default:
        formatted = String(val);
    }

    result = result.replace(`{${param.id}}`, formatted);

    // Also handle derived values like {savings} for move-cheaper
    if (param.id === "percent" && param.type === "percent") {
      const derived = formatK(Math.round(val * (values._expenses ?? 0) / 1000) * 1000);
      result = result.replace("{savings}", derived);
    }
  }
  return result;
}

function formatK(n: number): string {
  if (n < 0) return `-${formatK(Math.abs(n))}`;
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}
