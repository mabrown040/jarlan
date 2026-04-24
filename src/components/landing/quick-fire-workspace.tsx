"use client";

import type { Route } from "next";
import Link from "next/link";
import { Copy, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ChartShell,
  PageHero,
  SectionEyebrow,
} from "@/components/brand";
import { Card } from "@/components/ui/card";
import { useHasExistingDraft } from "@/lib/hooks/use-has-existing-draft";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useDisplayAmount, useDisplayMode } from "@/lib/hooks/use-display-amount";
import { ProjectionChart, ChartLegend } from "@/components/landing/projection-chart";
import { US_BENCHMARKS, estimateNetWorthPercentile, getMedianNetWorthForAge } from "@/lib/data/benchmarks";
import { buildScenarioProjection } from "@/lib/calc/quick-fire";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  calculateFireTypeSummaries,
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatPercent,
  getPlannedAnnualInvestmentContribution,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { computeProjectionMilestones } from "@/lib/calc/milestones";
import {
  deriveDisplayYearsToFi,
  deriveIncomeCardVariant,
  derivedProjectedSpendingExplanation,
  shouldShowRaiseSavingsWarning,
} from "@/components/landing/fire-display";
import { getRetirementPhase } from "@/lib/retirement/phase";
import { estimateScenarioTax } from "@/lib/tax";
import { SCENARIO_QUERY_KEY } from "@/lib/share";
import {
  buildScenarioShareUrl,
} from "@/lib/share";
import { useDrawerStore, useScenarioStore } from "@/lib/store";
import { MoneyFlowSankey } from "@/components/charts/money-flow-sankey";
import { InlineControls } from "@/components/plan/inline-controls";
import { SampleScenarioBanner } from "@/components/landing/sample-scenario-banner";
import { HomePreviewChart } from "@/components/landing/home-preview-chart";
import { cn } from "@/lib/utils";

