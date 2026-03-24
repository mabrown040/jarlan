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
import { US_BENCHMARKS, estimateNetWorthPercentile } from "@/lib/data/benchmarks";
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
    const coastTarget = summary.fireNumber > 0
      ? summary.fireNumber / (1 + activeScenario.assumptions.expectedRealReturn) ** Math.max((activeScenario.profile.retirementAge ?? activeScenario.profile.age) - activeScenario.profile.age, 1)
      : 0;
    const baristaTarget = fireTypes.find((ft) => ft.id === "barista")?.target ?? 0;
    // Only math-derived milestones — not subjective lifestyle categories
    const milestoneTargets = [
      // Only show Barista FIRE when post-FIRE income is set
      ...(activeScenario.assumptions.partTimeIncome > 0
        ? [{ label: "Barista FIRE", target: baristaTarget }]
        : []),
      { label: "Coast FIRE", target: coastTarget },
      { label: "FIRE", target: traditionalTarget },
    ].filter((m) => m.target > 0).sort((a, b) => a.target - b.target);
    const crossed = new Set<string>();
    return summary.projection.map((point, i) => {
      const milestone = milestoneTargets.find(
        (m) => !crossed.has(m.label) && point.balance >= m.target && m.target > 0,
      );
      if (milestone) crossed.add(milestone.label);
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
        milestone: milestone?.label ?? null,
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
      .filter((p) => p.milestone)
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

  const snapshotNarrative =
    summary.yearsToFi === null
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
            <section className="mx-auto max-w-7xl px-6 pt-8">
              {/* Compact status bar */}
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground">
                  Welcome back
                </h1>
                <div className="flex items-baseline gap-4 text-sm text-muted-foreground">
                  <span>
                    Target{" "}
                    <span className="font-semibold text-[var(--ember)]">
                      {formatCompactCurrency(summary.fireNumber)}
                    </span>
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {formatYears(summary.yearsToFi)}
                    </span>
                    {" "}to go
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    <span className="font-semibold text-foreground">
                      {formatPercent(summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0, 0)}
                    </span>
                    {" "}saved
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] transition-all duration-500"
                  style={{ width: `${Math.min((summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0) * 100, 100)}%` }}
                />
              </div>
            </section>

            {/* Navigation hub cards */}
            <section className="mx-auto max-w-7xl px-6 pt-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Your Plan */}
                <Link
                  href={"/accumulation" as Route}
                  className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(255,107,53,0.1)]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--ember)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                      </div>
                      <h3 className="font-semibold text-foreground">Your Plan</h3>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Projections, milestones, and what-if analysis for your path to FI.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="text-xs text-muted-foreground">
                      {summary.fireAge !== null ? `FI at age ${summary.fireAge}` : "Set up your plan"}
                    </span>
                    <span className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">→</span>
                  </div>
                </Link>

                {/* Withdrawal Lab */}
                <Link
                  href={"/withdrawal" as Route}
                  className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(99,102,241,0.1)]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/><path d="M12 6v6l4 2"/></svg>
                      </div>
                      <h3 className="font-semibold text-foreground">Stress-test retirement</h3>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Historical backtests and Monte Carlo sims against 150+ years of market data.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="text-xs text-muted-foreground">Will your money last?</span>
                    <span className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">→</span>
                  </div>
                </Link>

                {/* FIRE Quiz */}
                <Link
                  href={"/quiz" as Route}
                  className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(247,201,72,0.15)]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--flame)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><path d="M12 17h.01"/></svg>
                      </div>
                      <h3 className="font-semibold text-foreground">FIRE quiz</h3>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Find the FIRE style that fits your personality and goals.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="text-xs text-muted-foreground">Retake anytime</span>
                    <span className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">→</span>
                  </div>
                </Link>

                {/* Tax Strategy */}
                <Link
                  href={"/tax-strategy" as Route}
                  className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.1)]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
                      </div>
                      <h3 className="font-semibold text-foreground">Tax strategy</h3>
                      <span className="rounded-full border border-[rgba(255,107,53,0.22)] bg-[rgba(255,107,53,0.08)] px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ember)]">Pro</span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Roth conversions, drawdown sequencing, and ACA planning.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="text-xs text-muted-foreground">Optimize your withdrawals</span>
                    <span className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">→</span>
                  </div>
                </Link>

                {/* Track */}
                <Link
                  href={"/dashboard" as Route}
                  className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.1)]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                      </div>
                      <h3 className="font-semibold text-foreground">Track progress</h3>
                      <span className="rounded-full border border-[rgba(255,107,53,0.22)] bg-[rgba(255,107,53,0.08)] px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[var(--ember)]">Pro</span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Net worth snapshots, portfolio checkups, and milestone tracking.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="text-xs text-muted-foreground">Monitor your journey</span>
                    <span className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">→</span>
                  </div>
                </Link>

                {/* Learn */}
                <Link
                  href={"/education" as Route}
                  className="group flex flex-col justify-between rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.1)]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                      </div>
                      <h3 className="font-semibold text-foreground">Learn</h3>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Research-backed guides on withdrawal rates, asset allocation, and FIRE strategies.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                    <span className="text-xs text-muted-foreground">Understand the math</span>
                    <span className="text-sm font-medium text-primary transition-colors group-hover:text-primary/80">→</span>
                  </div>
                </Link>
              </div>
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
                      The average American retires at {US_BENCHMARKS.averageRetirementAge}. You&apos;re on track for {summary.fireAge} — that&apos;s {US_BENCHMARKS.averageRetirementAge - summary.fireAge} extra years of freedom.
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

            <ChartShell
              title="Accumulation projection"
              description="How your current pace stacks up against the target."
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
