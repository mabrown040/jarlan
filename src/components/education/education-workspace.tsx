"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo } from "react";
import { SectionHeading } from "@/components/brand";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  educationAnchors,
  educationDefaults,
  educationGlossary,
  educationReferences,
} from "@/lib/education/content";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { calculateFireTypeSummaries, calculateQuickFireSummary, getCurrentPortfolioBalance, getSavingsRate } from "@/lib/calc";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

/* ── Topic card definitions ────────────────────────────────── */
interface TopicCard {
  title: string;
  description: string;
  href: string | null; // null = coming soon
  emoji: string;
  getPersonalized?: (ctx: PersonalContext) => string | null;
}

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

const TOPICS: TopicCard[] = [
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
    title: "Safe Withdrawal Rate",
    description: "The percentage you can safely spend each year in retirement",
    href: null,
    emoji: "🛡️",
    getPersonalized: (ctx) =>
      ctx.fireNumber > 0
        ? `Your ${formatPercent(ctx.withdrawalRate, 0)} rate means ${formatCompactCurrency(ctx.expenses)}/yr from ${formatCompactCurrency(ctx.fireNumber)}`
        : null,
  },
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
    title: "Tax-Efficient Savings",
    description: "Where you save matters as much as how much",
    href: null,
    emoji: "🏦",
    getPersonalized: (ctx) =>
      ctx.taxSavings401k > 0
        ? `Your pre-tax 401(k) saves ~${formatCompactCurrency(ctx.taxSavings401k)} in taxes this year`
        : null,
  },
  {
    title: "Sequence of Returns Risk",
    description: "The biggest threat to early retirees",
    href: null,
    emoji: "📉",
    getPersonalized: () => null, // requires backtest data, future enhancement
  },
];

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
    // Rough tax savings from pre-tax contributions (~25% effective marginal rate)
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
    <div className="space-y-10 pb-12">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Understand the math behind your plan
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Every concept comes alive with your actual numbers. The more you tell Calcifer about your
          situation, the more personalized these insights become.
        </p>
      </section>

      {/* Personalized Topic Cards */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => {
            const personalized = personalCtx ? topic.getPersonalized?.(personalCtx) : null;
            const isComingSoon = topic.href === null;

            const cardContent = (
              <div className="flex h-full flex-col justify-between rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_12px_32px_rgba(26,17,24,0.05)]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{topic.emoji}</span>
                    <h3 className="font-display text-lg tracking-[-0.02em] text-foreground">
                      {topic.title}
                    </h3>
                    {isComingSoon && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{topic.description}</p>
                  {personalized && (
                    <p className="mt-3 rounded-lg bg-[rgba(255,107,53,0.05)] px-3 py-2 text-xs font-medium text-[var(--ember)]">
                      {personalized}
                    </p>
                  )}
                  {!personalized && hasData && topic.getPersonalized && (
                    <p className="mt-3 text-xs text-muted-foreground/60 italic">
                      Personalized data coming soon
                    </p>
                  )}
                  {!hasData && topic.getPersonalized && (
                    <p className="mt-3 text-xs text-muted-foreground/60">
                      Take the quiz to personalize →
                    </p>
                  )}
                </div>
                {!isComingSoon && (
                  <p className="mt-4 text-sm font-medium text-[var(--ember)]">
                    Read article →
                  </p>
                )}
              </div>
            );

            if (isComingSoon) {
              return <div key={topic.title} className="opacity-70">{cardContent}</div>;
            }

            return (
              <Link key={topic.title} href={topic.href as Route} className="block">
                {cardContent}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Glossary */}
      <section className="mx-auto max-w-7xl space-y-6 px-6">
        <SectionHeading
          eyebrow="Glossary"
          title="Core FIRE concepts"
          description="Short definitions for the terms that show up most often across the app."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {educationGlossary.map((entry) => (
            <Card key={entry.term} id={entry.id}>
              <CardHeader>
                <SectionHeading
                  eyebrow="Concept"
                  title={entry.term}
                  titleAs="h3"
                  titleClassName="text-[1.35rem]"
                />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {entry.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Defaults + Research */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Defaults"
                title="Why the app defaults look like this"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="Defaults are meant to be transparent starting points, not universal truths."
              />
            </CardHeader>
            <CardContent
              id={educationAnchors.defaults}
              className="space-y-3 text-sm text-muted-foreground"
            >
              {educationDefaults.map((item) => (
                <div
                  key={item.id}
                  id={item.id}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="mt-2">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Research"
                title="Research library"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="A small starting set of links that map directly to the assumptions and calculators in the app."
              />
            </CardHeader>
            <CardContent
              id={educationAnchors.researchLibrary}
              className="space-y-3 text-sm"
            >
              {educationReferences.map((reference) => (
                <a
                  key={reference.url}
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-border/60 bg-card/40 p-4 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  {reference.label}
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
