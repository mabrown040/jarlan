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
  { spending: "$20K/yr", fireNumber: 500_000, label: "$500K" },
  { spending: "$25K/yr", fireNumber: 625_000, label: "$625K" },
  { spending: "$30K/yr", fireNumber: 750_000, label: "$750K" },
  { spending: "$35K/yr", fireNumber: 875_000, label: "$875K" },
  { spending: "$40K/yr", fireNumber: 1_000_000, label: "$1.0M" },
  { spending: "$50K/yr", fireNumber: 1_250_000, label: "$1.25M" },
];

const LEAN_FIRE_THRESHOLD = 40_000;

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function LeanFireArticle() {
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

  const isAlreadyLean = useMemo(() => annualExpenses <= LEAN_FIRE_THRESHOLD, [annualExpenses]);

  const fireAt35K = useMemo(() => 35_000 / wr, [wr]);
  const fireAt40K = useMemo(() => 40_000 / wr, [wr]);

  const savingsIfReduced35K = useMemo(
    () => Math.max(fireNumber - fireAt35K, 0),
    [fireNumber, fireAt35K],
  );

  const savingsIfReduced40K = useMemo(
    () => Math.max(fireNumber - fireAt40K, 0),
    [fireNumber, fireAt40K],
  );

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          What Is Lean FIRE?
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Early retirement on a frugal budget &mdash; and why people choose it
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            Lean FIRE is the fastest path to financial independence &mdash; and
            the most demanding. The idea is simple: cut your spending low enough
            that your required portfolio shrinks to something achievable in under
            a decade. At $25,000 a year, you need $625,000. At $40,000, it&apos;s
            $1 million. Both are targets that aggressive savers can reach in
            10&ndash;15 years from a modest starting point, versus the 20&ndash;30
            years a traditional retirement typically requires.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            The tradeoff is real. Lean FIRE works when your spending actually
            reflects your values &mdash; when you genuinely prefer experiences over
            things, when your community is rich even if your budget is tight, when
            simplicity is a feature rather than a constraint. It fails when
            frugality is forced: when you&apos;re cutting things you actually need,
            or when a single unexpected expense can derail the plan.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Done well, Lean FIRE isn&apos;t poverty &mdash; it&apos;s optimization.
            Many Lean FIRE practitioners describe their lives as richer in time,
            relationships, and purpose than the high-income lifestyle they left
            behind. The question isn&apos;t whether $30K/yr sounds like enough.
            It&apos;s whether it can cover the specific life you actually want.
          </p>
        </div>
      </section>

      {/* ── Section 1: The Math ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The math
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The 4% rule says you can withdraw 4% of your portfolio each year
          indefinitely (with inflation adjustments) with a historically high
          probability of never running out. Lean FIRE applies this formula to
          a very small spending number, which produces a very small required
          portfolio.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The formula
          </p>
          <p className="mt-3 font-mono text-sm text-foreground">
            FIRE Number = Annual Expenses &divide; 0.04
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            $625,000 = $25,000 &divide; 0.04 &nbsp;&nbsp;&nbsp; (the archetypal Lean FIRE target)
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The time estimates below assume starting from near zero with a 50%
          savings rate. Your actual timeline depends heavily on your starting
          balance, income, and real return assumptions &mdash; but the table
          gives a useful benchmark for what aggressive saving can achieve.
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
                  FIRE Number
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Approx. Time at 50% SR
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                { spending: "$20,000", fire: "$500,000", time: "~7 years", lean: true },
                { spending: "$25,000", fire: "$625,000", time: "~9 years", lean: true },
                { spending: "$30,000", fire: "$750,000", time: "~10 years", lean: true },
                { spending: "$35,000", fire: "$875,000", time: "~12 years", lean: true },
                { spending: "$40,000", fire: "$1,000,000", time: "~14 years", lean: true },
                { spending: "$50,000", fire: "$1,250,000", time: "~18 years", lean: false },
              ].map((row) => (
                <tr key={row.spending}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.lean && (
                      <span className="mr-2 inline-block rounded-full bg-indigo-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-indigo-500">
                        Lean
                      </span>
                    )}
                    {row.spending}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {row.fire}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Time estimates are rough, assuming median income and 50% savings rate
          starting from near zero, at 7% real portfolio growth. Individual
          results vary significantly based on income, starting balance, and
          actual returns.
        </p>
      </section>

      {/* ── Section 2: The Bar Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The power of low spending
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below makes the numbers visceral. Cutting from $40K/yr to
          $25K/yr drops your required portfolio by $375,000 &mdash; a sum that
          might take years to save. This is the core insight of Lean FIRE:
          spending reduction is the most powerful accelerant available.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Required portfolio at 4% withdrawal rate
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Going from $40K to $25K/yr reduces your target by $375,000
          </p>
          <ChartFrame
            ariaLabel="Bar chart showing required portfolio size at annual spending levels from $20K to $50K per year"
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
                  width={60}
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
                      fill={entry.fireNumber <= 1_000_000 ? "#6366f1" : "#6366f180"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500" />
              Lean FIRE territory (up to $40K/yr)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-indigo-500/50" />
              Beyond Lean FIRE
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Where Lean FIRE Works ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Where Lean FIRE works well
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Not everyone can retire on $30K/yr, and not everyone should try. But
          certain circumstances make Lean FIRE genuinely viable &mdash; even
          comfortable. The common thread is that the biggest expense categories
          have been addressed structurally, not just minimized.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Geographic arbitrage
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Southeast Asia, Eastern Europe, and Latin America offer
              dramatically lower cost of living than the US or Western Europe.
              In Chiang Mai, Medell&iacute;n, or Tallinn, $25,000&ndash;$35,000
              per year funds a genuinely comfortable life: a modern apartment,
              good restaurants, travel within the region, and still money
              left over. The US dollar or euro goes roughly 2&ndash;3x further
              in many of these destinations. Geographic arbitrage lets you access
              the benefits of Lean FIRE&apos;s small portfolio without the
              lifestyle restrictions of lean living in a high-cost country.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Owning your home outright
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Housing is typically the largest budget line for most Americans
              &mdash; often $12,000&ndash;$24,000 per year for rent or a
              mortgage. Eliminating that cost through homeownership dramatically
              lowers the spending number that drives your FIRE target. A paid-off
              home in a lower-cost area is possibly the single biggest Lean FIRE
              enabler: it cuts the required portfolio by $300,000&ndash;$600,000
              compared to a renter with the same lifestyle.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              No dependents
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Raising children is expensive &mdash; $15,000 to $30,000 per child
              per year is a reasonable estimate when you include childcare,
              education, healthcare, activities, and everything else. Lean FIRE
              with children is possible but requires extraordinary frugality and
              creative solutions. Most people who successfully execute Lean FIRE
              are either child-free or have children who are grown and financially
              independent.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Rich social infrastructure
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Social wealth can substitute for financial wealth in retirement.
              A robust community &mdash; people who share meals, organize free
              activities, help each other with labor and skills &mdash; dramatically
              lowers the cost of a fulfilling life. Lean FIRE is easier in tight-
              knit communities, rural areas, or places with strong public
              amenities than in isolated suburbs where everything costs money.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your numbers
        </h2>

        <PersonalizedInsight title="Your Lean FIRE picture" hasData={hasData}>
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

            {isAlreadyLean ? (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  You&apos;re already in Lean FIRE territory.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your {formatCompactCurrency(annualExpenses)}/yr spending puts
                  your FIRE number at{" "}
                  <strong className="text-foreground">
                    {formatCompactCurrency(fireNumber)}
                  </strong>
                  {yearsToFi !== null
                    ? ` — a target you could reach in approximately ${Math.round(yearsToFi)} years based on your current savings rate.`
                    : "."}
                </p>
              </div>
            ) : annualExpenses > 40_000 ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <p className="text-sm font-medium text-foreground">
                    What if you reduced spending?
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your current spending of{" "}
                    {formatCompactCurrency(annualExpenses)}/yr requires a{" "}
                    {formatCompactCurrency(fireNumber)} portfolio. Lean FIRE
                    territory starts at $40K/yr.
                  </p>
                </div>
                {annualExpenses > 40_000 && savingsIfReduced40K > 0 && (
                  <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                    <p className="text-sm text-muted-foreground">
                      At{" "}
                      <strong className="text-foreground">$40,000/yr</strong>:
                      target drops to{" "}
                      <strong className="text-foreground">
                        {formatCompactCurrency(fireAt40K)}
                      </strong>{" "}
                      &mdash; saving{" "}
                      <strong className="text-indigo-500">
                        {formatCompactCurrency(savingsIfReduced40K)}
                      </strong>{" "}
                      off your goal at a {formatPercent(wr, 0)} withdrawal rate.
                    </p>
                  </div>
                )}
                {annualExpenses > 35_000 && savingsIfReduced35K > 0 && (
                  <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                    <p className="text-sm text-muted-foreground">
                      At{" "}
                      <strong className="text-foreground">$35,000/yr</strong>:
                      target drops to{" "}
                      <strong className="text-foreground">
                        {formatCompactCurrency(fireAt35K)}
                      </strong>{" "}
                      &mdash; saving{" "}
                      <strong className="text-indigo-500">
                        {formatCompactCurrency(savingsIfReduced35K)}
                      </strong>{" "}
                      off your goal.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: The Risks ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The real risks of Lean FIRE
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Lean FIRE is not a plan to enter casually. The smaller the portfolio,
          the less margin for error. Understanding the specific failure modes
          is essential for anyone seriously considering this path.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Sequence-of-returns risk hits harder
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A $625,000 portfolio has far less buffer than a $2.5M portfolio
              when the market crashes 30% in your first year of retirement.
              After a 30% loss, you&apos;re left with $437,500 and still need
              to withdraw $25,000 &mdash; a 5.7% withdrawal rate from the
              reduced balance. The historical data shows this is still often
              survivable with a 4% initial rate, but the margin is thin and
              the stress is real. Fat FIRE portfolios experience the same
              percentage loss but can absorb it more comfortably because the
              absolute dollar buffer is larger.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Lifestyle inflation over decades
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              $25,000 per year might feel genuinely comfortable at 35 when
              you&apos;re healthy, mobile, and your lifestyle involves hiking,
              cooking, and community. At 55, you may want different things:
              more medical care, more comfort travel, a nicer home, help with
              physical tasks. At 65 or 70, healthcare and long-term care costs
              can be substantial. Lean FIRE plans need to account for spending
              that doesn&apos;t stay flat &mdash; it shifts in category, even
              if total spending stays similar in inflation-adjusted terms.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              US healthcare before 65
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is the most acute practical challenge for US-based Lean FIRE
              practitioners. Without employer coverage, you&apos;re buying health
              insurance through the ACA marketplace. Unsubsidized premiums for a
              family can easily hit $15,000&ndash;$25,000 per year &mdash; a huge
              fraction of a $25K or $30K annual budget. However, there&apos;s a
              significant mitigating factor: at low income levels, ACA subsidies
              can be substantial. A Lean FIRE retiree with $25K in portfolio
              withdrawals may qualify for significant premium subsidies,
              particularly if they can manage their Modified Adjusted Gross Income
              carefully. This requires deliberate tax planning &mdash; Roth
              conversions, tax-loss harvesting, and careful sequencing of account
              withdrawals.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Social Security changes the math significantly
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For a Lean FIRE retiree, Social Security is transformative. Even a
              modest benefit of $1,200&ndash;$1,500 per month ($14,400&ndash;$18,000
              per year) at full retirement age cuts the required portfolio
              withdrawal nearly in half. On a $25K budget, an $18K Social Security
              benefit means you only need to withdraw $7,000 from your portfolio
              per year &mdash; a 1.1% withdrawal rate from a $625K portfolio. The
              portfolio effectively becomes self-sustaining. The catch: you need
              to survive 30+ years on Lean FIRE spending before Social Security
              kicks in at its full value.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Lean vs. Barista ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Lean FIRE vs. Barista FIRE
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          When people find that Lean FIRE feels too tight, they often discover
          that Barista FIRE is actually what they want. Understanding the
          distinction helps.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03),0_0_0_2px_rgba(99,102,241,0.15)]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Lean FIRE
              </h3>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-indigo-500">
                This article
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pulls spending down to make the required portfolio small. No
              earned income in retirement. Relies entirely on the portfolio
              and eventually Social Security.
            </p>
            <div className="mt-auto rounded-lg bg-indigo-500/5 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Lever:</strong> Minimize
                spending. Every dollar you don&apos;t spend reduces your FIRE
                number by $25 (at 4%).
              </p>
            </div>
          </div>

          <Link
            href="/education/barista-fire"
            className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(26,17,24,0.06)]"
          >
            <h3 className="text-sm font-semibold text-foreground">
              Barista FIRE
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Keeps spending at a more comfortable level but adds part-time
              income to cover the gap. The portfolio only needs to cover the
              difference between spending and income.
            </p>
            <div className="mt-auto rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Lever:</strong> Add income.
                Every $10K/yr of part-time income reduces the required portfolio
                by $250K (at 4%).
              </p>
            </div>
            <p className="text-xs font-medium text-primary">
              Learn about Barista FIRE &rarr;
            </p>
          </Link>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            The hybrid path
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Many people start Lean FIRE and discover part-time income naturally
            follows. A retired software engineer does consulting for 10 hours a
            week. A former teacher tutors online. A writer publishes. This isn&apos;t
            a failure of the Lean FIRE plan &mdash; it&apos;s a natural evolution.
            The portfolio takes pressure off, which makes it easier to do work
            you actually enjoy. The income, in turn, takes pressure off the
            portfolio. Both strategies reinforce each other.
          </p>
        </div>
      </section>

      {/* ── Section 7: Practical Strategies ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Making Lean FIRE work in practice
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The people who succeed at Lean FIRE aren&apos;t just saving more
          aggressively &mdash; they&apos;re restructuring their lives around low
          ongoing costs. Here are the structural moves that make the biggest
          difference.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Eliminate housing cost entirely
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Pay off your home before retiring, house-hack by renting rooms,
              or retire to a lower-cost area or country. Housing is typically
              the largest variable in any retirement budget and the most
              controllable.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Build ACA subsidy eligibility into the plan
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              At incomes below 400% of the federal poverty level, ACA subsidies
              can dramatically reduce healthcare costs. Lean FIRE retirees
              who manage their MAGI carefully through Roth conversions and
              capital gain harvesting can access meaningful subsidies.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Use Roth accounts aggressively
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Roth withdrawals don&apos;t count as income for ACA purposes. A
              retiree living on Roth distributions can effectively have zero
              MAGI, qualifying for maximum subsidies. This requires front-loading
              Roth contributions and conversions during the accumulation years.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Build a one-to-two year cash buffer
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A Lean FIRE portfolio has little room for sequence risk. Keeping
              12&ndash;24 months of expenses in cash or short-term bonds means
              you can avoid selling equities during a crash, giving the portfolio
              time to recover before you need to draw from it.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5 sm:col-span-2">
            <p className="text-sm font-semibold text-foreground">
              Plan for spending to shift, not just grow
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Lean FIRE budgets at 35 look very different from at 65. Early
              retirement spending tends to be high (travel, active lifestyle),
              then lower in mid-retirement (settling in, routine), then higher
              again late (healthcare, assistance). A fixed $25K assumption
              ignores this reality. A smarter Lean FIRE plan models at least
              three phases and builds a modest reserve for unexpected
              late-retirement costs.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 8: Is Lean FIRE Right For You ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Is Lean FIRE right for you?
        </h2>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You genuinely want less, not just less spending
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lean FIRE works when your target budget reflects your actual values,
              not a number you&apos;re forcing yourself to accept. If you actually
              want a simple life &mdash; fewer things, more experiences, more
              time &mdash; then lean spending isn&apos;t a sacrifice. It&apos;s
              just an accurate description of what you want.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Freedom sooner matters more than comfort later
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lean FIRE&apos;s defining trade is time: you leave work years or
              even a decade earlier by accepting a tighter budget. For many
              people, the years between 35 and 50 are more valuable than any
              amount of extra spending after 60. If that resonates, Lean FIRE
              is probably worth the tradeoffs.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You have geographic or housing flexibility
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lean FIRE is much more viable if you can move to a lower-cost
              area or already own your home outright. If you&apos;re locked
              into a high-cost city with significant fixed expenses, the
              numbers become very difficult to make work without extraordinary
              frugality everywhere else.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Consider Barista FIRE if the numbers feel too tight
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If $30&ndash;$40K/yr feels like cutting into things you actually
              need, Barista FIRE is often the better fit. $20K/yr of part-time
              income on a $1M portfolio covers $60K in spending at just a 2%
              portfolio withdrawal rate. You get the freedom of semi-retirement
              with a dramatically more resilient financial position.
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Take the quiz and Calcifer will calculate your Lean FIRE number,
              show you how your current spending compares, and let you explore
              what your timeline would look like at different spending levels.
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
            href="/education/fat-fire"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              What Is Fat FIRE?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The opposite approach &mdash; early retirement on $100K+ per year,
              without lifestyle compromise.
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
              Add part-time income to a smaller portfolio and retire earlier
              with more financial cushion.
            </p>
          </Link>
          <Link
            href="/education/coast-fire"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              What Is Coast FIRE?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save until compounding finishes the job, then work just to cover
              expenses &mdash; no more saving required.
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
              The single most powerful variable in your FIRE timeline, and why
              spending cuts compound faster than raises.
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
