"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
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
import { getCurrentPortfolioBalance } from "@/lib/calc";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

const TRINITY_DATA = [
  { wr: "3%", "15yr": 100, "20yr": 100, "25yr": 100, "30yr": 100 },
  { wr: "3.5%", "15yr": 100, "20yr": 100, "25yr": 98, "30yr": 98 },
  { wr: "4%", "15yr": 100, "20yr": 100, "25yr": 95, "30yr": 95 },
  { wr: "4.5%", "15yr": 100, "20yr": 98, "25yr": 87, "30yr": 87 },
  { wr: "5%", "15yr": 98, "20yr": 93, "25yr": 74, "30yr": 68 },
];

const BAR_CHART_DATA = [
  { wr: "3%", rate: 100 },
  { wr: "3.5%", rate: 98 },
  { wr: "4%", rate: 95 },
  { wr: "4.5%", rate: 87 },
  { wr: "5%", rate: 68 },
];

export function FourPercentRuleArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const currentBalance = getCurrentPortfolioBalance(activeScenario.accounts);
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;
  const annualExpenses = activeScenario.annualExpenses;
  const retirementAge = activeScenario.profile.retirementAge ?? 65;

  const fireNumber = useMemo(
    () => (withdrawalRate > 0 ? annualExpenses / withdrawalRate : 0),
    [annualExpenses, withdrawalRate],
  );

  const multiplier = useMemo(
    () => (withdrawalRate > 0 ? Math.round(1 / withdrawalRate) : 25),
    [withdrawalRate],
  );

  const wrInsightMessage = useMemo(() => {
    if (withdrawalRate <= 0.035) {
      return `Your ${formatPercent(withdrawalRate, 1)} rate is below the classic 4% rule — historically very conservative. Even the worst 30-year windows in the Trinity Study show near-100% success at this level.`;
    }
    if (withdrawalRate <= 0.04) {
      return `Your ${formatPercent(withdrawalRate, 1)} withdrawal rate is right in the Trinity Study sweet spot — the range that survived every 30-year historical window in the core research.`;
    }
    if (withdrawalRate <= 0.05) {
      return `Your ${formatPercent(withdrawalRate, 1)} rate is above 4%. The Trinity Study shows success rates in the 68–87% range at this level over 30 years. Consider a flexible strategy like Guyton-Klinger to adapt spending in down markets.`;
    }
    return `Your ${formatPercent(withdrawalRate, 1)} rate has historically lower success rates over 30 years. The Spend page shows withdrawal strategies — including flexible rules that can improve outcomes at higher starting rates.`;
  }, [withdrawalRate]);

  return (
    <div className="space-y-10 pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          The 4% Rule: What It Is and When It Works
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          In 1994, financial planner William Bengen sat down with 70 years of US stock and
          bond market data and asked a simple question: what is the highest withdrawal rate
          a retiree could have used in any historical period and never run out of money over
          a 30-year retirement? The answer was 4.15%. Bengen called it SAFEMAX — the safe
          maximum withdrawal rate.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          That finding, rounded to 4%, became the single most influential number in personal
          finance. It is the foundation of the FIRE number. It is why the &quot;25x rule&quot;
          exists. And it is simultaneously the most used and most misunderstood concept in
          retirement planning.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The 4% rule does not mean you are guaranteed to have money for 30 years. It means
          that in every historical 30-year window Bengen studied — including the 1929 crash,
          the Great Depression, and the 1970s stagflation — a retiree who started at 4% and
          inflation-adjusted upward each year afterward never hit zero. That is a powerful
          finding. It is also a historically specific one, with important caveats that every
          FIRE planner should understand.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Where it comes from: Bengen 1994 and the Trinity Study
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Bengen published &quot;Determining Withdrawal Rates Using Historical Data&quot; in the
          Journal of Financial Planning in October 1994. He studied rolling 30-year periods
          from 1926 to 1992, using a 50/50 stock-bond portfolio based on S&amp;P 500 and
          intermediate US Treasury data. The worst case — the 1966 retiree, who faced both
          the 1970s bear market and rampant inflation — still survived 30 years at 4%.
          Bengen later revised the figure upward to 4.5% when adding small-cap equities to
          the analysis, but 4% remained the canonical round number.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          In 1998, three professors at Trinity University — Philip Cooley, Carl Hubbard, and
          Daniel Walz — published what became known as the Trinity Study. They expanded
          Bengen&apos;s framework across five withdrawal rates (3% to 7%) and four time
          horizons (15 to 30 years), producing a table of portfolio success rates that
          planners still reference today.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Here is an approximation of that table for a 100% equity portfolio, which most
          FIRE planners use:
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Withdrawal rate</th>
                <th className="px-4 py-3 text-right font-medium">15 years</th>
                <th className="px-4 py-3 text-right font-medium">20 years</th>
                <th className="px-4 py-3 text-right font-medium">25 years</th>
                <th className="px-4 py-3 text-right font-medium">30 years</th>
              </tr>
            </thead>
            <tbody>
              {TRINITY_DATA.map((row) => {
                const is4pct = row.wr === "4%";
                return (
                  <tr
                    key={row.wr}
                    className={
                      is4pct
                        ? "border-t border-border/60 bg-[rgba(255,107,53,0.05)]"
                        : "border-t border-border/60"
                    }
                  >
                    <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                      {row.wr}
                      {is4pct && (
                        <span className="ml-2 text-xs font-bold text-[var(--ember)]">
                          ← classic rule
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${row["15yr"] >= 95 ? "text-emerald-600 dark:text-emerald-400" : row["15yr"] >= 80 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {row["15yr"]}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${row["20yr"] >= 95 ? "text-emerald-600 dark:text-emerald-400" : row["20yr"] >= 80 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {row["20yr"]}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${row["25yr"] >= 95 ? "text-emerald-600 dark:text-emerald-400" : row["25yr"] >= 80 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {row["25yr"]}%
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${row["30yr"] >= 95 ? "text-emerald-600 dark:text-emerald-400" : row["30yr"] >= 80 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {row["30yr"]}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Approximate historical success rates from the Trinity Study (Cooley, Hubbard, Walz
          1998), 100% equity portfolio. Green = 95%+, black = 80–94%, red = below 80%.
        </p>
        <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Data vintage</p>
          <p className="mt-1">
            The table above reflects the original 1998 Trinity Study. Since then, multiple
            authors — including Cooley, Hubbard, and Walz themselves (2011), Wade Pfau, and
            the Early Retirement Now &quot;Safe Withdrawal Series&quot; — have re-run the same
            analysis with longer datasets and found broadly similar results, with modest
            downward revisions at higher withdrawal rates. For your own scenario, use the{" "}
            <Link href="/withdrawal" className="underline">
              Spend page
            </Link>{" "}
            — it backtests against Shiller&apos;s full 1871-present dataset rather than
            Trinity&apos;s 1926-1995 window.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            30-year success rates by withdrawal rate
          </p>
          <ChartFrame ariaLabel="Bar chart showing Trinity Study 30-year success rates by withdrawal rate, from 100% at 3% down to 68% at 5%">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={BAR_CHART_DATA}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="wr"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[50, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "30-yr success"]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="rate"
                  radius={[4, 4, 0, 0]}
                  fill="var(--ember)"
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The FIRE number formula
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The 4% rule gives us the simplest formula in FIRE planning. If you can safely
          withdraw 4% of your portfolio each year, then you need a portfolio worth 25 times
          your annual expenses to be financially independent. This is the 25x rule — it
          is just 4% expressed as a multiplier.
        </p>

        <div className="mt-5 rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The formula
          </p>
          <p className="mt-3 font-mono text-base text-foreground">
            FIRE Number = Annual Expenses ÷ Withdrawal Rate
          </p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            At 4%: Annual Expenses × 25
          </p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            At 3.5%: Annual Expenses × 28.6
          </p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            At 3%: Annual Expenses × 33.3
          </p>
        </div>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The formula works in both directions. Increasing your withdrawal rate from 4% to
          5% cuts your required portfolio by 20% — from 25x to 20x. But it also materially
          increases the chance of running out of money over a long retirement. Conversely,
          dropping to 3.5% increases your required savings by 14% but purchases significantly
          more historical safety margin.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          For early retirees, the practical question is not just &quot;what is my FIRE number&quot;
          but &quot;at what withdrawal rate am I comfortable with the historical odds.&quot; That
          depends on your retirement horizon, your spending flexibility, and how much buffer
          you want.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your numbers" hasData={hasData}>
          <div className="space-y-3 text-sm leading-relaxed text-foreground">
            <p>{wrInsightMessage}</p>
            <div className="mt-2 rounded-lg border border-border/60 bg-background/50 p-3">
              <p className="font-medium text-foreground">Your FIRE number</p>
              <p className="mt-1 text-muted-foreground">
                At your {formatPercent(withdrawalRate, 1)} withdrawal rate, with{" "}
                <strong>{formatCompactCurrency(annualExpenses)}/yr</strong> in expenses:
              </p>
              <p className="mt-2 font-mono text-base text-foreground">
                {formatCompactCurrency(annualExpenses)} ÷ {formatPercent(withdrawalRate, 2)} ={" "}
                <strong className="text-[var(--ember)]">
                  {formatCompactCurrency(fireNumber)}
                </strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                That is the {multiplier}× rule applied to your spending — the portfolio
                you need at age {retirementAge} to fund spending at your current withdrawal
                rate indefinitely.
              </p>
              {currentBalance > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Your current portfolio of{" "}
                  <strong className="text-foreground">
                    {formatCompactCurrency(currentBalance)}
                  </strong>{" "}
                  is{" "}
                  <strong className="text-foreground">
                    {formatPercent(currentBalance / fireNumber, 0)}
                  </strong>{" "}
                  of your FIRE number.
                </p>
              )}
            </div>
          </div>
        </PersonalizedInsight>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What the 4% rule does not cover
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The 4% rule is a research finding, not a guarantee. Understanding where it breaks
          down is as important as understanding where it holds.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              It was tested on 30-year retirements
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bengen studied 30-year windows. A FIRE retiree at 35 may need their portfolio
              to last 55 or 60 years. The historical record does not contain enough 50-year
              windows to be statistically robust, and longer horizons dramatically increase
              the chance of encountering a catastrophic sequence of returns. Big ERN&apos;s
              analysis suggests that truly safe withdrawal rates for 50-year retirements may
              be closer to 3.25&ndash;3.5%.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              It used US stock data only
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Both Bengen and the Trinity Study relied primarily on US market returns.
              The 20th century was extraordinarily good for US investors by global standards.
              Research by Dimson, Marsh, and Staunton covering 21 countries found that US
              returns were exceptional in a global context. A 4% rule calibrated on US data
              may be optimistic for portfolios with significant international exposure, and
              it says nothing about what would have happened to a German or Japanese retiree
              in the same period.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              It assumes rigid, inflation-adjusted spending
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The rule takes 4% in year one and adjusts upward with inflation every year
              after — no matter what markets do. In practice, virtually no retiree spends
              this way. Most people cut spending in bad market years and increase it in good
              ones, whether consciously or not. Flexible withdrawal strategies — like
              Guyton-Klinger guardrails or CAPE-based dynamic rules — can support higher
              starting rates precisely because they allow adaptive response to market conditions.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Sequence of returns still matters
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The 4% rule survived every historical window, but some windows were close
              calls — the 1966 cohort in particular. A retiree who started at 4% in 1966
              was not in comfortable territory for most of their retirement. If future returns
              are lower than historical US averages — due to high starting valuations, lower
              structural growth, or other factors — the 4% floor from the past may not hold
              going forward.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The current research debate
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The 4% rule has been updated, challenged, and refined many times since 1994.
          Here is where the research stands today.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold text-foreground">
              Big ERN: 3.25&ndash;3.5% for early retirees
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Karsten Jeske (earlyretirementnow.com) has published the most rigorous modern
              analysis of safe withdrawal rates across different horizons and starting
              valuations. His Safe Withdrawal Rate series runs thousands of historical
              simulations and concludes that for 40&ndash;60 year retirements, the safe
              floor under rigid rules is roughly 3.25&ndash;3.5%, not 4%. The gap widens
              when markets are expensive at retirement (high CAPE), shrinks when they are
              cheap. His methodology is transparent and widely respected in the FIRE
              community.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold text-foreground">
              Flexible rules can support higher rates
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A rigid 4% rule that never adapts is inherently conservative because it has
              no mechanism to respond to bad markets. Strategies like Guyton-Klinger guardrails,
              CAPE-based dynamic withdrawals, and variable percentage withdrawal (VPW) can
              support higher starting rates because they incorporate spending cuts when conditions
              deteriorate. Morningstar&apos;s annual retirement research has consistently found
              that flexible strategies meaningfully extend portfolio survival compared to
              rigid inflation-adjusted rules at the same starting rate.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold text-foreground">
              The CAPE ratio as a valuation signal
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Research by Wade Pfau and others has shown that the CAPE ratio (Shiller P/E)
              at the time of retirement is a meaningful predictor of subsequent safe withdrawal
              rates. Retiring when CAPE is high (above 25&ndash;30) is historically associated
              with lower safe rates. This suggests that the static 4% rule may be too generous
              in high-valuation environments and too conservative in low-valuation environments.
              CAPE-adjusted dynamic strategies attempt to incorporate this signal directly into
              the withdrawal calculation.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-sm font-bold text-foreground">
              Bengen&apos;s own update: 4.7%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              In 2021, Bengen updated his original analysis using a broader dataset that
              extended back to 1926 and incorporated small-cap stocks. With this expanded
              dataset, SAFEMAX rose to 4.7%. He also clarified that his original 4% was
              always a conservative floor — he expected most retirees to do better. The
              distinction matters: 4% is not the &quot;expected&quot; withdrawal rate, it is
              the worst-case floor from historical data.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Practical implications for FIRE planning
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The 4% rule is a useful starting point, not a final answer. Here is how to think
          about it in the context of your own plan.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Use 3.5% if your horizon is 40+ years
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The additional buffer gives you meaningful protection against the combination
              of long horizon, potential sequence-of-returns risk, and lower future returns.
              The cost is a larger required FIRE number — about 14% more savings.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Add Social Security and other income sources
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Social Security benefits, pension income, or part-time work all reduce what
              you actually need to withdraw from your portfolio. A $20K/yr Social Security
              benefit effectively lowers a $60K expense plan to a $40K withdrawal need —
              reducing your effective withdrawal rate considerably.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Build in flexibility on spending
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              A plan that can cut 10% spending in a bad market year is far more robust
              than a rigid plan at the same withdrawal rate. The mechanical ability to
              adapt — even modestly — dramatically improves historical survival rates and
              lets you start retirement at a higher rate.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Run the historical scenarios, not just the average
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your success rate should be tested against specific historical cohorts — the
              1929 cohort, the 1966 cohort, the 2000 cohort. Calcifer&apos;s historical
              backtest does this automatically, running your plan against every available
              window in Shiller&apos;s 150-year dataset.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The bottom line
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The 4% rule is one of the most robust empirical findings in personal finance.
          It emerged from genuine historical analysis, it has been replicated and extended
          many times, and it remains a sensible planning anchor for most retirees with
          30-year horizons. The FIRE community has made it more complicated — rightly so,
          given longer retirement horizons and higher starting valuations.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          But the most important insight is not the specific number. It is the framework:
          your required portfolio is a multiple of your spending, that multiple depends on
          your withdrawal rate, and your withdrawal rate depends on your horizon, your
          flexibility, and your tolerance for historical uncertainty. Calcifer models all
          of this — and shows you the full historical distribution, not just the headline.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Read next
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/education/withdrawal-strategies"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Withdrawal strategies
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Go beyond the 4% rule — compare guardrails, VPW, CAPE-dynamic, and more.
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
              Why the order of returns matters more than the average — and what to do about it.
            </p>
          </Link>
          <Link
            href="/education/savings-rate"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Savings rate
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The single most powerful variable on your path to financial independence.
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
            Test your withdrawal rate →
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
