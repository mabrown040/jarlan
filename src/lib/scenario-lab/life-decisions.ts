import { calculateQuickFireSummary } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";
import { estimateScenarioTax } from "@/lib/tax";

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
  /** What this card models — shown in a help tooltip */
  methodology: string;
  /** Examples of what this covers */
  examples: string[];
  params: DecisionParam[];
  apply: (scenario: Scenario, values: Record<string, number>) => Scenario;
  getDirection: (values: Record<string, number>) => "positive" | "negative" | "neutral";
}

/* ── Resolved decision ── */

export interface LifeDecision {
  id: string;
  emoji: string;
  category: string;
  label: string;
  description: string;
  methodology: string;
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

  // Compute effective tax rate for after-tax income adjustments
  const taxCalc = estimateScenarioTax(scenario);
  const effectiveTaxRate = taxCalc.effectiveRate;

  return [
    /* ── 1. Income Change ── */
    {
      id: "income-change",
      emoji: "\u{1F4BC}",
      category: "Income",
      labelTemplate: "Income changes by {amount}/yr at age {startAge}",
      descriptionTemplate: "~{afterTax}/yr after tax added to savings",
      methodology: "Applies your effective tax rate to estimate the after-tax impact on savings. A raise of $X adds approximately $X × (1 - effective tax rate) to your annual savings.",
      examples: ["Raise", "Pay cut", "New job", "Lose a client", "Promotion"],
      params: [
        { id: "amount", label: "Gross annual change", type: "currency_signed", min: -100_000, max: 200_000, step: 5000, defaultValue: Math.round(income * 0.05 / 1000) * 1000 || 15_000 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 30, step: 1, defaultValue: age },
      ],
      getDirection: (v) => v.amount > 0 ? "positive" : v.amount < 0 ? "negative" : "neutral",
      apply: (s, v) => {
        const next = cloneScenario(s);
        // After-tax impact on savings
        const afterTaxAmount = Math.round(v.amount * (1 - effectiveTaxRate));

        if (v.startAge <= s.profile.age) {
          next.annualIncome = Math.max(next.annualIncome + v.amount, 0);
          next.annualSavings = Math.max(next.annualSavings + afterTaxAmount, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(
              next.accounts[0].annualContribution + afterTaxAmount, 0,
            );
          }
        } else {
          // Future: model after-tax savings increase as cash flow
          next.cashFlows.push({
            id: `income-${Date.now()}`,
            name: v.amount >= 0 ? "After-tax raise savings" : "Lost income savings",
            type: afterTaxAmount >= 0 ? "income" : "expense",
            amount: Math.abs(afterTaxAmount),
            startAge: v.startAge,
            endAge: null,
            inflationAdjusted: true,
            taxable: false, // already tax-adjusted
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
      methodology: "Directly changes your annual spending. Reduced spending both increases your savings rate AND lowers your FIRE target (you need less to sustain a lower lifestyle). This has a double effect on your timeline.",
      examples: ["Move cheaper", "Downsize", "Lifestyle upgrade", "Pay off debt", "New hobby"],
      params: [
        { id: "amount", label: "Annual spending change", type: "currency_signed", min: -50_000, max: 50_000, step: 1000, defaultValue: Math.round(expenses * -0.2 / 1000) * 1000 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 30, step: 1, defaultValue: age },
      ],
      getDirection: (v) => v.amount < 0 ? "positive" : v.amount > 0 ? "negative" : "neutral",
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.startAge <= s.profile.age) {
          next.annualExpenses = Math.max(next.annualExpenses + v.amount, 0);
          next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
          // Spending change directly affects savings (dollar-for-dollar, no tax)
          next.annualSavings = Math.max(next.annualSavings - v.amount, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(
              next.accounts[0].annualContribution - v.amount, 0,
            );
          }
        } else {
          // Future: change retirement expenses + model savings impact during working years
          next.retirementExpenses = Math.max(next.retirementExpenses + v.amount, 0);
          // The savings impact during working years before retirement
          next.cashFlows.push({
            id: `lifestyle-${Date.now()}`,
            name: v.amount > 0 ? "Higher spending" : "Lower spending savings",
            type: v.amount > 0 ? "expense" : "income",
            amount: Math.abs(v.amount),
            startAge: v.startAge,
            endAge: null,
            inflationAdjusted: true,
            taxable: false,
          });
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
      methodology: "Adds a temporary expense for the duration specified. Only affects your FIRE target if the expense extends into retirement. During working years, it reduces your savings rate. Costs are inflation-adjusted.",
      examples: ["Child", "Aging parent", "Supporting a partner", "Pet", "Tuition"],
      params: [
        { id: "cost", label: "Annual cost", type: "currency", min: 2000, max: 60_000, step: 1000, defaultValue: Math.round(expenses * 0.18 / 1000) * 1000 || 18_000 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 20, step: 1, defaultValue: age + 1 },
        { id: "duration", label: "Duration", type: "years", min: 1, max: 30, step: 1, defaultValue: 18 },
      ],
      getDirection: () => "negative",
      apply: (s, v) => {
        const next = cloneScenario(s);
        const endAge = v.startAge + v.duration;
        const retirementAge = s.profile.retirementAge ?? s.profile.age + 15;

        // Model entirely as a cash flow event — clean and accurate
        next.cashFlows.push({
          id: `dependent-${Date.now()}`,
          name: "Dependent expenses",
          type: "expense",
          amount: v.cost,
          startAge: Math.max(v.startAge, s.profile.age),
          endAge,
          inflationAdjusted: true,
          taxable: false,
        });

        // If the expense extends into retirement, increase retirement expenses
        if (endAge > retirementAge) {
          next.retirementExpenses += v.cost;
        }

        // If starting now or soon, reduce current savings
        if (v.startAge <= s.profile.age) {
          next.annualSavings = Math.max(next.annualSavings - v.cost, 0);
          if (next.accounts[0]) {
            next.accounts[0].annualContribution = Math.max(
              next.accounts[0].annualContribution - v.cost, 0,
            );
          }
        }

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
      methodology: "Models a one-time addition or deduction to your portfolio. Positive: inheritance, bonus, sell a business. Negative: home down payment, major medical expense, divorce settlement. If in the future, modeled as a cash flow event at the specified age.",
      examples: ["Inheritance", "Home purchase", "Sell a business", "Legal settlement", "Gift", "Down payment"],
      params: [
        { id: "amount", label: "Amount", type: "currency_signed", min: -500_000, max: 2_000_000, step: 10_000, defaultValue: 100_000 },
        { id: "atAge", label: "At age", type: "age", min: age, max: age + 40, step: 1, defaultValue: age },
      ],
      getDirection: (v) => v.amount > 0 ? "positive" : v.amount < 0 ? "negative" : "neutral",
      apply: (s, v) => {
        const next = cloneScenario(s);
        if (v.atAge <= s.profile.age) {
          // Immediate: directly adjust portfolio
          if (next.accounts[0]) {
            next.accounts[0].currentBalance = Math.max(
              next.accounts[0].currentBalance + v.amount, 0,
            );
          }
        } else {
          // Future: model as one-year cash flow event
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
      descriptionTemplate: "{duration} off work. Income during break: {breakIncome}/yr",
      methodology: "During a career break you lose your savings AND continue spending from your portfolio. Total cost = (normal expenses + lost savings - any income during break) × duration. Set 'income during break' for severance, partner income, or part-time work.",
      examples: ["Sabbatical", "Parental leave", "Health recovery", "Travel year", "Grad school"],
      params: [
        { id: "duration", label: "Time off", type: "years", min: 0.25, max: 5, step: 0.25, defaultValue: 1 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
        { id: "breakIncome", label: "Income during break", type: "currency", min: 0, max: 200_000, step: 5000, defaultValue: 0 },
      ],
      getDirection: () => "negative",
      apply: (s, v) => {
        const next = cloneScenario(s);
        // During the break: no savings + spending from portfolio
        // Net cost per year = expenses + lost savings - break income
        const annualSavings = s.annualSavings;
        const netCostPerYear = Math.max(s.annualExpenses + annualSavings - v.breakIncome, 0);

        if (v.startAge <= s.profile.age) {
          // Immediate: deduct the full cost from portfolio
          const totalCost = Math.round(netCostPerYear * v.duration);
          if (next.accounts[0]) {
            next.accounts[0].currentBalance = Math.max(
              next.accounts[0].currentBalance - totalCost, 0,
            );
          }
        } else {
          // Future: model the net cost as an expense cash flow
          // Note: this is one combined CF for portfolio math correctness.
          // The display layer interprets "Career break net cost" CFs specially
          // to show income=$breakIncome and expenses=base expenses.
          next.cashFlows.push({
            id: `break-${Date.now()}`,
            name: "Career break net cost",
            type: "expense",
            amount: Math.round(netCostPerYear),
            startAge: v.startAge,
            endAge: v.startAge + v.duration,
            inflationAdjusted: true,
            taxable: false,
          });
        }
        return next;
      },
    },

    /* ── 6. Market Event ── */
    {
      id: "market-event",
      emoji: "\u{1F4C8}",
      category: "Market",
      labelTemplate: "{rate} returns for {duration} starting at age {startAge}",
      descriptionTemplate: "Then reverts to your base {baseRate} assumption",
      methodology: "Models a temporary period of different market returns (e.g. a crash or a boom), then reverts to your normal assumption. Uses a time-weighted blended return across the full projection horizon to approximate the impact.",
      examples: ["Bear market", "Bull run", "Lost decade", "Recovery rally", "Crash + recovery"],
      params: [
        { id: "rate", label: "Return during event", type: "return", min: -0.05, max: 0.15, step: 0.005, defaultValue: Math.max(scenario.assumptions.expectedRealReturn - 0.04, 0) },
        { id: "duration", label: "Duration", type: "years", min: 1, max: 20, step: 1, defaultValue: 5 },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: age + 20, step: 1, defaultValue: age },
      ],
      getDirection: (v) => {
        const baseReturn = scenario.assumptions.expectedRealReturn;
        return v.rate > baseReturn ? "positive" : v.rate < baseReturn ? "negative" : "neutral";
      },
      apply: (s, v) => {
        const next = cloneScenario(s);
        // Use the ORIGINAL base return (before any market event modifications)
        // to prevent double-blending when composing multiple decisions
        const baseReturn = v._originalBaseReturn ?? s.assumptions.expectedRealReturn;
        const yearsToRetirement = Math.max((s.profile.retirementAge ?? s.profile.age + 15) - s.profile.age, 1);
        const eventStart = Math.max(v.startAge - s.profile.age, 0);
        const eventEnd = Math.min(eventStart + v.duration, yearsToRetirement);
        const eventYears = Math.max(eventEnd - eventStart, 0);
        const normalYears = yearsToRetirement - eventYears;

        // Time-weighted blended return across full horizon
        const blendedReturn = yearsToRetirement > 0
          ? (v.rate * eventYears + baseReturn * normalYears) / yearsToRetirement
          : baseReturn;

        next.assumptions.expectedRealReturn = Math.max(blendedReturn, 0);
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
    methodology: template.methodology,
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
    const defaults: Record<string, number> = {
      _baseReturn: scenario.assumptions.expectedRealReturn,
    };
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

  // Handle derived interpolations
  if (result.includes("{afterTax}")) {
    const amount = values.amount ?? 0;
    const afterTax = formatK(Math.round(amount * 0.75)); // ~25% effective rate approximation for display
    result = result.replaceAll("{afterTax}", afterTax);
  }
  if (result.includes("{baseRate}")) {
    // The base return is stored in the "rate" param's context — use a reasonable default
    result = result.replaceAll("{baseRate}", `${((values._baseReturn ?? 0.07) * 100).toFixed(0)}%`);
  }

  return result;
}

function formatK(n: number): string {
  if (n < 0) return `-${formatK(Math.abs(n))}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}
