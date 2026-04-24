"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { PersonalizedInsight } from "./personalized-insight";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { formatPercent } from "@/lib/calc/format";

const comparisonData = [
  {
    method: "Historical Backtest",
    successRate: 94,
    description: "~120 real 30-yr windows",
    fill: "#10b981",
  },
  {
    method: "Monte Carlo",
    successRate: 91,
    description: "10,000 simulated sequences",
    fill: "#6366f1",
  },
];

const divergenceData = [
  { label: "4% rule, 30 yr", historical: 94, monteCarlo: 91 },
  { label: "3.5% rule, 30 yr", historical: 98, monteCarlo: 96 },
  { label: "4% rule, 40 yr", historical: 87, monteCarlo: 84 },
  { label: "5% rule, 30 yr", historical: 78, monteCarlo: 72 },
  { label: "4% rule, 50 yr", historical: 82, monteCarlo: 77 },
];

export function MonteCarloArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const retirementAge = activeScenario.profile.retirementAge ?? 65;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;
  const retirementHorizon = Math.max(95 - retirementAge, 0);

  const historicalWindowCount =
    retirementHorizon > 0
      ? Math.max(Math.round(150 - retirementHorizon), 1)
      : 0;

  const approxSuccessRate = useMemo(() => {
    if (withdrawalRate <= 0.03) return "98–99%";
    if (withdrawalRate <= 0.035) return "96–98%";
    if (withdrawalRate <= 0.04) return "90–95%";
    if (withdrawalRate <= 0.045) return "83–90%";
    if (withdrawalRate <= 0.05) return "74–82%";
    return "below 75%";
  }, [withdrawalRate]);

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Monte Carlo vs. historical backtest
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          How retirement simulations work, and how to read success rates
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          When Calcifer reports an &ldquo;87% success rate,&rdquo; it&apos;s answering a precise
          question: in what percentage of simulated retirements does your money last through your
          planned retirement period without hitting zero? There are two fundamentally different ways
          to run that simulation — historical backtesting and Monte Carlo — and they answer slightly
          different questions.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Understanding which one you&apos;re looking at, and what each one can and cannot tell you,
          makes a real difference in how you interpret the numbers. A 90% success rate from a Monte
          Carlo run is not the same as a 90% rate from a historical backtest — even if they point in
          the same direction.
        </p>
      </section>

      {/* Personalized callout */}
      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your numbers" hasData={hasData}>
          <div className="space-y-2 text-sm leading-relaxed text-foreground">
            <p>
              Your plan uses a{" "}
              <strong className="text-[var(--ember)]">
                {formatPercent(withdrawalRate, 1)} withdrawal rate
              </strong>{" "}
              over a{" "}
              <strong>{retirementHorizon}-year retirement horizon</strong> (age{" "}
              {retirementAge} to 95).
            </p>
            <p className="text-muted-foreground">
              At {formatPercent(withdrawalRate, 1)} over {retirementHorizon} years, historical
              success rates are approximately{" "}
              <strong className="text-foreground">{approxSuccessRate}</strong>. Monte Carlo adds
              another lens — it can model scenarios worse than anything in the historical record,
              which tends to push success rates slightly lower.
            </p>
            {retirementHorizon > 0 ? (
              <p className="text-muted-foreground">
                For a {retirementHorizon}-year period, the historical dataset has roughly{" "}
                <strong className="text-foreground">
                  {historicalWindowCount} overlapping windows
                </strong>{" "}
                to test against, going back to 1871 (Shiller data). Monte Carlo runs 10,000+
                synthetic paths from the same statistical distribution.
              </p>
            ) : null}
          </div>
        </PersonalizedInsight>
      </section>

      {/* Historical Backtesting */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Historical backtesting
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Historical backtesting tests your plan against every actual market sequence since 1871,
          using Shiller&apos;s long-run US stock and bond return data. If you&apos;re modeling a
          30-year retirement, the test runs your portfolio through 1871–1901, then 1872–1902, then
          1873–1903, and so on through roughly 120 overlapping 30-year windows. Each window is a
          complete real-world retirement scenario — complete with the 1929 crash, the stagflation
          of the 1970s, the dot-com bust, and 2008.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The success rate is simply the percentage of those windows where your portfolio never hit
          zero before the end of the period. A 94% historical success rate at the 4% rule over 30
          years means roughly 6 of those 120 windows failed — and those failures were almost
          exclusively scenarios where someone retired in the late 1920s or mid-1960s into terrible
          sequence-of-returns conditions.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
              Strengths
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>
                  Uses real historical sequences including actual crashes — 1929, 1966, 2000, 2008
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>
                  Preserves real autocorrelation — bad years sometimes cluster, just as they
                  did historically
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>Anchored in actual economic history. Every data point is real.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>Results are interpretable: you can see which periods failed and why</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-600 dark:text-rose-400">
              Weaknesses
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>
                  Limited sample size — only ~120 non-overlapping 30-year windows in 150 years of
                  data
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>US-centric. The 20th century was the American century — survivorship
                  bias is real.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>
                  Cannot model &ldquo;worse than history&rdquo; scenarios — if future conditions
                  are more severe than any historical period, the backtest won&apos;t show it
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>Past sequences do not have to repeat in the same order</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Monte Carlo */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Monte Carlo simulation
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Monte Carlo simulation does not replay history. Instead, it generates thousands of
          synthetic return sequences using statistical properties derived from historical returns —
          typically the mean and standard deviation of annual real returns. From those properties,
          it creates 10,000 or more random 30-year (or 40- or 50-year) return paths and counts how
          many of them allow your portfolio to survive.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The appeal is unlimited sample size. Where the historical backtest gives you ~120 windows
          for a 30-year period, Monte Carlo gives you 10,000 or 100,000 — each slightly different.
          This lets the simulation explore the full statistical distribution of outcomes, including
          tails that may be worse than any individual year in recorded history.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
              Strengths
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>Unlimited sample size — 10,000+ runs gives richer statistical coverage</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>
                  Can model tail risks more extreme than anything in the historical record
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>
                  Can model parameter uncertainty — e.g., running the simulation with varying
                  mean return assumptions
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">+</span>
                <span>
                  Easy to layer on CAPE-based adjustments or stress scenarios that shift the
                  distribution
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-600 dark:text-rose-400">
              Weaknesses
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>
                  Assumes returns are normally distributed — markets have fat tails and skewness
                  that a Gaussian model understates
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>
                  Does not preserve real-world autocorrelation — crashes and recoveries have
                  structure that random draws miss
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>
                  Can be optimistic if variance is underestimated, or pessimistic if mean return
                  is set too conservatively
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">−</span>
                <span>
                  Results depend heavily on the parameter assumptions — garbage in, garbage out
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Monte Carlo variants */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Monte Carlo variants Calcifer supports
          </p>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">Normal distribution</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Draws each year&apos;s return from a normal distribution parameterized by historical
              mean and standard deviation. Fast and transparent, but underweights tail events.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">Bootstrap resampling</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Instead of a mathematical distribution, this approach resamples randomly from the
              actual year-by-year historical returns. Each synthetic sequence is assembled from
              real years in random order. This preserves fat tails while still generating many more
              paths than pure historical backtesting.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">CAPE-adjusted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Shifts the mean return assumption based on the current Shiller CAPE (cyclically
              adjusted P/E ratio). When valuations are high — as they have been in recent years —
              the expected real return is reduced, making this variant generally more pessimistic
              and arguably more relevant to planning.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">Sequence-stressed</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upweights bad sequences at the start of retirement to deliberately stress-test
              sequence-of-returns risk. This is the most pessimistic variant and is useful for
              checking worst-case early-retirement scenarios.
            </p>
          </div>
        </div>
      </section>

      {/* Chart: Side-by-side comparison */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Comparing the two methods: same scenario, different lenses
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows the approximate success rates from each method for the classic 4%
          rule over a 30-year retirement. They give similar but not identical answers — and that
          gap is meaningful information.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Success rate: 4% withdrawal, 30-year retirement
          </p>
          <ChartFrame
            ariaLabel="Bar chart comparing historical backtest and Monte Carlo success rates for the 4% rule over 30 years"
            className="mt-4 h-64"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={comparisonData}
                margin={{ top: 4, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="method"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[80, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value, name, props) => [
                    `${value}% success rate`,
                    props.payload?.description ?? String(name),
                  ]}
                />
                <Bar dataKey="successRate" radius={[6, 6, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#10b981]" />
              Historical backtest (~120 real windows)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#6366f1]" />
              Monte Carlo (10,000 synthetic runs)
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The ~3 percentage point gap is typical. Monte Carlo tends to run slightly lower because
            it can generate sequences worse than anything that actually occurred historically.
          </p>
        </div>

        {/* Multi-scenario comparison */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Divergence across withdrawal rates and horizons (approximate)
          </p>
          <ChartFrame
            ariaLabel="Grouped bar chart showing historical vs Monte Carlo success rates across multiple scenarios"
            className="mt-4 h-72"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={divergenceData}
                margin={{ top: 4, right: 8, bottom: 40, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  domain={[60, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value, name) => [
                    `${value}%`,
                    name === "historical" ? "Historical backtest" : "Monte Carlo",
                  ]}
                />
                <Bar dataKey="historical" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="monteCarlo" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#10b981]" />
              Historical
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#6366f1]" />
              Monte Carlo
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The two methods tend to diverge more at higher withdrawal rates and longer horizons —
            exactly the scenarios where stress-testing is most important.
          </p>
        </div>
      </section>

      {/* How to read success rates */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How to read success rates
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Success rates give you a probability distribution over outcomes, but they require some
          interpretation. A 90% historical success rate does not mean &ldquo;you have a 10% chance
          of going broke&rdquo; in any literal sense — it means 10% of historical 30-year periods
          resulted in portfolio depletion before the end of the period, assuming no adjustments were
          made.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          In real life, virtually no retiree follows a rigid rule with zero adjustment for 30 years.
          The actual behavioral risk is lower than the model suggests — because real people cut
          spending in bad markets, pick up occasional work, or adjust when they see their portfolio
          eroding. The simulation&apos;s job is to show you the guardrails, not to predict your
          exact outcome.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              95+
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Historically very robust</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The only failures at this success rate are typically 1929-era scenarios — someone
                who retired just before the Great Depression. Even then, most of those plans would
                have recovered if spending had been reduced modestly in the worst years. At this
                level, your plan is as resilient as the historical record allows.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.04] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              85–95
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Solid, with a flex plan</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This range includes the classic 4% rule outcome for 30-year retirements. It&apos;s
                considered the consensus &ldquo;safe withdrawal rate&rdquo; zone. The sensible
                addition here is a guardrail rule: if your portfolio drops meaningfully in the
                first five years, reduce spending 10–15% for a year or two. That adjustment alone
                dramatically reduces real-world failure rates.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-600 dark:text-amber-400">
              75–85
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Meaningful risk — plan for flexibility</p>
              <p className="mt-1 text-sm text-muted-foreground">
                At this success rate, your withdrawal rate is high enough that adverse sequences
                produce real stress. This isn&apos;t necessarily disqualifying — if you have part-time
                income potential, a flexible budget, or plan to downsize, you can absorb what the
                model says is a 15–25% failure rate. But going in without any contingency plan at this
                level is risky.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-sm font-bold text-rose-600 dark:text-rose-400">
              &lt;75
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">High risk — reconsider the withdrawal rate</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Below 75%, the withdrawal rate is likely too aggressive for the time horizon.
                Solutions include: reducing the withdrawal rate (lower spending or more savings),
                shortening the horizon in the model (planning for a legacy instead of full
                depletion), or explicitly modeling a flexible strategy like Guyton-Klinger that
                cuts spending in bad stretches. This is not a number to rationalize away.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-4">
          <p className="text-sm font-medium text-foreground">
            The key nuance: &ldquo;failure&rdquo; is not going broke
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            In simulation terms, &ldquo;failure&rdquo; means the portfolio hits zero before the
            end of the modeled period under the rigid withdrawal rule. In reality, retirees adjust.
            They spend less in bad years, pick up occasional work, sell a vacation home, or adjust
            expectations. The simulation is deliberately conservative in assuming no behavioral
            response. Treat the success rate as a lower bound on your real-world probability of
            surviving — not a literal prediction.
          </p>
        </div>
      </section>

      {/* Which method to use */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Which method should you use?
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The correct answer is both. They are complementary lenses, not competing answers to the
          same question.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Use historical backtest to understand what actually happened
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              If you want to know how your plan would have fared across real market history — with
              real crashes, real recoveries, and real economic regimes — historical backtesting is
              the right tool. It&apos;s grounded. Every data point is something that actually
              occurred. And because the failures are specific historical periods, you can
              investigate them: what happened in 1929, and would I have handled it differently?
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Use Monte Carlo to stress-test against scenarios worse than history
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The US market delivered exceptional returns over the past 150 years. That&apos;s
              partly good policy and institutional strength, and partly survivorship bias — we are
              looking at one of history&apos;s great economic success stories. Monte Carlo can
              generate paths worse than anything in that record: extended 20-year bear markets,
              persistent inflation, or extended low-return environments. If you want to plan
              conservatively beyond what history shows, Monte Carlo is the better tool.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              The gap between them is useful signal
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              When historical backtest gives 94% and Monte Carlo gives 91%, those are close enough
              to suggest reasonable agreement. When they diverge significantly — say, 90% vs 75% —
              it means one method is picking up something the other isn&apos;t. A large gap often
              signals a scenario where the historical record has been relatively favorable but
              statistical modeling suggests the distribution has meaningful downside tails.
              That divergence is &ldquo;model risk&rdquo; and deserves investigation.
            </p>
          </div>
        </div>
      </section>

      {/* Sequence of returns nuance */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Why the first decade matters most
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Both historical and Monte Carlo simulations reveal the same core truth about retirement
          planning: the sequence of returns in your first decade matters enormously. A 4% withdrawal
          from a $1M portfolio produces very different outcomes depending on whether markets go up
          or down in years 1–10.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          If you retire into a strong bull market, early gains build a buffer that protects you
          from later downturns. If you retire into a bear market, withdrawals in down years lock
          in losses and deplete capital that can never recover. This is called sequence-of-returns
          risk, and it&apos;s the main reason the 4% rule sometimes fails even when long-run average
          returns look fine.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              The practical implication
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your first five years of retirement are when your plan is most vulnerable. If markets
              deliver poor returns in that window, consider a flexible strategy that can cut spending
              by 10–15% before the damage compounds. This is why Guyton-Klinger guardrails,
              CAPE-based rules, and variable percentage withdrawal strategies exist — they all
              have built-in mechanisms to reduce spending when portfolio stress is detected early.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              How Monte Carlo models this vs. historical
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Historical backtest preserves the actual autocorrelation of returns — bad years in the
              historical record were sometimes followed by more bad years (as in the 1966–1982
              stagflation era). Simple Monte Carlo with independent draws does not capture this
              clustering. Bootstrap resampling does better. CAPE-adjusted Monte Carlo also helps
              by reducing expected returns when starting valuations are high, which statistically
              correlates with eventual mean-reversion and short-term drawdowns.
            </p>
          </div>
        </div>
      </section>

      {/* Related articles */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Related topics
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/education/the-4-percent-rule"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The 4% rule
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Where the 94% historical success rate comes from, and its original assumptions.
            </p>
          </Link>
          <Link
            href="/education/withdrawal-strategies"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Withdrawal strategies
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How different rules respond to sequence risk — and their simulated success rates.
            </p>
          </Link>
          <Link
            href="/education/aca-early-retirement"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              ACA planning
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How your MAGI level determines health insurance costs in early retirement.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/withdrawal"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Run your simulation &rarr;
          </Link>
          <Link
            href="/education"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            &larr; Back to Learn
          </Link>
        </div>
      </section>
    </div>
  );
}
