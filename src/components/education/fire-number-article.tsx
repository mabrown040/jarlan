"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import {
  calculateFireNumber,
  calculateQuickFireSummary,
} from "@/lib/calc";
import { formatCompactCurrency, formatPercent, formatYears } from "@/lib/calc/format";

// Grouped bar chart: FIRE number at 3 expense levels × 3 withdrawal rates
const FIRE_NUMBER_GRID = [
  {
    expenses: "$40K/yr",
    "3.5%": Math.round(40_000 / 0.035),
    "4.0%": Math.round(40_000 / 0.04),
    "4.5%": Math.round(40_000 / 0.045),
  },
  {
    expenses: "$60K/yr",
    "3.5%": Math.round(60_000 / 0.035),
    "4.0%": Math.round(60_000 / 0.04),
    "4.5%": Math.round(60_000 / 0.045),
  },
  {
    expenses: "$80K/yr",
    "3.5%": Math.round(80_000 / 0.035),
    "4.0%": Math.round(80_000 / 0.04),
    "4.5%": Math.round(80_000 / 0.045),
  },
];

const SENSITIVITY_TABLE = [
  { expenses: 40_000, rate35: 40_000 / 0.035, rate40: 40_000 / 0.04, rate45: 40_000 / 0.045 },
  { expenses: 50_000, rate35: 50_000 / 0.035, rate40: 50_000 / 0.04, rate45: 50_000 / 0.045 },
  { expenses: 60_000, rate35: 60_000 / 0.035, rate40: 60_000 / 0.04, rate45: 60_000 / 0.045 },
  { expenses: 70_000, rate35: 70_000 / 0.035, rate40: 70_000 / 0.04, rate45: 70_000 / 0.045 },
  { expenses: 80_000, rate35: 80_000 / 0.035, rate40: 80_000 / 0.04, rate45: 80_000 / 0.045 },
  { expenses: 100_000, rate35: 100_000 / 0.035, rate40: 100_000 / 0.04, rate45: 100_000 / 0.045 },
];

