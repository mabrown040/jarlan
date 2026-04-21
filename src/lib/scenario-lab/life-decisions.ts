import { calculateQuickFireSummary } from "@/lib/calc";
import {
  getFlexAccountIndex,
  getHouseholdAnnualIncome,
} from "@/lib/calc/scenario";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";
import { estimateScenarioTax } from "@/lib/tax";

/* ── Parameter system ── */

export type ParamType =
  | "currency"
  | "currency_signed"
  | "percent"
  | "years"
  | "return"
  | "age"
  // `boolean` params render as a checkbox in the decision card. Values are
  // stored as numbers (0 | 1) to share the same `Record<string, number>`
  // shape the slider-based params use.
  | "boolean";

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
  const householdIncome = getHouseholdAnnualIncome(scenario);
  const expenses = scenario.annualExpenses;
  const age = scenario.profile.age;
  const retAge = scenario.profile.retirementAge ?? age + 15;
  // Years remaining until the user's retirement target — used as the upper
  // bound on "take time off" so users can model leaving the workforce
  // permanently (e.g. a partner stopping work for good).
  const maxBreakYears = Math.max(retAge - age, 5);

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
          // Route the after-tax savings delta to the taxable brokerage
          // (via getFlexAccountIndex) instead of the first account. See
          // helper comment — otherwise a raise for a High Earner scales
          // the 401k past the IRS limit and distorts take-home.
          const flex = next.accounts[getFlexAccountIndex(next)];
          if (flex) {
            flex.annualContribution = Math.max(
              flex.annualContribution + afterTaxAmount, 0,
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
          // Route the savings delta via the flex account (taxable).
          const flex = next.accounts[getFlexAccountIndex(next)];
          if (flex) {
            flex.annualContribution = Math.max(
              flex.annualContribution - v.amount, 0,
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
          // Draw the new expense from the flex (taxable) account so the
          // 401k/HSA budget — which users usually set deliberately —
          // stays intact.
          const flex = next.accounts[getFlexAccountIndex(next)];
          if (flex) {
            flex.annualContribution = Math.max(
              flex.annualContribution - v.cost, 0,
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
          // Immediate: directly adjust portfolio. Inheritances, gifts,
          // and home-purchase proceeds all naturally land in taxable —
          // you can't dump a windfall into a 401k mid-year.
          const flex = next.accounts[getFlexAccountIndex(next)];
          if (flex) {
            flex.currentBalance = Math.max(
              flex.currentBalance + v.amount, 0,
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
      methodology:
        "Model stepping away from full-time work — for a single year, a multi-year break, or permanently. During the break, savings stop and expenses come from the portfolio. Total cost = (normal expenses + lost savings - any income during break) × duration. Use 'income during break' to capture severance, a partner who keeps working, or part-time work.",
      examples: [
        "Sabbatical",
        "Parental leave",
        "Partner stops working",
        "Leave the workforce permanently",
        "Grad school",
      ],
      params: [
        // Upper bound extends to the remaining years until the target retire
        // age so users can model "stop working forever" (partner leaves the
        // workforce, early semi-retirement, etc.) without the slider clipping.
        {
          id: "duration",
          label: "Time off",
          type: "years",
          min: 0.25,
          max: maxBreakYears,
          step: 0.25,
          defaultValue: 1,
        },
        { id: "startAge", label: "Starting at age", type: "age", min: age, max: retAge, step: 1, defaultValue: age },
        // Break income goes up to full household income (primary + partner)
        // so users can represent keeping the whole salary (= no real break)
        // or anything in between — e.g. one partner stops and the other
        // keeps earning. Falls back to a $200K floor when the scenario has
        // no income entered yet so the slider still has useful range.
        {
          id: "breakIncome",
          label: "Income during break",
          type: "currency",
          min: 0,
          max: Math.max(householdIncome, 200_000),
          step: 5000,
          defaultValue: 0,
        },
        // When checked, break income grows over the break at the scenario's
        // real income growth rate — same treatment as the base salary in
        // non-break years (modeling a partner who keeps getting raises).
        // The table is in real dollars, so checked makes the number visibly
        // rise; unchecked keeps it flat in real terms (still keeps pace with
        // inflation, but no raises). Default off — most part-time / severance
        // arrangements don't come with yearly raises.
        {
          id: "growsWithRaises",
          label: "Grows with yearly raises",
          type: "boolean",
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 0,
        },
      ],
      getDirection: () => "negative",
      apply: (s, v) => {
        const next = cloneScenario(s);
        // During the break:
        //   - Normal contributions stop (user isn't earning the base salary
        //     that fed `annualSavings`). The projection loop detects the
        //     break via the "Career break net cost" expense CF and zeroes
        //     the monthly contribution for those years, so we don't need to
        //     model it here.
        //   - Expenses continue. The portfolio either covers them directly
        //     (no break income) or they're offset by break income from a
        //     partner / severance / part-time work.
        //
        // Net per-break-year effect on portfolio = breakIncome − expenses
        // (plus normal investment growth on the balance).
        const breakExpenses = s.annualExpenses;
        const growsWithRaises = v.growsWithRaises !== 0;
        // Clamp startAge to the scenario's current age so a break that starts
        // "now" still emits cash flows the projection can render (previously
        // the same-age path used a lump-sum portfolio deduction, which left
        // the Year-by-year Income/Expenses columns showing the base salary).
        const effectiveStartAge = Math.max(v.startAge, s.profile.age);
        const breakId = `break-${Date.now()}`;
        next.cashFlows.push({
          id: `${breakId}-expense`,
          name: "Career break net cost",
          type: "expense",
          amount: Math.round(breakExpenses),
          startAge: effectiveStartAge,
          endAge: effectiveStartAge + v.duration,
          // Expenses always keep pace with inflation (rent, groceries
          // don't stop rising just because you took a break).
          inflationAdjusted: true,
          taxable: false,
        });
        if (v.breakIncome > 0) {
          // The CF name encodes whether the projection should grow this
          // income year-over-year at the scenario's real income growth
          // rate. Both variants keep pace with inflation (they're in real
          // dollars); the "raises" variant additionally applies
          // scenario.assumptions.incomeGrowthRate — matching how the base
          // salary grows in non-break years.
          const incomeName = growsWithRaises
            ? "Career break income (raises)"
            : "Career break income";
          next.cashFlows.push({
            id: `${breakId}-income`,
            name: incomeName,
            type: "income",
            amount: Math.round(v.breakIncome),
            startAge: effectiveStartAge,
            endAge: effectiveStartAge + v.duration,
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
