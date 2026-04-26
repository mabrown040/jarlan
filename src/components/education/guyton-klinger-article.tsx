"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { PersonalizedInsight } from "./personalized-insight";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

const spendingData = [
  { year: 0, fixed: 40000, gk: 50000 },
  { year: 5, fixed: 45000, gk: 56000 },
  { year: 8, fixed: 48000, gk: 50400 },
  { year: 12, fixed: 52000, gk: 61000 },
  { year: 15, fixed: 55000, gk: 67000 },
  { year: 18, fixed: 58000, gk: 60000 },
  { year: 22, fixed: 62000, gk: 73000 },
  { year: 25, fixed: 66000, gk: 80000 },
  { year: 30, fixed: 72000, gk: 88000 },
];

const tuningRows = [
  {
    param: "Guardrail width",
    default_: "20%",
    effect:
      "How far the current withdrawal rate must drift from the initial rate before a cut or raise triggers. Wider = more tolerance before adjustments fire.",
    narrower: "Tighter bands → more frequent, smaller adjustments. Good for sensitive budgets.",
    wider: "Wider bands → less frequent, more disruptive adjustments when they do fire.",
  },
  {
    param: "Spending adjustment",
    default_: "10%",
    effect:
      "How much spending changes when a guardrail triggers. Smaller adjustments are easier to absorb but provide less portfolio protection.",
    narrower: "5% cuts are barely noticeable but don't remove much stress from the portfolio.",
    wider: "15–20% cuts are harder to live through but do more to protect the portfolio.",
  },
  {
    param: "Capital preservation cutoff",
    default_: "No cutoff",
    effect:
      "The age or year after which the Capital Preservation Rule (spending cuts) is disabled. Useful near end of life when you accept the portfolio may not last much longer anyway.",
    narrower: "Disabling CPR at 80 lets you spend more freely in late retirement.",
    wider: "Keeping CPR active indefinitely maximizes portfolio safety.",
  },
];

const whoGkIsFor = [
  {
    fit: true,
    label: "Early retirees with flexible spending",
    detail:
      "If you can genuinely reduce spending 10% in a bad year without it causing hardship, GK's higher starting rate is a real advantage. Flexibility is the currency you spend to get the higher initial withdrawal.",
  },
  {
    fit: true,
    label: "People with baseline expenses covered elsewhere",
    detail:
      "If Social Security, rental income, pension, or part-time Barista FIRE income covers your essential expenses, a GK cut just reduces discretionary spending — which is much easier to live with than cutting necessities.",
  },
  {
    fit: true,
    label: "Those comfortable with variable spending",
    detail:
      "Some people adapt easily to spending more in good years and less in bad ones. If you're already flexible with your lifestyle, GK is a natural fit and doesn't feel punishing.",
  },
  {
    fit: false,
    label: "People with fixed, non-negotiable expenses",
    detail:
      "High mortgage payments, private school tuition, or other locked-in costs leave no room to absorb a 10% spending cut. A guardrail that triggers in year 8 becomes a crisis if your baseline budget has no slack.",
  },
  {
    fit: false,
    label: "Those who would panic-sell after a market drop",
    detail:
      "GK asks you to cut spending when the portfolio is already down. If your instinct in a bad market is to also move to cash, GK's behavioral demands will compound the damage instead of mitigating it.",
  },
];

