"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { calculateQuickFireSummary } from "@/lib/calc";
import { formatCompactCurrency, formatYearsToFi } from "@/lib/calc/format";

const subsidyData = [
  { magi: "~$23K (150%)", subsidy: 7800 },
  { magi: "~$30K (200%)", subsidy: 7000 },
  { magi: "~$38K (250%)", subsidy: 6200 },
  { magi: "~$45K (300%)", subsidy: 5400 },
  { magi: "~$53K (350%)", subsidy: 4600 },
  { magi: "~$60K (400%)", subsidy: 2400 },
  { magi: "Over $60K", subsidy: 0 },
];

export function AcaEarlyRetirementArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );

  const retirementAge = activeScenario.profile.retirementAge ?? 65;
  const annualIncome = activeScenario.annualIncome ?? 0;
  const isMarried =
    activeScenario.profile.filingStatus === "married_joint" ||
    activeScenario.profile.filingStatus === "married_separate";

  const yearsBeforeMedicare = Math.max(65 - retirementAge, 0);
  const fplLabel = isMarried ? "$81,760 (married, 2-person household)" : "$60,240 (single)";

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          ACA health insurance for early retirees
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          What you need to know before Medicare at 65
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          For most early retirees under 65, health insurance is the biggest financial wildcard.
          You&apos;re off your employer&apos;s plan, not yet eligible for Medicare, and facing
          individual market premiums that can run $500–$1,500 per month without help. The
          Affordable Care Act&apos;s marketplace subsidies can cut those costs dramatically —
          sometimes to near zero — but only if you manage your Modified Adjusted Gross Income
          (MAGI) carefully.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Getting this right is worth thousands of dollars per year. A 55-year-old on a Silver plan
          might pay a full unsubsidized premium of $800–$1,000 per month. Managed correctly, that
          same plan can cost $50–$200. The difference comes down to one number: your MAGI relative
          to the Federal Poverty Level.
        </p>
      </section>

      {/* Personalized callout */}
      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your numbers" hasData={hasData}>
          <div className="space-y-2 text-sm leading-relaxed text-foreground">
            {retirementAge < 65 ? (
              <p>
                You&apos;re planning to retire at age{" "}
                <strong className="text-[var(--ember)]">{retirementAge}</strong> — that&apos;s{" "}
                <strong>{yearsBeforeMedicare} year{yearsBeforeMedicare !== 1 ? "s" : ""}</strong>{" "}
                before Medicare. ACA planning is critical for your situation.
              </p>
            ) : (
              <p>
                Your plan has you retiring at age{" "}
                <strong className="text-[var(--ember)]">{retirementAge}</strong>, which is at or
                after Medicare eligibility. You may still need a bridge strategy if you plan to
                leave your employer before 65.
              </p>
            )}
            <p className="text-muted-foreground">
              Your 400% FPL subsidy cliff is approximately{" "}
              <strong className="text-foreground">{fplLabel}</strong>. In retirement, your MAGI
              will likely drop significantly from your current{" "}
              <strong className="text-foreground">{formatCompactCurrency(annualIncome)}/yr</strong>{" "}
              salary — which could put you squarely in subsidy territory. The key is controlling
              how much you pull from taxable accounts and traditional IRAs each year.
            </p>
            {summary.yearsToFi !== null && summary.yearsToFi > 0 ? (
              <p className="text-muted-foreground">
                Jarlan projects you&apos;re{" "}
                <strong className="text-foreground">
                  {formatYearsToFi(summary.yearsToFi)}
                </strong>{" "}
                from FI. Start modeling your ACA strategy now so the income sequencing is already
                figured out by the time you retire.
              </p>
            ) : null}
          </div>
        </PersonalizedInsight>
      </section>

      {/* How subsidies work */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How ACA subsidies work
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The ACA&apos;s premium tax credits are available to people with MAGI between 100% and
          400% of the Federal Poverty Level. At 400% FPL, you hit what&apos;s known as the{" "}
          <strong className="text-foreground">subsidy cliff</strong> — going one dollar over means
          losing the entire subsidy. Congress temporarily extended credits above 400% FPL through
          the American Rescue Plan, but that extension may not be permanent. Prudent planning means
          staying below the traditional 400% FPL threshold.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Below 400% FPL, your subsidy is calculated so your premium never exceeds a sliding-scale
          percentage of your income. The less you earn (down to 100% FPL), the smaller your
          required premium contribution. At 100–150% FPL, your Silver plan premium is capped near
          zero. At 400% FPL, you pay up to 8.5%.
        </p>

        {/* FPL Table */}
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/55 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">MAGI (Single)</th>
                <th className="px-4 py-3 font-medium">% of FPL</th>
                <th className="px-4 py-3 font-medium">Max premium as % of income</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/40">
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">&lt; $15,060</td>
                <td className="px-4 py-2.5 text-muted-foreground">&lt; 100%</td>
                <td className="px-4 py-2.5 text-muted-foreground">May qualify for Medicaid</td>
              </tr>
              <tr className="border-t border-border/40 bg-[rgba(255,107,53,0.02)]">
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">$15,060–$30,120</td>
                <td className="px-4 py-2.5 text-muted-foreground">100–200%</td>
                <td className="px-4 py-2.5 font-medium text-foreground">0–6% of income</td>
              </tr>
              <tr className="border-t border-border/40 bg-[rgba(255,107,53,0.03)]">
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">$30,120–$45,180</td>
                <td className="px-4 py-2.5 text-muted-foreground">200–300%</td>
                <td className="px-4 py-2.5 font-medium text-foreground">6–9% of income</td>
              </tr>
              <tr className="border-t border-border/40">
                <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">$45,180–$60,240</td>
                <td className="px-4 py-2.5 text-muted-foreground">300–400%</td>
                <td className="px-4 py-2.5 font-medium text-foreground">9–8.5% of income</td>
              </tr>
              <tr className="border-t border-border/40 bg-rose-500/5">
                <td className="px-4 py-2.5 font-mono text-sm font-medium text-foreground">&gt; $60,240</td>
                <td className="px-4 py-2.5 font-medium text-foreground">&gt; 400%</td>
                <td className="px-4 py-2.5 font-medium text-rose-700 dark:text-rose-400">
                  Full premium, no subsidy
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          2025 FPL for a household of one. For a 2-person household (married), the 400% cliff is
          approximately $81,760.
        </p>
      </section>

      {/* What counts as MAGI */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What counts as MAGI for ACA purposes
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          ACA MAGI includes most income sources, but critically excludes a few that are especially
          useful for FIRE retirees. Understanding what counts — and what does not — is the
          foundation of the entire strategy.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-600 dark:text-rose-400">
              Counts toward MAGI
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">+</span>
                <span>Wages and self-employment income</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">+</span>
                <span>
                  <strong className="text-foreground">Roth conversions</strong> — the big one for
                  FIRE. Converting $40K from traditional IRA to Roth adds $40K to MAGI.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">+</span>
                <span>
                  Traditional IRA and 401(k) withdrawals — every dollar you pull is ordinary income
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">+</span>
                <span>Realized capital gains from selling taxable assets</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">+</span>
                <span>
                  Social Security benefits (85% of benefits above the relevant thresholds)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-rose-500">+</span>
                <span>Rental income, dividends, interest</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
              Does NOT count toward MAGI
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span>
                  <strong className="text-foreground">Roth IRA withdrawals</strong> — this is why
                  Roth ladders are so valuable for early retirees
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span>Return of cost basis from taxable brokerage accounts</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span>
                  HSA withdrawals used for qualified medical expenses — tax-free in, tax-free out
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span>Municipal bond interest</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 text-emerald-500">✓</span>
                <span>Loans (including 401(k) loans, though these have other risks)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-4">
          <p className="text-sm font-medium text-foreground">
            The Roth IRA advantage for ACA planning
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Because Roth IRA withdrawals are excluded from MAGI, they are the cleanest income
            source for an early retiree managing the ACA subsidy cliff. A person living on $40K/yr
            from a Roth IRA pays essentially no income taxes and has MAGI of $0 — maximum subsidy,
            potentially $0 premiums. This is why building a Roth ladder during the accumulation
            phase is so strategically important.
          </p>
        </div>
      </section>

      {/* MAGI Management Strategy */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The MAGI management strategy for early retirees
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The goal is to keep MAGI in the sweet spot — ideally in the 200–350% FPL range —
          maximizing subsidies while still doing meaningful Roth conversions and tax-advantaged
          planning. Here is the sequence most FIRE retirees use.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              1. Draw from Roth first (or taxable basis)
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Roth IRA withdrawals and the return of cost basis from taxable accounts don&apos;t
              add to MAGI. Use these first to cover living expenses. This keeps your MAGI low and
              your subsidies high.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              2. Fill the traditional IRA / 401(k) withdrawal space carefully
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every dollar you pull from a traditional IRA or 401(k) is ordinary income. Model how
              much you need to keep MAGI below the FPL cliff. Often you can pull some — just not
              unlimited amounts. A common strategy is to withdraw enough to fill the 0% federal
              income tax bracket but stay well under the FPL cliff.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              3. Do Roth conversions in low-income years, but budget them into your MAGI
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Roth conversions are taxable income that count as MAGI. If you convert $30K in a year
              where you have $15K of other MAGI, your total MAGI is $45K — right near the 300% FPL
              threshold. Many FIRE retirees deliberately cap their conversions to stay under the
              cliff. The Roth conversion sweet spot depends heavily on your specific MAGI and your
              state&apos;s subsidy structure.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              4. Harvest capital gains at 0% when income permits
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              If your taxable income is below approximately $48,350 (single, 2025), long-term
              capital gains are taxed at 0% federal. Even better, realized gains do count as MAGI,
              so you have to factor them into your cliff calculation. But if you have appreciated
              taxable assets, low-income early retirement years are the ideal window to harvest
              gains at no federal tax cost — just stay below the cliff.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              5. Use an HSA for medical costs — it&apos;s invisible to ACA MAGI
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              If you funded an HSA during your working years and kept receipts, you can reimburse
              yourself for old medical expenses at any time. Those reimbursements don&apos;t count
              as MAGI. HSA spending on current medical costs is also MAGI-invisible. Over a
              long early retirement, a well-funded HSA can cover tens of thousands in medical costs
              while keeping your MAGI artificially low.
            </p>
          </div>
        </div>
      </section>

      {/* The Cliff */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The cliff and how to avoid it
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The 400% FPL cliff is one of the sharpest discontinuities in the entire tax code. Going
          one dollar over means losing the entire subsidy — not just the marginal subsidy on the
          dollar above the cliff. The math is brutal.
        </p>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
          <p className="text-sm font-bold text-foreground">The cliff in numbers (single filer)</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-4">
              <span>MAGI at $60,239 (1 cent under cliff)</span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                ~$2,400/yr subsidy
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>MAGI at $60,241 (1 dollar over cliff)</span>
              <span className="font-medium text-rose-700 dark:text-rose-400">
                $0 subsidy — full premium
              </span>
            </div>
            <div className="mt-3 border-t border-rose-500/20 pt-3">
              <p>
                On a $800/month Silver plan benchmark (age 55), crossing the cliff costs
                approximately <strong className="text-foreground">$9,600/year</strong> in lost
                subsidies for one dollar of extra income. No other income threshold in retirement
                planning has this kind of marginal tax rate.
              </p>
            </div>
          </div>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          Tactics to avoid cliff-crossing: project your income before year-end and compare it
          against the cliff threshold. If you&apos;re close, defer a Roth conversion to next year.
          Reduce traditional IRA withdrawals. Use QCDs (Qualified Charitable Distributions) from
          your IRA if you&apos;re over 70½ — they satisfy RMDs without adding to MAGI. Also check
          whether you have any year-end dividend distributions or capital gains distributions from
          mutual funds scheduled — these count and can surprise you.
        </p>

        <p className="text-base leading-relaxed text-muted-foreground">
          Many experienced FIRE retirees deliberately keep MAGI in the 200–300% FPL range. At
          that level, subsidies are substantial, Roth conversions are still meaningful, and there is
          a comfortable buffer before the cliff. The 200–300% band is often called the &ldquo;FIRE
          sweet spot&rdquo; for ACA planning.
        </p>
      </section>

      {/* Chart: Subsidy by MAGI level */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Estimated annual subsidy by income level
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows the approximate annual subsidy at each FPL level for a 50-year-old
          on a Silver benchmark plan with a ~$700/month full unsubsidized premium. These are
          illustrative — actual subsidies depend on your specific plan and state.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Annual subsidy value at each income level (single, age 50, Silver plan)
          </p>
          <ChartFrame
            ariaLabel="Bar chart showing annual ACA subsidy amounts at different income levels relative to FPL"
            className="mt-4 h-72"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={subsidyData}
                margin={{ top: 4, right: 8, bottom: 32, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="magi"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tickFormatter={(v) => `$${Math.round(v / 1000)}K`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                  }}
                  formatter={(value) => [
                    `$${Number(value).toLocaleString()}/yr`,
                    "Annual subsidy",
                  ]}
                />
                <Bar dataKey="subsidy" radius={[4, 4, 0, 0]}>
                  {subsidyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.subsidy === 0 ? "var(--muted-foreground)" : "var(--ember)"}
                      fillOpacity={entry.subsidy === 0 ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            The subsidy value drops sharply near the 400% FPL cliff. Above it, you get nothing.
          </p>
        </div>
      </section>

      {/* Planning decisions */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Practical ACA planning for FIRE retirees
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Project income before December 31
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              ACA subsidies are based on your projected annual income, not last year&apos;s. You
              can adjust your projection with the marketplace throughout the year. In November or
              December, estimate what your MAGI will actually land at and compare to the cliff.
              Pulling less from a traditional IRA or deferring a Roth conversion can save thousands.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Reconcile on your tax return
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              If your actual income ends up higher than projected, you may owe back some or all of
              your subsidy at tax time. If it&apos;s lower, you get a refundable credit. Keep this
              in mind when modeling your cash flow — there&apos;s a settling-up process in April.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Consider Silver plans specifically for Cost-Sharing Reductions
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cost-Sharing Reductions (CSRs) are additional subsidies that lower your deductible,
              copays, and out-of-pocket max. They are only available on Silver plans and only at
              100–250% FPL. If you can keep your MAGI in this range, a Silver plan can become
              equivalent to a Gold or Platinum plan in terms of actual coverage generosity.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              COBRA as a bridge in the transition year
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The year you retire, your income will likely be high (from working the first half of
              the year). That can push you over the FPL cliff for ACA purposes. Many people use
              COBRA to extend their employer coverage for that high-income transition year, then
              switch to the marketplace the following January when their full-year income is lower
              and subsidies are maximized.
            </p>
          </div>
        </div>
      </section>

      {/* Key takeaways */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Key takeaways
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              ACA planning is income sequencing, not just insurance shopping
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The plan you choose matters less than the MAGI you show up with. Optimizing your
              account withdrawal order — Roth first, then basis, then carefully metered traditional
              IRA — is the core of an ACA strategy.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              The Roth ladder pays off enormously in early retirement
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every dollar you convert to Roth during accumulation (even if you pay taxes now) is a
              future dollar that won&apos;t count as MAGI in retirement. The tax cost of conversion
              during accumulation can be far outweighed by the subsidy value of lower MAGI in
              retirement.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Model this before you retire, not after
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              The optimal account mix for ACA purposes takes years to build. If your entire
              retirement portfolio is in a traditional 401(k), every withdrawal is MAGI. You want a
              blend of Roth, taxable, and traditional accounts to give yourself flexibility. Start
              building that Roth balance while you&apos;re still working.
            </p>
          </div>
        </div>
      </section>

      {/* Related articles */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
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
              Setting your withdrawal rate, which determines how much MAGI you generate each year.
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
              How fixed, guardrails, and flexible strategies affect year-to-year income — and MAGI.
            </p>
          </Link>
          <Link
            href="/education/monte-carlo"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Monte Carlo simulations
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How Jarlan stress-tests your plan across thousands of possible futures.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tax-strategy"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Model your retirement income &rarr;
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
