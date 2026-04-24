"use client";

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

import { PersonalizedInsight } from "./personalized-insight";
import { ChartFrame } from "@/components/charts/chart-frame";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { formatCompactCurrency } from "@/lib/calc/format";

/* ── Static chart data ─────────────────────────────────────── */

const contributionData = [
  { account: "W-2 401(k)", value: 23_500, color: "#94a3b8" },
  { account: "SEP-IRA", value: 25_000, color: "#6366f1" },
  { account: "Solo 401(k)\nEmployee", value: 23_500, color: "#818cf8" },
  { account: "Solo 401(k)\nTotal", value: 46_000, color: "#f97316" },
];

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function SelfEmployedRetirementArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  useInitializeStore();
  useAutoSaveScenario();
  const hasData = activeScenario.isPersonalized !== false;

  const employmentType = activeScenario.profile.employmentType ?? "w2";
  const isSelfEmployed =
    employmentType === "self_employed" ||
    employmentType.toLowerCase().includes("self");

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          SEP-IRA and Solo 401(k) for Self-Employed FIRE Savers
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Two accounts built for self-employed workers &mdash; and which one gets you to FIRE faster
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            W-2 employees can put away $23,500/yr in a 401(k). Self-employed
            workers with the right account structure can put away $69,000
            &mdash; nearly triple. The SEP-IRA and Solo 401(k) are the two
            primary tools for self-employed FIRE savers, and choosing between
            them can add hundreds of thousands to your retirement savings over
            a career.
          </p>
        </div>
      </section>

      {/* ── Section 1: The self-employment tax context ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The self-employment tax context
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Self-employed people pay both sides of FICA &mdash; employee plus
          employer &mdash; which comes to 15.3% on income up to the Social
          Security wage base. This is the most important number to understand
          before modeling your retirement contributions.
        </p>
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              The SE tax deduction
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The IRS allows self-employed workers to deduct half of their
              self-employment tax from gross income before calculating their
              adjusted gross income. This deduction affects retirement
              contribution calculations for both SEP-IRA and Solo 401(k)
              &mdash; specifically, the &ldquo;employer&rdquo; contribution
              side is based on net self-employment income after this deduction.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Contributions reduce ordinary income, not SE income
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Both SEP-IRA and Solo 401(k) contributions lower your ordinary
              income tax bill. They do not reduce your self-employment tax
              liability (FICA). That said, the ordinary income tax savings are
              still extremely powerful &mdash; and at the contribution limits
              available to self-employed workers, the total tax reduction can
              dwarf what W-2 employees can achieve.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2: SEP-IRA ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          SEP-IRA: the simple route
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Simplified Employee Pension IRA is the easiest self-employed
          retirement account to set up. You can open one the day before your
          tax filing deadline and fund it retroactively for the prior year
          &mdash; no December 31 deadline, no annual paperwork.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Detail
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  SEP-IRA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                {
                  label: "Contribution type",
                  value: "Employer only (no salary deferral)",
                },
                {
                  label: "Contribution rate",
                  value: "Up to 25% of W-2 comp; ~20% of net SE income",
                },
                { label: "2025 limit", value: "$69,000" },
                { label: "Roth option", value: "No" },
                {
                  label: "Annual filing requirement",
                  value: "None (until assets > $250K, then Form 5500-EZ)",
                },
                {
                  label: "Setup deadline",
                  value: "Tax filing deadline incl. extensions (Oct 15)",
                },
                {
                  label: "Funding deadline",
                  value: "Tax filing deadline incl. extensions",
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Pros</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Extremely simple to set up and maintain
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Open at any major brokerage with no fees
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Retroactive setup allowed until tax deadline
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                No annual filing requirements
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Cons</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                No Roth option
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                No salary deferral &mdash; only employer-side math
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                At lower incomes, hard to hit the max limit
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                Requires proportional contributions for any employees
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section 3: Solo 401(k) ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Solo 401(k): the FIRE powerhouse
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Solo 401(k) &mdash; also called the individual 401(k) or
          self-employed 401(k) &mdash; mirrors the structure of an employer
          plan but you wear both hats. As the employee, you make an elective
          salary deferral. As the employer, you make an additional profit-sharing
          contribution. The combination lets you reach the annual limit at a
          much lower income level than the SEP-IRA.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Detail
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Solo 401(k)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                {
                  label: "Employee deferral (2025)",
                  value: "$23,500 ($31,000 if age 50+)",
                },
                {
                  label: "Employer contribution",
                  value: "~20% of net SE income (25% of W-2 equivalent)",
                },
                {
                  label: "Combined 2025 limit",
                  value: "$69,000 ($76,500 with catch-up)",
                },
                { label: "Roth option", value: "Yes (at most custodians)" },
                {
                  label: "Annual filing",
                  value: "Form 5500-EZ when assets exceed $250K",
                },
                {
                  label: "Setup deadline",
                  value:
                    "Must be ESTABLISHED by Dec 31 of the tax year (critical!)",
                },
                {
                  label: "Funding deadline",
                  value: "Tax filing deadline incl. extensions",
                },
                {
                  label: "Employees allowed",
                  value: "Owner only (spouse with SE income qualifies)",
                },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Pros</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Reach max limit at lower income (employee deferral helps)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Roth option available for tax-free growth
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Spouse can contribute from their own SE income
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--ember)]">&rarr;</span>
                Loan provisions available (not recommended)
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Cons</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                Must be established by Dec 31 &mdash; no retroactive setup
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                Form 5500-EZ required once assets exceed $250K
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                Cannot have W-2 employees (other than spouse)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-rose-500">&rarr;</span>
                More complex to set up than a SEP-IRA
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            The Dec 31 gotcha
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Unlike a SEP-IRA, you cannot set up a Solo 401(k) retroactively.
            The plan must be established (paperwork signed, plan document in
            place) by December 31 of the tax year you want contributions for.
            You can fund it until the tax filing deadline, but if you miss the
            Dec 31 establishment deadline, you lose the ability to contribute
            for that year entirely. Set up the plan the moment you start
            self-employed work &mdash; even if you don&apos;t fund it yet.
          </p>
        </div>
      </section>

      {/* ── Section 4: Contribution chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Max contribution at $100K SE income (2025 limits)
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          At $100,000 net self-employment income, the Solo 401(k) total
          contribution is nearly double what a W-2-only worker can contribute
          in an employer 401(k). The employee deferral alone matches the W-2
          worker; add the employer side and the total gap becomes substantial.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Annual contribution limit by account type
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            $100K net SE income &middot; 2025 limits &middot; illustrative
          </p>
          <ChartFrame
            ariaLabel="Bar chart comparing maximum annual contribution limits for W-2 401(k), SEP-IRA, Solo 401(k) employee deferral, and Solo 401(k) total at $100K SE income"
            className="mt-4 h-72"
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 1, height: 1 }}
            >
              <BarChart
                data={contributionData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="account"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
                  formatter={(value) => [
                    fmtCurrency(Number(value)),
                    "Max contribution",
                  ]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="value">
                  {contributionData.map((entry) => (
                    <Cell key={entry.account} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            Illustrative. Solo 401(k) employer side is ~20% of net SE income
            after SE tax deduction. Actual amounts depend on net profit and
            deductions. Consult a tax professional for your specific situation.
          </p>
        </div>
      </section>

      {/* ── Section 5: Which is better for FIRE? ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Which is better for FIRE?
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          There&apos;s no universal answer. The right choice depends on your
          income level, whether you want Roth access, and how much
          administrative simplicity matters to you.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Low income (&lt;$50K SE net) &rarr; Solo 401(k) wins
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              At modest self-employment income, the SEP-IRA employer-only math
              severely limits contributions. A $40K net SE income yields only
              ~$8,000 in SEP contributions (20%). The Solo 401(k) lets you
              shelter $23,500 as an employee deferral regardless of income
              &mdash; far more efficient at lower income levels.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Higher income &rarr; either works, but Solo 401(k) still has advantages
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Once SE income exceeds ~$175K, both accounts approach the same
              annual limit ($69,000). At that point, the Roth option in the
              Solo 401(k) becomes the deciding factor for most FIRE savers.
              Tax-free growth and tax-free withdrawals in early retirement are
              worth more than administrative simplicity.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Simplicity matters &rarr; SEP-IRA
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you find financial administration genuinely burdensome &mdash;
              or you&apos;re just starting and don&apos;t want to deal with plan
              documents &mdash; the SEP-IRA&apos;s simplicity has real value.
              It takes fifteen minutes to set up at Fidelity, Vanguard, or
              Schwab, and you never have to file anything with the IRS until
              assets exceed $250K.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              You also have a W-2 job &rarr; important caveat
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you have self-employment income alongside a W-2 job with a
              401(k), the IRS $23,500 employee deferral limit is shared across
              all employers. You cannot contribute $23,500 to a Solo 401(k)
              employee deferral if you&apos;ve already maxed your W-2 employer
              401(k). SEP-IRA contributions are entirely separate and are not
              affected by your W-2 contributions.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              The FIRE bottom line
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              For most self-employed FIRE savers, the Solo 401(k) is the
              better tool &mdash; particularly for its Roth option and higher
              effective limit at moderate income levels. Open it as soon as you
              start any self-employment activity; the Dec 31 establishment
              deadline is an easy thing to miss and an expensive mistake to make.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Personalized insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your situation
        </h2>

        <PersonalizedInsight title="Self-employment accounts" hasData={hasData}>
          {isSelfEmployed ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Employment type
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    Self-employed
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Annual income
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(activeScenario.annualIncome)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-3">
                <p className="text-sm font-medium text-foreground">
                  You&apos;re eligible for both the SEP-IRA and Solo 401(k).
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  With{" "}
                  <strong className="text-foreground">
                    {formatCompactCurrency(activeScenario.annualIncome)}
                  </strong>{" "}
                  in self-employment income, you have access to contribution
                  limits that far exceed what W-2 employees can shelter. If
                  you haven&apos;t established a Solo 401(k) yet and it&apos;s
                  before December 31, open one now &mdash; even if you
                  don&apos;t fund it immediately.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm font-medium text-foreground">
                  Your plan shows W-2 employment.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The SEP-IRA and Solo 401(k) are designed for self-employment
                  income. If you have any side income from freelancing,
                  consulting, or a side business &mdash; even occasional gig
                  work &mdash; that income may qualify you for a Solo 401(k).
                  The threshold is $0 of net SE profit.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Tip
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  If you earn any self-employment income alongside your W-2
                  job, you can contribute to a SEP-IRA or Solo 401(k) based on
                  that SE income alone. The employee deferral limit is shared
                  across employers, but the employer contribution side of a
                  SEP-IRA is entirely separate from your W-2 401(k).
                </p>
              </div>
            </div>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Section 7: Deadlines and administration ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Deadlines and where to open
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              SEP-IRA deadlines
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Open and fund your SEP-IRA any time up to your tax filing
              deadline, including extensions &mdash; typically October 15 for
              most filers using an extension. This makes the SEP-IRA the only
              retirement account that can be set up retroactively after the
              calendar year ends. If you realized in March that you had a
              profitable SE year, you can still open a SEP-IRA and reduce your
              tax bill.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Solo 401(k) deadlines
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The plan must be <strong className="text-foreground">established</strong>{" "}
              &mdash; meaning paperwork signed and plan document executed &mdash;
              by December 31 of the tax year. You cannot set one up in January
              for the prior year. However, once the plan is established,
              you can fund both the employee deferral and employer contribution
              up to your tax filing deadline (including extensions).
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Where to open
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                {
                  name: "Fidelity",
                  note: "Fee-free Solo 401(k) with Roth option, excellent fund selection, no minimums.",
                },
                {
                  name: "Vanguard",
                  note: "Good for existing Vanguard investors; Roth option available. Setup slightly more involved.",
                },
                {
                  name: "Schwab",
                  note: "Fee-free, Roth option, straightforward online setup. Strong customer service.",
                },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="rounded-lg bg-muted/40 p-3"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {provider.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {provider.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Form 5500-EZ: the only ongoing requirement
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Once your Solo 401(k) &mdash; or SEP-IRA &mdash; exceeds $250,000
              in assets, you must file Form 5500-EZ annually with the IRS. It&apos;s
              a straightforward one-page informational return with no tax due,
              but failure to file carries steep penalties ($250/day, up to
              $150,000). Mark your calendar and consider a tax professional once
              you approach this threshold.
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
            href="/education/account-types"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Account Types Compared
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How 401(k), IRA, Roth, HSA, and taxable accounts fit together in
              a FIRE portfolio.
            </p>
          </Link>
          <Link
            href="/education/roth-ladder"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The Roth Conversion Ladder
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Converting pre-tax funds to Roth tax-efficiently in early
              retirement &mdash; essential for self-employed FIRE savers.
            </p>
          </Link>
          <Link
            href="/education/tax-efficient-withdrawal"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Tax-Efficient Withdrawal
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Which accounts to tap first in retirement &mdash; and how to
              minimize lifetime taxes across all account types.
            </p>
          </Link>
          <Link
            href="/education/savings-rate"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Savings Rate
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why your savings rate matters more than your return rate &mdash;
              and how self-employed contribution limits amplify it.
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
