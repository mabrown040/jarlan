"use client";

import type { Route } from "next";
import Link from "next/link";
import { Copy, Printer, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChartShell,
  EnhancedStatCard,
  InsightMiniTable,
  InsightProgressBar,
  PageHero,
  SectionHeading,
  StatCard,
} from "@/components/brand";
import { GuidedFlow } from "@/components/landing/guided-flow/guided-flow";
import {
  LandingCapabilitySection,
  LandingPathwaySection,
} from "@/components/landing/landing-support-sections";
import { useHasExistingDraft } from "@/lib/hooks/use-has-existing-draft";
import { FieldLabel } from "@/components/form/field-label";
import { ProjectionChart } from "@/components/landing/projection-chart";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  buildSavingsRateTable,
  calculateFireTypeSummaries,
  calculateQuickFireSummary,
  calculateYearsToTarget,
  formatCompactCurrency,
  formatCurrency,
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
  createDefaultAccount,
  createDefaultCashFlowEvent,
} from "@/lib/domain";
import type {
  AccountOwner,
  AccountType,
  CashFlowEvent,
  CurrencyCode,
  FilingStatus,
  Scenario,
} from "@/lib/domain/types";
import { getCountryPreset, listCountryPresets } from "@/lib/data";
import { SCENARIO_QUERY_KEY } from "@/lib/share";
import {
  buildScenarioShareUrl,
  deserializeScenarioFromSearchParam,
} from "@/lib/share";
import { useDrawerStore, useScenarioStore } from "@/lib/store";
import { educationAnchors } from "@/lib/education/content";
import { cn } from "@/lib/utils";

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "traditional_401k", label: "Traditional 401(k)" },
  { value: "roth_401k", label: "Roth 401(k)" },
  { value: "traditional_ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "taxable", label: "Taxable brokerage" },
  { value: "hsa", label: "HSA" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const accountOwnerOptions: Array<{ value: AccountOwner; label: string }> = [
  { value: "primary", label: "Primary" },
  { value: "partner", label: "Partner" },
  { value: "joint", label: "Joint" },
];

const countryPresets = listCountryPresets();
const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

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
  const savingsRateTable = useMemo(
    () =>
      buildSavingsRateTable(
        getHouseholdAnnualIncome(activeScenario),
        activeScenario.assumptions.withdrawalRate,
        activeScenario.assumptions.expectedRealReturn,
      ),
    [activeScenario],
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
      const prevBalance = i > 0 ? summary.projection[i - 1].balance : point.balance;
      const growth = i > 0 ? point.balance - prevBalance - plannedContribution : 0;
      return {
        ...point,
        growth: Math.round(growth),
        contribution: i > 0 ? plannedContribution : 0,
        pctToFi: summary.fireNumber > 0 ? point.balance / summary.fireNumber : 0,
        milestone: milestone?.label ?? null,
      };
    });
  }, [summary, fireTypes, activeScenario, plannedContribution]);
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
  const sensitivityDeltas = useMemo(() => {
    const base = activeScenario.annualSavings;
    return [
      Math.round(base * -0.20 / 100) * 100,
      Math.round(base * -0.10 / 100) * 100,
      Math.round(base * -0.05 / 100) * 100,
      0,
      Math.round(base * 0.05 / 100) * 100,
      Math.round(base * 0.10 / 100) * 100,
      Math.round(base * 0.20 / 100) * 100,
    ];
  }, [activeScenario.annualSavings]);
  const sensitivityRows = useMemo(
    () =>
      sensitivityDeltas.map((delta) => {
        const nextScenario = cloneScenario(activeScenario);
        const otherContributionTotal = nextScenario.accounts
          .filter((_, index) => index !== 0)
          .reduce((total, account) => total + account.annualContribution, 0);
        const nextAnnualSavings = Math.max(nextScenario.annualSavings + delta, 0);

        nextScenario.accounts[0].annualContribution = Math.max(
          nextAnnualSavings - otherContributionTotal,
          0,
        );
        syncScenarioRollups(nextScenario);

        const nextSummary = calculateQuickFireSummary(nextScenario);

        return {
          delta,
          annualSavings: nextScenario.annualSavings,
          yearsToFi: nextSummary.yearsToFi,
          fireAge: nextSummary.fireAge,
        };
      }),
    [activeScenario, sensitivityDeltas],
  );

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
            <section className="mx-auto max-w-7xl space-y-6 px-6 pt-8">
              <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground">
                Your FIRE overview
              </h1>

              {/* Key metrics */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">FIRE number</p>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-[var(--ember)]">
                    {formatCompactCurrency(summary.fireNumber)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatPercent(summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0, 0)} there · {formatCompactCurrency(currentBalance)} saved
                  </p>
                </div>
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Years to FI</p>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatYears(summary.yearsToFi)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {summary.fireAge !== null ? `FI at age ${summary.fireAge}` : "Adjust inputs to see a timeline"}
                  </p>
                </div>
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">After-tax savings</p>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatPercent(taxEstimate.afterTaxSavingsRate, 0)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCompactCurrency(taxEstimate.actualSavings)} of {formatCompactCurrency(taxEstimate.takeHome)} take-home
                  </p>
                </div>
              </div>

              {/* FIRE type comparison */}
              <div className="space-y-4">
                <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                  Your FIRE paths
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {fireTypes.map((fireType) => (
                    <div
                      key={fireType.id}
                      className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]"
                    >
                      <h3 className="text-sm font-semibold text-foreground">{fireType.label}</h3>
                      <p className="font-display text-2xl tracking-[-0.03em] text-foreground">
                        {formatCompactCurrency(fireType.target)}
                      </p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${Math.min(fireType.progress * 100, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm leading-snug text-muted-foreground">{fireType.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={"/accumulation" as Route}>Open Your Plan</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={"/quiz" as Route}>Retake quiz</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={"/withdrawal" as Route}>Stress-test retirement</Link>
                </Button>
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
                <Link href={"/scenario-lab" as Route}>Compare scenarios</Link>
              </Button>
            </div>
          </div>
        </section>
      )}


      {variant === "landing" ? null : (
      <section id="calculator" className="mx-auto max-w-7xl px-6 scroll-mt-24">
        <div className="space-y-8">
          <div className="grid gap-6">
            {/* Inline inputs live in the Plan Drawer now */}
            {false as never ? (
            <div>
              <CardHeader>
                <SectionHeading
                  title="Scenario inputs"
                  titleAs="h3"
                  description={
                      <>
                        Adjust the core levers first, then layer in accounts, partner
                        planning, and recurring events further down this page.
                      </>
                  }
                />
              </CardHeader>
              <CardContent className="space-y-5">

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel
                        htmlFor="expenses"
                        label="Annual expenses"
                      />
                    </div>
                    <NumberInput
                      id="expenses"
                      min={0}
                      step={expenseInputMode === "monthly" ? 100 : 1000}
                      inputMode="numeric"
                      value={expenseInputValue}
                      onValueChange={(value) =>
                        updateExpenses(
                          expenseInputMode === "monthly" ? value * 12 : value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="portfolio" label="Current portfolio" />
                    <NumberInput
                      id="portfolio"
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={currentBalance}
                      onValueChange={updateCurrentBalance}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="savings" label="Annual savings" />
                    <NumberInput
                      id="savings"
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={activeScenario.annualSavings}
                      onValueChange={updateAnnualSavings}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor="income"
                      label={
                        activeScenario.profile.partner
                          ? "Primary income"
                          : "Annual income"
                      }
                    />
                    <NumberInput
                      id="income"
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={activeScenario.annualIncome}
                      onValueChange={updateIncome}
                    />
                  </div>
                  {variant === "module" || showAdvancedLandingInputs ? (
                    <>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="age" label="Current age" />
                        <NumberInput
                          id="age"
                          min={18}
                          max={80}
                          inputMode="numeric"
                          value={activeScenario.profile.age}
                          onValueChange={updateProfileAge}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="retirement-age"
                          label="Target retirement age"
                        />
                        <NumberInput
                          id="retirement-age"
                          min={18}
                          max={80}
                          inputMode="numeric"
                          value={
                            activeScenario.profile.retirementAge ??
                            activeScenario.profile.age
                          }
                          onValueChange={updateRetirementAge}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                        <FieldLabel
                          htmlFor="part-time-income"
                          label="Barista income"
                          tooltip="Used for the Barista FIRE target: (expenses - part-time income) / withdrawal rate."
                        />
                        <NumberInput
                          id="part-time-income"
                          min={0}
                          step={1000}
                          inputMode="numeric"
                          value={activeScenario.assumptions.partTimeIncome}
                          onValueChange={updatePartTimeIncome}
                        />
                      </div>
                      {variant === "module" ? (
                        <>
                          <div className="space-y-2">
                            <FieldLabel htmlFor="country" label="Country" />
                            <Select
                              id="country"
                              value={countryPreset.code}
                              onChange={(event) => handleCountryChange(event.target.value)}
                            >
                              {countryPresets.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <FieldLabel htmlFor="currency" label="Display currency" />
                            <Select
                              id="currency"
                              value={activeScenario.currency}
                              onChange={(event) =>
                                updateCurrency(event.target.value as CurrencyCode)
                              }
                            >
                              {currencyOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                            <FieldLabel
                              htmlFor="state"
                              label={countryPreset.stateLabel}
                              tooltip="US state logic feeds the most complete tax and ACA modeling today. Other countries use this as a location label while localized tax rules continue to expand."
                            />
                            <Input
                              id="state"
                              value={activeScenario.profile.state}
                              onChange={(event) =>
                                replaceScenario({
                                  ...cloneScenario(activeScenario),
                                  profile: {
                                    ...activeScenario.profile,
                                    state: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {variant === "module" ? (
                  <div className="rounded-2xl border border-border/60 bg-card/35 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Country and currency readiness</p>
                    <p className="mt-2">
                      {countryPreset.readiness} The whole planning surface now follows the
                      selected display currency so shared snapshots and walkthroughs are
                      easier outside the US, even while tax modeling remains deepest for US
                      households.
                    </p>
                  </div>
                ) : null}

                {variant === "module" ? (
                  <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Couple planning
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Add a partner to model dual retirement dates, household
                          income, and partner-readable summary language.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setPartnerPlanningEnabled(!activeScenario.profile.partner)
                        }
                      >
                        {activeScenario.profile.partner
                          ? "Switch back to solo planning"
                          : "Plan with a partner"}
                      </Button>
                    </div>

                    {activeScenario.profile.partner ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FieldLabel
                            htmlFor="partner-name"
                            label="Partner name"
                          />
                          <Input
                            id="partner-name"
                            value={activeScenario.profile.partner.name}
                            onChange={(event) =>
                              updatePartnerName(event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel
                            htmlFor="partner-income"
                            label="Partner income"
                          />
                          <NumberInput
                            id="partner-income"
                            min={0}
                            step={1000}
                            inputMode="numeric"
                            value={activeScenario.profile.partner.annualIncome ?? 0}
                            onValueChange={updatePartnerIncome}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="partner-age" label="Partner age" />
                          <NumberInput
                            id="partner-age"
                            min={18}
                            max={80}
                            inputMode="numeric"
                            value={activeScenario.profile.partner.age}
                            onValueChange={updatePartnerAge}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel
                            htmlFor="partner-retirement-age"
                            label="Partner retirement age"
                          />
                          <NumberInput
                            id="partner-retirement-age"
                            min={18}
                            max={90}
                            inputMode="numeric"
                            value={
                              activeScenario.profile.partner.retirementAge ??
                              activeScenario.profile.partner.age
                            }
                            onValueChange={updatePartnerRetirementAge}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <FieldLabel
                            htmlFor="partner-health"
                            label="Partner health outlook"
                          />
                          <Select
                            id="partner-health"
                            value={
                              activeScenario.profile.partner.healthStatus ??
                              "average"
                            }
                            onChange={(event) =>
                              updatePartnerHealthStatus(
                                event.target.value as NonNullable<
                                  NonNullable<
                                    Scenario["profile"]["partner"]
                                  >["healthStatus"]
                                >,
                              )
                            }
                          >
                            <option value="below_average">
                              Below average longevity
                            </option>
                            <option value="average">Average longevity</option>
                            <option value="above_average">
                              Above average longevity
                            </option>
                          </Select>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground md:col-span-2">
                          {coupleSummary}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}


                <Separator />
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <FieldLabel
                            htmlFor="withdrawal-rate"
                            label="Withdrawal rate"
                            tooltip="Default 4% is the classic Bengen/Trinity baseline. ERN's longer-horizon research suggests 3.25% to 3.5% is safer for early retirees."
                          />
                          <span className="text-sm font-medium">
                            {formatPercent(
                              activeScenario.assumptions.withdrawalRate,
                              2,
                            )}
                          </span>
                        </div>
                        <Slider
                          id="withdrawal-rate"
                          min={0.025}
                          max={0.06}
                          step={0.001}
                          value={[activeScenario.assumptions.withdrawalRate]}
                          onValueChange={([value]) => updateWithdrawalRate(value)}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <FieldLabel
                            htmlFor="real-return"
                            label="Expected real return"
                            tooltip="Real return means after inflation. The app defaults to real-dollar math so users can reason in today's purchasing power."
                          />
                          <span className="text-sm font-medium">
                            {formatPercent(
                              activeScenario.assumptions.expectedRealReturn,
                              1,
                            )}
                          </span>
                        </div>
                        <Slider
                          id="real-return"
                          min={0}
                          max={0.1}
                          step={0.005}
                          value={[activeScenario.assumptions.expectedRealReturn]}
                          onValueChange={([value]) =>
                            updateExpectedRealReturn(value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="safer-rate"
                          label="Safer FIRE rate"
                          tooltip="Used for the comparison callout so users can see a more conservative target alongside the default FIRE number."
                        />
                        <NumberInput
                          id="safer-rate"
                          min={0.025}
                          max={0.05}
                          step={0.001}
                          inputMode="decimal"
                          value={activeScenario.assumptions.saferWithdrawalRate}
                          onValueChange={updateSaferWithdrawalRate}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <a
                          href={`/education#${educationAnchors.safeWithdrawalRate}`}
                          className="rounded-full border border-border/60 px-3 py-1 transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          Why 4%?
                        </a>
                        <a
                          href={`/education#${educationAnchors.coastFire}`}
                          className="rounded-full border border-border/60 px-3 py-1 transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          What is Coast FIRE?
                        </a>
                        <a
                          href={`/education#${educationAnchors.defaults}`}
                          className="rounded-full border border-border/60 px-3 py-1 transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          Why use real returns?
                        </a>
                      </div>
                    </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={handleCopyShareLink}>
                    <Copy className="size-4" />
                    {copied ? "Copied share link" : "Copy share link"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrintSnapshot}
                  >
                    <Printer className="size-4" />
                    Print snapshot
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetScenario}>
                    <RotateCcw className="size-4" />
                    Reset sample
                  </Button>
                </div>
              </CardContent>
            </div>
            ) : null}

          <div className="grid gap-6">
            {false as never ? (
              <div data-print-section="summary" className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
                    Your FIRE snapshot
                  </h2>
                  <div className="flex items-center gap-1" data-print-hidden="true">
                    <Button type="button" variant="ghost" size="sm" onClick={handleCopyShareLink} title="Copy share link">
                      <Copy className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handlePrintSnapshot} title="Print">
                      <Printer className="size-4" />
                    </Button>
                  </div>
                </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <EnhancedStatCard
                      label="FIRE number"
                      value={formatCompactCurrency(summary.fireNumber)}
                      insight={
                        <InsightProgressBar
                          progress={summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0}
                          label={`${formatPercent(summary.fireNumber > 0 ? currentBalance / summary.fireNumber : 0, 0)} there \u00b7 ${formatCompactCurrency(currentBalance)} saved`}
                          tone="accent"
                        />
                      }
                      caption={`${formatCompactCurrency(activeScenario.retirementExpenses)}/yr at ${formatPercent(activeScenario.assumptions.withdrawalRate, 0)} withdrawal rate`}
                      learnMore={{
                        title: "How is this calculated?",
                        content: `FIRE number = annual spending \u00f7 withdrawal rate. The Trinity Study (1998) found that a 4% initial withdrawal, adjusted for inflation, sustained a portfolio for 30 years in most historical periods. Your ${formatCompactCurrency(activeScenario.retirementExpenses)}/yr spending at ${formatPercent(activeScenario.assumptions.withdrawalRate, 0)} means you need ${formatCompactCurrency(summary.fireNumber)}.`,
                      }}
                      tone="accent"
                    />
                    <EnhancedStatCard
                      label="Time to FI"
                      value={formatYears(summary.yearsToFi)}
                      subtitle={summary.fireAge !== null ? `age ${summary.fireAge}` : undefined}
                      insight={
                        sensitivityRows.length >= 7 ? (
                          <InsightMiniTable
                            rows={[
                              {
                                label: `Save 5% less`,
                                value: formatYears(sensitivityRows[2].yearsToFi),
                              },
                              {
                                label: `Save 5% more`,
                                value: formatYears(sensitivityRows[4].yearsToFi),
                              },
                            ]}
                          />
                        ) : null
                      }
                      caption={`${formatCompactCurrency(activeScenario.annualSavings)}/yr at ${formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} real return`}
                      learnMore={{
                        title: "How time to FI works",
                        content: `Projects your portfolio forward month by month, adding savings and compounding at ${formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} real return (after inflation). All numbers are in today's dollars. The sensitivity rows show how \u00b15% savings shifts the outcome.`,
                      }}
                      tone={summary.yearsToFi !== null && summary.yearsToFi <= 10 ? "success" : "default"}
                    />
                    <EnhancedStatCard
                      label="Coast FIRE"
                      value={
                        summary.coastGap <= 0
                          ? "Coasting"
                          : summary.coastAge !== null
                            ? `Age ${Math.round(summary.coastAge)}`
                            : `${formatCompactCurrency(summary.coastGap)} gap`
                      }
                      subtitle={
                        summary.coastGap <= 0
                          ? "stop saving now"
                          : summary.coastAge !== null
                            ? "stop saving then"
                            : undefined
                      }
                      insight={
                        <InsightProgressBar
                          progress={coastFireSummary?.progress ?? 0}
                          label={`${formatPercent(Math.min(coastFireSummary?.progress ?? 0, 1), 0)} of coast target reached`}
                          tone={coastFireSummary?.progress && coastFireSummary.progress >= 1 ? "success" : "warning"}
                        />
                      }
                      caption={`Compounding to ${formatCompactCurrency(summary.fireNumber)} by age ${activeScenario.profile.retirementAge ?? activeScenario.profile.age}`}
                      learnMore={{
                        title: "What is Coast FIRE?",
                        content: `Coast FIRE means you've saved enough that compound growth alone reaches your FIRE number by retirement \u2014 no new savings needed. The coast age is when your portfolio crosses that threshold. After that, you could take a lower-paying job covering just expenses and let compounding finish the job.`,
                      }}
                      tone={coastFireSummary?.progress && coastFireSummary.progress >= 1 ? "success" : "warning"}
                    />
                    <EnhancedStatCard
                      label="Safer target"
                      value={formatCompactCurrency(summary.saferFireNumber)}
                      subtitle={`at ${formatPercent(activeScenario.assumptions.saferWithdrawalRate, 1)}`}
                      insight={
                        <InsightProgressBar
                          progress={summary.saferFireNumber > 0 ? currentBalance / summary.saferFireNumber : 0}
                          label={`${formatCompactCurrency(summary.saferFireNumber - summary.fireNumber)} more than the ${formatPercent(activeScenario.assumptions.withdrawalRate, 0)} target`}
                        />
                      }
                      caption={`~95% historical success over 30 yrs; ${formatPercent(activeScenario.assumptions.saferWithdrawalRate, 1)} approaches 100% over 40+`}
                      learnMore={{
                        title: "Why a safer rate?",
                        content: `The 4% rule was designed for 30-year retirements. Early retirees need 40-60 years, which historically had higher failure rates. ERN's SWR Series suggests 3.25-3.5% for longer horizons. This target gives you a bigger buffer against sequence-of-returns risk in the critical early years.`,
                      }}
                    />
                  </div>
                <div data-print-hidden="true">
                  <Button asChild>
                    <Link href={landingNextStep.href}>{landingNextStep.cta}</Link>
                  </Button>
                </div>
              </div>
            ) : null}

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
                </button>
                <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Tax estimate</p>
                  <p className="mt-2 font-display text-[2.5rem] leading-none tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(taxEstimate.totalTax)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {formatPercent(taxEstimate.effectiveRate, 0)} effective
                    </p>
                    <select
                      value={activeScenario.profile.filingStatus}
                      onChange={(e) => {
                        const next = cloneScenario(activeScenario);
                        next.profile.filingStatus = e.target.value as FilingStatus;
                        replaceScenario(next);
                      }}
                      className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs text-foreground transition-colors hover:border-border"
                    >
                      <option value="single">Single</option>
                      <option value="married_joint">Married joint</option>
                      <option value="married_separate">Married separate</option>
                      <option value="head_of_household">Head of household</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            <ChartShell
              title="Accumulation projection"
              description="How your current pace stacks up against the target."
            >
              <ProjectionChart
                data={summary.projection}
                annualContribution={plannedContribution}
                milestones={
                  variant === "module"
                    ? projectionWithMilestones
                        .filter((p) => p.milestone)
                        .map((p) => ({ year: p.year, label: p.milestone! }))
                    : []
                }
              />
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

        {variant === "module" && false as boolean ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <CollapsibleSection
              title="Account plan"
              summary={`${activeScenario.accounts.length} account${activeScenario.accounts.length === 1 ? "" : "s"}, ${formatCompactCurrency(currentBalance)} total`}
            >
              <div className="space-y-4">
                {activeScenario.accounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="rounded-xl border border-border/60 bg-card/35 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`account-name-${account.id}`} label="Name" />
                        <Input
                          id={`account-name-${account.id}`}
                          value={account.name}
                          onChange={(event) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.name = event.target.value;
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`account-type-${account.id}`} label="Type" />
                        <Select
                          id={`account-type-${account.id}`}
                          value={account.type}
                          onChange={(event) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.type = event.target.value as AccountType;
                              }
                            })
                          }
                        >
                          {accountTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor={`account-owner-${account.id}`}
                          label="Owner"
                        />
                        <Select
                          id={`account-owner-${account.id}`}
                          value={account.owner ?? "primary"}
                          onChange={(event) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.owner =
                                  event.target.value as AccountOwner;
                              }
                            })
                          }
                        >
                          {accountOwnerOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor={`account-balance-${account.id}`}
                          label={index === 0 ? "Core balance" : "Balance"}
                        />
                        <NumberInput
                          id={`account-balance-${account.id}`}
                          min={0}
                          step={1000}
                          inputMode="numeric"
                          value={account.currentBalance}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.currentBalance = Math.max(value, 0);
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor={`account-contribution-${account.id}`}
                          label={index === 0 ? "Core contribution" : "Contribution"}
                        />
                        <NumberInput
                          id={`account-contribution-${account.id}`}
                          min={0}
                          step={1000}
                          inputMode="numeric"
                          value={account.annualContribution}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.annualContribution = Math.max(value, 0);
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor={`account-match-${account.id}`}
                          label="Employer match %"
                          tooltip="Interpreted as match percentage of the employee contribution, capped by the salary percentage below."
                        />
                        <NumberInput
                          id={`account-match-${account.id}`}
                          min={0}
                          max={1}
                          step={0.01}
                          inputMode="decimal"
                          value={account.employerMatch?.percentage ?? 0}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.employerMatch = {
                                  percentage: Math.max(value, 0),
                                  upTo: nextAccount.employerMatch?.upTo ?? 0,
                                };
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor={`account-match-cap-${account.id}`}
                          label="Match cap (% of salary)"
                          tooltip="A 6% cap means the employer only matches contributions up to 6% of annual income."
                        />
                        <NumberInput
                          id={`account-match-cap-${account.id}`}
                          min={0}
                          max={1}
                          step={0.01}
                          inputMode="decimal"
                          value={account.employerMatch?.upTo ?? 0}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextAccount = scenario.accounts.find(
                                (candidate) => candidate.id === account.id,
                              );

                              if (nextAccount) {
                                nextAccount.employerMatch = {
                                  percentage:
                                    nextAccount.employerMatch?.percentage ?? 0,
                                  upTo: Math.max(value, 0),
                                };
                              }
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          updateScenario((scenario) => {
                            if (scenario.accounts.length <= 1) {
                              return;
                            }

                            scenario.accounts = scenario.accounts.filter(
                              (candidate) => candidate.id !== account.id,
                            );
                          })
                        }
                        disabled={activeScenario.accounts.length <= 1}
                      >
                        Remove account
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    updateScenario((scenario) => {
                      scenario.accounts.push(
                        createDefaultAccount(
                          "traditional_401k",
                          "New retirement account",
                          scenario.profile.partner ? "joint" : "primary",
                        ),
                      );
                    })
                  }
                >
                  Add account
                </Button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Recurring events"
              summary={activeScenario.cashFlows.length === 0 ? "No events yet" : `${activeScenario.cashFlows.length} event${activeScenario.cashFlows.length === 1 ? "" : "s"}`}
            >
              <div className="space-y-4">
                {activeScenario.cashFlows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-card/35 p-4 text-sm text-muted-foreground">
                    No recurring cash-flow events yet. Add one to see it flow into the
                    accumulation runway.
                  </div>
                ) : null}
                {activeScenario.cashFlows.map((cashFlow: CashFlowEvent) => (
                  <div
                    key={cashFlow.id}
                    className="rounded-xl border border-border/60 bg-card/35 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`cashflow-name-${cashFlow.id}`} label="Name" />
                        <Input
                          id={`cashflow-name-${cashFlow.id}`}
                          value={cashFlow.name}
                          onChange={(event) =>
                            updateScenario((scenario) => {
                              const nextCashFlow = scenario.cashFlows.find(
                                (candidate) => candidate.id === cashFlow.id,
                              );

                              if (nextCashFlow) {
                                nextCashFlow.name = event.target.value;
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`cashflow-type-${cashFlow.id}`} label="Type" />
                        <Select
                          id={`cashflow-type-${cashFlow.id}`}
                          value={cashFlow.type}
                          onChange={(event) =>
                            updateScenario((scenario) => {
                              const nextCashFlow = scenario.cashFlows.find(
                                (candidate) => candidate.id === cashFlow.id,
                              );

                              if (nextCashFlow) {
                                nextCashFlow.type = event.target.value as CashFlowEvent["type"];
                              }
                            })
                          }
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`cashflow-amount-${cashFlow.id}`} label="Annual amount" />
                        <NumberInput
                          id={`cashflow-amount-${cashFlow.id}`}
                          min={0}
                          step={1000}
                          inputMode="numeric"
                          value={cashFlow.amount}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextCashFlow = scenario.cashFlows.find(
                                (candidate) => candidate.id === cashFlow.id,
                              );

                              if (nextCashFlow) {
                                nextCashFlow.amount = Math.max(value, 0);
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`cashflow-start-${cashFlow.id}`} label="Start age" />
                        <NumberInput
                          id={`cashflow-start-${cashFlow.id}`}
                          min={activeScenario.profile.age}
                          max={90}
                          step={1}
                          inputMode="numeric"
                          value={cashFlow.startAge}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextCashFlow = scenario.cashFlows.find(
                                (candidate) => candidate.id === cashFlow.id,
                              );

                              if (nextCashFlow) {
                                nextCashFlow.startAge = Math.round(value);
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor={`cashflow-end-${cashFlow.id}`}
                          label="End age"
                          tooltip="Use 0 to leave the event open-ended."
                        />
                        <NumberInput
                          id={`cashflow-end-${cashFlow.id}`}
                          min={0}
                          max={100}
                          step={1}
                          inputMode="numeric"
                          value={cashFlow.endAge ?? 0}
                          onValueChange={(value) =>
                            updateScenario((scenario) => {
                              const nextCashFlow = scenario.cashFlows.find(
                                (candidate) => candidate.id === cashFlow.id,
                              );

                              if (nextCashFlow) {
                                nextCashFlow.endAge = value <= 0 ? null : Math.round(value);
                              }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`cashflow-inflation-${cashFlow.id}`} label="Inflation adjusted" />
                        <Select
                          id={`cashflow-inflation-${cashFlow.id}`}
                          value={String(cashFlow.inflationAdjusted)}
                          onChange={(event) =>
                            updateScenario((scenario) => {
                              const nextCashFlow = scenario.cashFlows.find(
                                (candidate) => candidate.id === cashFlow.id,
                              );

                              if (nextCashFlow) {
                                nextCashFlow.inflationAdjusted =
                                  event.target.value === "true";
                              }
                            })
                          }
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          updateScenario((scenario) => {
                            scenario.cashFlows = scenario.cashFlows.filter(
                              (candidate) => candidate.id !== cashFlow.id,
                            );
                          })
                        }
                      >
                        Remove event
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateScenario((scenario) => {
                        const nextCashFlow = createDefaultCashFlowEvent("income");
                        nextCashFlow.startAge = scenario.profile.age;
                        scenario.cashFlows.push(nextCashFlow);
                      })
                    }
                  >
                    Add income event
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateScenario((scenario) => {
                        const nextCashFlow = createDefaultCashFlowEvent("expense");
                        nextCashFlow.startAge = scenario.profile.age;
                        scenario.cashFlows.push(nextCashFlow);
                      })
                    }
                  >
                    Add expense event
                  </Button>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        ) : null}

        {variant === "module" ? (
          <div className="space-y-6">
            <h2 className="font-display text-2xl tracking-[-0.03em] text-foreground">
              What-if analysis
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Savings sensitivity
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  How small changes to your savings rate shift the timeline.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-4 text-left font-medium">Scenario</th>
                        <th className="pb-2 pr-4 text-right font-medium">Savings/yr</th>
                        <th className="pb-2 text-right font-medium">Years to FI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivityRows.map((row, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-t border-border/30",
                            row.delta === 0 && "bg-[rgba(255,107,53,0.04)] font-medium",
                          )}
                        >
                          <td className="py-2.5 pr-4">
                            {row.delta === 0
                              ? "Current plan"
                              : `${row.delta > 0 ? "+" : ""}${formatPercent(row.delta / Math.max(activeScenario.annualSavings, 1), 0)}`}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {formatCompactCurrency(row.annualSavings)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums font-semibold">
                            {formatYears(row.yearsToFi)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  The shockingly simple math
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your time to FI depends on one number: how much of your take-home pay you save. Based on your {formatCompactCurrency(currentBalance)} starting balance.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-4 text-left font-medium">Save</th>
                        <th className="pb-2 pr-4 text-right font-medium">Spend/yr</th>
                        <th className="pb-2 pr-4 text-right font-medium">Need</th>
                        <th className="pb-2 text-right font-medium">Years</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((rate) => {
                        const takeHome = taxEstimate.takeHome;
                        const annualSavings = takeHome * rate;
                        const annualSpending = takeHome * (1 - rate);
                        const fireTarget = annualSpending / activeScenario.assumptions.withdrawalRate;
                        const effectiveReturn = activeScenario.assumptions.expectedRealReturn - activeScenario.simulationSettings.feeDrag;
                        const yearsToFi = currentBalance >= fireTarget
                          ? 0
                          : calculateYearsToTarget({
                              currentBalance,
                              annualContribution: annualSavings,
                              targetBalance: fireTarget,
                              annualRealReturn: effectiveReturn,
                            });
                        const userRate = taxEstimate.afterTaxSavingsRate;
                        const isClosest = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].reduce((best, r) =>
                          Math.abs(r - userRate) < Math.abs(best - userRate) ? r : best
                        ) === rate;
                        return (
                          <tr
                            key={rate}
                            className={cn(
                              "border-t border-border/30",
                              isClosest && "bg-[rgba(255,107,53,0.04)]",
                            )}
                          >
                            <td className="py-2.5 pr-4 tabular-nums">
                              {formatPercent(rate, 0)}
                              {isClosest ? (
                                <span className="ml-1.5 text-[0.65rem] font-bold uppercase text-[var(--ember)]">You</span>
                              ) : null}
                            </td>
                            <td className="py-2.5 pr-4 text-right tabular-nums">{formatCompactCurrency(annualSpending)}</td>
                            <td className="py-2.5 pr-4 text-right tabular-nums">{formatCompactCurrency(fireTarget)}</td>
                            <td className="py-2.5 text-right tabular-nums font-semibold">{formatYears(yearsToFi)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
        </div>
      </section>
      )}
    </div>
  );
}
