"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  CartesianGrid,
  ReferenceLine,
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
import { formatPercent } from "@/lib/calc/format";

const CURRENT_CAPE = 33;
const CAPE_A = 0.01;
const CAPE_B = 0.5;

function capeWithdrawalRate(cape: number): number {
  return CAPE_A + CAPE_B / cape;
}

const capeChartData = Array.from({ length: 31 }, (_, i) => {
  const cape = 10 + i;
  const rate = capeWithdrawalRate(cape);
  return {
    cape,
    capeRate: parseFloat((rate * 100).toFixed(2)),
    fixedRate: 4.0,
  };
});

const capeRangeRows = [
  {
    range: "< 10",
    condition: "Very cheap",
    historicalReturn: "~10–15% real",
    safeRate: "~5.5%",
  },
  {
    range: "10–15",
    condition: "Cheap",
    historicalReturn: "~8–12% real",
    safeRate: "~4.5–5%",
  },
  {
    range: "15–20",
    condition: "Fair value",
    historicalReturn: "~5–9% real",
    safeRate: "~4.0–4.5%",
  },
  {
    range: "20–25",
    condition: "Elevated",
    historicalReturn: "~3–7% real",
    safeRate: "~3.5–4.0%",
  },
  {
    range: "25–30",
    condition: "Expensive",
    historicalReturn: "~1–4% real",
    safeRate: "~3.25–3.5%",
  },
  {
    range: "> 30",
    condition: "Very expensive",
    historicalReturn: "~–1 to 3% real",
    safeRate: "~2.5–3.25%",
  },
];

const limitationRows = [
  {
    title: "CAPE has been structurally elevated since the 1990s",
    detail:
      "Accounting rule changes (FASB), the rise of intangible-heavy tech companies, and global earnings diversification may justify a higher long-run average CAPE than pre-1990 history suggests. Simply comparing today's CAPE to 1880s norms may not be apples-to-apples. Some researchers argue the fair-value CAPE is now closer to 25 than 15.",
  },
  {
    title: "CAPE predicts 10-year returns, not timing",
    detail:
      "A high CAPE can persist for a decade — the US CAPE was elevated throughout the 1990s bull market. Don't treat CAPE as a market-timing signal. It's a long-range probability instrument. You can't use it to know when to get in or out.",
  },
  {
    title: "International diversification helps",
    detail:
      "CAPE varies enormously across countries. In 2025, the US CAPE sits around 33, while European and emerging market CAPEs are far lower (often 10–20). Global diversification gives you exposure to cheaper markets that the CAPE metric says should have better expected returns.",
  },
  {
    title: "It's one signal, not an oracle",
    detail:
      "CAPE has been one of the best single predictors of 10-year equity returns in academic research. But it explains only a portion of the variance in actual outcomes. Use it as an input to withdrawal planning, not as a definitive forecast. Combine it with Guyton-Klinger guardrails or a cash buffer strategy for a more robust system.",
  },
];

