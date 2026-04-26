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
import { formatCompactCurrency, formatCurrency } from "@/lib/calc/format";

/* ── Static chart data ─────────────────────────────────────── */

// 20 years, $4,300/yr contribution, 7% real return, 22% marginal rate
// Taxable: after capital gains (~15%) on growth only
// Traditional IRA: pre-tax in, 22% tax on withdrawal (on full balance)
// Roth IRA: after-tax contributions, tax-free withdrawal
// HSA for medical: pre-tax in, tax-free growth, tax-free out

const ANNUAL_CONTRIBUTION = 4_300;
const YEARS = 20;
const REAL_RETURN = 0.07;
const MARGINAL_RATE = 0.22;
const CAPITAL_GAINS_RATE = 0.15;

function calcAccountValues() {
  // Future value of annuity (end-of-year contributions)
  const fva = (c: number, r: number, n: number) =>
    c * ((Math.pow(1 + r, n) - 1) / r);

  // Taxable: after-tax contributions ($4,300 * (1-22%) = $3,354), grow at 7%,
  // withdraw with 15% cap gains on gains only
  const taxableAfterTaxContrib = ANNUAL_CONTRIBUTION * (1 - MARGINAL_RATE);
  const taxableGross = fva(taxableAfterTaxContrib, REAL_RETURN, YEARS);
  const taxableBasisFinal = taxableAfterTaxContrib * YEARS;
  const taxableGains = taxableGross - taxableBasisFinal;
  const taxableNet = taxableGross - taxableGains * CAPITAL_GAINS_RATE;

  // Traditional IRA: pre-tax $4,300, grows tax-deferred, 22% on withdrawal
  const iraGross = fva(ANNUAL_CONTRIBUTION, REAL_RETURN, YEARS);
  const iraNet = iraGross * (1 - MARGINAL_RATE);

  // Roth IRA: after-tax $4,300 * (1 - 22%), grows tax-free
  const rothNet = fva(ANNUAL_CONTRIBUTION * (1 - MARGINAL_RATE), REAL_RETURN, YEARS);

  // HSA: pre-tax $4,300, grows tax-free, withdraw tax-free for medical
  const hsaNet = fva(ANNUAL_CONTRIBUTION, REAL_RETURN, YEARS);

  return [
    { account: "Taxable", value: Math.round(taxableNet), color: "#94a3b8" },
    { account: "Traditional IRA", value: Math.round(iraNet), color: "#6366f1" },
    { account: "Roth IRA", value: Math.round(rothNet), color: "#818cf8" },
    { account: "HSA (medical)", value: Math.round(hsaNet), color: "#f97316" },
  ];
}

const accountData = calcAccountValues();

