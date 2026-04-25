"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";
import {
  educationAnchors,
  educationDefaults,
  educationGlossary,
  educationReferences,
} from "@/lib/education/content";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { calculateFireTypeSummaries, calculateQuickFireSummary } from "@/lib/calc";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

/* ── Types ─────────────────────────────────────────────────── */

interface PersonalContext {
  income: number;
  expenses: number;
  savingsRate: number;
  fireNumber: number;
  yearsToFi: number;
  fireAge: number;
  coastAge: number | null;
  withdrawalRate: number;
  taxSavings401k: number;
  partTimeIncome: number;
  baristaTarget: number;
}

interface TopicCard {
  title: string;
  description: string;
  href: string;
  emoji: string;
  getPersonalized?: (ctx: PersonalContext) => string | null;
}

interface Category {
  id: string;
  title: string;
  description: string;
  topics: TopicCard[];
}

/* ── Categories ────────────────────────────────────────────── */

const CATEGORIES: Category[] = [
  {
    id: "foundation",
    title: "Foundation",
    description: "The core math every FIRE plan is built on",
    topics: [
      {
        title: "Start here: What is FIRE?",
        description: "The acronym, the one idea behind it, and how this site approaches the math",
        href: "/education/what-is-fire",
        emoji: "🧭",
        getPersonalized: () => null,
      },
      {
        title: "Savings Rate",
        description: "How fast you can retire depends on one number",
        href: "/education/savings-rate",
        emoji: "📊",
        getPersonalized: (ctx) =>
          ctx.income > 0
            ? `At ${formatPercent(ctx.savingsRate, 1)}, you reach FI in ${ctx.yearsToFi.toFixed(1)} years (age ${ctx.fireAge})`
            : null,
      },
      {
        title: "The 4% Rule",
        description: "Where the safe withdrawal rate comes from and when it holds",
        href: "/education/the-4-percent-rule",
        emoji: "📐",
        getPersonalized: (ctx) =>
          ctx.fireNumber > 0
            ? `Your ${formatPercent(ctx.withdrawalRate, 1)} rate means a ${formatCompactCurrency(ctx.fireNumber)} target (${Math.round(1 / ctx.withdrawalRate)}× expenses)`
            : null,
      },
      {
        title: "Your FIRE Number",
        description: "The math behind the single most important number in your plan",
        href: "/education/fire-number",
        emoji: "🎯",
        getPersonalized: (ctx) =>
          ctx.fireNumber > 0
            ? `Your FIRE number is ${formatCompactCurrency(ctx.fireNumber)} — here's exactly how that's calculated`
            : null,
      },
      {
        title: "Sequence of Returns Risk",
        description: "Why the order of market returns matters more than the average",
        href: "/education/sequence-of-returns",
        emoji: "📉",
        getPersonalized: (ctx) =>
          ctx.fireNumber > 0
            ? `Your plan is stress-tested against 150 years of market history including 1929, 1966, and 2000`
            : null,
      },
    ],
  },
  {
    id: "fire-variations",
    title: "Variations on FIRE",
    description:
      "Coast and Barista are structural choices. Lean and Fat are community labels you decide for yourself — this site doesn't prescribe them.",
    topics: [
      {
        title: "Coast FIRE",
        description: "Stop saving and let compounding finish the job",
        href: "/education/coast-fire",
        emoji: "⛵",
        getPersonalized: (ctx) =>
          ctx.coastAge !== null && ctx.coastAge > 0
            ? `You could stop saving at age ${ctx.coastAge} and still reach FI`
            : null,
      },
      {
        title: "Barista FIRE",
        description: "Part-time income + a smaller portfolio = earlier freedom",
        href: "/education/barista-fire",
        emoji: "☕",
        getPersonalized: (ctx) =>
          ctx.partTimeIncome > 0
            ? `${formatCompactCurrency(ctx.partTimeIncome)}/yr part-time drops your target to ${formatCompactCurrency(ctx.baristaTarget)}`
            : null,
      },
      {
        title: "Lean FIRE",
        description:
          "The community term for retiring on a lower-spending lifestyle — what counts as 'lean' is personal",
        href: "/education/lean-fire",
        emoji: "🌿",
        getPersonalized: () => null,
      },
      {
        title: "Fat FIRE",
        description:
          "The community term for retiring on a higher-spending lifestyle — what counts as 'fat' is personal",
        href: "/education/fat-fire",
        emoji: "🔥",
        getPersonalized: () => null,
      },
    ],
  },
  {
    id: "withdrawal",
    title: "Withdrawal & Spending",
    description: "How to make a portfolio last 30–50 years",
    topics: [
      {
        title: "Withdrawal Strategies",
        description: "How different spending rules trade off stability and flexibility",
        href: "/education/withdrawal-strategies",
        emoji: "🧭",
        getPersonalized: (ctx) =>
          ctx.fireNumber > 0
            ? `Your ${formatPercent(ctx.withdrawalRate, 0)} rate means ${formatCompactCurrency(ctx.expenses)}/yr from ${formatCompactCurrency(ctx.fireNumber)}`
            : null,
      },
      {
        title: "Floor & Ceiling Withdrawals",
        description: "A flexible spending band that protects both lifestyle and portfolio",
        href: "/education/floor-ceiling",
        emoji: "📏",
        getPersonalized: (ctx) =>
          ctx.expenses > 0
            ? `Your floor would be ${formatCompactCurrency(ctx.expenses * 0.85)}/yr, ceiling ${formatCompactCurrency(ctx.expenses * 1.15)}/yr`
            : null,
      },
      {
        title: "Guyton-Klinger Guardrails",
        description: "A flexible withdrawal system that supports a higher starting rate",
        href: "/education/guyton-klinger",
        emoji: "🛡️",
        getPersonalized: (ctx) =>
          ctx.withdrawalRate > 0.04
            ? `At ${formatPercent(ctx.withdrawalRate, 1)}, guardrails could help you sustain that rate with automatic adjustments`
            : ctx.withdrawalRate > 0
            ? `Guardrail rules let you start at 5–6% and automatically trim spending in bad markets`
            : null,
      },
      {
        title: "The CAPE Ratio",
        description: "How market valuation at retirement affects your safe withdrawal rate",
        href: "/education/cape-ratio",
        emoji: "📈",
        getPersonalized: (ctx) =>
          ctx.withdrawalRate > 0
            ? `At CAPE ~33 today, a valuation-aware rate would be closer to 2.5% — worth modeling`
            : null,
      },
      {
        title: "Monte Carlo Simulations",
        description: "How probability-based stress-testing works and what success rates mean",
        href: "/education/monte-carlo",
        emoji: "🎲",
        getPersonalized: (ctx) =>
          ctx.fireNumber > 0
            ? `Your plan is tested across thousands of simulated futures — not just historical averages`
            : null,
      },
      {
        title: "The Retirement Spending Smile",
        description: "Why retirement expenses aren't flat — and what that means for your plan",
        href: "/education/spending-smile",
        emoji: "😊",
        getPersonalized: (ctx) =>
          ctx.expenses > 0
            ? `Your Go-Go years may cost ~${formatCompactCurrency(Math.round((ctx.expenses * 1.12) / 1000) * 1000)}/yr — plan for that early-retirement peak`
            : null,
      },
      {
        title: "Social Security Timing",
        description: "The claiming age decision is worth hundreds of thousands of dollars",
        href: "/education/social-security-timing",
        emoji: "🏛️",
        getPersonalized: () => null,
      },
    ],
  },
  {
    id: "tax",
    title: "Tax & Accounts",
    description: "Keep more of what you earn and withdraw efficiently",
    topics: [
      {
        title: "Account Types: 401(k), Roth & HSA",
        description: "Which account to fill first and why the order matters",
        href: "/education/account-types",
        emoji: "🏦",
        getPersonalized: (ctx) =>
          ctx.taxSavings401k > 0
            ? `You're already capturing tax savings — the account mix determines your flexibility in retirement`
            : null,
      },
      {
        title: "The Roth Conversion Ladder",
        description: "Access your 401(k) before 59½ without the 10% penalty",
        href: "/education/roth-ladder",
        emoji: "🪜",
        getPersonalized: (ctx) =>
          ctx.taxSavings401k > 0
            ? `Your pre-tax accounts could convert at lower rates in early retirement`
            : null,
      },
      {
        title: "Tax-Efficient Withdrawal Sequencing",
        description: "Which accounts to tap first — and why the order changes your tax bill",
        href: "/education/tax-efficient-withdrawal",
        emoji: "🔀",
        getPersonalized: (ctx) =>
          ctx.taxSavings401k > 0
            ? `Your pre-tax balances will be subject to RMDs at 73 — sequencing now determines your future tax exposure`
            : null,
      },
      {
        title: "The HSA Triple Tax Advantage",
        description: "The only account with pre-tax contributions, tax-free growth, and tax-free withdrawals",
        href: "/education/hsa-triple-advantage",
        emoji: "🏥",
        getPersonalized: (ctx) =>
          ctx.taxSavings401k > 0
            ? `An HSA beats every other account in the tax code — here's how to maximize it`
            : null,
      },
      {
        title: "ACA Subsidies in Early Retirement",
        description: "How to keep healthcare affordable between retirement and Medicare",
        href: "/education/aca-early-retirement",
        emoji: "💊",
        getPersonalized: (ctx) =>
          ctx.expenses > 0
            ? `Managing MAGI below the subsidy cliff could save thousands per year on premiums`
            : null,
      },
      {
        title: "SEP-IRA and Solo 401(k)",
        description: "Self-employed savers can shelter nearly triple what W-2 employees can",
        href: "/education/self-employed-retirement",
        emoji: "🧾",
        getPersonalized: () => null,
      },
    ],
  },
  {
    id: "assumptions",
    title: "Planning Assumptions",
    description: "The inputs behind every projection — and why they matter",
    topics: [
      {
        title: "Real vs. Nominal Returns",
        description: "Why Calcifer uses real returns and what that means for your projections",
        href: "/education/real-vs-nominal-returns",
        emoji: "💹",
        getPersonalized: () => null,
      },
      {
        title: "How Investment Fees Erode Returns",
        description: "A 1% fee costs you 25% of your final portfolio over 30 years",
        href: "/education/investment-fees",
        emoji: "💸",
        getPersonalized: (ctx) =>
          ctx.fireNumber > 0
            ? `On a ${formatCompactCurrency(ctx.fireNumber)} portfolio, every 0.1% in fees is ${formatCompactCurrency(Math.round(ctx.fireNumber * 0.001))} per year`
            : null,
      },
      {
        title: "Lifestyle Creep and Your FIRE Number",
        description: "When spending grows above inflation, your target grows with it",
        href: "/education/lifestyle-creep",
        emoji: "📈",
        getPersonalized: (ctx) =>
          ctx.expenses > 0
            ? `At 1% real expense growth, your spending reaches ${formatCompactCurrency(Math.round((ctx.expenses * Math.pow(1.01, 15)) / 1000) * 1000)}/yr in 15 years`
            : null,
      },
    ],
  },
];

