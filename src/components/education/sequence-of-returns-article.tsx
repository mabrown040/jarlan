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
} from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { PersonalizedInsight } from "./personalized-insight";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { calculateQuickFireSummary, getCurrentPortfolioBalance } from "@/lib/calc";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

const BAD_FIRST_RETURNS = [
  -0.15, -0.10, -0.20, -0.05, 0.05,
  0.12, 0.14, 0.10, 0.13, 0.11,
  0.12, 0.09, 0.14, 0.11, 0.13,
  0.10, 0.12, 0.09, 0.14, 0.11,
];

const GOOD_FIRST_RETURNS = [...BAD_FIRST_RETURNS].reverse();

function buildPortfolioPath(
  returns: number[],
  startingBalance: number,
  annualWithdrawal: number,
): { year: number; balance: number }[] {
  const points: { year: number; balance: number }[] = [
    { year: 0, balance: startingBalance },
  ];
  let balance = startingBalance;
  for (let i = 0; i < returns.length; i++) {
    balance = Math.max(0, balance - annualWithdrawal);
    balance = balance * (1 + returns[i]);
    points.push({ year: i + 1, balance: Math.round(balance) });
    if (balance <= 0) {
      for (let j = i + 2; j <= returns.length; j++) {
        points.push({ year: j, balance: 0 });
      }
      break;
    }
  }
  return points;
}

