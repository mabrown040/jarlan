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
import { formatCompactCurrency, formatCurrency } from "@/lib/calc/format";

/* ── Static chart data ─────────────────────────────────────── */

// Illustrative 30-year withdrawal data (in today's dollars, starting $1M portfolio)
// Fixed 4%: $40K/yr constant real
// Floor-ceiling (85%–115%): drifts between $34K–$46K based on market
// Percentage of portfolio: highly volatile (5% of current balance)
const withdrawalData = [
  { year: 1,  fixed: 40000, floorCeiling: 40000, pctPortfolio: 40000 },
  { year: 3,  fixed: 40000, floorCeiling: 43000, pctPortfolio: 52000 },
  { year: 5,  fixed: 40000, floorCeiling: 46000, pctPortfolio: 61000 },
  { year: 7,  fixed: 40000, floorCeiling: 46000, pctPortfolio: 55000 },
  { year: 9,  fixed: 40000, floorCeiling: 38000, pctPortfolio: 34000 },
  { year: 11, fixed: 40000, floorCeiling: 34000, pctPortfolio: 22000 },
  { year: 13, fixed: 40000, floorCeiling: 37000, pctPortfolio: 28000 },
  { year: 15, fixed: 40000, floorCeiling: 41000, pctPortfolio: 38000 },
  { year: 17, fixed: 40000, floorCeiling: 44000, pctPortfolio: 50000 },
  { year: 19, fixed: 40000, floorCeiling: 46000, pctPortfolio: 58000 },
  { year: 21, fixed: 40000, floorCeiling: 42000, pctPortfolio: 44000 },
  { year: 23, fixed: 40000, floorCeiling: 38000, pctPortfolio: 30000 },
  { year: 25, fixed: 40000, floorCeiling: 40000, pctPortfolio: 36000 },
  { year: 27, fixed: 40000, floorCeiling: 43000, pctPortfolio: 46000 },
  { year: 30, fixed: 40000, floorCeiling: 41000, pctPortfolio: 42000 },
];

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function FloorCeilingArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const retirementExpenses = activeScenario.retirementExpenses;
  const floor = retirementExpenses * 0.85;
  const ceiling = retirementExpenses * 1.15;

  const withdrawalStrategy = activeScenario.withdrawalStrategy;
  const hasFloorCeiling =
    withdrawalStrategy.type === "floor_ceiling" &&
    withdrawalStrategy.floorCeiling != null;

  const configuredFloor = hasFloorCeiling
    ? retirementExpenses * (withdrawalStrategy.floorCeiling?.floor ?? 0.85)
    : null;
  const configuredCeiling = hasFloorCeiling
    ? retirementExpenses * (withdrawalStrategy.floorCeiling?.ceiling ?? 1.15)
    : null;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Floor &amp; Ceiling Withdrawal Strategy
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Spend flexibly within a band &mdash; and always know your worst case
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            The floor-ceiling strategy is a middle path between two extremes:
            the rigidity of a fixed dollar withdrawal and the volatility of
            spending a pure percentage of your portfolio. The rule is simple:
            set a floor (the minimum you&apos;ll ever spend) and a ceiling (the
            maximum), then let your actual withdrawal float between them based
            on portfolio performance.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            What makes this psychologically powerful is the floor. You know, with
            certainty, what the worst case looks like. Not &ldquo;the market
            crashed and I have to figure it out&rdquo; &mdash; but a specific
            number. Your lifestyle can absorb a bad year because you&apos;ve
            already planned for it. And in good years, the ceiling lets you enjoy
            the upside without overwithdrawing and jeopardizing later decades.
          </p>
        </div>
      </section>

      {/* ── Section 1: How It Works ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How it works
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          At retirement, you set your initial withdrawal amount in dollar terms
          &mdash; typically based on your planned spending. You then define a
          floor and a ceiling as percentages of that initial amount. Each year,
          you calculate what a fixed 4% withdrawal on your current portfolio
          balance would be, then clamp it to your band.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The formula
          </p>
          <div className="mt-3 space-y-2 font-mono text-sm text-foreground">
            <p>Candidate = Portfolio &times; withdrawalRate</p>
            <p>Withdrawal = clamp(Candidate, floor, ceiling)</p>
          </div>
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">Floor:</strong> typically 85% of initial spending &mdash; the minimum you&apos;ll ever withdraw
            </p>
            <p>
              <strong className="text-foreground">Ceiling:</strong> typically 115% of initial spending &mdash; the maximum, even if the portfolio booms
            </p>
            <p>
              <strong className="text-foreground">Starting point:</strong> 85% floor / 115% ceiling is a reasonable default. Wider bands = more flexibility, less lifestyle stability.
            </p>
          </div>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The key insight is that the band is defined in real (inflation-adjusted)
          dollar terms, not as a percentage of portfolio. This keeps your
          lifestyle anchored to a known range rather than swinging with market
          gyrations. In a bull market, your ceiling prevents you from inflating
          your lifestyle unsustainably. In a bear market, your floor means
          the cut is bounded and predictable.
        </p>
      </section>

      {/* ── Section 2: Comparison Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Three strategies, 30 years
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below compares annual withdrawals from a $1M portfolio over
          30 years under three strategies. Floor-ceiling (85%&ndash;115%) stays
          within a known range. Fixed 4% is flat but provides no upside in good
          markets. Percentage-of-portfolio gives maximum flexibility but swings
          wildly &mdash; which is difficult to plan around.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Annual withdrawal (illustrative, today&apos;s dollars)
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Starting $1M portfolio &middot; 4% base rate &middot; 85%&ndash;115% band
          </p>
          <ChartFrame
            ariaLabel="Line chart comparing annual withdrawals over 30 years under fixed 4%, floor-ceiling, and percentage-of-portfolio strategies"
            className="mt-4 h-72"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <LineChart
                data={withdrawalData}
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
                  width={56}
                  domain={[15000, 70000]}
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
                      fixed: "Fixed 4%",
                      floorCeiling: "Floor-Ceiling",
                      pctPortfolio: "% of Portfolio",
                    };
                    return [fmtCurrency(Number(value)), labels[String(name)] ?? String(name)];
                  }}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      fixed: "Fixed 4%",
                      floorCeiling: "Floor-Ceiling (85–115%)",
                      pctPortfolio: "% of Portfolio",
                    };
                    return labels[value] ?? value;
                  }}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "0.7rem", paddingTop: "0.75rem" }}
                />
                <Line
                  type="monotone"
                  dataKey="fixed"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                />
                <Line
                  type="monotone"
                  dataKey="floorCeiling"
                  stroke="var(--ember)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="pctPortfolio"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={false}
                  strokeOpacity={0.7}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            Illustrative data. Actual outcomes depend on market sequence, portfolio allocation, and starting conditions.
          </p>
        </div>
      </section>

      {/* ── Section 3: vs. other strategies ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How it compares to alternatives
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              vs. Fixed 4% rule
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Fixed withdrawals are simple and predictable, but they ignore
              portfolio performance entirely. In a 40% crash, you&apos;re still
              pulling the same real dollar amount from a portfolio that&apos;s
              dramatically smaller. Floor-ceiling lets you pull back during
              downturns, which significantly reduces sequence-of-returns risk
              and improves long-run success rates.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              vs. Guyton-Klinger guardrails
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Guyton-Klinger uses a set of discrete rules: cut spending 10% if
              the withdrawal rate exceeds a threshold, suspend inflation
              adjustments in down years. Floor-ceiling is simpler &mdash; it
              doesn&apos;t have decision rules, just a continuous band. The
              tradeoff: Guyton-Klinger can allow higher initial rates (sometimes
              5%+), while floor-ceiling with a 4% base rate is more conservative
              but requires fewer judgment calls each year.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              vs. Percentage-of-portfolio
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Spending a fixed percentage of your current portfolio guarantees
              you&apos;ll never run out of money, but your income can swing 30%
              or more in a bad year. That&apos;s fine for a discretionary budget,
              but genuinely difficult to plan around when you have real fixed
              costs. Floor-ceiling captures most of the flexibility of percentage
              withdrawals while bounding the downside to something you&apos;ve
              explicitly committed to living within.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your floor &amp; ceiling
        </h2>

        <PersonalizedInsight title="Your withdrawal band" hasData={hasData}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Retirement spending
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(retirementExpenses)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">per year</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Floor (85%)
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(floor)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">minimum withdrawal</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Ceiling (115%)
                </p>
                <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
                  {formatCompactCurrency(ceiling)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">maximum withdrawal</p>
              </div>
            </div>

            {hasFloorCeiling && configuredFloor != null && configuredCeiling != null ? (
              <div className="rounded-lg border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-3">
                <p className="text-sm font-medium text-foreground">
                  You have a floor-ceiling strategy configured.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your current settings produce a floor of{" "}
                  <strong className="text-foreground">
                    {formatCurrency(configuredFloor)}
                  </strong>{" "}
                  and a ceiling of{" "}
                  <strong className="text-foreground">
                    {formatCurrency(configuredCeiling)}
                  </strong>{" "}
                  per year &mdash; a band of{" "}
                  <strong className="text-foreground">
                    {formatCurrency(configuredCeiling - configuredFloor)}
                  </strong>
                  .
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm text-muted-foreground">
                  Using the standard 85%&ndash;115% band, your withdrawal would
                  range between{" "}
                  <strong className="text-foreground">
                    {formatCurrency(floor)}
                  </strong>{" "}
                  and{" "}
                  <strong className="text-foreground">
                    {formatCurrency(ceiling)}
                  </strong>{" "}
                  per year &mdash; a band of{" "}
                  <strong className="text-foreground">
                    {formatCurrency(ceiling - floor)}
                  </strong>
                  . This is the gap between your &ldquo;needs&rdquo; and your
                  &ldquo;wants&rdquo; that the strategy works within.
                </p>
              </div>
            )}
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: Who It's For ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Who benefits most
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Floor-ceiling works best when your spending is meaningfully separable
          into non-discretionary and discretionary buckets. If you genuinely need
          every dollar you&apos;re planning to spend, the floor becomes a
          constraint rather than a safety net. But most retirees have some
          flexibility &mdash; the question is whether they&apos;ve thought clearly
          about where it lives.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Retirees with separable spending
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If your budget has a clear tier structure &mdash; housing,
              food, utilities, and healthcare as fixed needs, with travel,
              dining, and hobbies as flexible wants &mdash; you can set your
              floor at your fixed costs and the ceiling 15&ndash;30% above
              total planned spending. The band maps cleanly onto a real budget
              decision, not just an abstract financial rule.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Early retirees with decades ahead
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The longer your retirement, the more market cycles you&apos;ll
              pass through &mdash; and the more valuable a flexible spending
              rule becomes. Floor-ceiling significantly reduces sequence risk
              by naturally cutting spending when the portfolio is under
              pressure, which is precisely when rigid fixed withdrawals cause
              the most long-term damage.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              People who want simplicity without sacrifice
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Guyton-Klinger requires tracking a withdrawal rate each year and
              applying discrete rules. Variable percentage withdrawal requires
              actuarial tables. Floor-ceiling is one calculation: multiply
              your portfolio by your rate, then clamp the result. Most people
              can do this in 60 seconds each January. The simplicity makes it
              much easier to actually follow.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Tuning the Band ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Tuning the band
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          There&apos;s no single right answer for floor and ceiling percentages.
          The choice reflects your actual budget flexibility and psychological
          tolerance for spending variation. Here&apos;s how to think about it.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Band
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Max Cut
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Max Upside
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Best for
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                { band: "90% / 110%", cut: "10%", upside: "10%", use: "Tight budgets, low flexibility" },
                { band: "85% / 115%", cut: "15%", upside: "15%", use: "Good starting point for most" },
                { band: "80% / 120%", cut: "20%", upside: "20%", use: "Large discretionary spend, tolerant of variation" },
                { band: "75% / 125%", cut: "25%", upside: "25%", use: "High flexibility, treat as income bonus" },
              ].map((row) => (
                <tr key={row.band}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                    {row.band}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.cut}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.upside}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            The lifestyle security tradeoff
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Narrower bands give you more predictability but fewer benefits from
            good markets. Wider bands let you participate more in bull runs but
            require genuine budget flexibility. The most important thing
            isn&apos;t picking the &ldquo;optimal&rdquo; band &mdash; it&apos;s
            picking a floor you can actually live on. That number should be
            grounded in your real fixed costs, not an arbitrary percentage.
            If your floor implies spending cuts that would genuinely harm your
            quality of life, widen it to something you can commit to honoring.
          </p>
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
              The research behind safe withdrawal rates and where the 4% number
              actually comes from.
            </p>
          </Link>
          <Link
            href="/education/guyton-klinger"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Guyton-Klinger Guardrails
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A rule-based flexible strategy that can support higher initial
              withdrawal rates than the fixed 4%.
            </p>
          </Link>
          <Link
            href="/education/withdrawal-strategies"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Withdrawal Strategies Overview
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              All major withdrawal methods compared &mdash; fixed, flexible,
              guardrails, and dynamic rules.
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
              Why the order of returns matters as much as the average, and how
              flexible withdrawals help.
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
