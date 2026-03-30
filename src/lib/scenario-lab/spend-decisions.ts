import { formatCompactCurrency, formatPercent, getRetirementStartAge } from "@/lib/calc";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";

export type SpendDecisionParamType =
  | "currency"
  | "currency_signed"
  | "years"
  | "percent";

export interface SpendDecisionParam {
  id: string;
  label: string;
  type: SpendDecisionParamType;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

interface SpendDecisionCopy {
  label: string;
  description: string;
  tradeoff: string;
}

export interface SpendDecisionTemplate {
  id: string;
  emoji: string;
  category: string;
  methodology: string;
  examples: string[];
  params: SpendDecisionParam[];
  resolveCopy: (values: Record<string, number>, scenario: Scenario) => SpendDecisionCopy;
  apply: (scenario: Scenario, values: Record<string, number>) => Scenario;
  getDirection: (
    values: Record<string, number>,
    scenario: Scenario,
  ) => "positive" | "negative" | "neutral";
}

export interface SpendDecision {
  id: string;
  emoji: string;
  category: string;
  label: string;
  description: string;
  tradeoff: string;
  methodology: string;
  examples: string[];
  direction: "positive" | "negative" | "neutral";
  template: SpendDecisionTemplate;
  values: Record<string, number>;
  apply: (scenario: Scenario) => Scenario;
}

function formatSignedCompactCurrency(value: number) {
  if (value === 0) {
    return formatCompactCurrency(0);
  }

  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatCompactCurrency(Math.abs(value))}`;
}

function formatYears(value: number) {
  return value === 1 ? "1 year" : `${Math.round(value)} years`;
}

export function buildSpendDecisionTemplates(
  scenario: Scenario,
): SpendDecisionTemplate[] {
  const retirementStartAge = getRetirementStartAge(scenario);
  const defaultSpendingChange = -Math.max(
    Math.round(scenario.retirementExpenses * 0.1 / 1_000) * 1_000,
    6_000,
  );
  const defaultBridgeIncome = Math.max(
    Math.round(scenario.retirementExpenses * 0.25 / 1_000) * 1_000,
    12_000,
  );
  const defaultLegacyTarget =
    scenario.simulationSettings.finalValueTarget > 0.25 ? 0.25 : 0;

  return [
    {
      id: "retirement-spending",
      emoji: "\u{1F4B8}",
      category: "Spending",
      methodology:
        "Changes retirement spending directly. Lower retirement expenses reduce the amount your strategy has to withdraw and immediately improve the withdrawal rate the simulations need to sustain.",
      examples: [
        "Downsize housing",
        "Travel less",
        "Increase discretionary spend",
        "Trim subscriptions",
      ],
      params: [
        {
          id: "amount",
          label: "Annual spending change",
          type: "currency_signed",
          min: -36_000,
          max: 36_000,
          step: 1_000,
          defaultValue: defaultSpendingChange,
        },
      ],
      resolveCopy: (values) => {
        const amount = values.amount ?? 0;

        if (amount < 0) {
          return {
            label: `Spend ${formatCompactCurrency(Math.abs(amount))}/yr less in retirement`,
            description:
              "Starts retirement with a lower withdrawal and more room for bad early markets.",
            tradeoff:
              "Trade-off: more durability, but less lifestyle spending on day one.",
          };
        }

        if (amount > 0) {
          return {
            label: `Spend ${formatCompactCurrency(amount)}/yr more in retirement`,
            description:
              "Tests a richer retirement lifestyle against the same market history.",
            tradeoff:
              "Trade-off: more lifestyle freedom, but less margin if returns disappoint early.",
          };
        }

        return {
          label: "Keep retirement spending where it is",
          description: "Use your current retirement spending plan as-is.",
          tradeoff: "Trade-off: no change to the current plan assumptions.",
        };
      },
      apply: (baseScenario, values) => {
        const nextScenario = cloneScenario(baseScenario);
        nextScenario.retirementExpenses = Math.max(
          baseScenario.retirementExpenses + (values.amount ?? 0),
          0,
        );
        return nextScenario;
      },
      getDirection: (values) => {
        const amount = values.amount ?? 0;
        return amount < 0 ? "positive" : amount > 0 ? "negative" : "neutral";
      },
    },
    {
      id: "retirement-timing",
      emoji: "\u{23F3}",
      category: "Timing",
      methodology:
        "Delays retirement by the chosen number of years. That gives the portfolio more time to compound and shortens the number of retirement years the plan needs to fund.",
      examples: [
        "One more year",
        "Two-year glide path",
        "Stay until vesting",
        "Phased exit",
      ],
      params: [
        {
          id: "years",
          label: "Extra working years",
          type: "years",
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 1,
        },
      ],
      resolveCopy: (values) => {
        const years = Math.max(Math.round(values.years ?? 1), 1);
        return {
          label: `Work ${formatYears(years)} longer before retiring`,
          description:
            "Adds more accumulation runway before withdrawals begin.",
          tradeoff:
            "Trade-off: a sturdier plan, but retirement starts later.",
        };
      },
      apply: (baseScenario, values) => {
        const nextScenario = cloneScenario(baseScenario);
        const years = Math.max(Math.round(values.years ?? 1), 1);
        nextScenario.profile.retirementAge = retirementStartAge + years;
        nextScenario.simulationSettings.retirementDuration = Math.max(
          baseScenario.simulationSettings.retirementDuration - years,
          10,
        );
        return nextScenario;
      },
      getDirection: () => "positive",
    },
    {
      id: "bridge-income",
      emoji: "\u{1F91D}",
      category: "Income",
      methodology:
        "Adds part-time income in the first retirement years. This offsets withdrawals during the sequence-risk window without permanently changing your long-run spending target.",
      examples: [
        "Consulting",
        "Seasonal work",
        "Part-time teaching",
        "Freelance projects",
      ],
      params: [
        {
          id: "amount",
          label: "Annual income",
          type: "currency",
          min: 0,
          max: 60_000,
          step: 1_000,
          defaultValue: defaultBridgeIncome,
        },
        {
          id: "duration",
          label: "Years after retiring",
          type: "years",
          min: 1,
          max: 10,
          step: 1,
          defaultValue: 5,
        },
      ],
      resolveCopy: (values) => {
        const amount = Math.max(values.amount ?? 0, 0);
        const duration = Math.max(Math.round(values.duration ?? 1), 1);
        return {
          label: `Earn ${formatCompactCurrency(amount)}/yr for ${formatYears(duration)} after retiring`,
          description:
            "Offsets withdrawals when early-retirement sequence risk is usually the highest.",
          tradeoff:
            "Trade-off: more flexibility in the first decade, but retirement still includes some paid work.",
        };
      },
      apply: (baseScenario, values) => {
        const nextScenario = cloneScenario(baseScenario);
        const amount = Math.max(values.amount ?? 0, 0);
        const duration = Math.max(Math.round(values.duration ?? 1), 1);
        nextScenario.assumptions.partTimeIncome =
          baseScenario.assumptions.partTimeIncome + amount;
        nextScenario.assumptions.partTimeIncomeDuration = Math.max(
          baseScenario.assumptions.partTimeIncomeDuration ?? 0,
          duration,
        );
        return nextScenario;
      },
      getDirection: (values) => {
        const amount = values.amount ?? 0;
        return amount > 0 ? "positive" : "neutral";
      },
    },
    {
      id: "guardrails-strategy",
      emoji: "\u{1F6DF}",
      category: "Strategy",
      methodology:
        "Switches the retirement spending rule to Guyton-Klinger guardrails, which allows spending cuts or raises as portfolio conditions change instead of holding the initial withdrawal flat forever.",
      examples: [
        "Accept flexible spending",
        "Use guardrails",
        "Trim after bad returns",
        "Take raises after strong years",
      ],
      params: [],
      resolveCopy: (_, currentScenario) => ({
        label:
          currentScenario.withdrawalStrategy.type === "guyton_klinger"
            ? "Keep using guardrail spending"
            : "Switch from fixed spending to guardrails",
        description:
          "Lets spending flex with market conditions instead of forcing a single real withdrawal path.",
        tradeoff:
          "Trade-off: often more durable, but annual spending becomes less predictable.",
      }),
      apply: (baseScenario) => {
        const nextScenario = cloneScenario(baseScenario);
        nextScenario.withdrawalStrategy.type = "guyton_klinger";
        nextScenario.withdrawalStrategy.gkParams =
          nextScenario.withdrawalStrategy.gkParams ?? {
            guardrailWidth: 0.2,
            adjustmentSize: 0.1,
            suspendCapPreservationYears: 15,
          };
        return nextScenario;
      },
      getDirection: (_, currentScenario) =>
        currentScenario.withdrawalStrategy.type === "guyton_klinger"
          ? "neutral"
          : "positive",
    },
    {
      id: "legacy-target",
      emoji: "\u{1F381}",
      category: "Legacy",
      methodology:
        "Changes how much ending wealth the plan still tries to preserve. Lowering the target increases flexibility because the simulations no longer need to finish with as much of the starting portfolio intact.",
      examples: [
        "Prioritize survival",
        "Lower inheritance goal",
        "Preserve 25%",
        "Spend your assets down",
      ],
      params: [
        {
          id: "target",
          label: "Ending portfolio target",
          type: "percent",
          min: 0,
          max: 1,
          step: 0.25,
          defaultValue: defaultLegacyTarget,
        },
      ],
      resolveCopy: (values) => {
        const target = Math.max(Math.min(values.target ?? 0, 1), 0);

        if (target === 0) {
          return {
            label: "Optimize for survival, not legacy",
            description:
              "Stops requiring the retirement plan to preserve a leftover portfolio at the end.",
            tradeoff:
              "Trade-off: higher success odds, but less inheritance or end-of-plan cushion.",
          };
        }

        return {
          label: `Keep ${formatPercent(target, 0)} of the starting portfolio at the end`,
          description:
            "Balances spending durability against how much legacy or cushion you still want left over.",
          tradeoff:
            "Trade-off: more legacy protection means the plan has less spending flexibility.",
        };
      },
      apply: (baseScenario, values) => {
        const nextScenario = cloneScenario(baseScenario);
        nextScenario.simulationSettings.finalValueTarget = Math.max(
          Math.min(values.target ?? 0, 1),
          0,
        );
        return nextScenario;
      },
      getDirection: (values, currentScenario) => {
        const target = Math.max(Math.min(values.target ?? 0, 1), 0);
        const currentTarget = currentScenario.simulationSettings.finalValueTarget;

        if (target < currentTarget) {
          return "positive";
        }

        if (target > currentTarget) {
          return "negative";
        }

        return "neutral";
      },
    },
  ];
}

export function resolveSpendDecision(
  template: SpendDecisionTemplate,
  values: Record<string, number>,
  scenario: Scenario,
): SpendDecision {
  const copy = template.resolveCopy(values, scenario);

  return {
    id: template.id,
    emoji: template.emoji,
    category: template.category,
    label: copy.label,
    description: copy.description,
    tradeoff: copy.tradeoff,
    methodology: template.methodology,
    examples: template.examples,
    direction: template.getDirection(values, scenario),
    template,
    values,
    apply: (baseScenario) => template.apply(baseScenario, values),
  };
}

export function buildSpendDecisions(scenario: Scenario): SpendDecision[] {
  return buildSpendDecisionTemplates(scenario).map((template) => {
    const values: Record<string, number> = {};
    for (const param of template.params) {
      values[param.id] = param.defaultValue;
    }
    return resolveSpendDecision(template, values, scenario);
  });
}

export function formatSpendDecisionDelta(value: number) {
  return formatSignedCompactCurrency(value);
}
