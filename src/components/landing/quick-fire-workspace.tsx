"use client";

import type { Route } from "next";
import Link from "next/link";
import { Copy, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChartShell,
  PageHero,
} from "@/components/brand";
import { useHasExistingDraft } from "@/lib/hooks/use-has-existing-draft";
import { ProjectionChart, ChartLegend, findCrossoverYear } from "@/components/landing/projection-chart";
import { US_BENCHMARKS, estimateNetWorthPercentile, getMedianNetWorthForAge } from "@/lib/data/benchmarks";
import { buildScenarioProjection } from "@/lib/calc/quick-fire";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";
import {
  calculateFireTypeSummaries,
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatPercent,
  formatYears,
  getEmployerMatchTotal,
  getHouseholdAnnualIncome,
  getNetCashFlowAtAge,
  getPlannedAnnualInvestmentContribution,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { estimateScenarioTax } from "@/lib/tax";
import {
  cloneScenario,
} from "@/lib/domain";
import type {
  FilingStatus,
  Scenario,
} from "@/lib/domain/types";
import { getCountryPreset } from "@/lib/data";
import { SCENARIO_QUERY_KEY } from "@/lib/share";
import {
  buildScenarioShareUrl,
  deserializeScenarioFromSearchParam,
} from "@/lib/share";
import { useDrawerStore, useScenarioStore } from "@/lib/store";
import { MoneyFlowSankey } from "@/components/charts/money-flow-sankey";
import { InlineControls } from "@/components/plan/inline-controls";
import { cn } from "@/lib/utils";

function syncScenarioRollups(nextScenario: Scenario) {
  nextScenario.annualSavings = nextScenario.accounts.reduce(
    (total, account) => total + account.annualContribution,
    0,
  );

  return nextScenario;
}

export function QuickFireWorkspace({
  variant = "landing",
}: {
  variant?: "landing" | "module";
}) {
  const {
    activeScenario,
    status,
    saveStatus,
    initialize,
    replaceScenario,
    resetScenario,
    saveDraft,
    updateAnnualSavings,
    updateCountry,
    updateCurrentBalance,
    updateCurrency,
    updateExpenses,
    updateExpectedRealReturn,
    updateIncome,
    updatePartTimeIncome,
    setPartnerPlanningEnabled,
    updatePartnerAge,
    updatePartnerHealthStatus,
    updatePartnerIncome,
    updatePartnerName,
    updatePartnerRetirementAge,
    updateProfileAge,
    updateRetirementAge,
    updateSaferWithdrawalRate,
    updateWithdrawalRate,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const hasInitialized = useRef(false);
  const [copied, setCopied] = useState(false);
  const [showAdvancedLandingInputs, setShowAdvancedLandingInputs] = useState(false);
  const [expenseInputMode, setExpenseInputMode] = useState<"annual" | "monthly">(
    "annual",
  );
  const { hasDraft } = useHasExistingDraft();
  const showWizard =
    variant === "landing" && !sharedScenarioParam && hasDraft === false;

  useGlobalScenarioFormatting(activeScenario);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    void initialize(
      sharedScenarioParam
        ? deserializeScenarioFromSearchParam(sharedScenarioParam)
        : undefined,
    );
  }, [initialize, sharedScenarioParam]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDraft();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeScenario, saveDraft, status]);

  // Clear the shared scenario URL param after loading it so the banner doesn't persist
  useEffect(() => {
    if (status !== "ready" || !sharedScenarioParam) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(SCENARIO_QUERY_KEY);
    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    router.replace(nextUrl as Route, { scroll: false });
  }, [status, sharedScenarioParam, pathname, router, searchParams]);

  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );
  const fireTypes = useMemo(
    () => calculateFireTypeSummaries(activeScenario),
    [activeScenario],
  );
  const countryPreset = useMemo(
    () => getCountryPreset(activeScenario.profile.country),
    [activeScenario.profile.country],
  );
  const currentBalance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );
  const chartTableRows = useMemo(
    () =>
      summary.projection.filter(
        (point, index) =>
          index === 0 ||
          index === summary.projection.length - 1 ||
          point.year % 5 === 0,
      ),
    [summary.projection],
  );

  function handleCountryChange(value: string) {
    const nextCountryPreset = getCountryPreset(value);
    updateCountry(nextCountryPreset.code);
    updateCurrency(nextCountryPreset.currency);
  }

  const progressToFire =
    summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0;
  const landingNextStep = useMemo(() => {
    if (sharedScenarioParam) {
      return {
        label: "Keep editing this shared scenario",
        description:
          "Review the assumptions, make it your own, and copy a fresh link when you are ready to send it back.",
        href: "/accumulation" as Route,
        cta: "Open the full planner",
      };
    }

    if (progressToFire >= 1) {
      return {
        label: "Your portfolio exceeds your target",
        description:
          "Based on your assumptions, you've reached financial independence. Stress-test whether your plan will last through retirement.",
        href: "/withdrawal" as Route,
        cta: "Stress-test your retirement",
      };
    }

    if (progressToFire >= 0.75 || (summary.yearsToFi !== null && summary.yearsToFi <= 10)) {
      return {
        label: "Stress-test retirement readiness",
        description:
          "You are close enough that historical backtests, Monte Carlo, and withdrawal strategy comparisons now matter.",
        href: "/withdrawal" as Route,
        cta: "Test retirement durability",
      };
    }

    if (activeScenario.accounts.length > 1 || activeScenario.cashFlows.length > 0) {
      return {
        label: "Open the full planner",
        description:
          "Move into the richer planning workspace to model multiple accounts, cash flows, and deeper assumptions.",
        href: "/accumulation" as Route,
        cta: "Open the full planner",
      };
    }

    return {
      label: "Take the FIRE type quiz",
      description:
        "The quiz turns this first answer into a path that better matches your lifestyle, flexibility, and retirement style.",
      href: "/quiz" as Route,
      cta: "Take the FIRE type quiz",
    };
  }, [
    activeScenario.accounts.length,
    activeScenario.cashFlows.length,
    progressToFire,
    sharedScenarioParam,
    summary.yearsToFi,
  ]);
  const landingAlternateCta =
    landingNextStep.href === "/quiz"
      ? ({
          href: "/accumulation",
          label: "Open the full planner",
        } as const)
      : ({
          href: "/quiz",
          label: "Take the FIRE type quiz",
        } as const);
  const headerTitle =
    variant === "landing"
      ? "See your FIRE number, timeline, and next best step"
      : "Build the full FIRE plan";
  const headerDescription =
    variant === "landing"
      ? "Start with a few numbers, get a first answer fast, and then move into the right tool for your stage instead of sorting through every feature at once."
      : "Use the richer planning workspace when you need multiple accounts, cash-flow events, partner planning, and more control over the model.";
  const heroEyebrow =
    variant === "landing"
      ? sharedScenarioParam
        ? "Shared scenario"
        : "Start here"
      : "Full planner";
  const heroBadges =
    variant === "landing"
      ? [
          { label: "No account required" },
          { label: "Research-backed", variant: "secondary" as const },
          { label: "Local-first", variant: "outline" as const },
        ]
      : [
          { label: "Accounts and cash flows" },
          { label: "Partner-ready", variant: "secondary" as const },
          { label: "Scenario-based", variant: "outline" as const },
        ];
  const plannedContribution = useMemo(
    () => getPlannedAnnualInvestmentContribution(activeScenario),
    [activeScenario],
  );
  const employerMatchTotal = useMemo(
    () => getEmployerMatchTotal(activeScenario),
    [activeScenario],
  );
  const netCashFlowNow = useMemo(
    () => getNetCashFlowAtAge(activeScenario, activeScenario.profile.age),
    [activeScenario],
  );
  const taxEstimate = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );
  const projectionWithMilestones = useMemo(() => {
    if (!fireTypes.length) return [];
    const traditionalTarget = fireTypes.find((ft) => ft.id === "traditional")?.target ?? 0;
    const baristaTarget = fireTypes.find((ft) => ft.id === "barista")?.target ?? 0;
    const retirementAge = activeScenario.profile.retirementAge ?? activeScenario.profile.age + 15;
    const realReturn = activeScenario.assumptions.expectedRealReturn;
    const startBalance = summary.projection[0]?.balance ?? 0;

    // Coast FIRE target is DYNAMIC — it changes each year as remaining years shrink.
    // At any given year, coastTarget = fireNumber / (1 + return) ^ yearsRemaining.
    // Only valid if FIRE is achievable by retirement age.
    const fireYear = summary.projection.findIndex((p, idx) => idx > 0 && p.balance >= traditionalTarget);
    const fireAchievableByRetirement = fireYear >= 0 && (activeScenario.profile.age + fireYear) <= retirementAge;

    // Static milestone targets (non-Coast)
    const staticMilestones = [
      ...(activeScenario.assumptions.partTimeIncome > 0
        ? [{ label: "Barista FIRE", target: baristaTarget }]
        : []),
      { label: "FIRE", target: traditionalTarget },
    ].filter((m) => m.target > 0 && m.target > startBalance).sort((a, b) => a.target - b.target);

    const crossed = new Set<string>();
    let coastCrossed = false;
    return summary.projection.map((point, i) => {
      // Check Coast FIRE dynamically: only if FIRE is achievable by retirement
      let coastMilestone: { label: string } | null = null;
      if (fireAchievableByRetirement && !coastCrossed && i > 0) {
        const yearsRemaining = Math.max(retirementAge - point.age, 0);
        if (yearsRemaining > 0) {
          const dynamicCoastTarget = summary.fireNumber / (1 + realReturn) ** yearsRemaining;
          if (point.balance >= dynamicCoastTarget && dynamicCoastTarget > 0) {
            coastMilestone = { label: "Coast FIRE" };
            coastCrossed = true;
          }
        }
      }

      // Check static milestones (Barista, FIRE)
      const staticMilestone = staticMilestones.find(
        (m) => !crossed.has(m.label) && point.balance >= m.target && m.target > 0,
      );
      if (staticMilestone) crossed.add(staticMilestone.label);

      // Coast takes priority if both trigger same year (unlikely but possible)
      const milestone = coastMilestone ?? staticMilestone ?? null;
      if (milestone && coastMilestone) crossed.add("Coast FIRE");
      // Don't show milestones that trigger on the very first data point (year 0)
      const effectiveMilestone = (milestone && i === 0) ? null : milestone;
      // Use enriched projection data when available, fall back to estimate
      const prevBalance = i > 0 ? summary.projection[i - 1].balance : point.balance;
      const estimatedGrowth = i > 0 ? point.balance - prevBalance - plannedContribution : 0;
      const growth = point.growth ?? estimatedGrowth;
      const contribution = point.contribution ?? (i > 0 ? plannedContribution : 0);
      return {
        ...point,
        growth: Math.round(growth),
        contribution: Math.round(contribution),
        pctToFi: summary.fireNumber > 0 ? point.balance / summary.fireNumber : 0,
        milestone: effectiveMilestone?.label ?? null,
      };
    });
  }, [summary, fireTypes, activeScenario, plannedContribution]);

  // Crossover: the year growth exceeds contributions
  const crossover = useMemo(
    () => findCrossoverYear(summary.projection, plannedContribution),
    [summary.projection, plannedContribution],
  );

  // Uncertainty bands: ±2% return projections
  const [showBands, setShowBands] = useState(false);
  const bandProjections = useMemo(() => {
    if (!showBands) return undefined;
    const baseReturn = activeScenario.assumptions.expectedRealReturn;
    const years = summary.projection.length;
    const pessimistic = buildScenarioProjection({
      scenario: { ...activeScenario, assumptions: { ...activeScenario.assumptions, expectedRealReturn: Math.max(baseReturn - 0.02, 0) } },
      targetBalance: summary.fireNumber,
      years,
    });
    const optimistic = buildScenarioProjection({
      scenario: { ...activeScenario, assumptions: { ...activeScenario.assumptions, expectedRealReturn: baseReturn + 0.02 } },
      targetBalance: summary.fireNumber,
      years,
    });
    return { pessimistic, optimistic };
  }, [showBands, activeScenario, summary.fireNumber, summary.projection.length]);

  // Enriched milestones with descriptions
  const enrichedMilestones = useMemo(() => {
    if (variant !== "module") return [];
    const retAge = activeScenario.profile.retirementAge ?? activeScenario.profile.age;
    const wr = activeScenario.assumptions.withdrawalRate;
    const expenses = activeScenario.retirementExpenses || activeScenario.annualExpenses;
    const partTime = activeScenario.assumptions.partTimeIncome;
    return projectionWithMilestones
      .filter((p) => p.milestone && p.year > 0)
      .map((p) => {
        const label = p.milestone!;
        let target = 0;
        let description = "";
        if (label === "Coast FIRE") {
          const coastT = summary.fireNumber / (1 + activeScenario.assumptions.expectedRealReturn) ** Math.max(retAge - activeScenario.profile.age, 1);
          target = coastT;
          description = `At ${formatCompactCurrency(coastT)} saved, you could stop saving entirely and compounding finishes the job by retirement at ${retAge}.`;
        } else if (label === "FIRE") {
          target = summary.fireNumber;
          description = `Financial independence. ${formatCompactCurrency(summary.fireNumber)} sustains ${formatCompactCurrency(expenses)}/year at a ${(wr * 100).toFixed(0)}% withdrawal rate.`;
        } else if (label === "Barista FIRE") {
          const baristaT = fireTypes.find((ft) => ft.id === "barista")?.target ?? 0;
          target = baristaT;
          description = `Switch to part-time earning ${formatCompactCurrency(partTime)}/yr — your portfolio of ${formatCompactCurrency(baristaT)} covers the rest.`;
        }
        return { year: p.year, label, target, description };
      });
  }, [projectionWithMilestones, summary, activeScenario, fireTypes, variant]);

  const alreadyFi = progressToFire >= 1;
  const snapshotNarrative =
    alreadyFi
      ? `Your portfolio of ${formatCompactCurrency(currentBalance)} already exceeds your FIRE target of ${formatCompactCurrency(summary.fireNumber)}, based on your current assumptions. The next step is stress-testing whether your plan will last.`
      : summary.yearsToFi === null
        ? `Your current settings do not yet reach ${formatCompactCurrency(
            summary.fireNumber,
          )}. Lower spending, higher savings, or a later target retirement age will move the plan back into range.`
        : `At this pace, ${activeScenario.name.toLowerCase()} reaches about ${formatCompactCurrency(
            summary.fireNumber,
          )} in ${formatYears(summary.yearsToFi)}. That puts your current FIRE age near ${summary.fireAge}.`;
  const expenseInputValue =
    expenseInputMode === "monthly"
      ? Math.round(activeScenario.annualExpenses / 12)
      : activeScenario.annualExpenses;
  const coastFireSummary = fireTypes.find((entry) => entry.id === "coast") ?? null;
  const coupleSummary = activeScenario.profile.partner
    ? `${activeScenario.profile.name || "Primary"} targets retirement at ${
        activeScenario.profile.retirementAge ?? activeScenario.profile.age
      }, while ${activeScenario.profile.partner.name} targets ${
        activeScenario.profile.partner.retirementAge ??
        activeScenario.profile.partner.age
      }. Household income currently models ${formatCompactCurrency(
        getHouseholdAnnualIncome(activeScenario),
      )} per year.`
    : null;
  function updateScenario(mutator: (scenario: Scenario) => void) {
    const nextScenario = cloneScenario(activeScenario);
    mutator(nextScenario);
    replaceScenario(syncScenarioRollups(nextScenario));
  }

  async function handleCopyShareLink() {
    if (typeof window === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(
      buildScenarioShareUrl(`${window.location.origin}${pathname}`, activeScenario),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  function handlePrintSnapshot() {
    if (typeof window === "undefined") {
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-10 pb-12">
      {variant === "landing" && sharedScenarioParam ? (
        <section className="mx-auto max-w-7xl px-6 pt-6">
          <div className="rounded-3xl border border-[rgba(255,107,53,0.22)] bg-card/70 p-6 shadow-[var(--shadow-soft)]">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]">
              Shared scenario
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl space-y-2">
                <p className="text-lg font-medium text-foreground">
                  You opened Calcifer from a shared link.
                </p>
                <p className="text-sm text-muted-foreground">
                  Review the numbers, adjust anything you want, and copy a fresh share
                  link when you are ready. Your local draft stays editable without
                  needing an account.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" onClick={handleCopyShareLink}>
                  <Copy className="size-4" />
                  {copied ? "Copied this version" : "Copy this version"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetScenario}>
                  <RotateCcw className="size-4" />
                  Start from scratch
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {variant === "landing" ? (
        showWizard ? (
          <>
            <PageHero
              title="Know your number. Plan your freedom."
              description="A research-backed FIRE calculator that stays private, shows its math, and meets you where you are."
              actions={
                <Button asChild>
                  <Link href={"/quiz" as Route}>Take the FIRE quiz</Link>
                </Button>
              }
            />
            <section className="mx-auto max-w-7xl px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Link
                  href={"/quiz" as Route}
                  className="group rounded-2xl bg-card p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">New to FIRE?</p>
                  <h3 className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
                    Take the quiz
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Answer 10 questions and get a personalized FIRE type, target number, and a clear next step.
                  </p>
                  <p className="mt-4 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                    Start the quiz →
                  </p>
                </Link>
                <Link
                  href={"/accumulation" as Route}
                  className="group rounded-2xl bg-card p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Know your numbers?</p>
                  <h3 className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
                    Open Your Plan
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Jump straight into tax-aware projections, year-by-year milestones, and what-if analysis.
                  </p>
                  <p className="mt-4 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                    Go to planner →
                  </p>
                </Link>
              </div>
            </section>
            <section className="mx-auto max-w-7xl px-6">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                What you can do here
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "Tax-aware projections", desc: "See your after-tax savings rate, estimated taxes, and real take-home pay." },
                  { title: "Year-by-year milestones", desc: "Watch your portfolio grow with Coast FIRE, Barista FIRE, and full FIRE marked on the timeline." },
                  { title: "What-if analysis", desc: "See how changes to savings, returns, or lifestyle creep shift your timeline." },
                  { title: "Stress-test retirement", desc: "Run historical backtests and Monte Carlo simulations against 150+ years of market data." },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]"
                  >
                    <p className="font-medium text-foreground">{feature.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Section 1: Hero Status Bar */}
            <section className="mx-auto max-w-7xl px-6 pt-8">
              <button
                type="button"
                onClick={() => drawerStore.open("basics")}
                className="group w-full rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {(() => {
                        if (progressToFire >= 1) return "\u2705";
                        if (progressToFire >= 0.9) return "\uD83D\uDD25";
                        const coastType = fireTypes.find((ft) => ft.id === "coast");
                        const baristaType = fireTypes.find((ft) => ft.id === "barista");
                        if (coastType && coastType.progress >= 0.9) return "\u2615";
                        if (baristaType && activeScenario.assumptions.partTimeIncome > 0 && baristaType.progress >= 0.9) return "\u2615";
                        return "\uD83D\uDD25";
                      })()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg tracking-[-0.02em] text-foreground">
                        {(() => {
                          if (progressToFire >= 1) return "Financially independent";
                          if (progressToFire >= 0.9) return "Within reach";
                          const coastType = fireTypes.find((ft) => ft.id === "coast");
                          if (coastType && coastType.progress >= 1) return "Coast FIRE";
                          return "Traditional FIRE";
                        })()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {progressToFire >= 1
                      ? "based on your current assumptions"
                      : <>Target:{" "}
                          <span className="font-semibold text-foreground">
                            {formatCompactCurrency(summary.fireNumber)}
                          </span>
                        </>
                    }
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] transition-all duration-500"
                      style={{ width: `${Math.min(progressToFire * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {formatPercent(Math.min(progressToFire, 1), 0)}
                    </span>
                    {" · "}
                    {formatCompactCurrency(currentBalance)} of {formatCompactCurrency(summary.fireNumber)}
                  </p>
                </div>

                {/* Inline metrics */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {progressToFire >= 1 ? (
                    <span>
                      Portfolio exceeds target by{" "}
                      <span className="font-semibold text-foreground">
                        {formatCompactCurrency(currentBalance - summary.fireNumber)}
                      </span>
                    </span>
                  ) : summary.fireAge !== null ? (
                    <span>
                      FI at age{" "}
                      <span className="font-semibold text-foreground">{Math.round(summary.fireAge)}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">FI age not yet reachable</span>
                  )}
                  <span className="text-border">{"\u00B7"}</span>
                  {progressToFire >= 1 ? (
                    <span>
                      <span className="font-semibold text-foreground">{formatCompactCurrency(currentBalance)}</span>
                      {" "}of{" "}{formatCompactCurrency(summary.fireNumber)}{" "}target
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold text-foreground">{formatYears(summary.yearsToFi)}</span>
                      {" "}away
                    </span>
                  )}
                  <span className="text-border">{"\u00B7"}</span>
                  <span>
                    <span className="font-semibold text-foreground">{formatPercent(summary.savingsRate, 0)}</span>
                    {" "}savings rate
                  </span>
                </div>
              </button>
            </section>

            {/* Section 2: Your Numbers */}
            <section className="mx-auto max-w-7xl px-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {/* Take-home */}
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Take-home</p>
                  <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(taxEstimate.takeHome)}
                    <span className="text-base font-normal text-muted-foreground">/yr</span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">After federal + state taxes</p>
                </div>

                {/* Savings */}
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Savings</p>
                  <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(taxEstimate.actualSavings)}
                    <span className="text-base font-normal text-muted-foreground">/yr</span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatPercent(taxEstimate.afterTaxSavingsRate, 0)} rate
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    US average: {(US_BENCHMARKS.savingsRate * 100).toFixed(1)}%
                  </p>
                </div>

                {/* Tax Estimate */}
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Tax estimate</p>
                  <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(taxEstimate.totalTax)}
                    <span className="text-base font-normal text-muted-foreground">/yr</span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatPercent(taxEstimate.effectiveRate, 0)} effective
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {activeScenario.profile.filingStatus === "single"
                      ? "Single filer"
                      : activeScenario.profile.filingStatus === "married_joint"
                        ? "Married filing jointly"
                        : activeScenario.profile.filingStatus === "married_separate"
                          ? "Married filing separately"
                          : "Head of household"}
                  </p>
                </div>

                {/* Peer Comparison */}
                {(() => {
                  const age = activeScenario.profile.age;
                  const percentile = estimateNetWorthPercentile(currentBalance, age);
                  const { median: medianForAge } = getMedianNetWorthForAge(age);
                  return (
                    <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">You vs peers</p>
                      <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                        Top {100 - percentile}%
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        for age {age}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Median: {formatCompactCurrency(medianForAge)}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Section 2.5: Money Flow Sankey */}
            {activeScenario.annualIncome > 0 && (
              <section className="mx-auto max-w-7xl px-6">
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
                    Where your money goes
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    How your gross income flows through taxes, spending, and into your investment accounts.
                  </p>
                  <MoneyFlowSankey scenario={activeScenario} />
                </div>
              </section>
            )}

            {/* Section 3: Three Paths to Freedom */}
            <section className="mx-auto max-w-7xl px-6">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                Your paths to freedom
              </h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {fireTypes
                  .filter((ft) => ft.id === "traditional" || ft.id === "coast" || ft.id === "barista")
                  .map((ft) => {
                    const hasPostFireIncome = activeScenario.assumptions.partTimeIncome > 0;
                    const baristaNoIncome = ft.id === "barista" && !hasPostFireIncome;
                    const isRecommended = (() => {
                      if (alreadyFi) return ft.id === "traditional";
                      const coastType = fireTypes.find((t) => t.id === "coast");
                      if (coastType && coastType.progress >= 1) return ft.id === "coast";
                      return ft.id === "traditional";
                    })();
                    const cta =
                      ft.id === "traditional"
                        ? "Open Your Plan"
                        : ft.id === "coast"
                          ? "Explore Coast FI"
                          : "Explore Barista FI";
                    const href =
                      ft.id === "traditional"
                        ? "/accumulation"
                        : ft.id === "coast"
                          ? "/accumulation"
                          : "/accumulation";
                    return (
                      <div
                        key={ft.id}
                        className="flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
                              {ft.label}
                            </p>
                          </div>
                          {ft.id === "coast" && summary.coastAge !== null ? (
                            <>
                              <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                                Age {Math.round(summary.coastAge)}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {Math.max(Math.round(summary.coastAge) - activeScenario.profile.age, 0)} years from now · need {formatCompactCurrency(ft.target)} today
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                              {formatCompactCurrency(ft.target)}
                            </p>
                          )}
                          <div className="mt-3 space-y-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]"
                                style={{ width: `${Math.min(Math.max(ft.progress, 0), 1) * 100}%` }}
                              />
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-muted-foreground">
                            {baristaNoIncome
                              ? "Work part-time in retirement to supplement a smaller portfolio. Add expected post-FIRE income in your plan to see the target."
                              : ft.description}
                          </p>
                        </div>
                        <div className="mt-4 border-t border-border/40 pt-4">
                          <Link
                            href={href as Route}
                            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                          >
                            {cta} {"\u2192"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* Section 4: Quick Actions */}
            <section className="mx-auto max-w-7xl px-6">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                Explore your tools
              </h2>
              {alreadyFi && (
                <Link
                  href={"/withdrawal" as Route}
                  className="group mt-4 block rounded-2xl border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.04)] p-6 transition-all hover:border-[rgba(99,102,241,0.35)]"
                >
                  <p className="font-display text-lg tracking-[-0.02em] text-foreground">
                    You've reached your target. See if your plan will last.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Run historical backtests and Monte Carlo simulations to stress-test your withdrawal strategy.
                  </p>
                  <p className="mt-3 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                    Stress-test your retirement {"\u2192"}
                  </p>
                </Link>
              )}
              <div className={cn("mt-4 grid gap-4 lg:grid-cols-3", alreadyFi && "lg:grid-cols-3")}>
                {/* Spend — shown first for post-FI users */}
                <div className={cn(
                  "rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]",
                  alreadyFi && "order-first",
                )}>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(99,102,241,0.1)]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <h3 className="font-semibold text-foreground">Spend</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Link
                      href={"/withdrawal" as Route}
                      className="group block"
                    >
                      <p className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                        Can I retire? {"\u2192"}
                      </p>
                      <p className="text-xs text-muted-foreground">Historical backtests and Monte Carlo stress tests.</p>
                    </Link>
                    <Link
                      href={"/tax-strategy" as Route}
                      className="group block"
                    >
                      <p className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                        Income plan {"\u2192"}
                      </p>
                      <p className="text-xs text-muted-foreground">Roth conversions, drawdown sequencing, and ACA planning.</p>
                    </Link>
                  </div>
                </div>

                {/* Save — de-emphasized for post-FI users */}
                <div className={cn(
                  "rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]",
                  alreadyFi && "order-last opacity-60",
                )}>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(255,107,53,0.1)]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--ember)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                    </div>
                    <h3 className="font-semibold text-foreground">Save</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Link
                      href={"/accumulation" as Route}
                      className="group block"
                    >
                      <p className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                        Your Plan {"\u2192"}
                      </p>
                      <p className="text-xs text-muted-foreground">Projections, milestones, and year-by-year breakdown.</p>
                    </Link>
                    <Link
                      href={"/save-what-if" as Route}
                      className="group block"
                    >
                      <p className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                        What if? {"\u2192"}
                      </p>
                      <p className="text-xs text-muted-foreground">See how changes to savings, returns, or lifestyle shift your timeline.</p>
                    </Link>
                  </div>
                </div>

                {/* Track */}
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.1)]">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <h3 className="font-semibold text-foreground">Track</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    <Link
                      href={"/dashboard" as Route}
                      className="group block"
                    >
                      <p className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                        Dashboard {"\u2192"}
                      </p>
                      <p className="text-xs text-muted-foreground">Net worth snapshots, portfolio checkups, and milestone tracking.</p>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Personalized Insight */}
            <section className="mx-auto max-w-7xl px-6">
              {(() => {
                let insightMessage: string;
                if (alreadyFi) {
                  insightMessage = `Based on your current assumptions, your portfolio of ${formatCompactCurrency(currentBalance)} exceeds your FIRE target of ${formatCompactCurrency(summary.fireNumber)}. The most valuable next step is stress-testing whether your withdrawal strategy will hold up through different market conditions.`;
                } else if (taxEstimate.afterTaxSavingsRate > 0.5) {
                  const multiple = Math.round(taxEstimate.afterTaxSavingsRate / US_BENCHMARKS.savingsRate);
                  insightMessage = `You're saving ${formatPercent(taxEstimate.afterTaxSavingsRate, 0)} of your take-home pay — that's ${multiple}x the US average. At this rate, your money is doing serious heavy lifting.`;
                } else if (summary.coastAge !== null && summary.coastAge <= activeScenario.profile.age + 3) {
                  insightMessage = `You're within striking distance of Coast FI. Once you hit ${formatCompactCurrency(fireTypes.find((ft) => ft.id === "coast")?.target ?? 0)}, compounding finishes the job and you could stop saving entirely.`;
                } else if (summary.fireAge !== null && summary.fireAge < 45) {
                  insightMessage = `On track to reach financial independence at ${Math.round(summary.fireAge)} — that's ${Math.round(US_BENCHMARKS.averageRetirementAge - summary.fireAge)} years before the average American retires. Every year you save now buys years of freedom later.`;
                } else {
                  const pctDone = summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0;
                  insightMessage = pctDone > 0.1
                    ? `You've already saved ${formatPercent(Math.min(pctDone, 1), 0)} of your FIRE number. Compounding is quietly working in the background — keep going.`
                    : `Every journey starts with the first step. You've mapped out a plan, and that alone puts you ahead of most people. Small, consistent progress adds up.`;
                }
                return (
                  <div className="rounded-2xl border border-[rgba(255,107,53,0.15)] bg-[rgba(255,107,53,0.03)] p-6">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg" aria-hidden="true">{"\u2728"}</span>
                      <p className="text-sm leading-relaxed text-foreground">
                        {insightMessage}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </section>
          </>
        )
      ) : (
        <section className="mx-auto max-w-7xl px-6 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground">
                Your Plan
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your numbers, accounts, projections, and FIRE breakdown — all in one place.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={"/withdrawal" as Route}>Stress-test retirement</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={"/save-what-if" as Route}>What if?</Link>
              </Button>
            </div>
          </div>
        </section>
      )}


      {variant === "landing" ? null : (
      <section id="calculator" className="mx-auto max-w-7xl px-6 scroll-mt-24">
        <div className="space-y-8">
          <div className="grid gap-6">

          <div className="grid gap-6">

            {variant === "module" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => drawerStore.open("basics")}
                  className="group rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">FIRE number</p>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </div>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-[var(--ember)]">
                    {formatCompactCurrency(summary.fireNumber)}
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]" style={{ width: `${Math.min((summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0) * 100, 100)}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">{formatPercent(summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0, 0)} there · {formatCompactCurrency(currentBalance)} saved</p>
                  </div>
                  {currentBalance > 0 ? (() => {
                    const pct = estimateNetWorthPercentile(currentBalance, activeScenario.profile.age);
                    return pct > 55 ? (
                      <p className="mt-2 text-xs text-muted-foreground/70">
                        Your {formatCompactCurrency(currentBalance)} puts you ahead of ~{pct}% of Americans your age.
                      </p>
                    ) : null;
                  })() : null}
                </button>
                <button
                  type="button"
                  onClick={() => drawerStore.open("basics")}
                  className="group rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Years to FI</p>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                      {formatYears(summary.yearsToFi)}
                    </p>
                    {summary.fireAge !== null ? (
                      <span className="text-sm text-muted-foreground">age {summary.fireAge}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatCompactCurrency(activeScenario.annualSavings)}/yr at {formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} real return
                  </p>
                  {summary.fireAge !== null && summary.fireAge < US_BENCHMARKS.averageRetirementAge ? (
                    <p className="mt-2 text-xs text-muted-foreground/70">
                      The average American retires at {US_BENCHMARKS.averageRetirementAge}. You&apos;re on track for {Math.round(summary.fireAge)} — that&apos;s {Math.round(US_BENCHMARKS.averageRetirementAge - summary.fireAge)} extra years of freedom.
                    </p>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => drawerStore.open("basics")}
                  className="group rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">After-tax savings</p>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </div>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatPercent(taxEstimate.afterTaxSavingsRate, 1)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatCompactCurrency(taxEstimate.actualSavings)} of {formatCompactCurrency(taxEstimate.takeHome)} take-home
                  </p>
                  {taxEstimate.afterTaxSavingsRate > US_BENCHMARKS.savingsRate ? (() => {
                    const multiple = Math.round(taxEstimate.afterTaxSavingsRate / US_BENCHMARKS.savingsRate);
                    return multiple >= 2 ? (
                      <p className="mt-2 text-xs text-muted-foreground/70">
                        The US average is {(US_BENCHMARKS.savingsRate * 100).toFixed(1)}%. You save {multiple}× more than most Americans.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground/70">
                        Above the US average of {(US_BENCHMARKS.savingsRate * 100).toFixed(1)}%.
                      </p>
                    );
                  })() : taxEstimate.afterTaxSavingsRate > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground/70">
                      Every dollar saved brings you closer. Even small increases make a big difference over time.
                    </p>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => drawerStore.open("basics")}
                  className="group rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Tax estimate</p>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                  </div>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(taxEstimate.totalTax)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {formatPercent(taxEstimate.effectiveRate, 0)} effective
                    </p>
                    <Select
                      value={activeScenario.profile.filingStatus}
                      onChange={(e) => {
                        e.stopPropagation();
                        const next = cloneScenario(activeScenario);
                        next.profile.filingStatus = e.target.value as FilingStatus;
                        replaceScenario(next);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-auto min-w-0 rounded-lg border border-border/60 bg-background px-2 py-1 text-xs"
                    >
                      <option value="single">Single</option>
                      <option value="married_joint">Married joint</option>
                      <option value="married_separate">Married separate</option>
                      <option value="head_of_household">Head of household</option>
                    </Select>
                  </div>
                </button>
              </div>
            ) : null}

            {variant === "module" && <InlineControls />}

            {alreadyFi && (
              <div className="rounded-xl border border-[rgba(99,102,241,0.15)] bg-[rgba(99,102,241,0.03)] px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  FI achieved — your portfolio already exceeds your target of {formatCompactCurrency(summary.fireNumber)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Based on your assumptions, saving milestones no longer apply. Consider{" "}
                  <Link href={"/withdrawal" as Route} className="font-medium text-primary hover:text-primary/80">
                    stress-testing your withdrawal plan
                  </Link>{" "}
                  to see if it holds up over time.
                </p>
              </div>
            )}
            <ChartShell
              title="Save projection"
              description={alreadyFi ? "Your portfolio growth beyond the target, based on current assumptions." : "How your current pace stacks up against the target."}
              actions={
                variant === "module" ? (
                  <div className="flex flex-col items-end gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showBands}
                        onChange={(e) => setShowBands(e.target.checked)}
                        className="rounded border-border accent-[var(--ember)]"
                      />
                      Show range of outcomes
                    </label>
                    <ChartLegend showBands={showBands} />
                  </div>
                ) : null
              }
            >
              <ProjectionChart
                data={summary.projection}
                annualContribution={plannedContribution}
                startAge={activeScenario.profile.age}
                milestones={enrichedMilestones}
                showBands={showBands}
                bandProjections={bandProjections}
              />
              {variant === "module" && crossover ? (() => {
                const total = crossover.contributions + crossover.growth;
                const pct = total > 0 ? Math.round((crossover.growth / total) * 100) : 0;
                return (
                  <div className="mt-4 rounded-xl border border-[var(--ember)]/15 bg-[rgba(255,107,53,0.03)] px-4 py-3 text-sm">
                    <p className="font-medium text-foreground">
                      <span className="mr-1.5 animate-pulse text-[var(--ember)]">{"\u2726"}</span>
                      Year {crossover.year}: Your money is making more money than you are
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Investment growth ({formatCompactCurrency(crossover.growth)}) now exceeds
                      your total contributions ({formatCompactCurrency(crossover.contributions)}).
                      Growth is <span className="font-medium text-[var(--ember)]">{pct}%</span> of your portfolio.
                    </p>
                  </div>
                );
              })() : null}
              {variant === "module" ? (
                <CollapsibleSection
                  title="Year-by-year breakdown"
                  summary={`${summary.projection.length} years · ${projectionWithMilestones.filter((p) => p.milestone).length} milestones`}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="pb-3 pr-4 font-medium">Age</th>
                          <th className="pb-3 pr-4 font-medium">Portfolio</th>
                          <th className="pb-3 pr-4 font-medium">Growth</th>
                          <th className="pb-3 pr-4 font-medium">% to FI</th>
                          <th className="pb-3 font-medium">Milestone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectionWithMilestones.map((point) => (
                          <tr
                            key={point.year}
                            className={cn(
                              "border-t border-border/40",
                              point.milestone && "bg-[rgba(255,107,53,0.04)]",
                            )}
                          >
                            <td className="py-2.5 pr-4 tabular-nums">{Math.round(point.age)}</td>
                            <td className="py-2.5 pr-4 tabular-nums font-medium">
                              {formatCompactCurrency(point.balance)}
                            </td>
                            <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                              {point.year > 0 ? `+${formatCompactCurrency(point.growth)}` : "\u2014"}
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.min(point.pctToFi * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="tabular-nums text-muted-foreground">
                                  {formatPercent(Math.min(point.pctToFi, 1), 0)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5">
                              {point.milestone ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help rounded-full bg-[rgba(255,107,53,0.1)] px-2 py-0.5 text-xs font-medium text-[var(--ember)]">
                                      {point.milestone}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {(() => {
                                      const ft = fireTypes.find((t) =>
                                        point.milestone?.includes(t.label.replace(" FIRE", "").replace(" FI", "")),
                                      );
                                      return ft
                                        ? `${ft.label}: ${formatCompactCurrency(ft.target)} — ${ft.description}`
                                        : point.milestone;
                                    })()}
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              ) : null}
            </ChartShell>
          </div>
        </div>


        </div>
      </section>
      )}
    </div>
  );
}
