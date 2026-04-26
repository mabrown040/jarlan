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

import { PersonalizedInsight } from "./personalized-insight";
import { ChartFrame } from "@/components/charts/chart-frame";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { calculateQuickFireSummary } from "@/lib/calc";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

/* ── Static data ──────────────────────────────────────────── */

const spendingData = [
  { spending: "$60K/yr", fireNumber: 1_500_000, label: "$1.5M" },
  { spending: "$80K/yr", fireNumber: 2_000_000, label: "$2.0M" },
  { spending: "$100K/yr", fireNumber: 2_500_000, label: "$2.5M" },
  { spending: "$120K/yr", fireNumber: 3_000_000, label: "$3.0M" },
  { spending: "$150K/yr", fireNumber: 3_750_000, label: "$3.75M" },
  { spending: "$200K/yr", fireNumber: 5_000_000, label: "$5.0M" },
];

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function classifySpending(annualExpenses: number): string {
  if (annualExpenses < 60_000) return "Lean/Traditional territory";
  if (annualExpenses < 100_000) return "Traditional FIRE territory";
  return "Fat FIRE territory";
}

/* ── Component ────────────────────────────────────────────── */

export function FatFireArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );

  const annualExpenses = activeScenario.annualExpenses;
  const wr = activeScenario.assumptions.withdrawalRate || 0.04;
  const fireNumber = summary.fireNumber;
  const yearsToFi = summary.yearsToFi;

  const spendingClassification = useMemo(
    () => classifySpending(annualExpenses),
    [annualExpenses],
  );

  const fireNumberAt20KMore = useMemo(
    () => (annualExpenses + 20_000) / wr,
    [annualExpenses, wr],
  );

  const extraPortfolioFor20K = useMemo(
    () => fireNumberAt20KMore - fireNumber,
    [fireNumberAt20KMore, fireNumber],
  );

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          What Is Fat FIRE?
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          High-income early retirement, without lifestyle compromise
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            Fat FIRE is financial independence without sacrifice. Where Lean FIRE
            asks what you can cut, Fat FIRE asks what you need to never feel
            constrained. Most definitions peg Fat FIRE at $100,000 or more in
            annual spending &mdash; which translates to a $2.5 million portfolio
            at the 4% rule, and $2.86 million at a more conservative 3.5%.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            It&apos;s the most expensive path to early retirement, but also the
            one that preserves the most optionality. Travel first class. Fund
            your kids&apos; college. Handle a health emergency without panic.
            Never feel the low-grade anxiety of checking whether a restaurant
            bill fits the budget. Fat FIRE is retirement with genuine slack
            built in.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            The tradeoff is time. Reaching a $3M or $4M portfolio takes longer
            than reaching $1M, which means either earning more aggressively,
            waiting longer to retire, or both. For many people, the question
            isn&apos;t whether Fat FIRE is better &mdash; it&apos;s whether the
            extra years of accumulation are worth the extra freedom in
            retirement.
          </p>
        </div>
      </section>

      {/* ── Section 1: The Math ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The math behind Fat FIRE
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The foundational equation is simple: divide your annual spending by
          your safe withdrawal rate to get your FIRE number. At the standard 4%
          rule, every $10,000 in annual spending requires $250,000 of portfolio.
          That relationship is linear and unforgiving.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The formula
          </p>
          <p className="mt-3 font-mono text-sm text-foreground">
            FIRE Number = Annual Expenses &divide; Safe Withdrawal Rate
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            $2,500,000 = $100,000 &divide; 0.04 &nbsp;&nbsp;&nbsp; (the Fat FIRE threshold at 4%)
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The table below shows how your FIRE number scales with spending. The
          difference between 4% and 3.5% withdrawal rates is significant &mdash;
          longer retirements and higher spending call for conservatism, and
          Fat FIRE planners often target 3.5% or lower because the dollar
          amounts leave little room for a portfolio failure to be manageable.
        </p>

        {/* Spending table */}
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Annual Spending
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  FIRE Number (4%)
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  FIRE Number (3.5%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                { spending: "$60,000", at4: "$1,500,000", at35: "$1,714,000" },
                { spending: "$80,000", at4: "$2,000,000", at35: "$2,286,000" },
                { spending: "$100,000", at4: "$2,500,000", at35: "$2,857,000", fat: true },
                { spending: "$120,000", at4: "$3,000,000", at35: "$3,429,000", fat: true },
                { spending: "$150,000", at4: "$3,750,000", at35: "$4,286,000", fat: true },
                { spending: "$200,000", at4: "$5,000,000", at35: "$5,714,000", fat: true },
              ].map((row) => (
                <tr
                  key={row.spending}
                  className={row.fat ? "bg-[rgba(255,107,53,0.025)]" : ""}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.fat && (
                      <span className="mr-2 inline-block rounded-full bg-[rgba(255,107,53,0.12)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--ember)]">
                        Fat
                      </span>
                    )}
                    {row.spending}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {row.at4}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.at35}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="text-sm font-medium text-foreground">
            The $250,000 rule of thumb
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            At a 4% withdrawal rate, every $10,000 more in annual spending
            adds exactly $250,000 to your required portfolio. Going from
            $100K/yr to $120K/yr in retirement spending adds half a million
            dollars to your target. This is why spending assumptions matter
            more than almost any other variable in your FIRE plan.
          </p>
        </div>
      </section>

      {/* ── Section 2: The Bar Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Spending vs. FIRE number: the linear relationship
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The relationship between annual spending and required portfolio is
          perfectly linear at any given withdrawal rate. The chart below shows
          why hitting Fat FIRE territory ($100K+) dramatically changes the
          scale of your target.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Required portfolio at 4% withdrawal rate
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Each extra $10K in annual spending adds $250K to your target
          </p>
          <ChartFrame
            ariaLabel="Bar chart showing required portfolio size at different annual spending levels from $60K to $200K per year"
            className="mt-4 h-64"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={spendingData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="spending"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => fmtCurrency(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [fmtCurrency(Number(value)), "FIRE number"]}
                  labelFormatter={(label) => `Spending: ${label}`}
                />
                <Bar dataKey="fireNumber" radius={[6, 6, 0, 0]} name="fireNumber">
                  {spendingData.map((entry) => (
                    <Cell
                      key={entry.spending}
                      fill={entry.fireNumber >= 2_500_000 ? "var(--ember)" : "var(--muted-foreground)"}
                      fillOpacity={entry.fireNumber >= 2_500_000 ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-[var(--ember)]" />
              Fat FIRE territory ($100K+/yr)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-muted-foreground/40" />
              Traditional / Lean FIRE
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: What Counts as Fat FIRE ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What actually counts as Fat FIRE?
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          There&apos;s no official threshold. The $100K/yr floor comes from
          community convention, not any financial principle. What matters is
          geography, lifestyle, and your own definition of &ldquo;without
          constraints.&rdquo;
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Geography transforms what $100K means
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              In New York City or San Francisco, $150,000 per year is genuinely
              middle-class once you account for housing, childcare, state taxes,
              and the baseline cost of everything. In Asheville, NC or Tucson,
              AZ, $80,000 funds a genuinely luxurious lifestyle with room to
              spare. International retirement destinations &mdash; Portugal,
              Mexico, Thailand &mdash; can make $60K feel like Fat FIRE spending
              power.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              The real question: what does your ideal retirement cost?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Fat FIRE isn&apos;t about hitting $100K to check a box. It&apos;s
              about spending without guilt or anxiety. That number is deeply
              personal: it depends on where you live, whether you travel, whether
              you have children, your healthcare situation, and what activities
              fill your days. Build a retirement budget first. That number divided
              by 0.04 is your Fat FIRE target &mdash; call it whatever you want.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              The community benchmark
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              In FIRE communities, the rough tiers look like this: Lean FIRE is
              under $40K/yr, Traditional FIRE is $40&ndash;$100K/yr, Fat FIRE
              is $100K+ per year, and &ldquo;Chubby FIRE&rdquo; sits between
              $80&ndash;$120K for those who feel that $100K label doesn&apos;t
              quite fit their situation. None of these are official &mdash;
              they&apos;re just useful shorthand for describing your target.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your numbers
        </h2>

        <PersonalizedInsight title="Your Fat FIRE picture" hasData={hasData}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Annual spending
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(annualExpenses)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Your FIRE number
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(fireNumber)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Years to FI
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {yearsToFi !== null ? `~${Math.round(yearsToFi)} yrs` : "—"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-sm font-medium text-foreground">
                Classification:{" "}
                <span className="text-[var(--ember)]">{spendingClassification}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {annualExpenses >= 100_000
                  ? `At ${formatCompactCurrency(annualExpenses)}/yr, you're planning a Fat FIRE retirement. Your ${formatCompactCurrency(fireNumber)} target reflects a lifestyle most people wouldn't call constrained.`
                  : annualExpenses >= 60_000
                  ? `At ${formatCompactCurrency(annualExpenses)}/yr, you're in Traditional FIRE territory. Bumping spending to $100K/yr would push your target to ${formatCompactCurrency(100_000 / wr)} — an increase of ${formatCompactCurrency(100_000 / wr - fireNumber)}.`
                  : `At ${formatCompactCurrency(annualExpenses)}/yr, you're planning a lean or traditional retirement. Fat FIRE spending of $100K/yr would require ${formatCompactCurrency(100_000 / wr)} — ${formatCompactCurrency(100_000 / wr - fireNumber)} more than your current target.`}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.03)] p-3">
              <p className="text-sm text-muted-foreground">
                If you spent{" "}
                <strong className="text-foreground">
                  $20,000/yr more
                </strong>{" "}
                in retirement, your FIRE number would rise by{" "}
                <strong className="text-[var(--ember)]">
                  {formatCompactCurrency(extraPortfolioFor20K)}
                </strong>{" "}
                to{" "}
                <strong className="text-foreground">
                  {formatCompactCurrency(fireNumberAt20KMore)}
                </strong>
                . At a {formatPercent(wr, 0)} withdrawal rate, every additional
                $10K in annual spending costs $250K of portfolio.
              </p>
            </div>
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: The Tradeoffs ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The Fat FIRE tradeoffs
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Fat FIRE isn&apos;t strictly better than other FIRE paths. It trades
          time in accumulation for freedom in retirement. Understanding the
          specific tradeoffs helps you decide whether the extra years of saving
          are worth it for your particular situation.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              More time working
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Going from $80K/yr to $120K/yr in retirement spending adds $1
              million to your portfolio target. At a 20% savings rate on a
              $150K household income, that&apos;s roughly 3&ndash;5 additional
              working years. At higher savings rates &mdash; 40&ndash;50% &mdash;
              it compresses to 2&ndash;3 years. The math is unambiguous: more
              spending means more accumulation time.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Same sequence risk, bigger absolute numbers
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A 30% market crash early in retirement is equally bad in percentage
              terms whether you have $1M or $3M. But the absolute impact is
              larger: $3M drops to $2.1M, and you&apos;re withdrawing $120K from
              a portfolio that just lost $900K. Fat FIRE portfolios have more
              nominal buffer but the same proportional vulnerability. This is
              why many Fat FIRE practitioners use flexible spending rules or
              bucket strategies rather than a rigid 4% draw.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Genuine margin for error
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The flip side of a large portfolio: you can underspend most years
              and let compounding work, then overspend when it matters. A $3M
              portfolio at 4% supports $120K/yr, but if you typically spend
              $90K, you&apos;re effectively running at 3% withdrawal &mdash;
              dramatically increasing your survival probability. Lean FIRE
              portfolios have almost no room for this kind of natural
              fluctuation.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Social Security still matters
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Even at $150K/yr in spending, Social Security eventually covers a
              meaningful chunk. The average benefit at full retirement age is
              around $20K/yr; a high earner might see $30&ndash;$40K. That
              benefit doesn&apos;t reduce your target directly &mdash; you still
              need the full portfolio to bridge you to 67 &mdash; but it
              meaningfully reduces the withdrawal burden later in retirement,
              making longevity risk less severe.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Fat FIRE Strategies ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How people reach Fat FIRE
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Fat FIRE is primarily an income problem, not a frugality problem.
          Reaching a $3M+ portfolio on a median income is theoretically possible
          but practically very slow. Most Fat FIRE achievers do one or more of
          the following.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Dual high-income households
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Two earners in tech, finance, medicine, or law can generate
              $300K&ndash;$500K in household income. At a 40% savings rate,
              that&apos;s $120K&ndash;$200K per year going into investments. A
              $3M portfolio becomes reachable in 12&ndash;18 years from a zero
              start.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Equity compensation
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              RSUs, stock options, and carried interest can create non-linear
              wealth accumulation. A single large vest or liquidity event can
              accelerate a Fat FIRE timeline by years. This is why tech and
              startup employees are overrepresented in the Fat FIRE community.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Real estate income
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Rental income directly reduces the portfolio required. If
              properties net $30K/yr in cash flow, your portfolio only needs to
              cover $90K rather than $120K of spending &mdash; cutting
              $750,000 off the required target at a 4% rate.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Geographic arbitrage
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Even at high spending levels, geography matters. $150K in Lisbon
              or Medell&iacute;n funds a dramatically different lifestyle than
              $150K in Manhattan. Retiring internationally can preserve Fat FIRE
              quality of life on a Traditional FIRE portfolio.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5 sm:col-span-2">
            <p className="text-sm font-semibold text-foreground">
              Barista FIRE as a bridge
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Fat FIRE doesn&apos;t have to be all-or-nothing. Some people
              leave full-time work when they hit $1.5M, consult part-time at
              $50K/yr, and let their portfolio compound to Fat FIRE levels over
              the following decade. The reduced withdrawal pressure keeps the
              portfolio intact while consulting provides income and purpose. This
              is essentially Barista FIRE at a higher income level.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 7: Is Fat FIRE Right for You ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Is Fat FIRE right for you?
        </h2>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Your identity isn&apos;t tied to frugality
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lean FIRE works best for people who genuinely enjoy minimalism and
              find frugality freeing. If you feel deprived cutting spending,
              if your social life involves restaurants and travel and hobbies
              that cost money, Fat FIRE is probably the honest target.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You want to fund your children&apos;s future
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              College funding, helping with a first home, family travel &mdash;
              these add meaningful spending pressure that Lean FIRE portfolios
              can&apos;t easily absorb. Fat FIRE&apos;s surplus gives you
              genuine generational optionality.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Healthcare uncertainty is a real concern
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pre-65 healthcare costs in the US are significant and unpredictable.
              A Fat FIRE portfolio has room to absorb premium spikes, out-of-pocket
              maximums, and long-term care costs without threatening the plan.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Worth considering: are you actually spending that much?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Many people targeting Fat FIRE discover they don&apos;t actually
              want to spend $150K/yr in retirement &mdash; especially once work
              expenses (commuting, wardrobe, work lunches, convenience spending)
              disappear. Run a realistic retirement budget. You might find your
              honest number is lower than you assumed, which meaningfully changes
              your timeline.
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Take the quiz and Jarlan will calculate your FIRE number,
              classify your spending tier, and show you exactly what it would
              take to reach Fat FIRE from where you are today.
            </p>
            <Link
              href="/quiz"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--ember)] hover:underline"
            >
              Take the FIRE quiz &rarr;
            </Link>
          </div>
        ) : null}
      </section>

      {/* ── Related Articles ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Related articles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/education/lean-fire"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              What Is Lean FIRE?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The opposite end of the spectrum &mdash; early retirement on
              $25K&ndash;$40K per year.
            </p>
          </Link>
          <Link
            href="/education/barista-fire"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              What Is Barista FIRE?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bridge the gap with part-time income and a smaller portfolio
              requirement.
            </p>
          </Link>
          <Link
            href="/education/savings-rate"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Why Savings Rate Is Everything
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The lever that determines your FIRE timeline, independent of
              income level.
            </p>
          </Link>
          <Link
            href="/education/withdrawal-strategies"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The 4% Rule &amp; Withdrawal Strategies
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How the withdrawal rate assumption shapes your entire FIRE number.
            </p>
          </Link>
        </div>
      </section>

      {/* ── Back + CTA ── */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/accumulation"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Open your plan &rarr;
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
