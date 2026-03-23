import { calculateQuickFireSummary } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

/* ── Parameter system ── */

export type ParamType = "currency" | "percent" | "years" | "return" | "age";

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
  labelTemplate: string;
  descriptionTemplate: string;
  direction: "positive" | "negative" | "mixed";
  params: DecisionParam[];
  apply: (scenario: Scenario, values: Record<string, number>) => Scenario;
}

/* ── Resolved decision ── */

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
  const age = scenario.profile.age;
  const retAge = scenario.profile.retirementAge ?? age + 15;

  return [
    {
      id: "raise",
      emoji: "\u{1F4B0}",
      labelTemplate: "Get a {amount} raise at age {startAge}",
      descriptionTemplate: "+{amount}/yr income starting at age {startAge}",
      direction: "positive",
      params: [
        { id: "amount", label: "Raise amount", type: "currency", min: 1000, max: 200_000, step: 1000, defaultValue: Math.round(income * 0.05 / 1000) * 1000 || 15_000 },
        { id: "startAge", label: "Starting age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        // If starting now, just increase income directly
        if (v.startAge <= s.profile.age) {
          next.annualIncome += v.amount;
          next.annualSavings += v.amount;
          if (next.accounts[0]) next.accounts[0].annualContribution += v.amount;
        } else {
          // Future raise: add as a cash flow event starting at that age
          next.cashFlows.push({
            id: `raise-${Date.now()}`,
            name: "Raise",
            type: "income",
            amount: v.amount,
            startAge: v.startAge,
            endAge: null,
            inflationAdjusted: true,
            taxable: true,
          });
        }
        return next;
      },
    },
    {
      id: "side-hustle",
      emoji: "\u{1F680}",
      labelTemplate: "Earn {amount}/yr side income for {duration}",
      descriptionTemplate: "+{amount}/yr from age {startAge} for {duration}",
      direction: "positive",
      params: [
        { id: "amount", label: "Annual income", type: "currency", min: 1000, max: 100_000, step: 1000, defaultValue: 12_000 },
        { id: "startAge", label: "Starting age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
        { id: "duration", label: "Duration", type: "years", min: 1, max: 20, step: 1, defaultValue: 5 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualSavings += v.amount;
          if (next.accounts[0]) next.accounts[0].annualContribution += v.amount;
        }
        // Model as cash flow for the duration
        next.cashFlows.push({
          id: `hustle-${Date.now()}`,
          name: "Side income",
          type: "income",
          amount: v.amount,
          startAge: Math.max(v.startAge, s.profile.age + 1),
          endAge: v.startAge + v.duration,
          inflationAdjusted: true,
          taxable: true,
        });
        return next;
      },
    },
    {
      id: "move-cheaper",
      emoji: "\u{1F3E0}",
      labelTemplate: "Cut expenses by {percent} at age {startAge}",
      descriptionTemplate: "Reduce spending by {percent} starting at age {startAge}",
      direction: "positive",
      params: [
        { id: "percent", label: "Expense reduction", type: "percent", min: 0.05, max: 0.50, step: 0.05, defaultValue: 0.20 },
        { id: "startAge", label: "Starting age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
      ],
      apply: (s, v) => {
        const cut = Math.round(s.annualExpenses * v.percent / 1000) * 1000;
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualExpenses = Math.max(next.annualExpenses - cut, 0);
          next.retirementExpenses = Math.max(next.retirementExpenses - cut, 0);
          next.annualSavings += cut;
          if (next.accounts[0]) next.accounts[0].annualContribution += cut;
        } else {
          // Future expense reduction — reduce retirement expenses
          next.retirementExpenses = Math.max(next.retirementExpenses - cut, 0);
        }
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
      labelTemplate: "Have a child at age {startAge}",
      descriptionTemplate: "+{cost}/yr for {duration} starting at age {startAge}",
      direction: "negative",
      params: [
        { id: "cost", label: "Annual cost", type: "currency", min: 5000, max: 50_000, step: 1000, defaultValue: Math.round(expenses * 0.18 / 1000) * 1000 || 18_000 },
        { id: "startAge", label: "Starting age", type: "age", min: age, max: age + 20, step: 1, defaultValue: age + 1 },
        { id: "duration", label: "Years of expenses", type: "years", min: 5, max: 25, step: 1, defaultValue: 18 },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualExpenses += v.cost;
          next.retirementExpenses += Math.round(v.cost * 0.5); // reduced cost in retirement
          next.annualSavings = Math.max(next.annualSavings - v.cost, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(next.accounts[0].annualContribution - v.cost, 0);
          }
        } else {
          // Future child: add as cash flow expense
          next.cashFlows.push({
            id: `child-${Date.now()}`,
            name: "Child expenses",
            type: "expense",
            amount: v.cost,
            startAge: v.startAge,
            endAge: v.startAge + v.duration,
            inflationAdjusted: true,
            taxable: false,
          });
        }
        return next;
      },
    },
    {
      id: "windfall",
      emoji: "\u{1F381}",
      labelTemplate: "Receive {amount} at age {atAge}",
      descriptionTemplate: "+{amount} one-time at age {atAge}",
      direction: "positive",
      params: [
        { id: "amount", label: "Amount", type: "currency", min: 10_000, max: 2_000_000, step: 10_000, defaultValue: 100_000 },
        { id: "atAge", label: "At age", type: "age", min: age, max: age + 30, step: 1, defaultValue: age },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.atAge <= s.profile.age) {
          // Immediate: add to portfolio
          if (next.accounts[0]) next.accounts[0].currentBalance += v.amount;
        } else {
          // Future windfall: add as one-time cash flow
          next.cashFlows.push({
            id: `windfall-${Date.now()}`,
            name: "Windfall",
            type: "income",
            amount: v.amount,
            startAge: v.atAge,
            endAge: v.atAge + 1,
            inflationAdjusted: false,
            taxable: true,
          });
        }
        return next;
      },
    },
    {
      id: "sabbatical",
      emoji: "\u{2708}\u{FE0F}",
      labelTemplate: "Take {duration} off at age {startAge}",
      descriptionTemplate: "{duration} off work starting at age {startAge}",
      direction: "negative",
      params: [
        { id: "duration", label: "Time off", type: "years", min: 0.5, max: 5, step: 0.5, defaultValue: 1 },
        { id: "startAge", label: "Starting age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        const cost = Math.round(s.annualExpenses * v.duration);
        if (v.startAge <= s.profile.age) {
          // Immediate: deduct from portfolio
          if (next.accounts[0]) {
            next.accounts[0].currentBalance = Math.max(next.accounts[0].currentBalance - cost, 0);
          }
        } else {
          // Future: add expense cash flow
          next.cashFlows.push({
            id: `sabbatical-${Date.now()}`,
            name: "Sabbatical expenses",
            type: "expense",
            amount: Math.round(s.annualExpenses),
            startAge: v.startAge,
            endAge: v.startAge + v.duration,
            inflationAdjusted: true,
            taxable: false,
          });
        }
        return next;
      },
    },
    {
      id: "spending-change",
      emoji: "\u{2702}\u{FE0F}",
      labelTemplate: "Change spending by {amount}/yr at age {startAge}",
      descriptionTemplate: "Adjust expenses by {amount}/yr starting at age {startAge}",
      direction: "mixed",
      params: [
        { id: "amount", label: "Annual change", type: "currency", min: -50_000, max: 50_000, step: 1000, defaultValue: Math.round(expenses * -0.1 / 1000) * 1000 },
        { id: "startAge", label: "Starting age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
      ],
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualExpenses = Math.max(next.annualExpenses + v.amount, 0);
          next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
          next.annualSavings = Math.max(next.annualSavings - v.amount, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(next.accounts[0].annualContribution - v.amount, 0);
          }
        } else {
          next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
        }
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
    label: interpolate(template.labelTemplate, template.params, values),
    description: interpolate(template.descriptionTemplate, template.params, values),
    direction: template.direction,
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
      case "percent":
        formatted = `${Math.round(val * 100)}%`;
        break;
      case "years":
        formatted = val === 1 ? "1 year" : val === 0.5 ? "6 months" : `${val} years`;
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