export function FireNumberArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const retirementExpenses = activeScenario.retirementExpenses;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;

  const fireNumber = useMemo(
    () => calculateFireNumber(retirementExpenses, withdrawalRate),
    [retirementExpenses, withdrawalRate],
  );

  const fireNumberAt35 = useMemo(
    () => calculateFireNumber(retirementExpenses, 0.035),
    [retirementExpenses],
  );

  const fireNumberAt45 = useMemo(
    () => calculateFireNumber(retirementExpenses, 0.045),
    [retirementExpenses],
  );

  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );

  const multiplier = useMemo(
    () => (withdrawalRate > 0 ? Math.round(1 / withdrawalRate) : 25),
    [withdrawalRate],
  );

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          How Your FIRE Number Is Calculated
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The FIRE number is the portfolio size at which your investments can fund your
          lifestyle indefinitely — the point where work becomes optional. It&apos;s the
          single most important number in your financial independence plan, and it follows
          from a beautifully simple formula. But that simplicity conceals real nuances that
          determine whether your number is conservative enough to last 50 years or optimistic
          enough to fail in a bad market sequence.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This article covers the math behind the formula, why expenses (not income) are the
          right input, how withdrawal rate sensitivity works, and the probability-based thinking
          that separates a robust plan from a fragile one.
        </p>
      </section>

      {/* ── Section 1: The Formula ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The formula
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The FIRE number is your annual retirement expenses divided by your withdrawal rate:
        </p>

        <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-6 text-center">
          <p className="font-display text-2xl tracking-[-0.02em] text-foreground">
            FIRE Number = Annual Expenses &divide; Withdrawal Rate
          </p>
          <p className="mt-3 text-muted-foreground text-sm">
            At a 4% withdrawal rate: FIRE Number = Annual Expenses &times; 25
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          At 4%, dividing by 0.04 is mathematically identical to multiplying by 25 — which
          is where the &ldquo;25× rule&rdquo; comes from. Spend $60K/year? You need $1.5M.
          Spend $40K/year? You need $1M. The multiplier is just 1 divided by the withdrawal
          rate. At 3.5% the multiplier is 28.6×. At 5% it drops to 20×.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { rate: "3.5%", multiplier: "28.6×", label: "Conservative", color: "text-indigo-600 dark:text-indigo-400" },
            { rate: "4.0%", multiplier: "25×", label: "Classic rule", color: "text-[var(--ember)]" },
            { rate: "4.5%", multiplier: "22.2×", label: "Aggressive", color: "text-amber-600 dark:text-amber-400" },
          ].map((item) => (
            <div
              key={item.rate}
              className="rounded-xl border border-border/60 bg-card/40 p-4 text-center"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {item.label}
              </p>
              <p className={`mt-1 font-display text-3xl tracking-[-0.03em] ${item.color}`}>
                {item.multiplier}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">at {item.rate} withdrawal</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Why Expenses, Not Income ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Why expenses — not income — are the right input
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          A common mistake is to target a portfolio that replaces your salary. But in
          retirement, you no longer save. You don&apos;t pay payroll taxes. You may not have
          a commute, a work wardrobe, or childcare expenses. Your spending in retirement can
          be substantially lower than your working income — and that difference compounds
          powerfully through the formula.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Scenario</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  Working income
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  Retirement spending
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  FIRE number (4%)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { scenario: "Income-based (wrong)", income: "$120K", spend: "$120K", fire: "$3M", highlight: false },
                { scenario: "Expense-based (correct)", income: "$120K", spend: "$60K", fire: "$1.5M", highlight: true },
                { scenario: "Lean lifestyle", income: "$120K", spend: "$40K", fire: "$1M", highlight: false },
              ].map((row) => (
                <tr
                  key={row.scenario}
                  className={[
                    "border-b border-border/40 last:border-0",
                    row.highlight ? "bg-[rgba(255,107,53,0.04)]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-4 py-3 text-foreground font-medium">{row.scenario}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.income}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {row.spend}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                    {row.fire}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The same $120K earner who saves aggressively might need only $1M–$1.5M to retire —
          not $3M. The FIRE number rewards frugality doubly: lower spending means a smaller
          target <em>and</em> a higher savings rate that gets you there faster. This is why
          savings rate has such disproportionate leverage on time-to-FI.
        </p>
      </section>

      {/* ── Section 3: Withdrawal Rate Is Not Fixed ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The withdrawal rate is not fixed — it&apos;s a dial
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The 4% rule is not a law of nature — it&apos;s a historically derived guideline for
          a 30-year retirement horizon. FIRE planners often have 40–60 year retirements. That
          changes the math significantly. Lower withdrawal rates correspond to larger safety
          margins; higher rates produce smaller FIRE numbers but accept more failure risk.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Annual expenses
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  At 3.5%
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  At 4.0%
                </th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">
                  At 4.5%
                </th>
              </tr>
            </thead>
            <tbody>
              {SENSITIVITY_TABLE.map((row) => (
                <tr key={row.expenses} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground tabular-nums">
                    ${row.expenses.toLocaleString()}/yr
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatCompactCurrency(row.rate35)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ember)] font-semibold">
                    {formatCompactCurrency(row.rate40)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {formatCompactCurrency(row.rate45)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Indigo = conservative (3.5%), ember = classic 4%, amber = aggressive (4.5%).
        </p>

        <p className="text-base leading-relaxed text-muted-foreground">
          The gap between a 3.5% and a 4.5% withdrawal rate at $60K/year spending is
          $428,000 in required savings — nearly half a million dollars more to accumulate
          for a 0.5% rate difference. Most FIRE planners land somewhere between 3.5% and
          4% for long retirements, using flexibility strategies (like Guyton-Klinger) to
          earn back some of the return without accepting the full sequence risk of 4%+.
        </p>
      </section>

      {/* ── Section 4: Chart ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Expenses &times; withdrawal rate: the interaction
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows FIRE numbers across three expense levels and three withdrawal
          rates. The key insight: a 0.5% change in withdrawal rate has a dramatically larger
          absolute dollar impact at higher spending levels — which is why higher spenders benefit
          most from conservative withdrawal assumptions.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            FIRE number by annual expenses and withdrawal rate
          </p>
          <ChartFrame ariaLabel="Grouped bar chart showing FIRE numbers at three expense levels ($40K, $60K, $80K) and three withdrawal rates (3.5%, 4%, 4.5%)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={FIRE_NUMBER_GRID}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                barCategoryGap="20%"
                barGap={3}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="expenses"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCompactCurrency(Number(value)),
                    `At ${name} withdrawal rate`,
                  ]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
                />
                <Bar dataKey="3.5%" radius={[3, 3, 0, 0]} fill="#6366f1" opacity={0.85} />
                <Bar dataKey="4.0%" radius={[3, 3, 0, 0]} fill="var(--ember)" opacity={0.85} />
                <Bar dataKey="4.5%" radius={[3, 3, 0, 0]} fill="#f59e0b" opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      </section>

      {/* ── Section 5: The One More Year Trap ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The &ldquo;one more year&rdquo; trap
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Once you&apos;re close to your FIRE number, there&apos;s a psychological pull to
          keep working — to get to the next round-number milestone, to pad the buffer a
          little more, to be &ldquo;really&rdquo; sure. This is the one more year (OMY) trap.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The math rarely justifies it. If you have $1.4M and your FIRE number is $1.5M,
          working one more year might add $50K in savings but costs you a full year of
          retirement living. That year — particularly early in retirement while you&apos;re
          healthy and energetic — is often worth far more than the marginal financial
          security the extra savings provide.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The asymmetry nobody talks about
          </p>
          <p className="text-sm text-muted-foreground">
            Your FIRE number is calculated using a conservative historical worst-case
            withdrawal rate. In most historical scenarios, a 4% withdrawal rate portfolio
            doesn&apos;t just survive 30 years — it grows substantially. The median Monte
            Carlo outcome at 4% often leaves retirees with 2–4× their starting balance
            after 30 years. One more year of work marginally improves your starting portfolio
            while definitively costing you a year of optionality.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The OMY compounding effect
          </p>
          <p className="text-sm text-muted-foreground">
            Working one more year doesn&apos;t just add savings — it also shortens your
            retirement by one year, which mechanically improves your survival probability
            more than the extra savings do. If you&apos;re at 94% success and uncomfortable,
            the path to 96% is more likely to come from a spending flexibility plan than
            from another year of work.
          </p>
        </div>
      </section>

      {/* ── Section 6: Coast FIRE ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Coast FIRE: the amount you need to stop contributing
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Coast FIRE is the portfolio size where, even if you never contribute another dollar,
          compounding alone grows your balance to the full FIRE number by your target
          retirement age. At that point, you only need income to cover current expenses —
          you can take a lower-paying job you actually like, work part-time, or simply
          stop adding to investments and wait for the compounding to complete the job.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Coast FIRE formula discounts the full FIRE number backward in time using the
          expected real return:
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5 text-center space-y-2">
          <p className="font-display text-lg tracking-[-0.02em] text-foreground">
            Coast FIRE = FIRE Number &divide; (1 + real return)^years until retirement
          </p>
          <p className="text-sm text-muted-foreground">
            Example: $1.5M FIRE number, 7% real return, 20 years away &rarr; Coast FIRE
            &asymp; $388K
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The earlier you accumulate the Coast number, the less time pressure you face. Many
          FIRE pursuers discover they hit Coast FIRE years before their full FIRE number —
          which changes the psychological calculus of work entirely.
        </p>
      </section>

      {/* ── Section 7: SORR ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your FIRE number is a probability statement, not a guarantee
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The most important thing to understand about the FIRE number: hitting it doesn&apos;t
          guarantee success. It means that in the historical record — across every 30-year
          (or 40-year, or 50-year) window the researchers studied — a portfolio of that size
          survived at the given withdrawal rate in X% of cases.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The biggest risk isn&apos;t running out of money on average — it&apos;s experiencing
          a bad sequence of returns early in retirement. If your portfolio drops 40% in year
          one, you&apos;re selling depressed assets to fund living expenses. The math of
          sequence-of-returns risk (SORR) means that two retirees with identical average
          returns can have vastly different outcomes depending on when the good and bad years occur.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              How to make the probability better
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">→</span>
                <span>
                  <strong className="text-foreground">Lower withdrawal rate</strong> — every
                  0.5% lower buys substantial additional historical safety margin.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">→</span>
                <span>
                  <strong className="text-foreground">Flexible spending</strong> — strategies
                  like Guyton-Klinger that cut spending 10% in down years dramatically improve
                  success rates vs. rigid 4%.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">→</span>
                <span>
                  <strong className="text-foreground">Part-time income</strong> — even $10K/yr
                  in the first 5 years of retirement has an outsized effect on SORR outcomes.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">→</span>
                <span>
                  <strong className="text-foreground">Bond tent / cash buffer</strong> — holding
                  1–2 years of expenses in cash or short-term bonds lets you avoid selling equities
                  during a crash.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section 8: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <PersonalizedInsight
          title="Your FIRE number"
          hasData={hasData}
          emptyPrompt="Take the FIRE quiz or add your details in the Plan drawer to see your personalized FIRE number."
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Your FIRE number at {formatPercent(withdrawalRate, 1)}
                </p>
                <p className="mt-0.5 font-display text-3xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(fireNumber)}
                </p>
                <p className="text-xs text-muted-foreground">
                  = {formatCompactCurrency(retirementExpenses)}/yr &times; {multiplier}×
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Years to FI (projected)</p>
                <p className="mt-0.5 font-display text-3xl tracking-[-0.03em] text-foreground">
                  {formatYears(summary.yearsToFi)}
                </p>
                {summary.fireAge !== null && (
                  <p className="text-xs text-muted-foreground">
                    FIRE age: {summary.fireAge.toFixed(1)}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Withdrawal rate sensitivity
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">At 3.5% (conservative)</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatCompactCurrency(fireNumberAt35)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    At {formatPercent(withdrawalRate, 1)} (yours)
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--ember)]">
                    {formatCompactCurrency(fireNumber)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">At 4.5% (aggressive)</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {formatCompactCurrency(fireNumberAt45)}
                  </p>
                </div>
              </div>
            </div>

            {summary.coastAge !== null && (
              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Coast FIRE
                </p>
                <p className="text-sm text-muted-foreground">
                  If you&apos;re saving on track, you could reach Coast FIRE at age{" "}
                  <strong className="text-foreground">{summary.coastAge.toFixed(1)}</strong> —
                  after which compounding alone can complete the journey to your full FIRE number
                  by retirement age.
                </p>
              </div>
            )}
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Related Articles ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
          Related articles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/education/the-4-percent-rule"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The 4% Rule
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The research behind the 4% rule — Bengen&apos;s work, the Trinity Study, and
              when the classic rule needs adjusting for FIRE timelines.
            </p>
          </Link>
          <Link
            href="/education/savings-rate"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Savings Rate vs. Time to FI
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why savings rate is the highest-leverage variable in your FIRE plan — and
              how a 10% increase can cut years off your timeline.
            </p>
          </Link>
          <Link
            href="/education/sequence-of-returns"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Sequence of Returns Risk
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why the order of market returns matters more than the average — and the
              strategies that protect against a bad early-retirement sequence.
            </p>
          </Link>
          <Link
            href="/education/coast-fire"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Coast FIRE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The Coast number in depth — how to calculate it, how to use it as a
              milestone, and what it means to &ldquo;coast&rdquo; to retirement.
            </p>
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            See your full projection &rarr;
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