/* ── Helpers ──────────────────────────────────────────────── */

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function HsaTripleAdvantageArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const hsaAccount = activeScenario.accounts.find((a) => a.type === "hsa");
  const hasHsa = hsaAccount != null;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          The HSA Triple Tax Advantage
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          The only account in the US tax code with three simultaneous tax benefits
        </p>

        <div className="mt-6 space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            The Health Savings Account is the most tax-advantaged account most
            Americans are eligible for &mdash; and among the most underused. A
            401(k) gives you two tax benefits. A Roth IRA gives you two.
            The HSA gives you all three: pre-tax contributions, tax-free
            growth, and tax-free withdrawals for qualified medical expenses.
            No other account in the US tax code does this.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            For FIRE planning specifically, the HSA has an additional property
            that makes it extraordinary: after age 65, it functions as a
            traditional IRA for any purpose. You can withdraw for non-medical
            expenses, paying ordinary income tax. But for medical costs &mdash;
            which become a larger and larger share of retirement spending as
            you age &mdash; it remains completely tax-free forever.
          </p>
        </div>
      </section>

      {/* ── Section 1: The Three Advantages ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The three advantages
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/15 text-xs font-bold text-[var(--ember)]">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Pre-tax contributions
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  HSA contributions reduce your taxable income dollar-for-dollar,
                  just like a 401(k) or traditional IRA. If you&apos;re in the
                  22% bracket, a $4,300 contribution saves $946 in federal income
                  taxes immediately. Contributions through payroll also skip FICA
                  taxes (7.65%), saving an additional $329 &mdash; an advantage
                  neither the IRA nor 401(k) fully replicates.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/15 text-xs font-bold text-[var(--ember)]">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Tax-free growth
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Investments inside your HSA grow without any annual tax drag.
                  No capital gains taxes, no dividend taxes, no annual rebalancing
                  tax events. Compounding works at full speed. Over 20&ndash;30
                  years, eliminating this drag adds meaningfully to final balances
                  compared to a taxable brokerage account.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/15 text-xs font-bold text-[var(--ember)]">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Tax-free withdrawals for medical
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Withdrawals for qualified medical expenses are completely
                  tax-free, at any age. The list of qualifying expenses is
                  broad: doctor visits, prescriptions, dental, vision, hearing
                  aids, mental health care, Medicare premiums after 65, COBRA
                  premiums, and long-term care insurance premiums. This is where
                  the HSA separates itself from every other account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Comparison Chart ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          After-tax value after 20 years
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows the after-tax value of $4,300/yr contributed
          to four different account types over 20 years at 7% real return,
          assuming a 22% marginal income tax rate. The HSA (used for medical)
          wins clearly because you get the pre-tax contribution benefit{" "}
          <em>and</em> pay zero tax on withdrawal.
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            After-tax value: $4,300/yr &times; 20 years at 7% real
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            22% marginal income tax rate &middot; 15% capital gains rate
          </p>
          <ChartFrame
            ariaLabel="Bar chart comparing after-tax value after 20 years of $4,300/yr contributions across taxable, traditional IRA, Roth IRA, and HSA accounts"
            className="mt-4 h-72"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={accountData}
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
                  formatter={(value) => [fmtCurrency(Number(value)), "After-tax value"]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="value">
                  {accountData.map((entry) => (
                    <Cell key={entry.account} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-3 text-xs text-muted-foreground">
            Illustrative. Assumes contributions at start of year, 7% real compounding, 22% income tax rate, 15% capital gains rate, no state taxes. HSA figure assumes withdrawals for qualified medical expenses.
          </p>
        </div>
      </section>

      {/* ── Section 3: Eligibility ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Eligibility &amp; limits
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          To contribute to an HSA, you must be enrolled in a qualifying
          High-Deductible Health Plan (HDHP). Not every health plan qualifies
          &mdash; the IRS sets minimum deductible thresholds and maximum
          out-of-pocket limits each year. Check your plan documents or ask
          your HR department whether your plan is HSA-eligible.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Limit type
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  2025 amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[
                { label: "Individual contribution limit", amount: "$4,300" },
                { label: "Family contribution limit", amount: "$8,550" },
                { label: "Catch-up contribution (age 55+)", amount: "+$1,000" },
                { label: "HDHP minimum deductible (individual)", amount: "$1,650" },
                { label: "HDHP minimum deductible (family)", amount: "$3,300" },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 text-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                    {row.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Limits are indexed to inflation and adjust annually. You cannot
          contribute to an HSA while enrolled in Medicare. Contributions must
          stop once you turn 65 and enroll in Medicare.
        </p>
      </section>

      {/* ── Section 4: The Stealth IRA Strategy ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The &ldquo;stealth IRA&rdquo; strategy
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The optimal HSA strategy for FIRE savers is counterintuitive: don&apos;t
          spend it on medical costs in the near term. Instead, invest the full
          balance in index funds, let it compound tax-free for decades, and pay
          current medical costs out of pocket. Then, in retirement, use the
          accumulated balance for the large healthcare costs that inevitably
          arrive in later life.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            Receipt arbitrage: the most powerful variant
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            There is no time limit on HSA reimbursements. You can pay a medical
            bill out of pocket today, keep the receipt, and reimburse yourself
            from your HSA 20 years later. The money compounds inside the HSA
            the entire time, and the eventual reimbursement is still completely
            tax-free because the expense was qualified.
          </p>
          <div className="mt-3 rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Example
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You pay a $200 doctor visit out of pocket today. You invest that
              $200 in your HSA. At 7% real, it grows to{" "}
              <strong className="text-foreground">$774</strong> in 20 years.
              You reimburse yourself $200 at any point, and{" "}
              <strong className="text-foreground">the entire $774</strong>{" "}
              is available tax-free for the full lifetime of that receipt.
              The &ldquo;cost&rdquo; of saving the receipt is zero; the payoff
              is the compounded growth on deferred medical spending.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            After 65: a traditional IRA with a medical bonus
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Once you turn 65, you can withdraw HSA funds for any reason. For
            non-medical expenses, you pay ordinary income tax &mdash; exactly
            like a traditional IRA. For qualified medical expenses (which
            typically consume a large portion of late-retirement spending),
            withdrawals remain 100% tax-free. The HSA effectively becomes
            a hybrid account: traditional IRA for non-medical, zero-tax for
            medical. No other account gives you this flexibility.
          </p>
        </div>
      </section>

      {/* ── Section 5: Investment Options ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Investing your HSA
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Many employers default your HSA into a cash savings account paying
          near-zero interest. To unlock the triple advantage, you need to
          invest in index funds. Most HSA administrators now offer brokerage-
          style investing with a modest minimum balance threshold (often $1,000
          &ndash;$2,000 must remain in cash before you can invest the rest).
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              name: "Fidelity HSA",
              note: "No account fees, no investment minimums, full index fund access via Fidelity funds. Best overall option if available.",
            },
            {
              name: "Lively",
              note: "No fees, integrates with TD Ameritrade/Schwab brokerage for investing. Good option for self-employed.",
            },
            {
              name: "HealthEquity",
              note: "Widely available through employer plans. Investment options vary; check expense ratios carefully.",
            },
          ].map((provider) => (
            <div key={provider.name} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-sm font-semibold text-foreground">{provider.name}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{provider.note}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">
            What qualifies as a medical expense?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The IRS definition of qualified medical expenses (IRS Publication
            502) is broad. It includes: doctor and hospital visits, prescription
            drugs, dental and vision care, hearing aids, mental health
            treatment, chiropractic care, medical equipment, Medicare premiums
            (Part B, Part D, Medicare Advantage) after 65, COBRA premiums
            if you lose employer coverage, and long-term care insurance
            premiums (up to age-based limits). Over-the-counter medications
            and menstrual care products qualify since 2020.
          </p>
        </div>
      </section>

      {/* ── Section 6: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Your HSA picture
        </h2>

        <PersonalizedInsight title="Your HSA status" hasData={hasData}>
          {hasHsa ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    HSA account
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    {hsaAccount.name}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Current balance
                  </p>
                  <p className="mt-1 font-display text-lg tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(hsaAccount.currentBalance)}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-3">
                <p className="text-sm font-medium text-foreground">
                  You&apos;re already using the triple advantage.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep investing &mdash; don&apos;t let it sit in cash. Save
                  every medical receipt with the date and amount. There&apos;s
                  no time limit on reimbursement, so every out-of-pocket
                  expense today is a future tax-free withdrawal opportunity
                  at {formatCurrency(hsaAccount.currentBalance)} compounded.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-sm font-medium text-foreground">
                  You don&apos;t have an HSA account in your plan yet.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  To contribute to an HSA, you must be enrolled in a qualifying
                  High-Deductible Health Plan (HDHP). If you have one &mdash;
                  or are considering switching to one &mdash; adding an HSA to
                  your plan will let Jarlan account for it in your projections.
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Annual value of max-funding an HSA (individual)
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  At $4,300/yr for 20 years at 7% real, an HSA for medical grows
                  to approximately{" "}
                  <strong className="text-foreground">
                    {formatCompactCurrency(accountData[3].value)}
                  </strong>{" "}
                  in after-tax value &mdash; versus{" "}
                  <strong className="text-foreground">
                    {formatCompactCurrency(accountData[0].value)}
                  </strong>{" "}
                  in a taxable account with the same contributions.
                </p>
              </div>
            </div>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Section 7: Common Mistakes ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Common HSA mistakes
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Leaving it in cash
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Most employer-provided HSAs default to a cash savings account.
              Unless you actively move the balance into investments, the triple
              advantage becomes a single advantage (pre-tax contributions) with
              near-zero growth. Always check your HSA administrator&apos;s
              investment options and move the investable portion into a
              low-cost index fund.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Spending it on current medical costs
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Using the HSA as a spending account for routine medical bills is
              legal, but it destroys the compounding opportunity. If you can
              afford to pay current medical costs from other income, pay them
              out of pocket, save the receipts, and let the HSA grow. Withdraw
              later when the money has compounded significantly.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Not tracking receipts
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The receipt arbitrage strategy only works if you have documentation
              of past qualified expenses. Keep digital copies (a simple folder
              in cloud storage works) of every medical receipt from the time
              you open your HSA. The IRS requires documentation for tax-free
              withdrawals, and losing receipts eliminates the ability to make
              penalty-free withdrawals for those amounts before age 65.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">
              Assuming you lose it if you leave your HDHP
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your HSA balance is yours permanently. If you switch from an
              HDHP to a traditional plan, you stop making new contributions,
              but you keep everything already in the account. It continues to
              grow tax-free, and you can still withdraw tax-free for qualified
              medical expenses. Many early retirees keep their HSA invested
              for decades after leaving HDHP coverage.
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
              How 401(k), IRA, Roth, HSA, and taxable accounts fit together
              in a FIRE portfolio.
            </p>
          </Link>
          <Link
            href="/education/aca-early-retirement"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              ACA &amp; Early Retirement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How to get health insurance before Medicare, and how the HDHP
              &amp; HSA fit into that strategy.
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
              Converting traditional IRA funds to Roth tax-efficiently in early
              retirement &mdash; pairs well with HSA planning.
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
              The foundation of safe withdrawal rate planning and how a large
              HSA affects your effective withdrawal rate.
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