function fmtK(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

const STARTING_BALANCE = 1_000_000;
const ANNUAL_WITHDRAWAL = 40_000;

export function SequenceOfReturnsArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const currentBalance = getCurrentPortfolioBalance(activeScenario.accounts);
  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );

  const annualWithdrawal = useMemo(
    () => activeScenario.annualExpenses ?? ANNUAL_WITHDRAWAL,
    [activeScenario.annualExpenses],
  );

  const chartData = useMemo(() => {
    const badPath = buildPortfolioPath(
      BAD_FIRST_RETURNS,
      STARTING_BALANCE,
      ANNUAL_WITHDRAWAL,
    );
    const goodPath = buildPortfolioPath(
      GOOD_FIRST_RETURNS,
      STARTING_BALANCE,
      ANNUAL_WITHDRAWAL,
    );
    return badPath.map((point, i) => ({
      year: `Year ${point.year}`,
      bad: point.balance,
      good: goodPath[i]?.balance ?? 0,
    }));
  }, []);

  const retirementAge = activeScenario.profile.retirementAge ?? 65;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;
  const userAnnualNeed = annualWithdrawal;
  const yearsOfHistory = 150;

  return (
    <div className="space-y-10 pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Sequence of Returns Risk Explained
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Imagine two retirees — call them Alex and Jordan. They both invest in the exact same
          assets over a 20-year retirement. They both earn the same average annual return of
          roughly 6%. But Alex retires in 2000, takes the dot-com crash in year one, and runs out
          of money by year 14. Jordan retires in 1982, catches the Reagan bull market early, and
          leaves behind an estate worth more than she started with.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Same average. Wildly different outcomes. The culprit is sequence of returns risk —
          the danger that bad market years arriving early in retirement can permanently cripple
          a portfolio, even if good years eventually follow. When you are in the accumulation
          phase, a market crash is painful but recoverable. When you are withdrawing, a crash
          forces you to sell more shares at depressed prices to fund your spending, leaving
          fewer shares to recover when markets rebound.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The average return doesn&apos;t matter. The sequence does.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The math, made concrete
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The chart below shows two $1M portfolios, each withdrawing $40,000 per year (a 4%
          withdrawal rate). Both experience the same 20 years of returns — but in opposite
          order. The &quot;bad years first&quot; sequence opens with five rough years: &minus;15%,
          &minus;10%, &minus;20%, &minus;5%, and +5%. The &quot;good years first&quot; sequence gets
          those same numbers in reverse, opening with +11%, +14%, and so on.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Both sequences produce the same average return over 20 years. The arithmetic is
          identical. But watch what happens to the portfolios.
        </p>

        <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4">
          <ChartFrame ariaLabel="Line chart showing two $1M portfolios with identical average returns but different sequences — bad years first depletes the portfolio while good years first grows it">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval={4}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={fmtK}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  formatter={(value, name) => [
                    fmtK(Number(value)),
                    name === "bad" ? "Bad years first" : "Good years first",
                  ]}
                  labelStyle={{ color: "var(--foreground)", fontSize: 12 }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bad"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="bad"
                />
                <Line
                  type="monotone"
                  dataKey="good"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="good"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-4 rounded-full"
                style={{ background: "#ef4444" }}
              />
              Bad years first (crashes at the start)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-4 rounded-full"
                style={{ background: "#10b981" }}
              />
              Good years first (gains at the start)
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            $1M starting portfolio, $40K/yr withdrawal. Same average return over 20 years.
          </p>
        </div>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The bad-sequence portfolio can reach zero or near-zero before the decade is out,
          while the good-sequence portfolio may double. The math is not subtle. When you
          withdraw $40K from a $1M portfolio that drops 15% in year one, you are selling
          shares at a 15% discount — and those sold shares are no longer around to compound
          when the recovery comes.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Why early retirement amplifies the risk
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          In the accumulation phase, volatility is actually your friend — or at least a neutral
          party. If markets drop while you are saving, you buy more shares at lower prices through
          dollar-cost averaging. Each month&apos;s paycheck buys more at the dip, and your long
          time horizon lets compounding do its work.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Retirement flips this on its head. Now you are running dollar-cost averaging in reverse
          — sometimes called <em>dollar-cost ravaging</em>. Instead of buying more shares cheaply,
          you are <em>selling</em> more shares cheaply. When the portfolio drops 20%, your $40K
          withdrawal now requires liquidating 25% more shares to fund the same spending level.
          Those extra shares are gone permanently, and they are gone precisely when they are worth
          the least.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          For early retirees, this is especially acute. Someone retiring at 40 faces a potential
          50-year drawdown period. The window for a catastrophic sequence of returns is vast
          compared to someone retiring at 65 with a 25-year horizon. The Trinity Study — which
          established much of the foundational thinking around safe withdrawal rates — was designed
          around 30-year retirements. Early retirees are operating well beyond the edges of that
          research.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your numbers" hasData={hasData}>
          <div className="space-y-2 text-sm leading-relaxed text-foreground">
            <p>
              Your plan calls for{" "}
              <strong className="text-[var(--ember)]">
                {formatCompactCurrency(userAnnualNeed)}/yr
              </strong>{" "}
              from a portfolio of{" "}
              <strong>{formatCompactCurrency(currentBalance)}</strong> at age{" "}
              <strong>{retirementAge}</strong> — a{" "}
              <strong>{formatPercent(withdrawalRate, 1)}</strong> withdrawal rate.
              {summary.yearsToFi !== null && summary.yearsToFi > 0 && (
                <>
                  {" "}
                  You have approximately{" "}
                  <strong>{Math.round(summary.yearsToFi)} years</strong> until your target
                  retirement age.
                </>
              )}
            </p>
            <p className="text-muted-foreground">
              Calcifer stress-tests this plan against{" "}
              <strong className="text-foreground">{yearsOfHistory} years</strong> of market
              history using Shiller data going back to 1871 — including the 1929 crash, the
              1966&ndash;1982 stagflation era, and the 2000 and 2008 downturns. The success
              rate you see on the Can I Retire page reflects every historical 20&ndash;40-year
              window where your plan would have survived, not just averages.
            </p>
          </div>
        </PersonalizedInsight>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How Calcifer models sequence risk
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The most honest way to model sequence risk is to run your plan against actual market
          history, not just probability distributions. Calcifer uses two complementary approaches.
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">Historical backtesting</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every 20-to-50-year rolling window in Shiller&apos;s dataset since 1871 is run
              against your plan. The 1929 cohort, the 1966 cohort, the 2000 cohort — they all
              get tested. Your success rate is the share of windows where you didn&apos;t run
              out of money. This captures real sequence distributions, not theoretical ones.
              A plan with a 92% historical success rate failed in 8% of historical windows.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">Monte Carlo simulation</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Monte Carlo adds thousands of randomly constructed sequences drawn from historical
              return and volatility parameters. This extends beyond the constraints of recorded
              history and can surface scenarios where bad sequences cluster more severely than
              anything that actually happened — useful stress-testing for early retirees who
              cannot rely solely on historical precedent.
            </p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Neither method is a guarantee. What they offer is an honest accounting of historical
          probability — and a clear view of which inputs change your odds the most.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Three strategies that reduce sequence risk
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          You cannot control when you retire or what markets do in your first decade. But
          you can structure your plan to blunt the damage when bad sequences arrive.
        </p>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
              Strategy 1
            </p>
            <p className="mt-1 text-base font-medium text-foreground">
              Cash buffer / bucket strategy
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Keep 1&ndash;2 years of spending in cash or short-term bonds, separate from
              your investment portfolio. In a down year, spend from the bucket instead of
              selling equities. This gives your stock portfolio time to recover before you
              need to liquidate shares. The buffer acts as a shock absorber for the first few
              years of retirement — precisely the period where sequence risk is most dangerous.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The tradeoff: cash earns less than equities over the long run. But the drag is
              small compared to the sequence-risk protection, especially in the first decade
              of retirement.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
              Strategy 2
            </p>
            <p className="mt-1 text-base font-medium text-foreground">
              Flexible withdrawals and Guyton-Klinger guardrails
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The Guyton-Klinger guardrails system sets upper and lower bounds on your
              withdrawal rate. If a bad market sequence pushes your actual withdrawal rate
              above the upper guardrail — meaning you are spending a larger-than-planned
              share of a shrinking portfolio — you cut spending by a set percentage (often
              10%). Conversely, if good markets push your rate below the lower guardrail,
              you can take a &quot;prosperity increase.&quot;
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This is not deprivation. It is a rules-based system that gives you a concrete
              trigger for when to tighten or loosen spending, rather than guessing. Research
              by Guyton and Klinger (2006) found this approach supported higher initial
              withdrawal rates precisely because the guardrails allow adaptive response to
              poor sequences. Calcifer models Guyton-Klinger as one of its eight supported
              withdrawal strategies.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
              Strategy 3
            </p>
            <p className="mt-1 text-base font-medium text-foreground">
              Coast FIRE and Barista FIRE: reducing what you need from the portfolio
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The most powerful structural defense against sequence risk is reducing how much
              you need to withdraw in the first place. Coast FIRE and Barista FIRE both
              accomplish this by layering in part-time or flexible income during the early
              retirement years — precisely the danger window.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              If your annual expenses are $60K and you earn $25K from part-time work, you
              only need $35K from your portfolio — a 2.3% withdrawal rate on a $1.5M
              portfolio instead of 4%. Bad market years are far less catastrophic when you
              are drawing less. The sequence risk window narrows dramatically.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What the research actually says
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          William Bengen&apos;s 1994 work establishing the 4% rule explicitly accounted for
          sequence risk — he studied the worst historical sequences in US data, not the
          average. The 4% figure was the rate that survived the worst 30-year window on
          record, which was the 1966 cohort that retired into two decades of inflation and
          stagnant real returns.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Big ERN (Karsten Jeske) has published the most thorough modern analysis of sequence
          risk for early retirees, running thousands of historical simulations across varying
          horizons and withdrawal rates. His conclusion: for 40&ndash;50 year retirements,
          the safe starting withdrawal rate drops to roughly 3.25&ndash;3.5% under rigid
          rules. Flexible strategies can support modestly higher rates because they allow
          adaptive response to bad sequences rather than ignoring them.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The CAPE ratio (cyclically adjusted price-to-earnings) has also emerged as a useful
          sequence-risk signal. When you retire into a period of high market valuations — as
          was the case in 2000, and as is the case in many recent years — the probability
          of a bad early sequence is historically elevated. Some researchers suggest adjusting
          your starting withdrawal rate downward during high-CAPE environments, or switching
          to a CAPE-adjusted dynamic withdrawal rule.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The key insight: you can&apos;t diversify away timing
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Diversification helps with many investment risks, but it does not help with sequence
          risk in the way most people assume. Even a globally diversified portfolio can
          experience prolonged downturns. International diversification reduces the chance that
          all your assets fall together — but the 2008 global financial crisis and the 2022
          inflation shock showed that correlation between global asset classes rises dramatically
          in bear markets.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The real diversification against sequence risk is time diversification on the spending
          side: cash buffers, flexible withdrawals, and alternative income sources. These reduce
          your forced selling at depressed prices — the core mechanism that makes bad early
          sequences so destructive.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Calcifer surfaces this through the success rate metric, the historical cohort
          breakdown, and the withdrawal strategy comparison. You can see directly how different
          strategies fare against the 1929, 1966, and 2000 cohorts — not just what the average
          looks like.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Read next
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/education/barista-fire"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Barista FIRE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How part-time income reduces both your FIRE number and sequence risk exposure.
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
              Compare fixed real, Guyton-Klinger guardrails, VPW, CAPE-dynamic, and more.
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
              Reach the point where you stop contributing and let compounding do the rest.
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
            See your success rate →
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
