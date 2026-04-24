"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { formatCompactCurrency } from "@/lib/calc/format";

/* ── Static chart data ─────────────────────────────────────── */

// Stylized U-shaped spending smile over 30 retirement years.
// Values represent % of initial retirement spending.
const smileData = [
  { year: 0,  pct: 100 },
  { year: 5,  pct: 115 },
  { year: 10, pct: 108 },
  { year: 15, pct: 100 },
  { year: 20, pct: 88  },
  { year: 25, pct: 92  },
  { year: 30, pct: 110 },
];

/* ── Component ────────────────────────────────────────────── */

export function SpendingSmileArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const annualExpenses = activeScenario.annualExpenses;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          The Retirement Spending Smile
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Why your expenses in retirement aren&apos;t flat &mdash; and why that matters
          for safe withdrawal planning
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            Most retirement planning tools assume your spending stays roughly
            flat in real terms &mdash; you withdraw the same inflation-adjusted
            amount every year. But decades of spending data tell a different
            story. Research by David Blanchett (2014) and Sudipto Banerjee
            (2014) independently documented a U-shaped pattern now called the
            &ldquo;retirement spending smile&rdquo;: expenses start high, dip in the middle
            years, then rise again late in life as healthcare costs take over.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Understanding this pattern changes how you think about safe
            withdrawal rates, front-loading discretionary spending, and planning
            for late-life healthcare &mdash; the real financial risk in a long
            retirement.
          </p>
        </div>
      </section>

      {/* ── Section 1: The Three Phases ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The three phases of retirement spending
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/15 text-xs font-bold text-[var(--ember)]">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Go-Go years (roughly 65&ndash;75)
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Early retirement is the most expensive decade. Energy is
                  high, mobility is good, and the bucket list is long. Travel,
                  hobbies, dining, and new experiences fill the calendar.
                  Historically, spending in this phase runs 110&ndash;120% of
                  pre-retirement baseline. If you retire early at 50 or 55,
                  this window can stretch even longer. This is the phase you
                  spent your whole career imagining &mdash; and it costs more
                  than most models assume.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/15 text-xs font-bold text-[var(--ember)]">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Slow-Go years (roughly 75&ndash;85)
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Energy and mobility shift. Long-haul travel becomes less
                  appealing. Discretionary spending on experiences declines
                  naturally. Banerjee&apos;s analysis of actual retiree spending
                  data found a real (inflation-adjusted) decline of roughly
                  1&ndash;1.5% per year during this phase. The portfolio gets a
                  break from withdrawals just when many models predict peak
                  sequence-of-returns risk. This is the dip of the smile.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/15 text-xs font-bold text-[var(--ember)]">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  No-Go years (85+)
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Healthcare dominates. Assisted living, in-home care,
                  prescription costs, and medical procedures can push spending
                  back to &mdash; or above &mdash; early retirement levels. But
                  the composition has changed entirely: this is no longer
                  travel and leisure. It&apos;s medical and care costs. This is
                  the tail of the smile, and it&apos;s the key financial risk in
                  a long retirement. Many retirees who spent modestly in their
                  70s are caught underprepared for what arrives at 88 or 92.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The smile in practice
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows a stylized version of the spending smile over a
          30-year retirement, expressed as a percentage of initial retirement
          spending. The pattern is smooth in the data &mdash; retirees don&apos;t
          flip a switch &mdash; but the arc is consistent across multiple
          large-scale studies.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Retirement spending as % of initial spending
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Stylized illustration based on Blanchett (2014) and Banerjee (2014)
          </p>
          <ChartFrame
            ariaLabel="Area chart showing the retirement spending smile — spending rises in early retirement, dips in the middle years, then rises again in late retirement due to healthcare"
            className="mt-4 h-72"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <AreaChart
                data={smileData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="smileFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ember)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--ember)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="year"
                  label={{
                    value: "Retirement year",
                    position: "insideBottom",
                    offset: -2,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  height={36}
                />
                <YAxis
                  domain={[70, 130]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  label={{
                    value: "% of initial spending",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [`${value}%`, "Spending"]}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke="var(--ember)"
                  strokeWidth={2}
                  fill="url(#smileFill)"
                  dot={{ fill: "var(--ember)", r: 3, strokeWidth: 0 }}
                  name="Spending"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            Illustrative. Actual experience varies by individual health status,
            lifestyle, and long-term care needs. The pattern is broadly
            consistent across multiple peer-reviewed studies of retiree spending.
          </p>
        </div>
      </section>

      {/* ── Section 3: What This Means for FIRE ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What the smile means for FIRE planning
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Most safe withdrawal rate research &mdash; including the classic
          Trinity Study &mdash; assumes flat real spending: you draw the same
          inflation-adjusted amount every year for 30 years. The spending smile
          reveals three important implications for FIRE planners.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Flat models overstate mid-retirement withdrawals
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A simulation that projects the same withdrawal at year 18 as at
              year 3 overstates what most retirees actually spend in their
              Slow-Go years. This means the simulated portfolio depletion risk
              is higher than your likely real-world experience &mdash; you
              probably have more cushion in your 70s than a flat-spending Monte
              Carlo suggests.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Safe withdrawal rates are conservative, but for the wrong reason
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The 4% rule has significant margin built in &mdash; historically
              many 30-year periods end with large remaining balances. Part of
              that conservatism implicitly buffers the late-life healthcare
              spike. But the cushion is unevenly distributed: the real risk
              isn&apos;t ruin at year 20, it&apos;s being cash-strapped at 90
              when a memory-care facility costs $10,000/month.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              The late-life healthcare spike is the key risk
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The right response to the smile isn&apos;t to reduce your FIRE
              number &mdash; it&apos;s to explicitly plan for the tail. An HSA
              invested for decades is purpose-built for this. Long-term care
              insurance (ideally purchased in your 50s) hedges the care cost.
              Medicare Supplement (Medigap) caps most out-of-pocket medical
              costs after 65. Ignoring the tail and spending freely in the
              Go-Go years without a plan is the main smile-related mistake.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your spending picture
        </h2>

        <PersonalizedInsight
          title="Spending smile estimate"
          hasData={hasData}
          emptyPrompt="Take the FIRE quiz to see how the spending smile applies to your numbers"
        >
          {hasData && annualExpenses > 0 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Current baseline
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(annualExpenses)}/yr
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Go-Go peak (~115%)
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(Math.round(annualExpenses * 1.15))}/yr
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Slow-Go dip (~88%)
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(Math.round(annualExpenses * 0.88))}/yr
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-3">
                <p className="text-sm font-medium text-foreground">
                  Early retirement spending may run 10&ndash;15% above your
                  current baseline.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your plan uses {formatCompactCurrency(annualExpenses)}/yr as
                  the baseline. In the Go-Go phase, actual spending historically
                  runs closer to{" "}
                  {formatCompactCurrency(Math.round(annualExpenses * 1.15))}/yr.
                  The Slow-Go dip around year 15&ndash;20 may give the portfolio
                  a meaningful recovery window before late-life healthcare
                  costs arrive.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm font-medium text-foreground">
                  The spending smile affects every retirement plan.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Research consistently shows spending is highest in early
                  retirement (travel, experiences), dips in the middle years
                  as activity levels naturally decline, then rises again in
                  late life as healthcare costs dominate. Planning for a flat
                  spending line underestimates both the early high and the
                  late-life healthcare spike.
                </p>
              </div>
            </div>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: Withdrawal Strategy Implications ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Implications for withdrawal strategy
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The spending smile interacts meaningfully with your choice of
          withdrawal strategy. Some approaches adapt naturally; others require
          intentional adjustments.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Floor &amp; Ceiling and Guyton-Klinger naturally adapt
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Variable withdrawal strategies that cut distributions when markets
              underperform will naturally pull back in the Slow-Go years even
              without a market downturn &mdash; simply because you&apos;re
              spending less. This creates an organic match between the
              strategy&apos;s guardrails and the smile pattern. The portfolio
              benefits from lower withdrawals precisely when it may need the
              runway to fund late-life costs.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Fixed-percentage withdrawals build a buffer automatically
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A percentage-of-portfolio approach (e.g., withdraw 4% of current
              balance each year) reduces the dollar withdrawal when the
              portfolio has grown but spending needs have dipped. In the
              Slow-Go years, the combination of lower spending and a portfolio
              that may have recovered creates an expanding buffer &mdash;
              exactly the reserve needed for No-Go healthcare costs.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Front-load discretionary spending deliberately
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The smile gives you explicit permission to spend more in the
              early years. That trip to Patagonia makes more sense at 62 than
              at 82. Build your early retirement budget to reflect Go-Go
              realities &mdash; then accept that spending will naturally taper
              as the slow-go phase arrives. Don&apos;t plan for flat spending
              and then feel guilty about spending more early. The data says
              that&apos;s normal.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Protect the tail with dedicated vehicles
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A well-funded HSA is the single most efficient tool for late-life
              healthcare spending &mdash; triple tax-advantaged and designed
              for exactly this cost. Long-term care insurance, purchased in
              your 50s before premiums become prohibitive, hedges the care
              cost risk. Medicare Supplement (Medigap) caps most
              out-of-pocket costs after 65. These aren&apos;t optional extras;
              they&apos;re the financial infrastructure for the right side of
              the smile.
            </p>
          </div>
        </div>
      </section>

      {/* ── Related Articles ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Related articles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/education/withdrawal-strategies"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Withdrawal Strategies
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How different approaches handle variable spending needs across a
              long retirement.
            </p>
          </Link>
          <Link
            href="/education/floor-ceiling"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Floor &amp; Ceiling Strategy
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A flexible withdrawal approach that naturally adapts to spending
              changes across the retirement smile.
            </p>
          </Link>
          <Link
            href="/education/hsa-triple-advantage"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              HSA Triple Advantage
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The most tax-efficient vehicle for funding the late-life
              healthcare spike at the right of the smile.
            </p>
          </Link>
          <Link
            href="/education/the-4-percent-rule"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The 4% Rule
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why the safe withdrawal rate has more cushion than it appears
              &mdash; and how the smile explains part of that margin.
            </p>
          </Link>
        </div>
      </section>

      {/* ── Back + CTA ── */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/withdrawal"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Open Can I Retire &rarr;
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
