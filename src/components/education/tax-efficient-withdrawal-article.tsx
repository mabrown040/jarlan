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

// Illustrative 10-year federal tax estimates for three withdrawal sequences.
// These are intentionally simplified to make the key tradeoff legible —
// not live-calculated from the user&apos;s scenario.
const TAX_SEQUENCE_DATA = [
  {
    strategy: "Conventional",
    taxes: 142_000,
  },
  {
    strategy: "Bracket-Fill",
    taxes: 89_000,
  },
  {
    strategy: "Roth-First",
    taxes: 54_000,
  },
];

const YEAR_BY_YEAR_EXAMPLE = [
  {
    age: 55,
    source: "Taxable brokerage (LTCG at 0%)",
    amount: "$18K",
    notes: "Sell appreciated shares. Long-term gains taxed at 0% under $48K income.",
  },
  {
    age: 56,
    source: "Traditional IRA (bracket-fill to 12%)",
    amount: "$33K",
    notes: "Withdraw up to the top of the 12% bracket. Also converts future RMD exposure.",
  },
  {
    age: 57,
    source: "Roth IRA (principal)",
    amount: "$9K",
    notes: "Cover the remaining $9K of annual spending from Roth — zero tax, no penalty.",
  },
  {
    age: 58,
    source: "Traditional IRA + Roth",
    amount: "$42K + $18K",
    notes: "Bracket expands slightly with inflation. Fill 12% bracket, cover rest from Roth.",
  },
  {
    age: 59,
    source: "All sources penalty-free",
    amount: "Any mix",
    notes: "Age 59½ — 10% early withdrawal penalty gone. Full flexibility begins.",
  },
];

export function TaxEfficientWithdrawalArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const totalBalance = useMemo(
    () => getCurrentPortfolioBalance(activeScenario.accounts),
    [activeScenario.accounts],
  );

  const preTaxBalance = useMemo(
    () =>
      activeScenario.accounts
        .filter((a) => a.type === "traditional_401k" || a.type === "traditional_ira")
        .reduce((sum, a) => sum + a.currentBalance, 0),
    [activeScenario.accounts],
  );

  const rothBalance = useMemo(
    () =>
      activeScenario.accounts
        .filter((a) => a.type === "roth_ira" || a.type === "roth_401k")
        .reduce((sum, a) => sum + a.currentBalance, 0),
    [activeScenario.accounts],
  );

  const taxableBalance = useMemo(
    () =>
      activeScenario.accounts
        .filter((a) => a.type === "taxable")
        .reduce((sum, a) => sum + a.currentBalance, 0),
    [activeScenario.accounts],
  );

  const hsaBalance = useMemo(
    () =>
      activeScenario.accounts
        .filter((a) => a.type === "hsa")
        .reduce((sum, a) => sum + a.currentBalance, 0),
    [activeScenario.accounts],
  );

  const preTaxPct = totalBalance > 0 ? preTaxBalance / totalBalance : 0;
  const rothPct = totalBalance > 0 ? rothBalance / totalBalance : 0;
  const taxablePct = totalBalance > 0 ? taxableBalance / totalBalance : 0;

  const isHeavilyPreTax = preTaxPct > 0.7 && totalBalance > 0;
  const hasGoodMix = preTaxPct < 0.7 && preTaxPct > 0 && rothBalance > 0 && totalBalance > 0;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Tax-Efficient Withdrawal Sequencing
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Most people spend decades accumulating wealth across several account types — a
          taxable brokerage here, a 401(k) there, maybe a Roth IRA and an HSA. Each bucket
          has different tax treatment. The question that determines tens of thousands of
          dollars in lifetime tax savings is: in what order do you draw them down?
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The conventional wisdom — spend taxable first, then traditional accounts, then
          Roth last — is a reasonable default but often the wrong answer for FIRE retirees.
          FIRE planners retire decades before Social Security and RMDs arrive, which creates
          a low-income window where smarter sequencing can permanently lower lifetime taxes.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This article covers the three-bucket framework, the bracket-fill strategy, capital
          gains harvesting in low-income years, and why the &ldquo;RMD tax bomb&rdquo; lurking in
          large traditional accounts is the biggest long-term sequencing risk most FIRE
          planners underestimate.
        </p>
      </section>

      {/* ── Section 1: The Three Buckets ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The three buckets: taxable, tax-deferred, tax-free
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Before sequencing, understand what you&apos;re working with. Every retirement account
          falls into one of three tax buckets, and each withdraws very differently:
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Taxable brokerage — &ldquo;already taxed&rdquo;
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You invested after-tax dollars, so only the <em>growth</em> is taxable at
                  withdrawal. Long-term capital gains (assets held 12+ months) are taxed at
                  0%, 15%, or 20% — well below ordinary income rates. At low income levels,
                  you can realize substantial gains at 0% federal tax.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-400">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Tax-deferred — traditional 401(k) and traditional IRA
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You got a deduction when you contributed. Every dollar withdrawn is ordinary
                  income — taxed at your marginal rate that year. Required Minimum Distributions
                  (RMDs) begin at age 73, forcing withdrawals whether you want them or not.
                  Large balances here are the source of the &ldquo;RMD tax bomb.&rdquo;
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Tax-free — Roth IRA, Roth 401(k), and HSA
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You paid taxes going in. Qualified withdrawals — contributions always, earnings
                  after age 59½ with a 5+ year account — come out completely tax-free. HSA
                  triple-tax-advantage: deductible contributions, tax-free growth, tax-free
                  withdrawal for qualified medical expenses at any age. No RMDs on Roth IRAs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Conventional vs. Optimal ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Conventional order vs. the FIRE retiree&apos;s playbook
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The standard advice is to spend taxable accounts first (letting tax-advantaged money
          compound longer), then draw down traditional accounts, and leave Roth until last as
          a tax-free inheritance or late-retirement buffer. For a 65-year-old who just retired,
          this is often reasonable.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          For a 45-year-old FIRE retiree, it can be a costly mistake.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              Conventional order
            </p>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              <li>Taxable brokerage (capital gains)</li>
              <li>Traditional IRA / 401(k) (ordinary income)</li>
              <li>Roth IRA / HSA (tax-free, last resort)</li>
            </ol>
            <div className="mt-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Leaves large traditional balances to compound and trigger high RMDs at 73.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.03)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ember)] mb-2">
              FIRE retiree playbook
            </p>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              <li>Taxable brokerage <em>and</em> bracket-fill from traditional IRA</li>
              <li>Roth for remaining spending needs</li>
              <li>Manage traditional balance down before RMDs</li>
            </ol>
            <div className="mt-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Harvests low tax rates during the early-retirement income valley.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Bracket Fill ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The bracket-fill strategy
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          In early retirement, your taxable income is often near zero — no salary, no Social
          Security yet, minimal dividends. The 10% and 12% federal brackets sit mostly
          empty. The bracket-fill strategy deliberately fills that space with traditional IRA
          withdrawals, paying ordinary income tax now at 10–12% rather than leaving the
          balance to be taxed at 22–37% once RMDs force it out.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Bracket</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Single (2025)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  MFJ (2025)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  rate: "10%",
                  single: "$0 – $11,925",
                  mfj: "$0 – $23,850",
                  action: "Free conversion / withdrawal space",
                  highlight: true,
                },
                {
                  rate: "12%",
                  single: "$11,925 – $48,475",
                  mfj: "$23,850 – $96,950",
                  action: "Fill with traditional IRA withdrawals",
                  highlight: true,
                },
                {
                  rate: "22%",
                  single: "$48,475 – $103,350",
                  mfj: "$96,950 – $206,700",
                  action: "Stop here — use Roth for the rest",
                  highlight: false,
                },
                {
                  rate: "24%+",
                  single: "$103,350+",
                  mfj: "$206,700+",
                  action: "Avoid if possible",
                  highlight: false,
                },
              ].map((row) => (
                <tr
                  key={row.rate}
                  className={[
                    "border-b border-border/40 last:border-0",
                    row.highlight ? "bg-[rgba(255,107,53,0.04)]" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {row.rate}
                    {row.highlight ? (
                      <span className="ml-2 rounded-full bg-[rgba(255,107,53,0.12)] px-1.5 py-0.5 text-[0.6rem] font-bold text-[var(--ember)] uppercase tracking-wide">
                        Target
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.single}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.mfj}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The standard deduction ($15,000 single / $30,000 MFJ in 2025) reduces your taxable
          income before brackets apply — which means you can withdraw up to $30,000 single or
          $60,000 MFJ from a traditional IRA at zero federal income tax by using the standard
          deduction as a shield. Everything above that fills the 10% bracket, then 12%, before
          you switch to Roth for the remainder of your spending needs.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            ACA MAGI ceiling
          </p>
          <p className="text-sm text-muted-foreground">
            If you&apos;re on an ACA marketplace plan before Medicare, your MAGI determines
            your subsidy eligibility. Traditional IRA withdrawals count as MAGI. Crossing 400%
            of the Federal Poverty Level (~$58,320 single in 2025) causes a cliff loss of all
            premium tax credits. Many early retirees deliberately cap traditional withdrawals
            to stay just under this threshold, even if the bracket would permit more.
          </p>
        </div>
      </section>

      {/* ── Section 4: Capital Gains Harvesting ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Capital gains harvesting at 0%
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          In years when your taxable income stays below ~$48,350 (single, 2025) or ~$96,700
          (MFJ), long-term capital gains are taxed at 0% federal. This creates an opportunity
          that most high-earning workers never access: selling appreciated taxable assets and
          realizing gains for free.
        </p>

        <div className="space-y-3">
          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Sell and re-buy to step up your cost basis
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sell a position at a gain, pay $0 federal tax on the gain, and immediately
                repurchase. Your cost basis resets to the current price, eliminating the
                embedded taxable gain permanently. This is &ldquo;gain harvesting&rdquo; — the mirror
                image of tax-loss harvesting. Note: no wash-sale rule applies to gains.
              </p>
            </div>
          </div>

          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Use taxable account spending to stay in the 0% zone
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                In a bracket-fill year, sell long-term appreciated shares from your taxable
                account to cover spending while traditional IRA withdrawals fill the 12% bracket.
                Both can happen in the same year as long as total taxable income stays under
                the 0% threshold for LTCG.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 mb-1">
              Watch: ordinary income stacks below capital gains
            </p>
            <p className="text-sm text-muted-foreground">
              The IRS applies capital gains rates to the &ldquo;top&rdquo; of your income, not
              independently. If you have $30K of ordinary income (traditional IRA withdrawal)
              and $20K of LTCG, only the $20K that sits above the threshold gets pushed into
              the 15% LTCG bracket. In 2025, that threshold is $48,350 (single), so the first
              $18,350 of gains would be at 0% and the remaining $1,650 at 15%. Plan accordingly.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 5: RMD Risk ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The RMD tax bomb: why traditional balances need active management
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Required Minimum Distributions begin at age 73. The IRS calculates your RMD each
          year by dividing your traditional account balance by a life expectancy factor — which
          means a $2M traditional IRA at age 73 generates roughly $77,000 of mandatory ordinary
          income, whether you need the money or not. Add Social Security (which also counts as
          income), and you could find yourself suddenly in the 22–24% bracket with no levers
          to pull.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Traditional IRA at 73
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Approx. RMD (÷26.5)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  + SS income: likely bracket
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { balance: "$500K", rmd: "~$19K", bracket: "10–12%", ok: true },
                { balance: "$1M", rmd: "~$38K", bracket: "12–22%", ok: true },
                { balance: "$1.5M", rmd: "~$57K", bracket: "22%+", ok: false },
                { balance: "$2M", rmd: "~$75K", bracket: "22–24%+", ok: false },
                { balance: "$3M+", rmd: "~$113K+", bracket: "24–32%", ok: false },
              ].map((row) => (
                <tr key={row.balance} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-mono text-sm tabular-nums text-foreground">
                    {row.balance}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{row.rmd}</td>
                  <td
                    className={`px-4 py-3 font-medium ${row.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                  >
                    {row.bracket}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The asymmetry is stark: every dollar of traditional IRA balance left to compound is a
          future RMD tax obligation. The bracket-fill strategy during the 55–72 window
          deliberately shrinks the traditional balance to keep future RMDs manageable. A FIRE
          retiree who retires at 50 and has 23 years of bracket-filling before RMDs start is in
          a dramatically better position than one who follows the &ldquo;let Roth compound&rdquo;
          conventional wisdom.
        </p>
      </section>

      {/* ── Section 6: Year-by-Year Example ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Year-by-year example: age 55 early retiree
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Consider an early retiree who retires at 55 with $1.5M — 70% in traditional IRA,
          20% Roth, 10% taxable brokerage — and needs $60K/year in spending. Here&apos;s
          the optimal sequence:
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Age</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Primary source
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Why</th>
              </tr>
            </thead>
            <tbody>
              {YEAR_BY_YEAR_EXAMPLE.map((row) => (
                <tr key={row.age} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3 font-mono text-sm tabular-nums text-foreground">
                    {row.age}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{row.source}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground font-mono text-xs">
                    {row.amount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          This sequence minimizes taxes during the low-income window, steadily reduces the
          traditional IRA balance before RMDs, and reserves Roth for tax-free gap-filling.
          The taxable account depletes first — as planned — since it has the shallowest
          tax advantage of the three buckets.
        </p>
      </section>

      {/* ── Section 7: Tax Comparison Chart ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Estimated lifetime taxes: three withdrawal sequences
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The chart below shows illustrative 10-year federal tax estimates for three
          withdrawal strategies applied to the same $1.5M portfolio ($60K/yr spending).
          The &ldquo;conventional&rdquo; strategy leaves the largest tax bill; bracket-filling
          cuts that significantly; pure Roth-first minimizes near-term taxes but leaves
          the traditional balance to compound into a larger future RMD problem.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">
            Estimated federal taxes paid over 10 years — illustrative
          </p>
          <ChartFrame ariaLabel="Bar chart comparing estimated 10-year federal taxes for three withdrawal sequences: conventional, bracket-fill, and Roth-first">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={TAX_SEQUENCE_DATA}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="strategy"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => [
                    `$${Number(value).toLocaleString()}`,
                    "Est. federal taxes",
                  ]}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="taxes"
                  radius={[4, 4, 0, 0]}
                  fill="var(--ember)"
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <p className="mt-2 text-xs text-muted-foreground">
            Illustrative only. Assumes single filer, $60K/yr spending, $1.5M portfolio (70%
            traditional / 20% Roth / 10% taxable). Conventional = taxable then traditional
            then Roth. Bracket-fill = traditional to 12% ceiling, Roth covers remainder.
            Roth-first = Roth then taxable then traditional. Actual taxes depend on your
            specific mix, state taxes, and income. Not financial advice.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The Roth-first caveat
          </p>
          <p className="text-sm text-muted-foreground">
            Roth-first has the lowest near-term tax bill, but it depletes your tax-free
            buffer while leaving the traditional balance compounding toward a larger RMD
            at 73. For a retiree with 18+ years before RMDs, this tradeoff is often
            unfavorable in the long run. The bracket-fill approach captures the best of
            both worlds: tax savings now <em>and</em> RMD management for later.
          </p>
        </div>
      </section>

      {/* ── Section 8: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <PersonalizedInsight
          title="Your account mix snapshot"
          hasData={hasData}
          emptyPrompt="Add your accounts in the Plan drawer to see your personalized withdrawal sequencing analysis."
        >
          {totalBalance > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Pre-tax (trad. IRA / 401k)</p>
                  <p className="mt-0.5 font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(preTaxBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(preTaxPct)} of portfolio
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Roth (+ HSA)</p>
                  <p className="mt-0.5 font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(rothBalance + hsaBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(rothPct)} of portfolio
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taxable brokerage</p>
                  <p className="mt-0.5 font-display text-xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(taxableBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(taxablePct)} of portfolio
                  </p>
                </div>
              </div>

              {isHeavilyPreTax ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400 mb-1">
                    RMD risk: heavily pre-tax portfolio
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Over {formatPercent(preTaxPct)} of your portfolio is in pre-tax accounts.
                    At {formatCompactCurrency(preTaxBalance)}, your future RMDs could push you
                    into the 22–24% bracket or higher even after Social Security. The Roth
                    conversion ladder is your primary tool — start converting during low-income
                    years to bring this balance down before age 73.
                  </p>
                </div>
              ) : hasGoodMix ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-400 mb-1">
                    Good diversification across tax buckets
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You have assets spread across pre-tax, Roth, and taxable — giving you
                    flexibility to implement bracket-filling and capital gains harvesting in
                    early retirement. Focus on the sequencing strategy: use taxable + traditional
                    up to the 12% ceiling, then Roth for the rest.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-sm text-muted-foreground">
                    Your current account mix gives you some flexibility. As you plan for
                    retirement, aim to build assets across all three buckets to maximize
                    sequencing options in retirement.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                No accounts are configured yet. Add your 401(k), IRA, Roth IRA, and brokerage
                accounts in the Plan drawer to see your personalized withdrawal sequence analysis.
              </p>
            </div>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Related Articles ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
          Related articles
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/education/roth-ladder"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The Roth Conversion Ladder
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Build a pipeline of tax-free income before 59½ — the mechanics, the
              five-year rule, and how to sequence conversions efficiently.
            </p>
          </Link>
          <Link
            href="/education/account-types"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Account Types Explained
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Deep-dive on 401(k), IRA, Roth, HSA, and taxable accounts — contribution
              limits, withdrawal rules, and when each makes sense.
            </p>
          </Link>
          <Link
            href="/education/aca-early-retirement"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              ACA and Early Retirement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How your MAGI determines ACA subsidies — and why income management is as
              important as investment returns for early retirees pre-Medicare.
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
              The research behind safe withdrawal rates and how to think about your FIRE
              number in the context of sequence-of-returns risk.
            </p>
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/withdrawal"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Model your withdrawal strategy &rarr;
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
