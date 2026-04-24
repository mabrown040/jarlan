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
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

/* ── Static chart data ─────────────────────────────────────── */

function buildCreepData() {
  const baseSpending = 60_000;
  const data = [];
  for (let yr = 0; yr <= 20; yr++) {
    data.push({
      year: yr,
      flat: Math.round(baseSpending * Math.pow(1 + 0.00, yr)),
      creep1: Math.round(baseSpending * Math.pow(1 + 0.01, yr)),
      creep2: Math.round(baseSpending * Math.pow(1 + 0.02, yr)),
      creep3: Math.round(baseSpending * Math.pow(1 + 0.03, yr)),
    });
  }
  return data;
}

const creepData = buildCreepData();

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Impact table (static, year 20, 4% SWR) ──────────────── */

const impactRows = [
  { label: "0%", spending: 60_000, fire: 1_500_000 },
  { label: "1%", spending: 73_200, fire: 1_830_000 },
  { label: "2%", spending: 89_157, fire: 2_229_000 },
  { label: "3%", spending: 108_367, fire: 2_709_000 },
];

/* ── Component ────────────────────────────────────────────── */

export function LifestyleCreepArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  useInitializeStore();
  useAutoSaveScenario();
  const hasData = activeScenario.isPersonalized !== false;

  /* Personalized numbers */
  const creepRate = activeScenario.assumptions.expenseGrowthRate ?? 0;
  const annualExpenses = activeScenario.annualExpenses;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;
  const age = activeScenario.profile.age;
  const retirementAge = activeScenario.profile.retirementAge ?? age + 20;
  const yearsToRetirement = Math.max(0, retirementAge - age);

  const projectedSpending =
    annualExpenses > 0
      ? Math.round(annualExpenses * Math.pow(1 + creepRate, yearsToRetirement))
      : 0;
  const fireWithCreep =
    withdrawalRate > 0 && projectedSpending > 0
      ? Math.round(projectedSpending / withdrawalRate)
      : 0;
  const fireFlat =
    withdrawalRate > 0 && annualExpenses > 0
      ? Math.round(annualExpenses / withdrawalRate)
      : 0;
  const extraTarget = fireWithCreep - fireFlat;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Lifestyle Creep: How Rising Expenses Move Your FIRE Target
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          When spending grows faster than inflation, your FIRE number grows too
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            Lifestyle creep is the gradual increase in spending that happens as
            income grows. New car, bigger apartment, nicer restaurants &mdash;
            each upgrade feels modest in isolation. But in FIRE planning, creep
            compounds twice: higher expenses mean a larger FIRE number{" "}
            <em>and</em> more years of higher savings required to reach it.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            A 2%/yr real expense growth rate on $60K/yr spending adds over
            $500K to your retirement target by year 20. That&apos;s not an
            inflation number &mdash; it&apos;s spending that genuinely grows
            faster than prices, driven by lifestyle choices. Understanding the
            difference between drift and deliberate choice is one of the highest-leverage
            decisions in your FIRE plan.
          </p>
        </div>
      </section>

      {/* ── Section 1: The double compounding trap ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The double compounding trap
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          When expenses grow at a real rate{" "}
          <span className="font-mono text-foreground">g</span> above inflation,
          your retirement spending isn&apos;t today&apos;s{" "}
          <span className="font-mono text-foreground">$X</span> &mdash; it&apos;s{" "}
          <span className="font-mono text-foreground">
            $X &times; (1 + g)<sup>n</sup>
          </span>{" "}
          at retirement, where <span className="font-mono text-foreground">n</span>{" "}
          is years until you retire. And since your FIRE number is determined by
          that future spending divided by your safe withdrawal rate, the target
          scales with it:
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="font-mono text-sm text-foreground">
            FIRE number = (expenses &times; (1 + g)<sup>n</sup>) &divide; SWR
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is separate from inflation. Calcifer already models expenses in
            today&apos;s dollars (real terms) with a real portfolio growth rate.
            Lifestyle creep is an <em>extra</em>, above-inflation increase in
            spending &mdash; new baseline spending that genuinely exceeds what
            prices alone would justify.
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The second compounding effect is subtler: to fund higher future
          spending, you need a larger portfolio, which takes longer to
          accumulate. Each additional year of saving happens while your spending
          is still rising &mdash; so the gap between your savings rate and your
          lifestyle can widen even when income grows.
        </p>
      </section>

      {/* ── Section 2: Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Starting from $60K/yr: spending after lifestyle creep
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows how $60K in annual spending today evolves over
          20 years at four different real expense growth rates. These are
          inflation-adjusted figures &mdash; even the &ldquo;flat&rdquo; line
          still keeps up with prices.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Annual spending trajectory from $60K/yr base (real dollars)
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Growth rates are above inflation &mdash; not inflation itself
          </p>
          <ChartFrame
            ariaLabel="Area chart showing how $60K in annual spending grows over 20 years at 0%, 1%, 2%, and 3% real expense growth rates"
            className="mt-4 h-72"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 1, height: 1 }}
            >
              <AreaChart
                data={creepData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gradFlat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCreep1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCreep2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCreep3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
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
                />
                <YAxis
                  tickFormatter={(v) => fmtCurrency(Number(v))}
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
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      flat: "No creep (0%)",
                      creep1: "1% real growth",
                      creep2: "2% real growth",
                      creep3: "3% real growth",
                    };
                    return [fmtCurrency(Number(value)), labels[String(name)] ?? String(name)];
                  }}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="flat"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  fill="url(#gradFlat)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="creep1"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#gradCreep1)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="creep2"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradCreep2)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="creep3"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fill="url(#gradCreep3)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { color: "#94a3b8", label: "No creep (0%)" },
              { color: "#818cf8", label: "1% real growth" },
              { color: "#6366f1", label: "2% real growth" },
              { color: "#f97316", label: "3% real growth" },
            ].map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Impact on FIRE number ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Impact on your FIRE number
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          At a 4% safe withdrawal rate, each dollar of additional annual
          spending at retirement requires $25 more in your portfolio. Here is
          what the four trajectories above produce after 20 years:
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Annual creep
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Spending at year 20
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  FIRE number
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {impactRows.map((row, i) => (
                <tr key={row.label} className={i === 3 ? "bg-[rgba(249,115,22,0.04)]" : ""}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.label}
                    {i === 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (flat)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    ${row.spending.toLocaleString()}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-medium ${
                      i === 3 ? "text-[#f97316]" : "text-foreground"
                    }`}
                  >
                    ${row.fire.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            3% creep nearly doubles the target
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Going from 0% to 3% real expense growth increases the FIRE number
            from $1.5M to $2.7M &mdash; an 80% increase in the portfolio
            required. That extra $1.2M must be accumulated on top of a
            simultaneously rising baseline, which makes the compounding penalty
            larger than it first appears.
          </p>
        </div>
      </section>

      {/* ── Section 4: Personalized insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your lifestyle creep assumption
        </h2>

        <PersonalizedInsight title="Your creep rate" hasData={hasData}>
          {annualExpenses > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Creep rate
                  </p>
                  <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatPercent(creepRate, 1)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    real above inflation
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Projected spending
                  </p>
                  <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(projectedSpending)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    at retirement in {yearsToRetirement} yr
                    {yearsToRetirement !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    FIRE number
                  </p>
                  <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(fireWithCreep)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    with creep vs.{" "}
                    <span className="text-foreground">
                      {formatCompactCurrency(fireFlat)}
                    </span>{" "}
                    flat
                  </p>
                </div>
              </div>

              {extraTarget > 0 && (
                <div className="rounded-lg border border-[var(--ember)]/20 bg-[rgba(249,115,22,0.04)] p-3">
                  <p className="text-sm font-medium text-foreground">
                    Lifestyle creep adds{" "}
                    <span className="text-[var(--ember)]">
                      {formatCompactCurrency(extraTarget)}
                    </span>{" "}
                    to your target
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    At your current {formatPercent(creepRate, 1)} real expense
                    growth rate, your projected retirement spending is{" "}
                    {formatCompactCurrency(projectedSpending)}/yr &mdash; higher
                    than today&apos;s {formatCompactCurrency(annualExpenses)}.
                    That requires {formatCompactCurrency(fireWithCreep)} in your
                    portfolio vs. {formatCompactCurrency(fireFlat)} if spending
                    stayed flat in real terms.
                  </p>
                </div>
              )}

              {creepRate === 0 && (
                <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                  <p className="text-sm text-muted-foreground">
                    Your plan assumes 0% real expense growth &mdash; spending
                    keeps pace with inflation but doesn&apos;t rise above it.
                    This is the simplest assumption, but worth stress-testing if
                    your spending has historically outpaced inflation. You can
                    adjust this in{" "}
                    <Link
                      href="/accumulation"
                      className="font-medium text-[var(--ember)] hover:underline"
                    >
                      your plan assumptions
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add your annual expenses in your plan to see how lifestyle creep
              affects your specific FIRE target.
            </p>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: What to do ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What to do about lifestyle creep
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Model it honestly
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If your spending has grown above inflation historically, assuming
              it will stay flat produces a FIRE plan that underestimates your
              target. Look at your actual spending over the last 3&ndash;5 years
              and calculate the real annual growth rate. Use that number &mdash;
              not zero &mdash; as your creep assumption. An honest plan is more
              useful than an optimistic one.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              The 2% creep threshold
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Above ~2% real expense growth, your savings rate needs to grow
              substantially just to keep pace with the rising FIRE target. At
              3%, you&apos;re adding roughly $1.2M to a $1.5M base target over
              20 years. The math becomes self-defeating unless income grows
              faster than expenses &mdash; which requires both career advancement
              and deliberate spending discipline simultaneously.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Intentional upgrades vs. passive drift
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Deliberate lifestyle choices &mdash; moving to a nicer
              neighborhood, having children, prioritizing travel &mdash; are
              fine, as long as they&apos;re reflected in your plan. Passive drift
              is the problem: spending that rises without a conscious decision,
              often in small amounts that feel negligible. An annual spending
              audit helps separate the two. Know what you&apos;re choosing vs.
              what&apos;s just happening.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Coast FIRE and lifestyle creep
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you plan to Coast FIRE &mdash; stop contributing and let
              compounding do the rest &mdash; lock in your spending assumptions
              early. A Coast plan built on $60K/yr expenses is invalidated if
              your lifestyle drifts to $80K before retirement arrives. The
              longer your coast horizon, the more sensitive your target is to
              expense growth assumptions set today.
            </p>
            <Link
              href="/education/coast-fire"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--ember)] hover:underline"
            >
              Learn about Coast FIRE &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Related articles ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Related articles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/education/savings-rate"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Why Savings Rate Is Everything
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The single biggest lever in your FIRE timeline &mdash; and why
              lifestyle creep attacks it from both sides.
            </p>
          </Link>
          <Link
            href="/education/fire-number"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              What Is a FIRE Number?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How your annual expenses determine the portfolio target &mdash; and
              why that relationship is linear.
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
              The withdrawal rate that determines how many times annual expenses
              your portfolio must equal.
            </p>
          </Link>
          <Link
            href="/education/real-vs-nominal-returns"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Real vs. Nominal Returns
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why lifestyle creep is distinct from inflation &mdash; and how
              Calcifer separates the two in your projections.
            </p>
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/accumulation"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Adjust your assumptions &rarr;
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
