"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import { formatPercent } from "@/lib/calc/format";

/* ── Static chart data ─────────────────────────────────────── */

// $500K portfolio over 30 years, all values in today's dollars
// Line 1: 7% real return → 500000 * 1.07^year
// Line 2: 10% nominal, 3% inflation → ~6.8% real → 500000 * 1.068^year
// Line 3: 7% nominal, 3% inflation → ~3.88% real → 500000 * 1.0388^year
function makeChartData() {
  const points = [];
  for (let year = 0; year <= 30; year += 2) {
    points.push({
      year,
      real7: Math.round(500_000 * Math.pow(1.07, year)),
      nom10real: Math.round(500_000 * Math.pow(1.068, year)),
      nom7real: Math.round(500_000 * Math.pow(1.0388, year)),
    });
  }
  return points;
}

const portfolioData = makeChartData();

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function RealVsNominalReturnsArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const realReturn = activeScenario.assumptions.expectedRealReturn;
  const inflation = 0.03;
  // Fisher equation: nominal = (1 + real) * (1 + inflation) - 1
  const impliedNominal = (1 + realReturn) * (1 + inflation) - 1;

  const isConservative = realReturn < 0.05;
  const isOptimistic = realReturn > 0.08;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Real vs. Nominal Returns
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Why inflation changes what your portfolio growth actually means
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            When your investment account shows a 10% gain, that&apos;s your
            nominal return &mdash; the raw number before adjusting for inflation.
            Your real return is what matters: the increase in your actual
            purchasing power. If inflation was 3%, your real return was
            approximately 7%. The difference between these two numbers is the
            single most common source of confusion in retirement planning.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            It sounds like a technical distinction, but it has enormous practical
            consequences. A retirement plan built on nominal returns will
            systematically overestimate what your money can buy. A plan built
            on real returns &mdash; as Calcifer is &mdash; keeps the math honest
            by measuring everything in today&apos;s dollars from start to finish.
          </p>
        </div>
      </section>

      {/* ── Section 1: The Fisher Equation ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The Fisher equation
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The relationship between real and nominal returns is described by the
          Fisher equation, named after economist Irving Fisher. The simplified
          approximation works well for low inflation rates. The precise version
          is needed when inflation is high.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Approximation
            </p>
            <p className="mt-3 font-mono text-sm text-foreground">
              real &asymp; nominal &minus; inflation
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              7% &asymp; 10% &minus; 3%
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Precise (Fisher)
            </p>
            <p className="mt-3 font-mono text-sm text-foreground">
              1 + real = (1 + nom) &divide; (1 + inf)
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              1.068 = 1.10 &divide; 1.03
            </p>
          </div>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          At the 3% long-run average inflation rate, the approximation is close
          enough for practical planning. At 8%+ inflation (as in the 1970s),
          the gap between the two formulas becomes meaningful and the precise
          version matters more.
        </p>
      </section>

      {/* ── Section 2: Historical Numbers ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What history actually shows
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Based on roughly 150 years of US market data, the standard reference
          points for long-run returns are well-established. These are the numbers
          that underlie most FIRE planning, including Calcifer&apos;s defaults.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Asset class
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Nominal
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Inflation
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Real
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                { asset: "US stocks (S&P 500)", nominal: "~10%", inflation: "~3%", real: "~7%" },
                { asset: "US bonds (intermediate)", nominal: "~4%", inflation: "~3%", real: "~1%" },
                { asset: "Inflation (CPI)", nominal: "—", inflation: "~3%", real: "—" },
              ].map((row) => (
                <tr key={row.asset}>
                  <td className="px-4 py-3 font-medium text-foreground">{row.asset}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{row.nominal}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.inflation}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--ember)] font-medium">{row.real}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Long-run historical averages. Individual decades vary significantly.
          International returns differ from US. Past performance does not
          guarantee future results.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Why Calcifer defaults to 7% real
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The 7% real return assumption reflects 150+ years of US equity
            market history after accounting for inflation. It&apos;s not a
            guarantee &mdash; specific decades can be much worse (the 2000s
            decade produced near-zero real returns) or much better. It&apos;s
            a long-run planning assumption that has proven reasonable across a
            wide range of historical scenarios, including the periods studied
            in the original Trinity Study that produced the 4% rule.
          </p>
        </div>
      </section>

      {/* ── Section 3: The Illusion Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The illusion of nominal growth
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows three lines &mdash; all measured in today&apos;s
          dollars &mdash; for a $500K starting portfolio over 30 years. 10%
          nominal sounds much better than 7% real, but when you strip out
          inflation from the nominal return, the gap shrinks dramatically.
          The relevant number is always the real one.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            $500K portfolio growth — in today&apos;s dollars
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Nominal returns adjusted for 3% inflation to show real purchasing power
          </p>
          <ChartFrame
            ariaLabel="Line chart showing $500K portfolio growth over 30 years at 7% real, 10% nominal, and 7% nominal, all measured in today's dollars"
            className="mt-4 h-72"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <LineChart
                data={portfolioData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
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
                      real7: "7% real (reference)",
                      nom10real: "10% nominal → 6.8% real",
                      nom7real: "7% nominal → 3.9% real",
                    };
                    return [fmtCurrency(Number(value)), labels[String(name)] ?? String(name)];
                  }}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      real7: "7% real return",
                      nom10real: "10% nominal (→ 6.8% real after 3% inflation)",
                      nom7real: "7% nominal (→ 3.9% real after 3% inflation)",
                    };
                    return labels[value] ?? value;
                  }}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "0.7rem", paddingTop: "0.75rem" }}
                />
                <Line
                  type="monotone"
                  dataKey="real7"
                  stroke="var(--ember)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="nom10real"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                />
                <Line
                  type="monotone"
                  dataKey="nom7real"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1.5}
                  dot={false}
                  strokeOpacity={0.7}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            After 30 years: 7% real → $3.8M &middot; 10% nominal (6.8% real) → $3.6M &middot; 7% nominal (3.9% real) → $1.6M in today&apos;s purchasing power.
          </p>
        </div>
      </section>

      {/* ── Section 4: Why Calcifer Uses Real ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Why Calcifer works in real terms
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          FIRE planning has two sides: your expenses and your portfolio growth.
          Calcifer models your retirement expenses in today&apos;s dollars
          &mdash; your $60K/yr spending goal is $60K in today&apos;s purchasing
          power, not a number that inflates over time. To keep both sides of the
          equation consistent, the growth rate must also be in today&apos;s
          dollars. That means using real return, not nominal.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            The consistency principle
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If you model expenses in today&apos;s dollars but grow your
            portfolio at a nominal rate, your model contains a hidden assumption:
            that your expenses will grow with inflation while your portfolio
            growth is measured before inflation. This produces wildly optimistic
            projections &mdash; effectively double-counting inflation as a
            tailwind. Using real returns throughout keeps the math internally
            consistent.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            The practical difference
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            At 10% nominal and 7% real, a $500K portfolio becomes approximately
            $8.7M nominal after 30 years &mdash; but only $3.8M in today&apos;s
            dollars. That&apos;s the number that tells you what you can actually
            spend. FIRE calculators that use nominal returns need to
            also apply a separate inflation adjustment to retirement spending
            each year. The real-return approach builds this in from the start.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Sequence of real returns matters
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Even if average real returns are identical, the order in which they
            occur dramatically affects retirement outcomes. Two retirees with
            the same 7% average real return over 30 years can have very
            different results if one experiences large early losses while the
            other experiences them late. This is sequence-of-returns risk, and
            it affects real returns exactly as much as nominal ones.
          </p>
          <Link
            href="/education/sequence-of-returns"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--ember)] hover:underline"
          >
            Learn about sequence-of-returns risk &rarr;
          </Link>
        </div>
      </section>

      {/* ── Section 5: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your return assumptions
        </h2>

        <PersonalizedInsight title="Your growth rate" hasData={hasData}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Your real return
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatPercent(realReturn, 1)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  after inflation, in today&apos;s dollars
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Implied nominal
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatPercent(impliedNominal, 1)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  assuming 3% long-run inflation
                </p>
              </div>
            </div>

            {isConservative && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  Conservative assumption
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your {formatPercent(realReturn, 1)} real return is below the
                  historical long-run average of ~7%. This is a deliberately
                  cautious approach &mdash; useful if you&apos;re planning for a
                  future with lower returns, or if you want extra margin of safety.
                  It will result in a higher FIRE number and longer timeline than
                  a 7% assumption would produce.
                </p>
              </div>
            )}

            {isOptimistic && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-sm font-medium text-foreground">
                  Optimistic assumption
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your {formatPercent(realReturn, 1)} real return exceeds the
                  historical long-run average of ~7%. This is achievable but
                  represents above-average market performance. Consider whether
                  your projections would still work at 5&ndash;6% real &mdash;
                  a stress test that covers periods like 2000&ndash;2010.
                </p>
              </div>
            )}

            {!isConservative && !isOptimistic && (
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm text-muted-foreground">
                  Your {formatPercent(realReturn, 1)} real return is in the
                  standard planning range, consistent with long-run historical
                  US equity returns after inflation. This implies a nominal
                  return of approximately {formatPercent(impliedNominal, 1)} at
                  3% inflation &mdash; close to the historical ~10% nominal
                  return for US stocks.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">What you see in your account vs. what Calcifer uses:</strong>{" "}
                When the market is up 10% in a year, your account balance grows
                10% nominally. Calcifer uses your real return of {formatPercent(realReturn, 1)}
                &mdash; the growth in purchasing power &mdash; so all projections
                are already expressed in today&apos;s dollars.
              </p>
            </div>
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Section 6: Common Mistakes ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Common mistakes
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Using a nominal rate with inflation-adjusted expenses
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you enter 10% as your return assumption but model your
              retirement spending as a fixed dollar amount (not growing with
              inflation), you&apos;ve accidentally mixed nominal and real.
              The model will be far too optimistic &mdash; effectively assuming
              your spending stays flat in nominal terms while your portfolio
              compounds at full nominal rate.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Confusing account value with purchasing power
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              $1M growing at 10%/yr for 30 years becomes $17.4M. At 3%
              inflation, that $17.4M buys only what $7.2M buys today. People
              who plan around nominal millionaire milestones often underestimate
              how much inflation erodes the real value of a given dollar target.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Treating the 7% real as a guaranteed floor
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The 7% real return is a long-run historical average, not a
              minimum. The 2000s produced near-zero real returns for a full
              decade. Japan&apos;s market went 30+ years with negative real
              returns. A robust FIRE plan stress-tests at 4&ndash;5% real to
              understand what happens when the long-run average doesn&apos;t
              apply to your specific retirement window.
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
            href="/education/the-4-percent-rule"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The 4% Rule
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The study behind safe withdrawal rates and how real vs. nominal
              returns shaped the original research.
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
              Same average return, completely different outcomes &mdash; why
              the order of returns matters so much.
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
              Your savings rate matters more than your return assumption during
              accumulation. Here&apos;s the math.
            </p>
          </Link>
          <Link
            href="/education/monte-carlo"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Monte Carlo Simulation
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How running thousands of return sequences reveals your real
              probability of success.
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