export function CapeRatioArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;

  const capeImpliedRate = useMemo(
    () => capeWithdrawalRate(CURRENT_CAPE),
    [],
  );

  const userRateVsCape = useMemo(() => {
    if (!hasData) return null;
    return withdrawalRate - capeImpliedRate;
  }, [hasData, withdrawalRate, capeImpliedRate]);

  return (
    <div className="space-y-10 pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          The CAPE ratio and valuation-aware withdrawals
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          How Shiller&apos;s PE10 predicts retirement outcomes — and how to use it
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The 4% rule was built on historical average returns. But history shows a
          pattern: retire when markets are cheap and your odds improve dramatically.
          Retire at a market peak — like 2000 or 1929 — and even a 3.5% withdrawal rate
          runs into serious trouble. Robert Shiller&apos;s CAPE ratio (cyclically adjusted
          price-to-earnings, also called PE10) is the best single metric for knowing
          whether you&apos;re retiring into a cheap or expensive market.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          It&apos;s not a crystal ball. But it&apos;s actionable — and using it can
          meaningfully improve your retirement odds without requiring you to time the
          market or predict the future.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your withdrawal rate vs CAPE" hasData={hasData}>
          <div className="space-y-3 text-sm leading-relaxed">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Your withdrawal rate</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatPercent(withdrawalRate, 1)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">
                  CAPE-implied rate (CAPE ~{CURRENT_CAPE})
                </p>
                <p className="mt-1 text-xl font-semibold text-[var(--ember)]">
                  {formatPercent(capeImpliedRate, 1)}
                </p>
              </div>
            </div>
            <p className="text-foreground">
              At the current US CAPE of approximately {CURRENT_CAPE} (early 2025 — this
              is a historically elevated reading), the CAPE-adjusted formula suggests a
              starting withdrawal rate of approximately{" "}
              <strong className="text-[var(--ember)]">
                {formatPercent(capeImpliedRate, 1)}
              </strong>
              .
            </p>
            {userRateVsCape !== null && userRateVsCape > 0.005 ? (
              <p className="text-muted-foreground">
                Your configured rate of {formatPercent(withdrawalRate, 1)} is{" "}
                {formatPercent(userRateVsCape, 1)} above the CAPE-implied rate. At this
                valuation level, consider whether Guyton-Klinger guardrails or a cash
                buffer would give you additional protection against a bad sequence of
                returns in your early retirement years.
              </p>
            ) : userRateVsCape !== null && userRateVsCape <= 0.005 ? (
              <p className="text-muted-foreground">
                Your configured rate of {formatPercent(withdrawalRate, 1)} is at or
                below the CAPE-implied rate. You&apos;re already being appropriately
                conservative given current valuations.
              </p>
            ) : null}
          </div>
        </PersonalizedInsight>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What CAPE is, and what it isn&apos;t
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The standard P/E ratio divides stock price by the last 12 months of earnings.
          The problem: earnings are volatile. A single bad year (recession, write-downs,
          pandemic) can make P/E look cheap when the market is actually expensive, and a
          great year can make it look expensive when it&apos;s actually cheap.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          CAPE solves this by dividing price by the average of the last{" "}
          <strong className="text-foreground">10 years</strong> of inflation-adjusted
          earnings. Ten years of averaging smooths out economic cycles, recessions, and
          one-time events to give you a stable, long-run view of whether stocks are
          cheap or expensive relative to their productive capacity.
        </p>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm">
          <p className="font-semibold text-foreground">A brief history</p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>
              <strong className="text-foreground">1988</strong> — John Campbell and
              Robert Shiller first publish the cyclically adjusted earnings methodology
              in the Journal of Finance.
            </li>
            <li>
              <strong className="text-foreground">2000</strong> — Shiller&apos;s{" "}
              <em>Irrational Exuberance</em> popularizes CAPE as the market peaks.
              CAPE hit 44 — the highest ever recorded — just before the dot-com crash.
            </li>
            <li>
              <strong className="text-foreground">2013</strong> — Shiller receives the
              Nobel Prize in Economics, in part for work on predicting asset prices using
              cyclically adjusted earnings.
            </li>
            <li>
              <strong className="text-foreground">Early 2025</strong> — US CAPE is
              approximately 33, well above the long-run average of ~17 but below the
              2000 peak.
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          CAPE ranges and historical returns
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Decades of research confirm that starting CAPE is strongly predictive of
          10-year forward real equity returns. This doesn&apos;t tell you what the market
          will do next year — but it does give you a reasonable probability range for
          what the next decade might look like:
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">CAPE</th>
                <th className="px-4 py-3 font-medium">Market condition</th>
                <th className="px-4 py-3 font-medium">Historical 10-yr real return</th>
                <th className="px-4 py-3 font-medium">Safe withdrawal rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {capeRangeRows.map((row) => {
                const isCurrent =
                  (row.range === "> 30" && CURRENT_CAPE > 30) ||
                  (row.range === "25–30" &&
                    CURRENT_CAPE >= 25 &&
                    CURRENT_CAPE <= 30);
                return (
                  <tr
                    key={row.range}
                    className={isCurrent ? "bg-[rgba(255,107,53,0.06)]" : undefined}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {row.range}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-bold text-[var(--ember)]">
                          ← ~now
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.condition}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.historicalReturn}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.safeRate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          Safe withdrawal rates from research by Michael Kitces and Wade Pfau correlating
          starting CAPE with 30-year historical outcomes. Higher CAPE at retirement
          correlates with worse sequence-of-returns risk in the early years.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How CAPE-based withdrawals work
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Jarlan implements a CAPE-dynamic withdrawal strategy using the formula:
        </p>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-sm text-foreground">
          withdrawal_rate = a + b × (1 / CAPE)
        </div>
        <p className="text-base leading-relaxed text-muted-foreground">
          Where <code className="rounded bg-muted px-1 py-0.5 text-sm">a</code> is an
          intercept (default ~0.01) and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">b</code> is a
          coefficient (default ~0.5). This is inspired by Big ERN&apos;s Safe Withdrawal
          Rate series, which demonstrated that CAPE is the strongest single predictor of
          retirement cohort outcomes.
        </p>
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-semibold text-foreground">
              When CAPE is high (expensive market)
            </p>
            <p className="mt-1 text-muted-foreground">
              1/CAPE is small, so the formula yields a lower withdrawal rate. You spend
              less in years when valuations are stretched and sequence-of-returns risk is
              highest. At CAPE 35, the default formula gives a rate of about 2.4%.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-semibold text-foreground">
              When CAPE is low (cheap market)
            </p>
            <p className="mt-1 text-muted-foreground">
              1/CAPE is larger, so the formula yields a higher withdrawal rate. You can
              spend more when stocks are cheap and expected returns are higher. At CAPE
              10, the default formula gives a rate of about 6%.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="font-semibold text-foreground">
              This is a dynamic rule — it recalculates every year
            </p>
            <p className="mt-1 text-muted-foreground">
              Unlike the fixed 4% rule which locks in year-one spending and
              inflation-adjusts it forever, CAPE-dynamic withdrawals are recalculated
              annually based on the current CAPE reading. In a bear market that brings
              CAPE down, your allowed withdrawal rate actually increases.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          The Can I Retire page in Jarlan lets you tune the{" "}
          <code className="rounded bg-muted px-1 py-0.5">a</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5">b</code> parameters directly
          and see how they affect your historical backtest outcomes.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          CAPE withdrawal rate vs the fixed 4% rule
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows the CAPE-implied withdrawal rate at each CAPE level
          (using the default formula) against the static 4% rule. At expensive markets,
          the CAPE rate is more conservative. At cheap markets, it permits more spending.
        </p>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <ChartFrame ariaLabel="Line chart comparing CAPE-adjusted withdrawal rates against the fixed 4% rule across CAPE values from 10 to 40.">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={capeChartData}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="cape"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  label={{
                    value: "CAPE",
                    position: "insideBottom",
                    offset: -4,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  domain={[1.5, 6.5]}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, ""]}
                  labelFormatter={(label) => `CAPE: ${label}`}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine
                  x={CURRENT_CAPE}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: "Today",
                    position: "top",
                    fontSize: 10,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="capeRate"
                  name="CAPE-adjusted rate"
                  stroke="var(--ember)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="fixedRate"
                  name="Fixed 4% rule"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 bg-[var(--ember)]" />
              CAPE-adjusted rate
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-6"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 4px, transparent 4px, transparent 8px)",
                }}
              />
              Fixed 4% rule
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Formula: withdrawal_rate = 0.01 + 0.5 × (1 / CAPE). At CAPE 10, rate ≈ 6.0%.
          At CAPE 20, rate ≈ 3.5%. At CAPE 35, rate ≈ 2.4%. The intersection point
          (where CAPE-adjusted equals 4%) occurs around CAPE 16-17, historically close to
          fair value.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Limitations to keep in mind
        </h2>
        <div className="space-y-3">
          {limitationRows.map((row) => (
            <div key={row.title} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-sm font-semibold text-foreground">{row.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{row.detail}</p>
            </div>
          ))}
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
              Where it comes from, why it works, and when to adjust it.
            </p>
          </Link>
          <Link
            href="/education/guyton-klinger"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Guyton-Klinger guardrails
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A flexible withdrawal system that can support a higher starting rate.
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
              Why the order of market returns matters more than the average.
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
            Model CAPE-based withdrawals →
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