export function GuytonKlingerArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;
  const annualExpenses = activeScenario.annualExpenses;

  const cutAmount = useMemo(() => annualExpenses * 0.1, [annualExpenses]);
  const afterCutExpenses = useMemo(() => annualExpenses - cutAmount, [annualExpenses, cutAmount]);

  return (
    <div className="space-y-10 pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Guyton-Klinger guardrails
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          A flexible withdrawal strategy that lets you start higher — if you can adapt
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The 4% rule is rigid: you withdraw 4% in year one and inflation-adjust every
          year after, no matter what markets do. Guyton-Klinger is the opposite: it lets
          you spend more in good years and automatically cuts spending in bad ones. The
          result is a system that can support a 5–5.5% starting withdrawal rate with
          similar long-term safety to the static 4% rule — but only if you&apos;re willing
          to accept variable spending.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Developed by financial planner Jonathan Guyton and researcher William Klinger in
          their 2006 paper &ldquo;Decision Rules and Maximum Initial Withdrawal Rates,&rdquo; the
          guardrail system is one of the most researched dynamic withdrawal strategies in
          retirement planning. It trades spending predictability for higher average
          spending and better portfolio resilience.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your situation" hasData={hasData}>
          <div className="space-y-3 text-sm leading-relaxed">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Your withdrawal rate</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatPercent(withdrawalRate, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Annual expenses</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatCompactCurrency(annualExpenses)}/yr
                </p>
              </div>
            </div>

            {withdrawalRate <= 0.04 ? (
              <p className="text-foreground">
                Your current rate of {formatPercent(withdrawalRate, 1)} is conservative
                relative to GK&apos;s typical starting range of 5–5.5%. If you&apos;re committed
                to this rate, GK&apos;s flexibility might let you enjoy more spending in good
                markets while maintaining similar safety — the guardrails would rarely
                trigger at such a conservative starting level.
              </p>
            ) : (
              <p className="text-foreground">
                At {formatPercent(withdrawalRate, 1)}, understanding GK&apos;s guardrails is
                worth your time. The willingness to cut spending in bad years is precisely
                what makes higher starting rates sustainable over a long retirement.
              </p>
            )}

            <div className="rounded-xl border border-border/60 bg-card/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                What a 10% GK cut would look like
              </p>
              <p className="mt-1 text-sm text-foreground">
                <strong>{formatCompactCurrency(annualExpenses)}/yr</strong> →{" "}
                <strong className="text-[var(--ember)]">
                  {formatCompactCurrency(afterCutExpenses)}/yr
                </strong>{" "}
                (a reduction of {formatCompactCurrency(cutAmount)}/yr)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Is that workable in your budget? If yes, GK is a viable strategy. If that
                cut would cause real hardship, consider a more conservative starting rate
                or a floor-and-ceiling variant that caps the downside.
              </p>
            </div>
          </div>
        </PersonalizedInsight>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The three Guyton-Klinger rules
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          GK consists of three distinct rules that operate simultaneously. Every year in
          retirement, you calculate your current withdrawal rate and check all three
          conditions. The rules interact: the Withdrawal Rate Rule might freeze your
          inflation adjustment while the Capital Preservation Rule hasn&apos;t yet triggered.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-sm font-bold text-white">
                1
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  The Withdrawal Rate Rule (WRR)
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Each year, calculate your current withdrawal rate:{" "}
                  <em>
                    (this year&apos;s planned withdrawal) ÷ (current portfolio value)
                  </em>
                  . If this rate is more than the guardrail threshold above your initial
                  rate — meaning the portfolio has shrunk and your spending has become a
                  larger fraction of remaining assets — you forfeit the inflation
                  adjustment for that year.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong className="text-foreground">Example:</strong> You started at
                  5%. After a bad year, your portfolio is down and your current rate
                  reads 5.8%. The WRR triggers: no cost-of-living increase this year.
                  Your spending stays flat in nominal terms, which means you&apos;re actually
                  taking a small real (inflation-adjusted) cut.
                </p>
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Purpose:</strong> Prevents
                  overspending during market downturns. The most common and gentlest
                  guardrail — it fires before the harder Capital Preservation Rule.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-sm font-bold text-white">
                2
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  The Capital Preservation Rule (CPR)
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  If your current withdrawal rate rises to 20% above your initial rate
                  (the default guardrail width), cut your spending by 10%. This is the
                  hard guardrail — it fires when a drawdown has been severe enough that
                  you&apos;re depleting capital at a dangerously fast pace.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong className="text-foreground">Example:</strong> You started at
                  5%. Your portfolio has dropped enough that your current withdrawal
                  rate hits 6% (20% above your 5% starting rate). The CPR fires: reduce
                  this year&apos;s spending by 10%. Next year you check again from the new,
                  lower spending baseline.
                </p>
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Purpose:</strong> The safety
                  valve that protects the portfolio during sustained drawdowns — the
                  exact scenarios that sink rigid withdrawal strategies. Research shows
                  this rule fires infrequently but has an outsized impact on long-term
                  portfolio survival.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                3
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  The Prosperity Rule (PR)
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  If your current withdrawal rate falls to 20% below your initial rate —
                  meaning the portfolio has grown significantly relative to your spending
                  — increase your spending by 10%. This is the good news rule: bull
                  markets generate real raises.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <strong className="text-foreground">Example:</strong> You started at
                  5%. After a strong decade, your portfolio has grown so much that your
                  current rate has dropped to 4% (20% below starting). The Prosperity
                  Rule fires: increase spending by 10%. This is GK&apos;s mechanism for
                  letting you capture genuine gains from a bull market.
                </p>
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Purpose:</strong> Prevents
                  systematic under-spending when the portfolio is thriving. Without this
                  rule, GK retirees would leave too much money unspent in good markets —
                  effectively subsidizing estate value at the cost of their own quality
                  of life.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Why this enables a higher starting withdrawal rate
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The rigid 4% rule&apos;s safety comes from being conservative enough to survive the
          worst historical sequences — the Great Depression starting point, the 1966
          stagflation cohort — without ever cutting spending. That conservatism has a
          cost: most retirement cohorts leave behind enormous portfolios, having spent far
          less than they could have.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          GK&apos;s insight is that a retiree who is willing to make modest, rules-based
          spending cuts in bad years is taking on some of the risk that the rigid 4% rule
          manages through pure conservatism. By agreeing to cut 10% when the guardrails
          trigger, you&apos;re essentially buying yourself permission to start higher.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-[var(--ember)]">5–5.5%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              GK starting withdrawal rate
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">4.0%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fixed rule starting rate
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ~Similar
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Historical portfolio survival
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Research by Guyton and Klinger shows that a 5–5.5% starting rate with guardrails
          active has similar or better historical portfolio survival rates compared to a
          rigid 4% rule over 30+ year retirement horizons. The trade-off is spending
          variability: GK retirees spend more on average but experience more year-to-year
          fluctuation.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Fixed 4% vs GK 5%: two paths through 30 years
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows approximate annual spending trajectories for a fixed 4%
          rule and a GK 5% rule over a 30-year retirement. Both portfolios survive —
          but GK starts higher, takes cuts during bad stretches (years 8 and 18), and
          earns raises in good stretches (years 12 and 22).
        </p>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <ChartFrame ariaLabel="Line chart comparing annual spending trajectories for a fixed 4% withdrawal rule and a Guyton-Klinger 5% guardrail strategy over 30 years.">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={spendingData}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  label={{
                    value: "Year of retirement",
                    position: "insideBottom",
                    offset: -4,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value) => [
                    `$${Number(value).toLocaleString()}`,
                    "",
                  ]}
                  labelFormatter={(label) => `Year ${label}`}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="top"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="fixed"
                  name="Fixed 4%"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#94a3b8" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="gk"
                  name="GK 5%"
                  stroke="var(--ember)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--ember)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>
              GK cuts at year 8 (market stress) and year 18 (another downturn), each by
              10%. GK raises at year 12 and year 22 when the portfolio has grown
              significantly relative to spending.
            </p>
            <p>
              Illustrative trajectories. Actual outcomes depend on sequence of returns,
              portfolio composition, and when guardrails trigger.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How to tune the parameters
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Jarlan&apos;s Can I Retire page lets you tune all three GK parameters and see
          their impact on historical backtest outcomes. Here&apos;s what each one controls:
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Parameter</th>
                <th className="px-4 py-3 font-medium">Default</th>
                <th className="px-4 py-3 font-medium">What it controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tuningRows.map((row) => (
                <tr key={row.param}>
                  <td className="px-4 py-3 font-semibold text-foreground">{row.param}</td>
                  <td className="px-4 py-3 text-[var(--ember)] font-medium">
                    {row.default_}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-medium text-foreground">Narrower guardrails (e.g., 15%)</p>
            <p className="mt-1">
              Rules fire more frequently, but adjustments are triggered sooner and are
              less jarring. Good for retirees who prefer smaller, more predictable
              adjustments over time rather than waiting for a 20% threshold.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-medium text-foreground">Wider guardrails (e.g., 25–30%)</p>
            <p className="mt-1">
              Rules fire less frequently, but when they do, you&apos;ve already drifted
              significantly from your initial rate. The portfolio has had more time to
              stress before a cut triggers. Less behavioral friction day-to-day, but
              larger shock when adjustments occur.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Who GK is best for — and who should skip it
        </h2>
        <div className="space-y-3">
          {whoGkIsFor.map((row) => (
            <div
              key={row.label}
              className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div
                className={
                  row.fit
                    ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white"
                    : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs text-white"
                }
              >
                {row.fit ? "✓" : "✕"}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Key takeaways
        </h2>
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              GK is not just about the math — it&apos;s about the contract
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The system only works if you actually follow the rules when they fire —
              including the cuts. A retiree who takes the 5% starting rate but ignores
              the CPR cut when it triggers is running an unsustainable strategy. The
              discipline to follow the rules in bad years is as important as the formula
              itself.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Guardrails work best when you have a flexible budget
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A 10% spending cut is trivial if it means fewer restaurant meals and one
              less vacation. It&apos;s a crisis if it means choosing between medication and
              groceries. Before adopting GK, honestly audit how much of your spending is
              genuinely discretionary vs truly essential.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Combine with CAPE awareness for stronger outcomes
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Using CAPE to set your initial withdrawal rate — lower when markets are
              expensive, higher when cheap — and then applying GK guardrails to adapt
              dynamically gives you two layers of protection. This combination is one of
              the most robust approaches in the academic literature for early retirees
              with long time horizons.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
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
              The rigid baseline GK was designed to improve upon.
            </p>
          </Link>
          <Link
            href="/education/cape-ratio"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              CAPE ratio
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use valuation to set your initial GK rate for a stronger starting point.
            </p>
          </Link>
          <Link
            href="/education/sequence-of-returns"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Sequence of returns risk
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The underlying problem GK guardrails were designed to solve.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/withdrawal"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Model GK in your plan →
          </Link>
          <Link
            href="/education"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            ← Back to Learn
          </Link>
        </div>
      </section>
    </div>
  );
}
