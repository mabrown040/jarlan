"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChartShell, SectionHeading } from "@/components/brand";
import { PersonalizedInsight } from "@/components/education/personalized-insight";
import {
  supportedStrategyTypes,
  type SupportedStrategyType,
  useWithdrawalStrategyComparison,
} from "@/components/withdrawal/use-withdrawal-strategy-comparison";
import { WithdrawalStrategyComparisonChart } from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/number-input";
import {
  calculateFireNumber,
  formatCurrency,
  formatCompactCurrency,
  formatPercent,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { buildScenarioForStartingPortfolio } from "@/lib/scenario-lab/spend-analysis";
import {
  getEducationReference,
  withdrawalStrategyReferences,
} from "@/lib/education/content";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import {
  runSimulation,
  simulationCapabilities,
  withdrawalStrategyMetadata,
} from "@/lib/sim";
import type { HistoricalBacktestResult } from "@/lib/sim/contracts";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { cn } from "@/lib/utils";

type ComparisonMode = "fire-target" | "current";
type StrategyLensId = "all" | "steady" | "flexible" | "higher_early";
type RankerMode = "stable_spending" | "market_adaptation" | "higher_early_spending";

const rankerModes: Array<{
  id: RankerMode;
  label: string;
  linkedLens: StrategyLensId;
  description: string;
  weights: {
    success: number;
    stability: number;
    adaptability: number;
    earlySpending: number;
    simplicity: number;
  };
}> = [
  {
    id: "stable_spending",
    label: "Prioritize stable spending",
    linkedLens: "steady",
    description:
      "Weights spending stability highest while still considering durability and manageable complexity.",
    weights: {
      success: 0.2,
      stability: 0.45,
      adaptability: 0.1,
      earlySpending: 0.1,
      simplicity: 0.15,
    },
  },
  {
    id: "market_adaptation",
    label: "Prioritize market adaptation",
    linkedLens: "flexible",
    description:
      "Rewards strategies that can adjust to changing valuations or portfolio stress while preserving resilience.",
    weights: {
      success: 0.25,
      stability: 0.1,
      adaptability: 0.45,
      earlySpending: 0.1,
      simplicity: 0.1,
    },
  },
  {
    id: "higher_early_spending",
    label: "Prioritize higher early spending",
    linkedLens: "higher_early",
    description:
      "Emphasizes early-retirement income, with durability and flexibility as secondary checks.",
    weights: {
      success: 0.15,
      stability: 0.1,
      adaptability: 0.15,
      earlySpending: 0.5,
      simplicity: 0.1,
    },
  },
];

const strategyLenses = [
  {
    id: "all",
    label: "All eight",
    title: "See the full menu",
    description:
      "Use this view when you want the whole opportunity set in one chart.",
    strategies: supportedStrategyTypes,
  },
  {
    id: "steady",
    label: "Steadier income",
    title: "Prioritize narrower spending swings",
    description:
      "These rules usually give up some upside in exchange for easier household budgeting.",
    strategies: ["fixed", "floor_ceiling"] as const,
  },
  {
    id: "flexible",
    label: "Rules-based flexibility",
    title: "Let spending adapt to conditions",
    description:
      "These rules respond to valuation or portfolio stress instead of defending a perfectly flat paycheck.",
    strategies: ["cape_dynamic", "guyton_klinger"] as const,
  },
  {
    id: "higher_early",
    label: "Higher early spending",
    title: "Spend more while the portfolio or age-based rule allows it",
    description:
      "These strategies naturally ride portfolio size, remaining horizon, or planned spending decline.",
    strategies: ["vpw", "constant_pct", "rmd", "spending_smile"] as const,
  },
] as const satisfies ReadonlyArray<{
  id: StrategyLensId;
  label: string;
  title: string;
  description: string;
  strategies: ReadonlyArray<SupportedStrategyType>;
}>;

const strategyProfiles: Record<
  SupportedStrategyType,
  {
    lens: Exclude<StrategyLensId, "all">;
    headline: string;
    fit: string;
    tradeoff: string;
    implementation: string;
    expectation: string;
    sourceIds: string[];
    adaptabilityScore: number;
    complexityScore: number;
  }
> = {
  fixed: {
    lens: "steady",
    headline: "The classic constant-purchasing-power rule.",
    fit: "Households that want the easiest budget to understand and can start from a conservative withdrawal rate.",
    tradeoff:
      "You get the smoothest paycheck, but the rule does not automatically respond when markets get expensive or portfolios get stressed.",
    implementation:
      "Calcifer models this in real dollars, so the spending target stays level in purchasing-power terms throughout retirement.",
    expectation:
      "Very predictable spending, but sequence risk can be high when early retirement years are weak.",
    sourceIds: ["bengen1994", "trinity1998"],
    adaptabilityScore: 0.1,
    complexityScore: 0.05,
  },
  cape_dynamic: {
    lens: "flexible",
    headline: "A valuation-aware rule inspired by Big ERN's CAPE work.",
    fit: "Retirees who are comfortable letting spending react to market valuation, especially over long FIRE horizons.",
    tradeoff:
      "The rule can be more resilient than a flat paycheck, but it asks you to trust a market-valuation signal that can stay elevated or depressed for years.",
    implementation:
      "Calcifer uses a simple annual rule of the form portfolio × (a + b / CAPE), with user-tunable intercept and slope parameters.",
    expectation:
      "Can materially improve resilience when valuations are high, but spending may vary from year to year.",
    sourceIds: ["ernSWRSeries", "ernPart54", "shillerData"],
    adaptabilityScore: 0.85,
    complexityScore: 0.55,
  },
  guyton_klinger: {
    lens: "flexible",
    headline: "Guardrails for retirees who can make occasional spending cuts or raises.",
    fit: "Households that want a ruleset for when to tighten up or loosen spending instead of recalculating from scratch every year.",
    tradeoff:
      "It can support higher initial spending than fixed real rules, but the worst-case cuts can still be emotionally hard to live through.",
    implementation:
      "Calcifer applies the core guardrail logic annually, including capital-preservation cuts and prosperity increases, with adjustable guardrail width and step size.",
    expectation:
      "Potentially stronger outcomes in stress periods, but requires discipline to follow cuts and raises consistently.",
    sourceIds: ["guytonKlinger2006", "klinger2016"],
    adaptabilityScore: 0.95,
    complexityScore: 0.75,
  },
  vpw: {
    lens: "higher_early",
    headline: "A remaining-horizon rule that deliberately spends more when time is short.",
    fit: "Retirees who accept year-to-year variation and want a portfolio-linked rule that is designed to exhaust more of the portfolio over the full horizon.",
    tradeoff:
      "Income can move around a lot, especially after bad markets, so it works best when essential expenses are partly covered elsewhere.",
    implementation:
      "Calcifer treats VPW as a variable-percentage rule tied to remaining years in retirement rather than a flat real paycheck.",
    expectation:
      "Tends to spend more in stronger periods and less in weaker periods; income can swing materially.",
    sourceIds: ["bogleheadsVPW", "morningstar2025"],
    adaptabilityScore: 0.75,
    complexityScore: 0.45,
  },
  constant_pct: {
    lens: "higher_early",
    headline: "The simplest flexible rule: spend a fixed share of whatever the portfolio is worth now.",
    fit: "People who care more about never mathematically hitting zero than about maintaining a stable lifestyle.",
    tradeoff:
      "Because spending falls whenever the portfolio falls, this is one of the hardest rules on lifestyle stability.",
    implementation:
      "This is intentionally a transparent heuristic in Calcifer, not a claim that constant-percentage spending is the universally best researched withdrawal framework.",
    expectation:
      "Simple and durable, but income volatility is high and can be hard to live with after bad markets.",
    sourceIds: ["morningstar2025"],
    adaptabilityScore: 0.65,
    complexityScore: 0.1,
  },
  rmd: {
    lens: "higher_early",
    headline: "An age-based divisor rule borrowed from required minimum distributions.",
    fit: "Retirees who like a clear age schedule and expect spending percentages to rise as life expectancy shortens.",
    tradeoff:
      "The rule is simple and age-aware, but the resulting paycheck can still move materially with portfolio size and it was not designed to optimize lifestyle stability.",
    implementation:
      "Calcifer uses IRS-style divisors as the annual denominator, so withdrawals increase as the divisor falls with age.",
    expectation:
      "Naturally conservative early and higher later, but spending is still market-sensitive and not needs-based.",
    sourceIds: ["irsRmdWorksheets"],
    adaptabilityScore: 0.4,
    complexityScore: 0.2,
  },
  floor_ceiling: {
    lens: "steady",
    headline: "A spending-band rule that caps both austerity and excess.",
    fit: "Households that want some portfolio responsiveness but also need a minimum and maximum real paycheck they can plan around.",
    tradeoff:
      "Bands smooth the ride, but any hard floor reintroduces the chance of depletion if the portfolio is pressured long enough.",
    implementation:
      "Calcifer implements this as portfolio-based spending clamped between a real-dollar floor and ceiling, which matches the spirit of floor-and-ceiling research while staying easy to audit.",
    expectation:
      "Smoother than most dynamic rules, but requires active guardrail settings and periodic review.",
    sourceIds: ["retirementResearcherFloorCeiling", "morningstar2025"],
    adaptabilityScore: 0.7,
    complexityScore: 0.4,
  },
  spending_smile: {
    lens: "higher_early",
    headline: "A planned real spending glidepath inspired by observed retiree spending decline.",
    fit: "Retirees who expect early retirement to be the expensive phase and are comfortable planning for slower real spending later.",
    tradeoff:
      "The rule bakes in decline whether or not your real life cooperates, so it can misfit households with rising healthcare or family costs.",
    implementation:
      "Calcifer models the smile as a steady annual real-spending decline, which is a practical approximation of the broader spending-smile literature rather than a promise of any exact household path.",
    expectation:
      "Can support higher early spending, but relies on confidence that your household can spend less later.",
    sourceIds: ["blanchett2014", "morningstar2025"],
    adaptabilityScore: 0.35,
    complexityScore: 0.25,
  },
};

const articleReferenceIds = [
  "bengen1994",
  "trinity1998",
  "ernSWRSeries",
  "ernPart54",
  "shillerData",
  "guytonKlinger2006",
  "klinger2016",
  "bogleheadsVPW",
  "irsRmdWorksheets",
  "blanchett2014",
  "morningstar2025",
  "retirementResearcherFloorCeiling",
] as const;

const defaultLabParams = {
  capeA: 0.0175,
  capeB: 0.5,
  gkGuardrailWidth: 0.2,
  gkAdjustmentSize: 0.1,
  gkSuspendYears: 15,
  floor: 30_000,
  ceiling: 80_000,
  smileDeclineRate: 0.0125,
} as const;

function normalizeMetric(value: number, min: number, max: number) {
  if (max - min < 1e-9) {
    return 0.5;
  }

  return (value - min) / (max - min);
}

function formatSignedPercent(value: number, maximumFractionDigits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatPercent(value, maximumFractionDigits)}`;
}

function formatSignedCurrency(value: number) {
  const sign = value > 0 ? "+" : "";
  if (Math.abs(value) >= 1_000) {
    return `${sign}${formatCompactCurrency(value)}`;
  }

  const absolute = Math.abs(value);
  return `${sign}$${absolute.toFixed(2)}`;
}

function strategyRuleText(args: {
  type: SupportedStrategyType;
  startingPortfolio: number;
  retirementExpenses: number;
  withdrawalRate: number;
  capeParams: { a: number; b: number };
  gkParams: {
    guardrailWidth: number;
    adjustmentSize: number;
    suspendCapPreservationYears: number;
  };
  floorCeiling: { floor: number; ceiling: number };
  spendingDeclineRate: number;
}) {
  const {
    type,
    startingPortfolio,
    retirementExpenses,
    withdrawalRate,
    capeParams,
    gkParams,
    floorCeiling,
    spendingDeclineRate,
  } = args;

  switch (type) {
    case "fixed":
      return `Start near ${formatCompactCurrency(retirementExpenses)}/yr and keep purchasing power roughly level in real terms.`;
    case "cape_dynamic":
      return `Withdrawal = portfolio × (${formatPercent(capeParams.a, 2)} + ${capeParams.b.toFixed(
        2,
      )} / CAPE).`;
    case "guyton_klinger":
      return `Start from about ${formatPercent(withdrawalRate, 1)}, then cut or raise spending by ${formatPercent(
        gkParams.adjustmentSize,
        0,
      )} when the withdrawal rate moves ${formatPercent(
        gkParams.guardrailWidth,
        0,
      )} outside its guardrails.`;
    case "vpw":
      return `Spend a changing percentage of the portfolio based on remaining years, so the withdrawal rate rises as the horizon gets shorter.`;
    case "constant_pct":
      return `Each year: ${formatPercent(withdrawalRate, 1)} × current portfolio value.`;
    case "rmd":
      return `Each year: current portfolio / IRS-style age divisor. The divisor falls as age rises.`;
    case "floor_ceiling":
      return `Spend about ${formatPercent(withdrawalRate, 1)} of the portfolio, but clamp the result between ${formatCompactCurrency(
        floorCeiling.floor,
      )} and ${formatCompactCurrency(floorCeiling.ceiling)}.`;
    case "spending_smile":
      return `Target spending ≈ ${formatCompactCurrency(
        retirementExpenses,
      )} × (1 - ${formatPercent(spendingDeclineRate, 2)})^years.`;
    default:
      return `This rule is being compared from a starting portfolio of ${formatCompactCurrency(
        startingPortfolio,
      )}.`;
  }
}

export function WithdrawalStrategiesArticle() {
  const activeScenario = useScenarioStore((state) => state.activeScenario);
  const status = useScenarioStore((state) => state.status);

  const paramRequestTokenRef = useRef(0);
  const strategyChooserRef = useRef<HTMLDivElement | null>(null);
  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const currentBalance = getCurrentPortfolioBalance(activeScenario.accounts);
  const fireTarget = useMemo(
    () =>
      calculateFireNumber(
        activeScenario.retirementExpenses,
        activeScenario.assumptions.withdrawalRate,
      ),
    [activeScenario.assumptions.withdrawalRate, activeScenario.retirementExpenses],
  );
  const currentStrategy = supportedStrategyTypes.includes(
    activeScenario.withdrawalStrategy.type as SupportedStrategyType,
  )
    ? (activeScenario.withdrawalStrategy.type as SupportedStrategyType)
    : "fixed";
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("fire-target");
  const [selectedLens, setSelectedLens] = useState<StrategyLensId>("all");
  const [selectedStrategy, setSelectedStrategy] =
    useState<SupportedStrategyType>(currentStrategy);
  const [showStickyStrategyBar, setShowStickyStrategyBar] = useState(false);
  const [labParams, setLabParams] = useState({
    capeA:
      activeScenario.withdrawalStrategy.capeParams?.a ?? defaultLabParams.capeA,
    capeB:
      activeScenario.withdrawalStrategy.capeParams?.b ?? defaultLabParams.capeB,
    gkGuardrailWidth:
      activeScenario.withdrawalStrategy.gkParams?.guardrailWidth ??
      defaultLabParams.gkGuardrailWidth,
    gkAdjustmentSize:
      activeScenario.withdrawalStrategy.gkParams?.adjustmentSize ??
      defaultLabParams.gkAdjustmentSize,
    gkSuspendYears:
      activeScenario.withdrawalStrategy.gkParams?.suspendCapPreservationYears ??
      defaultLabParams.gkSuspendYears,
    floor:
      activeScenario.withdrawalStrategy.floorCeiling?.floor ??
      defaultLabParams.floor,
    ceiling:
      activeScenario.withdrawalStrategy.floorCeiling?.ceiling ??
      defaultLabParams.ceiling,
    smileDeclineRate:
      activeScenario.withdrawalStrategy.spendingDeclineRate ??
      defaultLabParams.smileDeclineRate,
  });
  const [paramLabStatus, setParamLabStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [paramLabError, setParamLabError] = useState<string | null>(null);
  const [adjustedStrategyResult, setAdjustedStrategyResult] =
    useState<HistoricalBacktestResult | null>(null);
  const startingPortfolio =
    comparisonMode === "current" ? currentBalance : fireTarget;
  const activeCapeParams = activeScenario.withdrawalStrategy.capeParams ?? {
    a: 0.0175,
    b: 0.5,
  };
  const activeGkParams = activeScenario.withdrawalStrategy.gkParams ?? {
    guardrailWidth: 0.2,
    adjustmentSize: 0.1,
    suspendCapPreservationYears: 15,
  };
  const activeFloorCeiling = activeScenario.withdrawalStrategy.floorCeiling ?? {
    floor: 36_000,
    ceiling: 72_000,
  };
  const activeSpendingDeclineRate =
    activeScenario.withdrawalStrategy.spendingDeclineRate ?? 0.0125;
  const articleSources = articleReferenceIds
    .map((id) => getEducationReference(id))
    .filter(
      (
        reference,
      ): reference is NonNullable<ReturnType<typeof getEducationReference>> =>
        Boolean(reference),
    );

  const {
    backtestStatus,
    backtestError,
    comparisonSummaries,
    strategyComparisonRows,
    strategyComparisonSeries,
  } = useWithdrawalStrategyComparison({
    scenario: activeScenario,
    startingPortfolio,
    enabled: status === "ready",
    debounceMs: 250,
  });

  const visibleStrategies = useMemo<SupportedStrategyType[]>(
    () => [
      ...(strategyLenses.find((lens) => lens.id === selectedLens)?.strategies ??
        supportedStrategyTypes),
    ],
    [selectedLens],
  );
  const visibleSeries = strategyComparisonSeries.filter((series) =>
    visibleStrategies.includes(series.key as SupportedStrategyType),
  );
  const selectedSummary =
    comparisonSummaries.find((summary) => summary.type === selectedStrategy) ?? null;
  const selectedProfile = strategyProfiles[selectedStrategy];
  const baselineSelectedResult = selectedSummary?.result ?? null;

  const completedSummaries = useMemo(
    () => comparisonSummaries.filter((summary) => summary.result),
    [comparisonSummaries],
  );
  const steadiestSummary = useMemo(() => {
    if (completedSummaries.length === 0) {
      return null;
    }

    return completedSummaries.reduce((best, current) =>
      current.result!.withdrawalSummary.medianStdDev <
      best.result!.withdrawalSummary.medianStdDev
        ? current
        : best,
    );
  }, [completedSummaries]);
  const highestStartingSummary = useMemo(() => {
    if (completedSummaries.length === 0) {
      return null;
    }

    return completedSummaries.reduce((best, current) =>
      current.result!.withdrawalSummary.firstYearMedian >
      best.result!.withdrawalSummary.firstYearMedian
        ? current
        : best,
    );
  }, [completedSummaries]);
  const strongestSuccessSummary = useMemo(() => {
    if (completedSummaries.length === 0) {
      return null;
    }

    return completedSummaries.reduce((best, current) =>
      current.result!.successRate > best.result!.successRate ? current : best,
    );
  }, [completedSummaries]);

  const parameterOverlayRows = useMemo(() => {
    const baselineBand = baselineSelectedResult?.percentileBand ?? [];
    const adjustedBand = adjustedStrategyResult?.percentileBand ?? [];
    const years = new Set<number>();
    baselineBand.forEach((point) => years.add(point.year));
    adjustedBand.forEach((point) => years.add(point.year));
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => {
        const baselinePoint = baselineBand.find((point) => point.year === year);
        const adjustedPoint = adjustedBand.find((point) => point.year === year);
        return {
          year,
          baseline: baselinePoint?.withdrawal ?? null,
          adjusted: adjustedPoint?.withdrawal ?? null,
        };
      });
  }, [adjustedStrategyResult, baselineSelectedResult]);

  const parameterOverlaySeries = useMemo(
    () => [
      { key: "baseline", label: "Baseline", color: "var(--color-muted-foreground)" },
      { key: "adjusted", label: "Adjusted", color: "var(--ember)" },
    ],
    [],
  );

  const paramDeltaSummary = useMemo(() => {
    if (!baselineSelectedResult || !adjustedStrategyResult) {
      return null;
    }

    return {
      success: adjustedStrategyResult.successRate - baselineSelectedResult.successRate,
      firstYear:
        adjustedStrategyResult.withdrawalSummary.firstYearMedian -
        baselineSelectedResult.withdrawalSummary.firstYearMedian,
      volatility:
        adjustedStrategyResult.withdrawalSummary.medianStdDev -
        baselineSelectedResult.withdrawalSummary.medianStdDev,
      ending:
        adjustedStrategyResult.terminalValueStats.median -
        baselineSelectedResult.terminalValueStats.median,
    };
  }, [adjustedStrategyResult, baselineSelectedResult]);
  const noMaterialDelta = useMemo(() => {
    if (!paramDeltaSummary) {
      return false;
    }

    return (
      Math.abs(paramDeltaSummary.success) < 0.0005 &&
      Math.abs(paramDeltaSummary.firstYear) < 50 &&
      Math.abs(paramDeltaSummary.volatility) < 50 &&
      Math.abs(paramDeltaSummary.ending) < 250
    );
  }, [paramDeltaSummary]);

  function resetLabParams() {
    setLabParams({
      capeA:
        activeScenario.withdrawalStrategy.capeParams?.a ?? defaultLabParams.capeA,
      capeB:
        activeScenario.withdrawalStrategy.capeParams?.b ?? defaultLabParams.capeB,
      gkGuardrailWidth:
        activeScenario.withdrawalStrategy.gkParams?.guardrailWidth ??
        defaultLabParams.gkGuardrailWidth,
      gkAdjustmentSize:
        activeScenario.withdrawalStrategy.gkParams?.adjustmentSize ??
        defaultLabParams.gkAdjustmentSize,
      gkSuspendYears:
        activeScenario.withdrawalStrategy.gkParams?.suspendCapPreservationYears ??
        defaultLabParams.gkSuspendYears,
      floor:
        activeScenario.withdrawalStrategy.floorCeiling?.floor ??
        defaultLabParams.floor,
      ceiling:
        activeScenario.withdrawalStrategy.floorCeiling?.ceiling ??
        defaultLabParams.ceiling,
      smileDeclineRate:
        activeScenario.withdrawalStrategy.spendingDeclineRate ??
        defaultLabParams.smileDeclineRate,
    });
  }
  const activeRankerMode = useMemo(
    () =>
      rankerModes.find((mode) => mode.linkedLens === selectedLens) ??
      rankerModes[0],
    [selectedLens],
  );
  const rankingRows = useMemo(() => {
    const rows = comparisonSummaries
      .map((summary) => {
        const type = summary.type as SupportedStrategyType;
        const profile = strategyProfiles[type];
        const result = summary.result;
        return {
          type,
          label: summary.label,
          profile,
          result,
          success: result?.successRate ?? null,
          firstYearMedian: result?.withdrawalSummary.firstYearMedian ?? null,
          volatility: result?.withdrawalSummary.medianStdDev ?? null,
        };
      })
      .filter((row) => Boolean(row.profile));

    const scoredRows = rows.filter(
      (row): row is (typeof rows)[number] & {
        success: number;
        firstYearMedian: number;
        volatility: number;
      } =>
        row.success !== null &&
        row.firstYearMedian !== null &&
        row.volatility !== null,
    );

    if (scoredRows.length === 0) {
      return rows.map((row, index) => ({
        ...row,
        rank: index + 1,
        compositeScore: null as number | null,
      }));
    }

    const minFirstYear = Math.min(...scoredRows.map((row) => row.firstYearMedian));
    const maxFirstYear = Math.max(...scoredRows.map((row) => row.firstYearMedian));
    const minVolatility = Math.min(...scoredRows.map((row) => row.volatility));
    const maxVolatility = Math.max(...scoredRows.map((row) => row.volatility));
    const mode = activeRankerMode;

    const ranking = rows
      .map((row) => {
        if (
          row.success === null ||
          row.firstYearMedian === null ||
          row.volatility === null
        ) {
          return {
            ...row,
            compositeScore: null as number | null,
          };
        }

        const earlySpendingScore = normalizeMetric(
          row.firstYearMedian,
          minFirstYear,
          maxFirstYear,
        );
        const stabilityScore =
          1 - normalizeMetric(row.volatility, minVolatility, maxVolatility);
        const adaptabilityScore = row.profile.adaptabilityScore;
        const simplicityScore = 1 - row.profile.complexityScore;

        const compositeScore =
          row.success * mode.weights.success +
          stabilityScore * mode.weights.stability +
          adaptabilityScore * mode.weights.adaptability +
          earlySpendingScore * mode.weights.earlySpending +
          simplicityScore * mode.weights.simplicity;

        return {
          ...row,
          compositeScore,
        };
      })
      .sort((a, b) => {
        if (a.compositeScore === null && b.compositeScore === null) {
          return 0;
        }
        if (a.compositeScore === null) {
          return 1;
        }
        if (b.compositeScore === null) {
          return -1;
        }
        return b.compositeScore - a.compositeScore;
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    return ranking;
  }, [activeRankerMode, comparisonSummaries]);

  useEffect(() => {
    setSelectedStrategy(currentStrategy);
  }, [currentStrategy]);

  useEffect(() => {
    if (!visibleStrategies.includes(selectedStrategy)) {
      setSelectedStrategy(visibleStrategies[0]);
    }
  }, [selectedStrategy, visibleStrategies]);

  useEffect(() => {
    const chooserNode = strategyChooserRef.current;
    if (!chooserNode || typeof window === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyStrategyBar(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        );
      },
      {
        root: null,
        threshold: 0,
      },
    );

    observer.observe(chooserNode);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status !== "ready") {
      setParamLabStatus("idle");
      setParamLabError(null);
      setAdjustedStrategyResult(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++paramRequestTokenRef.current;
      setParamLabStatus("loading");
      setParamLabError(null);

      // Rescale all accounts proportionally so the "starting portfolio"
      // the user sets on this interactive sim actually matches the total
      // passed into the engine. Writing to accounts[0] alone would leak
      // other account balances into the sim total for multi-account
      // scenarios. See getFlexAccountIndex for the broader pattern.
      const nextScenario = buildScenarioForStartingPortfolio(
        activeScenario,
        startingPortfolio,
      );
      nextScenario.withdrawalStrategy.type = selectedStrategy;
      nextScenario.withdrawalStrategy.capeParams = {
        a: labParams.capeA,
        b: labParams.capeB,
      };
      nextScenario.withdrawalStrategy.gkParams = {
        guardrailWidth: labParams.gkGuardrailWidth,
        adjustmentSize: labParams.gkAdjustmentSize,
        suspendCapPreservationYears: Math.round(labParams.gkSuspendYears),
      };
      nextScenario.withdrawalStrategy.floorCeiling = {
        floor: labParams.floor,
        ceiling: labParams.ceiling,
      };
      nextScenario.withdrawalStrategy.spendingDeclineRate =
        labParams.smileDeclineRate;

      void runSimulation({
        kind: "historical",
        datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
        scenario: nextScenario,
      })
        .then((result) => {
          if (requestToken !== paramRequestTokenRef.current) {
            return;
          }
          setAdjustedStrategyResult(result as HistoricalBacktestResult);
          setParamLabStatus("ready");
        })
        .catch((error: Error) => {
          if (requestToken !== paramRequestTokenRef.current) {
            return;
          }
          setAdjustedStrategyResult(null);
          setParamLabStatus("error");
          setParamLabError(error.message);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeScenario, labParams, selectedStrategy, startingPortfolio, status]);

  return (
    <div className="space-y-10 pb-12">
      {showStickyStrategyBar ? (
        <div className="fixed inset-x-0 top-[4.5rem] z-30 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-border/60 bg-background/90 p-3 shadow-[0_8px_28px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Active strategy: {withdrawalStrategyMetadata[selectedStrategy].label}
              </p>
              <Link
                href="#strategy-chooser"
                className="text-xs font-medium text-[var(--ember)] hover:underline"
              >
                Jump to chooser
              </Link>
            </div>
            <div className="mt-2 overflow-x-auto">
              <div className="inline-flex min-w-max gap-2">
                {comparisonSummaries.map((summary) => {
                  const type = summary.type as SupportedStrategyType;
                  const isActive = type === selectedStrategy;
                  return (
                    <button
                      key={`sticky-${type}`}
                      type="button"
                      onClick={() => setSelectedStrategy(type)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "border-[rgba(255,107,53,0.28)] bg-[rgba(255,107,53,0.12)] text-foreground"
                          : "border-border/60 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {summary.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          How to choose a withdrawal strategy
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Fixed real, guardrails, VPW, RMD, and the tradeoffs between them
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The 4% rule is only one way to turn a portfolio into retirement income.
          Some retirees want the steadiest possible paycheck. Others are willing
          to cut or raise spending when markets move. Others deliberately spend
          more up front and accept that real income may drift lower later.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The right choice is not just about mathematical survival. It is about
          whether your household can tolerate spending cuts, how much valuation
          or portfolio noise you want in your paycheck, and how much ending
          wealth you care about leaving behind.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your current plan" hasData={hasData}>
          <div className="space-y-2 text-sm leading-relaxed text-foreground">
            <p>
              Calcifer is currently modeling your plan with{" "}
              <strong className="text-[var(--ember)]">
                {withdrawalStrategyMetadata[currentStrategy].label}
              </strong>
              . This guide is comparing the same eight rules from a starting
              portfolio of{" "}
              <strong>{formatCompactCurrency(startingPortfolio)}</strong> and a
              retirement spending target around{" "}
              <strong>{formatCompactCurrency(activeScenario.retirementExpenses)}/yr</strong>.
            </p>
            {backtestStatus === "ready" &&
            steadiestSummary &&
            highestStartingSummary &&
            strongestSuccessSummary ? (
              <p className="text-muted-foreground">
                On these inputs,{" "}
                <strong className="text-foreground">{steadiestSummary.label}</strong>{" "}
                is showing the narrowest median spending swings,{" "}
                <strong className="text-foreground">
                  {highestStartingSummary.label}
                </strong>{" "}
                starts the highest, and{" "}
                <strong className="text-foreground">
                  {strongestSuccessSummary.label}
                </strong>{" "}
                has the strongest historical survival.
              </p>
            ) : (
              <p className="text-muted-foreground">
                The article is using the same backtest engine as the Spend page,
                so the comparison blocks below refresh as your scenario changes.
              </p>
            )}
          </div>
        </PersonalizedInsight>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-6">
        <SectionHeading
          eyebrow="Interactive strategy ranker"
          title="Rank strategies by what your household values most"
          description="Pick the behavior your household values most, then review a preference-weighted ranking of the same eight strategies."
        />
        <div className="space-y-4 rounded-2xl border border-border/60 bg-card/35 p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-3">
            {strategyLenses
              .filter((lens) => lens.id !== "all")
              .map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setSelectedLens(lens.id)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-colors",
                    selectedLens === lens.id
                      ? "border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.08)]"
                      : "border-border/60 bg-card/40 hover:border-border hover:bg-card",
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{lens.label}</p>
                  <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
                    {lens.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {lens.description}
                  </p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-[var(--ember)]">
                    Focus these strategies
                  </p>
                </button>
              ))}
          </div>

          <div className="rounded-xl border border-border/60 bg-card/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Active priority
            </p>
            <p className="mt-1 text-sm text-foreground">{activeRankerMode.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeRankerMode.description}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted/55 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Strategy</th>
                  <th className="px-4 py-3 font-medium">What to expect</th>
                  <th className="px-4 py-3 font-medium">Best fit</th>
                </tr>
              </thead>
              <tbody>
                {rankingRows.map((row) => {
                  const isActive = row.type === selectedStrategy;
                  return (
                    <tr
                      key={row.type}
                      className={cn(
                        "cursor-pointer border-t border-border/60",
                        isActive && "bg-[rgba(255,107,53,0.08)]",
                      )}
                      onClick={() => setSelectedStrategy(row.type)}
                    >
                      <td className="px-4 py-3 font-semibold text-foreground">
                        #{row.rank}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--ember)]">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.profile.expectation}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.profile.fit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How this ranking is scored</p>
            <p className="mt-1">
              Scores are preference-weighted, not universal advice. We combine
              historical success rate, spending volatility, year-one median
              spending, strategy adaptability, and rule simplicity. Clicking a
              strategy row updates the detailed breakdown panel below.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-6">
        <SectionHeading
          eyebrow="Interactive comparison"
          title="See the strategies on your own plan"
          description="The chart below uses the same historical comparison engine as the Spend page, but with a lighter article-first UI."
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setComparisonMode("fire-target")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              comparisonMode === "fire-target"
                ? "border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.08)] text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Retirement-ready balance
          </button>
          <button
            type="button"
            onClick={() => setComparisonMode("current")}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              comparisonMode === "current"
                ? "border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.08)] text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            Current balance
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {comparisonMode === "fire-target"
            ? `This keeps the starting balance at ${formatCompactCurrency(
                fireTarget,
              )}, so the strategies are being compared from the same retirement-ready baseline.`
            : `This stress-tests your actual saved balance of ${formatCompactCurrency(
                currentBalance,
              )}, which is useful when you want to see how sensitive each rule is before full FI.`}
        </p>

        <div className="flex flex-wrap gap-2">
          {strategyLenses.map((lens) => (
            <button
              key={lens.id}
              type="button"
              onClick={() => setSelectedLens(lens.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                selectedLens === lens.id
                  ? "border-[rgba(255,107,53,0.24)] bg-[rgba(255,107,53,0.08)] text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {lens.label}
            </button>
          ))}
        </div>

        <div
          id="strategy-chooser"
          ref={strategyChooserRef}
          className="rounded-xl border border-border/60 bg-card/35 p-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Strategy chooser
          </p>
          <div className="mt-3 overflow-x-auto">
            <div className="inline-flex min-w-max gap-2">
              {comparisonSummaries.map((summary) => {
                const type = summary.type as SupportedStrategyType;
                const isActive = type === selectedStrategy;
                return (
                  <button
                    key={`inline-${type}`}
                    type="button"
                    onClick={() => setSelectedStrategy(type)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "border-[rgba(255,107,53,0.28)] bg-[rgba(255,107,53,0.12)] text-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {summary.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <ChartShell
          eyebrow="Strategy comparison"
          title="How spending changes under the visible strategies"
          description={
            strategyLenses.find((lens) => lens.id === selectedLens)?.description ??
            "Compare the supported withdrawal rules."
          }
        >
          <WithdrawalStrategyComparisonChart
            data={strategyComparisonRows}
            series={visibleSeries}
            ariaLabel="Line chart comparing median annual withdrawals for the selected retirement spending strategies."
          />
        </ChartShell>
        {backtestStatus === "loading" ? (
          <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-muted-foreground">
            Refreshing the strategy comparison for your latest plan inputs.
          </div>
        ) : null}
        {backtestStatus === "error" && backtestError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-900 dark:text-rose-100">
            Strategy comparison failed: {backtestError}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <SectionHeading
              eyebrow="Selected strategy"
              title={withdrawalStrategyMetadata[selectedStrategy].label}
              titleAs="h2"
              titleClassName="text-[2rem]"
              description={selectedProfile.headline}
            />
            <p className="text-sm text-muted-foreground">
              Choose any row in the ranking table above to update this detailed
              breakdown.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Rule of thumb
              </p>
              <p className="mt-3 font-mono text-sm text-foreground">
                {strategyRuleText({
                  type: selectedStrategy,
                  startingPortfolio,
                  retirementExpenses: activeScenario.retirementExpenses,
                  withdrawalRate: activeScenario.assumptions.withdrawalRate,
                  capeParams: activeCapeParams,
                  gkParams: activeGkParams,
                  floorCeiling: activeFloorCeiling,
                  spendingDeclineRate: activeSpendingDeclineRate,
                })}
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="text-sm font-medium text-foreground">Good fit when</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedProfile.fit}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="text-sm font-medium text-foreground">Main tradeoff</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedProfile.tradeoff}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="text-sm font-medium text-foreground">
                  How Calcifer implements it
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedProfile.implementation}
                </p>
              </div>
            </div>

            {selectedSummary?.result ? (
              <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Current scenario snapshot
                </p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>Success rate</span>
                    <span className="font-medium text-foreground">
                      {formatPercent(selectedSummary.result.successRate, 1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Average median spending</span>
                    <span className="font-medium text-foreground">
                      {formatCompactCurrency(
                        selectedSummary.result.withdrawalSummary.averageMedian,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Median ending value</span>
                    <span className="font-medium text-foreground">
                      {formatCompactCurrency(
                        selectedSummary.result.terminalValueStats.median,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Primary sources
              </p>
              {selectedProfile.sourceIds.map((sourceId) => {
                const source = getEducationReference(sourceId);
                if (!source) {
                  return null;
                }

                return (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border/60 bg-card/40 p-4 text-sm transition-colors hover:border-border hover:bg-card"
                  >
                    <p className="font-medium text-foreground">{source.label}</p>
                    {source.note ? (
                      <p className="mt-1 text-muted-foreground">{source.note}</p>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl space-y-5 px-6">
        <SectionHeading
          eyebrow="Parameter lab"
          title="Tune strategy parameters and watch outcomes move"
          description="This is the deeper learning sandbox. Baseline uses your current plan inputs; adjusted reflects the controls below."
        />
        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Controls"
                title={`${withdrawalStrategyMetadata[selectedStrategy].label} knobs`}
                titleAs="h3"
                titleClassName="text-[1.6rem]"
                description="Adjust only the parameters this strategy actually uses."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStrategy === "cape_dynamic" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Intercept (a)
                    </p>
                    <NumberInput
                      min={0}
                      max={0.06}
                      step={0.0005}
                      inputMode="decimal"
                      value={labParams.capeA}
                      onValueChange={(value) =>
                        setLabParams((current) => ({ ...current, capeA: value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Coefficient (b)
                    </p>
                    <NumberInput
                      min={0}
                      max={2}
                      step={0.01}
                      inputMode="decimal"
                      value={labParams.capeB}
                      onValueChange={(value) =>
                        setLabParams((current) => ({ ...current, capeB: value }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedStrategy === "guyton_klinger" ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Guardrail width
                    </p>
                    <NumberInput
                      min={0.05}
                      max={0.5}
                      step={0.01}
                      inputMode="decimal"
                      value={labParams.gkGuardrailWidth}
                      onValueChange={(value) =>
                        setLabParams((current) => ({
                          ...current,
                          gkGuardrailWidth: value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Adjustment size
                    </p>
                    <NumberInput
                      min={0.01}
                      max={0.25}
                      step={0.01}
                      inputMode="decimal"
                      value={labParams.gkAdjustmentSize}
                      onValueChange={(value) =>
                        setLabParams((current) => ({
                          ...current,
                          gkAdjustmentSize: value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Cutoff years
                    </p>
                    <NumberInput
                      min={0}
                      max={40}
                      step={1}
                      inputMode="numeric"
                      value={labParams.gkSuspendYears}
                      onValueChange={(value) =>
                        setLabParams((current) => ({
                          ...current,
                          gkSuspendYears: value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedStrategy === "floor_ceiling" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Floor spending
                    </p>
                    <NumberInput
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={labParams.floor}
                      onValueChange={(value) =>
                        setLabParams((current) => ({ ...current, floor: value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Ceiling spending
                    </p>
                    <NumberInput
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={labParams.ceiling}
                      onValueChange={(value) =>
                        setLabParams((current) => ({ ...current, ceiling: value }))
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedStrategy === "spending_smile" ? (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Real decline rate
                  </p>
                  <NumberInput
                    min={0}
                    max={0.05}
                    step={0.001}
                    inputMode="decimal"
                    value={labParams.smileDeclineRate}
                    onValueChange={(value) =>
                      setLabParams((current) => ({
                        ...current,
                        smileDeclineRate: value,
                      }))
                    }
                  />
                </div>
              ) : null}

              {!["cape_dynamic", "guyton_klinger", "floor_ceiling", "spending_smile"].includes(
                selectedStrategy,
              ) ? (
                <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                  This strategy has minimal direct parameters. Change withdrawal
                  rate, plan horizon, and portfolio mode to explore behavior.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={resetLabParams}>
                  Reset parameters
                </Button>
                <Link
                  href="/withdrawal?tab=compare"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
                >
                  Open these in Spend →
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Outcome deltas"
                title="Baseline vs adjusted"
                titleAs="h3"
                titleClassName="text-[1.6rem]"
                description="How parameter changes alter survivability, income shape, and ending wealth."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-card/35 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Success rate delta
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {paramDeltaSummary
                      ? formatSignedPercent(paramDeltaSummary.success, 2)
                      : "—"}
                  </p>
                  {baselineSelectedResult && adjustedStrategyResult ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPercent(baselineSelectedResult.successRate, 1)} →{" "}
                      {formatPercent(adjustedStrategyResult.successRate, 1)}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-border/60 bg-card/35 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Year-one median delta
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {paramDeltaSummary
                      ? formatSignedCurrency(paramDeltaSummary.firstYear)
                      : "—"}
                  </p>
                  {baselineSelectedResult && adjustedStrategyResult ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(
                        baselineSelectedResult.withdrawalSummary.firstYearMedian,
                      )}{" "}
                      →{" "}
                      {formatCurrency(
                        adjustedStrategyResult.withdrawalSummary.firstYearMedian,
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-border/60 bg-card/35 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Volatility delta
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {paramDeltaSummary
                      ? formatSignedCurrency(paramDeltaSummary.volatility)
                      : "—"}
                  </p>
                  {baselineSelectedResult && adjustedStrategyResult ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(
                        baselineSelectedResult.withdrawalSummary.medianStdDev,
                      )}{" "}
                      →{" "}
                      {formatCurrency(
                        adjustedStrategyResult.withdrawalSummary.medianStdDev,
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-border/60 bg-card/35 p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Ending wealth delta
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {paramDeltaSummary
                      ? formatSignedCurrency(paramDeltaSummary.ending)
                      : "—"}
                  </p>
                  {baselineSelectedResult && adjustedStrategyResult ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(
                        baselineSelectedResult.terminalValueStats.median,
                      )}{" "}
                      →{" "}
                      {formatCurrency(adjustedStrategyResult.terminalValueStats.median)}
                    </p>
                  ) : null}
                </div>
              </div>
              {noMaterialDelta ? (
                <div className="rounded-xl border border-border/60 bg-card/35 p-4 text-sm text-muted-foreground">
                  No material change yet under this scenario. Try larger
                  parameter moves, a different strategy, or switch to current
                  balance mode for a more sensitive stress test.
                </div>
              ) : null}

              <ChartShell
                eyebrow="Before / after"
                title="Median spending path overlay"
                description="Dashed baseline versus adjusted settings for the same strategy."
              >
                <WithdrawalStrategyComparisonChart
                  data={parameterOverlayRows}
                  series={parameterOverlaySeries}
                  ariaLabel="Line chart comparing baseline and adjusted median spending paths for the selected strategy."
                />
              </ChartShell>

              {paramLabStatus === "loading" ? (
                <p className="text-sm text-muted-foreground">
                  Recomputing adjusted outcome...
                </p>
              ) : null}
              {paramLabStatus === "error" && paramLabError ? (
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  Could not compute adjusted outcome: {paramLabError}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-5 px-6">
        <SectionHeading
          eyebrow="Research takeaways"
          title="What the literature says, and what it does not"
          description="The sources are useful, but none of them can choose your lifestyle flexibility for you."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-medium text-foreground">
              Fixed 4% research is a baseline, not a universal answer
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bengen and Trinity-style studies are foundational, but they were
              built around historical cohorts and classic retirement horizons.
              FIRE timelines, valuation starting points, and household
              flexibility can justify looking beyond a single flat real rule.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-medium text-foreground">
              Flexible rules buy resilience by asking you to react
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Guardrails, CAPE-based rules, VPW, and constant-percentage methods
              can support higher spending or stronger durability, but only if
              you can live with the paycheck moving when the rule says it
              should.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-medium text-foreground">
              Behavioral fit matters as much as backtest fit
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A mathematically elegant rule can still fail in real life if your
              household cannot stomach a 10% cut, valuation-sensitive spending,
              or a planned decline in travel and discretionary spending later in
              retirement.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-5 px-6">
        <SectionHeading
          eyebrow="Sources"
          title="Research and methodology references"
          description="These are the primary sources used to frame the strategies in this guide."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {articleSources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-border hover:bg-card"
            >
              <p className="font-medium text-foreground">{source.label}</p>
              {source.note ? (
                <p className="mt-2 text-sm text-muted-foreground">{source.note}</p>
              ) : null}
            </a>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Calcifer supports all {supportedStrategyTypes.length} strategies in the
          Spend workspace, but some are direct literature-backed rules and some
          are simpler planning heuristics chosen because they are transparent,
          auditable, and useful for side-by-side comparison.
        </p>
        <p className="text-sm text-muted-foreground">
          The Learn hub already includes{" "}
          <strong>{withdrawalStrategyReferences.length}</strong> strategy-specific
          references, and this article uses that same shared source set so the
          app and the educational content stay aligned.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Next steps
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/withdrawal"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Compare them in your plan
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open Spend and tune the strategy-specific controls.
            </p>
          </Link>
          <Link
            href="/tax-strategy"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Build the income plan
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Layer taxes, account sequencing, and guaranteed income on top.
            </p>
          </Link>
          <Link
            href="/education"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Explore more FIRE topics
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jump back to the Learn hub for the rest of the explainers.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/withdrawal"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Open your Spend plan →
          </Link>
          <Link
            href="/education"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            ← Back to Learn
          </Link>
        </div>
      </section>
    </div>
  );
}