/* ── Article count ─────────────────────────────────────────── */
const ARTICLE_COUNT = CATEGORIES.reduce((sum, c) => sum + c.topics.length, 0);

/* ── TopicCard component ───────────────────────────────────── */
function ArticleCard({
  topic,
  personalized,
}: {
  topic: TopicCard;
  personalized: string | null;
}) {
  return (
    <Link href={topic.href as Route} className="group block">
      <div className="flex h-full flex-col gap-3 rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-200 group-hover:border-border/80 group-hover:shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-lg leading-none">{topic.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base leading-snug tracking-[-0.02em] text-foreground group-hover:text-[var(--ember)] transition-colors">
              {topic.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {topic.description}
            </p>
          </div>
        </div>
        {personalized && (
          <p className="rounded-lg bg-[rgba(255,107,53,0.07)] px-3 py-2 text-xs font-medium text-[var(--ember)]">
            {personalized}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ── Main workspace ────────────────────────────────────────── */
export function EducationWorkspace() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const personalCtx = useMemo<PersonalContext | null>(() => {
    if (!hasData) return null;
    const summary = calculateQuickFireSummary(activeScenario);
    const taxInfo = estimateScenarioTax(activeScenario);
    const trad401k = activeScenario.accounts
      .filter((a) => a.type === "traditional_401k" || a.type === "hsa")
      .reduce((sum, a) => sum + a.annualContribution, 0);
    const taxSavings401k = Math.round(trad401k * 0.25);

    return {
      income: activeScenario.annualIncome,
      expenses: activeScenario.annualExpenses,
      savingsRate: taxInfo.afterTaxSavingsRate,
      fireNumber: summary.fireNumber,
      yearsToFi: summary.yearsToFi ?? 99,
      fireAge: Math.round(activeScenario.profile.age + (summary.yearsToFi ?? 99)),
      coastAge: summary.coastAge ? Math.round(summary.coastAge) : null,
      withdrawalRate: activeScenario.assumptions.withdrawalRate,
      taxSavings401k,
      partTimeIncome: activeScenario.assumptions.partTimeIncome,
      baristaTarget: (() => {
        const fireTypeSummaries = calculateFireTypeSummaries(activeScenario);
        return fireTypeSummaries.find((ft) => ft.id === "barista")?.target ?? 0;
      })(),
    };
  }, [activeScenario, hasData]);

  return (
    <div className="space-y-14 pb-16">

      {/* ── Hero ── */}
      <section className="mx-auto max-w-7xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          {ARTICLE_COUNT} in-depth articles on FIRE planning
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Research-backed, personalized to your numbers. Every article updates with your actual plan data so the math is never hypothetical.
        </p>

        {!hasData && (
          <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-[var(--ember)]/25 bg-[rgba(255,107,53,0.05)] px-4 py-2.5">
            <span className="text-sm text-muted-foreground">
              Articles show generic numbers right now.
            </span>
            <Link
              href="/quiz"
              className="text-sm font-medium text-[var(--ember)] hover:underline"
            >
              Take the quiz to personalize &rarr;
            </Link>
          </div>
        )}
      </section>

      {/* ── Category sections ── */}
      {CATEGORIES.map((category) => (
        <section
          key={category.id}
          id={category.id}
          className="mx-auto max-w-7xl scroll-mt-32 px-6"
        >
          {/* Section header */}
          <div className="mb-5 flex flex-col gap-0.5 border-b border-border/50 pb-4 sm:flex-row sm:items-baseline sm:gap-4">
            <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
              {category.title}
            </h2>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>

          {/* Article cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {category.topics.map((topic) => {
              const personalized = personalCtx ? (topic.getPersonalized?.(personalCtx) ?? null) : null;
              return (
                <ArticleCard
                  key={topic.href}
                  topic={topic}
                  personalized={personalized}
                />
              );
            })}
          </div>
        </section>
      ))}

      {/* ── Glossary ── */}
      <section className="mx-auto max-w-7xl space-y-5 px-6">
        <div className="border-b border-border/50 pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
            Glossary
          </p>
          <h2 className="mt-1 font-display text-xl tracking-[-0.02em] text-foreground">
            Core FIRE concepts
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Short definitions for the terms that appear most often across the app.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {educationGlossary.map((entry) => (
            <div
              key={entry.term}
              id={entry.id}
              className="rounded-xl border border-border/50 bg-card p-5"
            >
              <p className="font-display text-base tracking-[-0.02em] text-foreground">
                {entry.term}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {entry.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Defaults + Research ── */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Defaults */}
          <div className="space-y-5">
            <div className="border-b border-border/50 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
                Methodology
              </p>
              <h2 className="mt-1 font-display text-xl tracking-[-0.02em] text-foreground">
                Why the defaults look like this
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Defaults are transparent starting points, not universal truths.
              </p>
            </div>
            <div
              id={educationAnchors.defaults}
              className="space-y-2"
            >
              {educationDefaults.map((item) => (
                <div
                  key={item.id}
                  id={item.id}
                  className="rounded-xl border border-border/50 bg-card p-4"
                >
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Research */}
          <div className="space-y-5">
            <div className="border-b border-border/50 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
                Research
              </p>
              <h2 className="mt-1 font-display text-xl tracking-[-0.02em] text-foreground">
                Research library
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Papers and studies that map directly to the calculators in this app.
              </p>
            </div>
            <div
              id={educationAnchors.researchLibrary}
              className="space-y-2"
            >
              {educationReferences.map((reference) => (
                <a
                  key={reference.id}
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-border hover:bg-card/80"
                >
                  <p className="text-sm font-medium text-foreground transition-colors group-hover:text-[var(--ember)]">
                    {reference.label}
                  </p>
                  {reference.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {reference.note}
                    </p>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
