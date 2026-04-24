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

function buildFeeData() {
  const annual = 10_000;
  const data = [];
  for (let yr = 0; yr <= 30; yr++) {
    const fv = (r: number) =>
      yr === 0 ? 0 : annual * ((Math.pow(1 + r, yr) - 1) / r);
    data.push({
      year: yr,
      index: Math.round(fv(0.07)),
      onePercent: Math.round(fv(0.06)),
      twoPercent: Math.round(fv(0.05)),
    });
  }
  return data;
}

const feeData = buildFeeData();

const yr30 = feeData[30];

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function InvestmentFeesArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const feeDrag = activeScenario.simulationSettings?.feeDrag ?? 0.001;
  const realReturn = activeScenario.assumptions.expectedRealReturn;
  const fireNumber =
    activeScenario.assumptions.withdrawalRate > 0
      ? activeScenario.retirementExpenses / activeScenario.assumptions.withdrawalRate
      : 0;
  const annualFeeDragAmount = feeDrag * fireNumber;
  const netReturnAfterFees = realReturn - feeDrag;

  const isHighFeeDrag = feeDrag > 0.005;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          How Investment Fees Erode Your Portfolio Over Time
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Why expense ratios matter more than most investors realize
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            A 1% fee sounds like nothing. On a $500,000 portfolio, it&apos;s
            $5,000 per year &mdash; but the real damage is the compounding you
            lose. That $5,000 doesn&apos;t just disappear; it also stops growing
            for the next 20 years. Over a 30-year retirement accumulation, a 1%
            annual fee can eliminate 25&ndash;30% of your final balance compared
            to a low-cost index fund.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            The mechanism is straightforward: fees are charged as a percentage of
            assets, not a flat dollar amount. Every dollar paid in fees today is a
            dollar that can&apos;t compound. The later in the accumulation period a
            fee lands, the less damage it does &mdash; which means fees hurt most
            during the early, high-compounding years when your portfolio has the
            most time to grow.
          </p>
        </div>
      </section>

      {/* ── Section 1: The Math ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How expense ratios work
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Expense ratios are charged as a percentage of your assets annually and
          are automatically deducted from your fund&apos;s returns &mdash; you
          never see a bill. A fund with a 0.75% expense ratio and a 7% gross
          return delivers 6.25% to you. Add an advisor fee on top and the drag
          compounds further. The formula is simple:
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="font-mono text-sm text-foreground">
            net return = gross return &minus; expense ratio &minus; advisor fee
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            e.g.&ensp;5.25% = 7.00% &minus; 0.75% &minus; 1.00%
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The table below shows common fee levels across different fund and
          advisory structures. The difference between 0.04% and 2.25% looks
          small in isolation &mdash; it&apos;s just two percentage points. In
          practice it means hundreds of thousands of dollars over a 30-year
          accumulation period.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Strategy
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Expense ratio
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Advisor fee
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Total drag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                {
                  strategy: "Index fund (e.g., VTSAX)",
                  expenseRatio: "0.04%",
                  advisorFee: "0%",
                  totalDrag: "0.04%",
                  highlight: true,
                },
                {
                  strategy: "Low-cost index portfolio",
                  expenseRatio: "0.10%",
                  advisorFee: "0%",
                  totalDrag: "0.10%",
                  highlight: false,
                },
                {
                  strategy: "Actively managed fund",
                  expenseRatio: "0.75%",
                  advisorFee: "0%",
                  totalDrag: "0.75%",
                  highlight: false,
                },
                {
                  strategy: "Full-service advisory",
                  expenseRatio: "0.50%",
                  advisorFee: "1.00%",
                  totalDrag: "1.50%",
                  highlight: false,
                },
                {
                  strategy: "High-cost fund + advisor",
                  expenseRatio: "1.25%",
                  advisorFee: "1.00%",
                  totalDrag: "2.25%",
                  highlight: false,
                },
              ].map((row) => (
                <tr key={row.strategy} className={row.highlight ? "bg-muted/10" : ""}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.strategy}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.expenseRatio}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.advisorFee}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                      row.highlight
                        ? "text-[var(--ember)]"
                        : "text-foreground"
                    }`}
                  >
                    {row.totalDrag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 2: The Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Thirty years of fee drag, visualized
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows three growth trajectories for $10,000 in annual
          contributions over 30 years &mdash; one at 7% (near-zero fees), one at
          6% (1% fee drag), and one at 5% (2% fee drag). The gap that opens
          between them is entirely the cost of fees. No difference in market
          performance. No difference in discipline. Just the silent drag of
          expense ratios and advisory costs.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            $10,000/yr contribution &mdash; 30 years at varying fee levels
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Future value of annual $10K contributions; no starting balance
          </p>
          <ChartFrame
            ariaLabel="Area chart showing $10,000/yr contributions over 30 years at 0.03% fees (index, 7% net), 1% fee drag (6% net), and 2% fee drag (5% net)"
            className="mt-4 h-72"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 1, height: 1 }}
            >
              <AreaChart
                data={feeData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gradIndex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOne" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTwo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="year"
                  tickFormatter={(v) => `Yr ${v}`}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={(v) => fmtCurrency(Number(v))}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      index: "0.03% fees (index)",
                      onePercent: "1% fees",
                      twoPercent: "2% fees",
                    };
                    return [
                      fmtCurrency(Number(value)),
                      labels[String(name)] ?? String(name),
                    ];
                  }}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="index"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fill="url(#gradIndex)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="onePercent"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradOne)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="twoPercent"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  fill="url(#gradTwo)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            Year 30: 0.03% fees &rarr; {fmtCurrency(yr30.index)} &middot; 1%
            fees &rarr; {fmtCurrency(yr30.onePercent)} &middot; 2% fees &rarr;{" "}
            {fmtCurrency(yr30.twoPercent)}
          </p>
        </div>
      </section>

      {/* ── Section 3: The Real Cost ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The real cost at year 30
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          At $10,000 per year in contributions, the difference between a
          near-zero-fee index fund and a 2% total-drag strategy is approximately
          $281,000 after 30 years &mdash; roughly 30% of the final index fund
          value. That&apos;s not a rounding error. It&apos;s more than two years
          of contributions multiplied by a decade of compounding.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ember)]">
              0.03% fees (index)
            </p>
            <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
              {fmtCurrency(yr30.index)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              7% net return &middot; year 30
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              1% fees
            </p>
            <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
              {fmtCurrency(yr30.onePercent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              6% net return &middot; year 30
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              2% fees
            </p>
            <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
              {fmtCurrency(yr30.twoPercent)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              5% net return &middot; year 30
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Fees hurt more during accumulation than in retirement
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every dollar lost to fees during accumulation is a dollar that
            can&apos;t compound into your FIRE number. A $300,000 portfolio
            paying 1%/yr loses $3,000 per year &mdash; money that, left to grow
            at 7% real for 20 years, would have become $11,600. The earlier the
            fee hits, the more compounding it steals. This is why even a 0.5%
            difference in expense ratio matters meaningfully over a 20&ndash;30
            year accumulation window.
          </p>
        </div>
      </section>

      {/* ── Section 4: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your fee drag
        </h2>

        <PersonalizedInsight title="Your current fee setting" hasData={hasData}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Fee drag
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {(feeDrag * 100).toFixed(2)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  annual drag on returns
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Annual drag amount
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(annualFeeDragAmount)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  on your FIRE number
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Net return after fees
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {(netReturnAfterFees * 100).toFixed(2)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  real return minus fee drag
                </p>
              </div>
            </div>

            {isHighFeeDrag ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  Meaningful fee drag detected
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your current fee drag of {(feeDrag * 100).toFixed(2)}% is
                  above 0.5% &mdash; enough to meaningfully reduce your final
                  portfolio value over a long accumulation window. Consider
                  reviewing your fund selection. Switching to a broad-market
                  index fund (VTSAX at 0.04%, FZROX at 0%, SWTSX at 0.03%)
                  could recapture a substantial portion of this drag and
                  meaningfully accelerate your timeline.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm text-muted-foreground">
                  Your fee drag of {(feeDrag * 100).toFixed(2)}% is in
                  low-cost territory &mdash; consistent with broad-market index
                  fund investing. At this level, fees are an afterthought rather
                  than a meaningful drag on your plan. Keep it there: the single
                  best thing you can do is hold low-cost index funds and not
                  make changes based on short-term performance.
                </p>
              </div>
            )}
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: Action Items ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What to do about fees
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              1. Check your expense ratios
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Most brokerages show the expense ratio in the fund details page.
              Look for a line labeled &ldquo;expense ratio&rdquo; or
              &ldquo;annual operating expenses.&rdquo; On Vanguard, Fidelity,
              and Schwab this is one click from the fund summary. On 401(k)
              platforms, check the fund fact sheet or the plan&apos;s fee
              disclosure document (required by law to be provided annually).
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              2. Compare vs. index alternatives
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Three of the lowest-cost total-market index funds available today:
              Vanguard VTSAX (0.04%), Fidelity FZROX (0.00%), Schwab SWTSX
              (0.03%). Any of these will deliver market returns minus
              a rounding error in fees. If you hold actively managed funds with
              expense ratios above 0.5%, the evidence that active management
              beats its benchmark net of fees is weak &mdash; particularly over
              the 20+ year windows relevant for FIRE planning.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              3. If working with an advisor
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Fee-only fiduciaries &mdash; advisors who charge a flat hourly or
              annual retainer rather than a percentage of assets under management
              &mdash; often cost significantly less than 1% AUM, especially once
              your portfolio grows. A flat-fee advisor charging $5,000/yr on a
              $1M portfolio costs 0.5%; on a $2M portfolio the same fee is
              0.25%. Compare this to the 1%&ndash;1.5% AUM model, which scales
              with your wealth rather than the work required.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              4. In your 401(k)
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Most 401(k) plans include at least one low-cost index fund option
              &mdash; often a total market or S&amp;P 500 index fund with an
              expense ratio under 0.10%. If your plan&apos;s cheapest option is
              above 0.50%, it may be worth raising the issue with your HR
              department. ERISA requires plan sponsors to act in participants&apos;
              best interests, and offering only high-cost funds has been the
              subject of successful class-action litigation against employers.
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
            href="/education/real-vs-nominal-returns"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Real vs. Nominal Returns
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why inflation changes what your portfolio growth actually means
              &mdash; and how fees interact with real returns.
            </p>
          </Link>
          <Link
            href="/education/account-types"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              401(k), Roth IRA &amp; HSA
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Which account to fill first &mdash; and how tax treatment
              amplifies or softens the impact of fees.
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
              During accumulation, your savings rate matters more than your
              return assumption &mdash; including fee drag.
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
              The Trinity Study assumed low-cost index investing. High fees
              directly erode safe withdrawal rate math.
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