export function QuickFireWorkspace({
  variant = "landing",
}: {
  variant?: "landing" | "module";
}) {
  const {
    activeScenario,
    status,
    resetScenario,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const [copied, setCopied] = useState(false);
  const { hasDraft } = useHasExistingDraft();
  const showWizard =
    variant === "landing" && !sharedScenarioParam && hasDraft === false;

  useInitializeStore(sharedScenarioParam);
  useGlobalScenarioFormatting(activeScenario);

  // Auto-save (inline — kept separate from useAutoSaveScenario to avoid
  // double useSearchParams() which can cause Suspense issues on static pages)
  const saveDraft = useScenarioStore((s) => s.saveDraft);
  useEffect(() => {
    if (status !== "ready" || activeScenario.isPersonalized === false) {
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
  const currentBalance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );
  const progressToFire =
    summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0;
  const plannedContribution = useMemo(
    () => getPlannedAnnualInvestmentContribution(activeScenario),
    [activeScenario],
  );
  const taxEstimate = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );
  // Display-mode transform — nominal mode inflates future-year dollar
  // amounts by (1+inflation)^year; real mode is a pass-through. Apply
  // at every display site that renders a dollar from a future year
  // (year table, FIRE number card, any stat that references the
  // retirement year).
  const display = useDisplayAmount();
  const { mode: displayMode } = useDisplayMode();
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

  // Derived display values for the Years-to-FI card and the plan-health
  // warning. Logic lives in `./fire-display` so the past-FIRE / phase guard
  // edge cases can be unit tested without mounting the whole workspace.
  const traditionalFireTarget =
    fireTypes.find((ft) => ft.id === "traditional")?.target ?? 0;
  const { displayYearsToFi, displayFireAge, isPastFire } = useMemo(
    () =>
      deriveDisplayYearsToFi({
        scenario: activeScenario,
        traditionalTarget: traditionalFireTarget,
        projection: summary.projection,
        analyticalYearsToFi: summary.yearsToFi,
      }),
    [
      activeScenario,
      summary.projection,
      summary.yearsToFi,
      traditionalFireTarget,
    ],
  );
  const scenarioPhase = useMemo(
    () => getRetirementPhase(activeScenario),
    [activeScenario],
  );
  const incomeCardVariant = useMemo(
    () => deriveIncomeCardVariant(activeScenario, scenarioPhase),
    [activeScenario, scenarioPhase],
  );
  const projectedSpendingExplanation = useMemo(
    () => derivedProjectedSpendingExplanation(activeScenario),
    [activeScenario],
  );
  const plannedInvestmentContribution = plannedContribution;
  const investedRate =
    taxEstimate.takeHome > 0
      ? plannedInvestmentContribution / taxEstimate.takeHome
      : 0;
  const showRaiseSavingsWarning = shouldShowRaiseSavingsWarning({
    scenario: activeScenario,
    phase: scenarioPhase,
    isPastFire,
    displayFireAge,
  });

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
    return computeProjectionMilestones({
      scenario: activeScenario,
      summary,
      fireTypes,
    });
  }, [summary, activeScenario, fireTypes, variant]);

  const alreadyFi = progressToFire >= 1;

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

  return (
    <div className="space-y-10 pb-12">
      {/* Sample-mode banner only renders on the module variant (/accumulation).
          On the landing variant, the wizard gating already tells new users
          they haven't personalized, and a shared-scenario landing gets its
          own banner below. */}
      {variant === "module" ? <SampleScenarioBanner /> : null}
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
              description="A research-backed FIRE calculator that shows its math."
              actions={
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={"/quiz" as Route}>Take the FIRE quiz</Link>
                    </Button>
                    {/* Secondary CTA for visitors who aren't ready to input
                        numbers — drops them into /accumulation with the
                        sample-scenario banner so the state is explicit. */}
                    <Button asChild variant="outline">
                      <Link href={"/accumulation" as Route}>See a sample plan</Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/80">
                    Free forever. No account required &mdash; sign in to sync across devices.
                  </p>
                </div>
              }
            />
            {/* Visual proof before the decision. Muted projection chart
                driven by the default scenario so new visitors can see
                what the calculator produces without committing to data
                entry or even a second click. */}
            <HomePreviewChart />
            {/* Two-card onboarding grid. `feature` tone gives these the
                richest surface (subtle ember gradient + elevation-3), and
                `card-hover` gives the lift + glow on pointer-over. Same
                primitive used by the Why Calcifer and What's Inside
                grids below, differentiated only by tone. */}
            <section className="mx-auto max-w-7xl px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card
                  asChild
                  tone="feature"
                  interactive
                  className="group relative overflow-hidden p-8"
                >
                  <Link href={"/quiz" as Route}>
                    {/* Corner ember orb — reads as a spark, reinforces
                        the "FIRE" brand without a literal flame icon. */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.22)_0%,transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <SectionEyebrow>New to FIRE?</SectionEyebrow>
                    <h3 className="mt-3 font-display text-2xl leading-tight tracking-[-0.03em] text-foreground">
                      Take the quiz
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Answer a few quick questions and get a personalized FIRE
                      type, target number, and a clear next step.
                    </p>
                    <p className="mt-4 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                      Start the quiz →
                    </p>
                  </Link>
                </Card>
                {/* Repurposed from "Open Your Plan" — that framing implied
                    the user had a plan saved. Now offers a sample walk so
                    tentative visitors can explore the planner before
                    committing to data entry. Lands on /accumulation where
                    SampleScenarioBanner makes the demo state explicit. */}
                <Card
                  asChild
                  tone="elevated"
                  interactive
                  className="group p-8"
                >
                  <Link href={"/accumulation" as Route}>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      Prefer to poke around?
                    </p>
                    <h3 className="mt-3 font-display text-2xl leading-tight tracking-[-0.03em] text-foreground">
                      See a sample plan
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Explore a demo scenario with every chart, stat, and
                      projection wired up. Edit any field to make it yours.
                    </p>
                    <p className="mt-4 text-sm font-medium text-primary transition-colors group-hover:text-primary/80">
                      Open the planner →
                    </p>
                  </Link>
                </Card>
              </div>
            </section>

            {/* "Why Calcifer" — positioning claims framed against competitor
                defaults. Each card uses the gradient-border primitive so
                the grid reads as a coordinated set rather than four
                independent tiles. `card-hover` lifts on pointer-over to
                match the two-card CTA grid above. */}
            <section className="mx-auto max-w-7xl px-6">
              <SectionEyebrow>Why Calcifer</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.03em] text-foreground">
                Built more accurate, more flexible, more honest.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Designed against the defaults baked into the one-size-fits-all
                FIRE calculators you&rsquo;ve used before.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  {
                    claim: "State-aware tax math",
                    detail:
                      "Federal + state income tax, FICA, and filing status all flow into your savings rate. Most FIRE calculators ignore state tax entirely — a 6-figure difference over a career in CA or NY.",
                    proofLabel: "See how savings rate is calculated →",
                    href: "/education/savings-rate",
                  },
                  {
                    claim: "Four withdrawal strategies",
                    detail:
                      "Fixed 4%, Guyton-Klinger guardrails, CAPE-variable, and Floor-Ceiling. The classic 4% rule is one option — not the only one — and each lands differently in bad sequences.",
                    proofLabel: "Compare withdrawal strategies →",
                    href: "/education/withdrawal-strategies",
                  },
                  {
                    claim: "Stack life decisions",
                    detail:
                      "Career break, lifestyle change, promotion, market downturn, new dependent. Model them individually or composed — and see the interaction effects most calculators can\u2019t express.",
                    proofLabel: "Try what-if analysis →",
                    href: "/save-what-if",
                  },
                  {
                    claim: "Research-grade data",
                    detail:
                      "150 years of Shiller market data, SSA 2022 period mortality tables, and 2026 IRS brackets — not synthetic averages. Stress tests run against actual history, not just Monte Carlo noise.",
                    proofLabel: "Browse the methodology →",
                    href: "/education",
                  },
                ].map((item) => (
                  <Link
                    key={item.claim}
                    href={item.href as Route}
                    className="gradient-border card-hover group block p-6"
                  >
                    <p className="font-display text-lg font-medium tracking-[-0.01em] text-foreground">
                      {item.claim}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                    <p className="mt-4 text-xs font-medium text-primary transition-colors group-hover:text-primary/80">
                      {item.proofLabel}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* Feature grid — reordered so Stress-test retirement (flagship)
                leads. `soft` tone distinguishes this set visually from the
                Why-Calcifer cards above (positioning-level) — these are
                inventory-level, meant to read as a clean list. */}
            <section className="mx-auto max-w-7xl px-6">
              <SectionEyebrow>What&rsquo;s inside</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl leading-tight tracking-[-0.03em] text-foreground">
                Every feature, one click away.
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    title: "Stress-test retirement",
                    desc: "150 years of Shiller market data, four withdrawal strategies (Fixed, Guyton-Klinger, CAPE, Floor-Ceiling), and Monte Carlo simulation.",
                    href: "/education/withdrawal-strategies",
                    cta: "How withdrawal strategies work →",
                  },
                  {
                    title: "Tax-aware projections",
                    desc: "State, filing status, and 2026 brackets feed into after-tax savings rate, estimated taxes, and real take-home.",
                    href: "/education/savings-rate",
                    cta: "Why savings rate matters →",
                  },
                  {
                    title: "Year-by-year milestones",
                    desc: "Watch your portfolio cross Coast FIRE, Barista FIRE, and full FIRE — each with a real-dollar target and date.",
                    href: "/education/coast-fire",
                    cta: "Coast FIRE explained →",
                  },
                  {
                    title: "What-if analysis",
                    desc: "Stack life decisions — career break, lifestyle change, market downturn — and see how they shift your timeline.",
                    href: "/save-what-if",
                    cta: "Try it →",
                  },
                ].map((feature) => (
                  <Card
                    key={feature.title}
                    asChild
                    tone="soft"
                    interactive
                    className="group p-6"
                  >
                    <Link href={feature.href as Route}>
                      <p className="font-medium text-foreground">
                        {feature.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {feature.desc}
                      </p>
                      <p className="mt-3 text-xs font-medium text-primary transition-colors group-hover:text-primary/80">
                        {feature.cta}
                      </p>
                    </Link>
                  </Card>
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
                  ) : displayFireAge !== null ? (
                    <span>
                      {/* Use displayFireAge (integer, projection-aligned)
                          instead of the analytical summary.fireAge so Home
                          matches Save's stat card. */}
                      FI at age{" "}
                      <span className="font-semibold text-foreground">{displayFireAge}</span>
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
                      {/* Use the integer displayYearsToFi so this line matches
                          the header pill ("29 yrs") and Save stat card
                          ("29 yrs · age 56"). Was fractional formatYears
                          and read as "28.4 yrs away" next to a "29 yrs" pill. */}
                      <span className="font-semibold text-foreground">
                        {displayYearsToFi === null
                          ? "—"
                          : `${displayYearsToFi} yr${displayYearsToFi === 1 ? "" : "s"}`}
                      </span>
                      {" "}away
                    </span>
                  )}
                  <span className="text-border">{"\u00B7"}</span>
                  <span>
                    {/* Show what's actually being invested (account contribs +
                        employer match), not "take-home minus expenses" which
                        conflated potential savings with real contributions.
                        Falls back to gross rate when tax data is unavailable. */}
                    <span className="font-semibold text-foreground">
                      {plannedInvestmentContribution > 0 && taxEstimate.takeHome > 0
                        ? formatPercent(investedRate, 0)
                        : formatPercent(summary.savingsRate, 0)}
                    </span>
                    {" "}invested rate
                  </span>
                </div>
              </button>
            </section>

            {/* Section 2: Your Numbers
                Retirees (phase === "withdrawal" && annualIncome === 0) see a
                single "Retirement status" tile in place of the three
                income-side tiles, which would otherwise all read "$0". */}
            <section className="mx-auto max-w-7xl px-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {incomeCardVariant === "retirement" ? (
                  <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] xl:col-span-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Retirement status</p>
                    <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                      {formatCompactCurrency(activeScenario.retirementExpenses)}
                      <span className="text-base font-normal text-muted-foreground">/yr spending</span>
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {currentBalance > 0
                        ? `${formatPercent(
                            activeScenario.retirementExpenses / currentBalance,
                            1,
                          )} current withdrawal rate`
                        : "No portfolio balance yet."}
                    </p>
                    <Link
                      href={"/withdrawal" as Route}
                      className="mt-1 inline-block text-[10px] font-medium text-primary hover:text-primary/80"
                    >
                      Run the retirement checkup &rarr;
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Take-home */}
                    <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Take-home</p>
                      <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                        {formatCompactCurrency(taxEstimate.takeHome)}
                        <span className="text-base font-normal text-muted-foreground">/yr</span>
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">After federal + state taxes</p>
                    </div>

                    {/* Invested (account contributions + employer match).
                        Was "Savings" with `takeHome - expenses` — that's
                        theoretical-max savings and diverges from the
                        "Save per year" slider. This reports what the
                        projection actually uses. */}
                    <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Invested</p>
                      <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                        {formatCompactCurrency(plannedInvestmentContribution)}
                        <span className="text-base font-normal text-muted-foreground">/yr</span>
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {formatPercent(investedRate, 0)} of take-home
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
                  </>
                )}

                {/* Peer Comparison.
                    "Top {100-percentile}%" was mathematically correct but read
                    as "elite" for low-percentile users (e.g. a 22yo with $5K
                    saw "Top 89%" — technically "better than 11%" but colloquially
                    sounds like top-of-the-pack). "Ahead of X%" scales cleanly
                    at both ends of the distribution. */}
                {(() => {
                  const age = activeScenario.profile.age;
                  const percentile = estimateNetWorthPercentile(currentBalance, age);
                  const { median: medianForAge } = getMedianNetWorthForAge(age);
                  return (
                    <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">You vs peers</p>
                      <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
                        Ahead of {percentile}%
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        of {age}-year-olds
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
                          ? "/education/coast-fire"
                          : "/education/barista-fire";
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
                    You&apos;ve reached your target. See if your plan will last.
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
                        {/* Matches the sub-nav label. Previously read "Your
                            Plan" which was the pre-rename Spend sub-tab name. */}
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
                  {/* FIRE number: inflated to the target retirement year in
                      nominal mode so the user sees "what you'll need to hit
                      on your account statement" vs. the real-dollar
                      purchasing-power equivalent. Years-to-FI is the
                      integer horizon from the shared helper so the pill,
                      card, and What-if panel all agree. */}
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-[var(--ember)]">
                    {formatCompactCurrency(
                      display(summary.fireNumber, displayYearsToFi ?? 0),
                    )}
                  </p>
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]" style={{ width: `${Math.min((summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0) * 100, 100)}%` }} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatPercent(summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0, 0)} there &middot; {formatCompactCurrency(currentBalance)} saved
                      {displayMode === "nominal" && displayYearsToFi && displayYearsToFi > 0 ? (
                        <>
                          {" "}
                          <span className="ml-1 rounded-full bg-[var(--ember)]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ember)]">
                            target in {new Date().getFullYear() + displayYearsToFi}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {(() => {
                      const wr = activeScenario.assumptions.withdrawalRate;
                      return wr === 0.04
                        ? "Based on the standard 4% rule"
                        : wr < 0.04
                          ? `Based on a conservative ${(wr * 100).toFixed(1)}% withdrawal rate`
                          : `Based on an aggressive ${(wr * 100).toFixed(1)}% withdrawal rate`;
                    })()}
                  </p>
                  {/* Explain the gap between user-entered retirement spend and
                      the projected real-dollar amount the FIRE target uses. Only
                      shows when lifestyle creep is non-zero AND divergence is
                      > 2% (see derivedProjectedSpendingExplanation). */}
                  {projectedSpendingExplanation ? (
                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                      Projected retirement spending:{" "}
                      {formatCompactCurrency(
                        projectedSpendingExplanation.projectedSpending,
                      )}
                      /yr ({formatCompactCurrency(
                        projectedSpendingExplanation.todaySpending,
                      )}{" "}
                      × {formatPercent(
                        projectedSpendingExplanation.expenseGrowthRate,
                        // 1-decimal precision so 0.5% doesn't round to "1%"
                        // (Intl rounds half-away-from-zero on integer format).
                        1,
                      )}{" "}
                      real growth × {projectedSpendingExplanation.yearsUntilRetirement} yrs)
                    </p>
                  ) : null}
                  <Link
                    href={"/withdrawal" as Route}
                    className="mt-1 inline-block text-[10px] font-medium text-primary hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Stress-test this &rarr;
                  </Link>
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
                      {/* Integer year count matching the FIRE milestone row in
                          the projection table — avoids "28.1 yrs" here with
                          the badge on the age-57 row below. */}
                      {displayYearsToFi === null ? "—" : `${displayYearsToFi} yrs`}
                    </p>
                    {displayFireAge !== null ? (
                      <span className="text-sm text-muted-foreground">age {displayFireAge}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {formatCompactCurrency(activeScenario.annualSavings)}/yr at {formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} real return
                  </p>
                  {/* Plan-health callout. Pick the most urgent signal in order:
                      (1) won't hit FI at all, (2) target age is before FI age,
                      (3) freedom-years comparison when user is ahead.
                      The (2) "raise savings" warning is gated behind a phase
                      check so it doesn't fire for users already past FIRE or
                      already in withdrawal phase. */}
                  {displayYearsToFi === null ? (
                    <p className="mt-2 text-xs font-medium text-[var(--danger)]">
                      ⚠ Not projected to hit FI at the current savings rate. Increase savings or lower spending.
                    </p>
                  ) : showRaiseSavingsWarning &&
                    activeScenario.profile.retirementAge !== null &&
                    displayFireAge !== null ? (
                    <p className="mt-2 text-xs font-medium text-[var(--warning,#b45309)]">
                      ⚠ Target retirement age {activeScenario.profile.retirementAge} is {displayFireAge - activeScenario.profile.retirementAge} yr
                      {displayFireAge - activeScenario.profile.retirementAge === 1 ? "" : "s"} before projected FI (age {displayFireAge}). Raise savings or push the target.
                    </p>
                  ) : displayFireAge !== null && displayFireAge < US_BENCHMARKS.averageRetirementAge ? (
                    <p className="mt-2 text-xs text-muted-foreground/70">
                      The average American retires at {US_BENCHMARKS.averageRetirementAge}. You&apos;re on track for {displayFireAge} — that&apos;s {US_BENCHMARKS.averageRetirementAge - displayFireAge} extra years of freedom.
                    </p>
                  ) : null}
                  <Link
                    href={"/withdrawal" as Route}
                    className="mt-1 inline-block text-[10px] font-medium text-primary hover:text-primary/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Will it last? &rarr;
                  </Link>
                </button>
                {/* Income-side tiles. Retirees see a Retirement status tile
                    in place of the "Invested %" + "Tax estimate" pair (both
                    read as $0 / 0% when annualIncome === 0). */}
                {incomeCardVariant === "retirement" ? (
                  <button
                    type="button"
                    onClick={() => drawerStore.open("basics")}
                    className="group rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)] md:col-span-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Retirement status</p>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </div>
                    <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                      {formatCompactCurrency(activeScenario.retirementExpenses)}
                      <span className="ml-2 text-base font-normal text-muted-foreground">/yr</span>
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {currentBalance > 0
                        ? `Drawing ${formatPercent(
                            activeScenario.retirementExpenses / currentBalance,
                            1,
                          )} of a ${formatCompactCurrency(currentBalance)} portfolio`
                        : "No portfolio balance yet."}
                    </p>
                    <Link
                      href={"/withdrawal" as Route}
                      className="mt-1 inline-block text-[10px] font-medium text-primary hover:text-primary/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Run the retirement checkup &rarr;
                    </Link>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => drawerStore.open("basics")}
                      className="group rounded-2xl bg-card p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.06)]"
                    >
                      <div className="flex items-center justify-between">
                        {/* Renamed from "After-tax savings" (takeHome minus
                            expenses — theoretical max) to "Invested" (actual
                            account contribs + match, matching the slider and
                            the projection math). */}
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Invested</p>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </div>
                      <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                        {formatPercent(investedRate, 1)}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {formatCompactCurrency(plannedInvestmentContribution)} of {formatCompactCurrency(taxEstimate.takeHome)} take-home
                      </p>
                      {investedRate > US_BENCHMARKS.savingsRate ? (() => {
                        const multiple = Math.round(investedRate / US_BENCHMARKS.savingsRate);
                        return multiple >= 2 ? (
                          <p className="mt-2 text-xs text-muted-foreground/70">
                            The US average is {(US_BENCHMARKS.savingsRate * 100).toFixed(1)}%. You invest {multiple}× more than most Americans.
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground/70">
                            Above the US average of {(US_BENCHMARKS.savingsRate * 100).toFixed(1)}%.
                          </p>
                        );
                      })() : investedRate > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground/70">
                          Every dollar invested brings you closer. Even small increases make a big difference over time.
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
                    </button>
                  </>
                )}
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
              {/* Crossover callout removed — not actionable for users */}
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
                              {formatCompactCurrency(display(point.balance, point.year))}
                            </td>
                            <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                              {point.year > 0
                                ? `+${formatCompactCurrency(display(point.growth, point.year))}`
                                : "\u2014"}
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${Math.min(point.pctToFi * 100, 100)}%` }}
                                  />
                                </div>
                                {/* Progress bar caps at 100% visually, but the
                                    numeric display shows true % so past-FIRE
                                    retirees see their overshoot (e.g. 133% at
                                    retirement drifting up to 160% over time).
                                    Previously capped at 100%, which flattened
                                    the retirement trajectory into a meaningless
                                    row of identical "100%" values. */}
                                <span className="tabular-nums text-muted-foreground">
                                  {formatPercent(point.pctToFi, 0)}
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
