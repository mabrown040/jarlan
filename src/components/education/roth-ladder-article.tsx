"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PersonalizedInsight } from "./personalized-insight";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

const LADDER_ROWS = [
  { year: "2025", action: "Convert $40K from Traditional IRA", available: null },
  { year: "2026", action: "Convert $40K", available: null },
  { year: "2027", action: "Convert $40K", available: null },
  { year: "2028", action: "Convert $40K", available: null },
  { year: "2029", action: "Convert $40K", available: null },
  { year: "2030", action: "Convert $40K", available: "$40K (2025 tranche)" },
  { year: "2031", action: "Convert $40K", available: "$40K (2026 tranche)" },
  { year: "2032", action: "Ongoing", available: "$40K (2027 tranche)" },
];

export function RothLadderArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const taxInfo = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );

  const traditionalAccounts = useMemo(
    () =>
      activeScenario.accounts.filter(
        (a) => a.type === "traditional_401k" || a.type === "traditional_ira",
      ),
    [activeScenario.accounts],
  );

  const rothAccounts = useMemo(
    () =>
      activeScenario.accounts.filter(
        (a) => a.type === "roth_ira" || a.type === "roth_401k",
      ),
    [activeScenario.accounts],
  );

  const totalTraditionalBalance = useMemo(
    () => traditionalAccounts.reduce((sum, a) => sum + a.currentBalance, 0),
    [traditionalAccounts],
  );

  const hasTraditionalAccounts = traditionalAccounts.length > 0 && totalTraditionalBalance > 0;
  const hasRothAccounts = rothAccounts.length > 0;

  const yearsToConvert = useMemo(
    () => (totalTraditionalBalance > 0 ? Math.ceil(totalTraditionalBalance / 40_000) : 0),
    [totalTraditionalBalance],
  );

  const currentEffectiveRate = taxInfo.effectiveRate;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          The Roth Conversion Ladder: Tax-Free Income Before 59½
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          One of the biggest early retirement traps is this: you&apos;ve saved diligently in your
          401(k) and traditional IRA for years — and now you can&apos;t touch it without a 10%
          penalty until age 59½. If you retire at 45, that&apos;s 14 years of waiting, with your
          largest assets locked up and your portfolio doing the heavy lifting without you being
          able to reach the most tax-advantaged part of it.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The Roth conversion ladder solves this. It&apos;s a technique where you methodically
          convert funds from a traditional IRA to a Roth IRA each year, pay income tax on the
          converted amount now, wait the required five years, and then pull those converted funds
          out completely tax-free and penalty-free. Do it right and you build a &ldquo;ladder&rdquo;
          of tax-free income — a new rung becomes accessible each year — that funds your entire
          early retirement without any penalty.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The strategy is particularly powerful in early retirement because your income is often
          very low, which means conversions land in the 10% or 12% tax bracket instead of the
          22–32% bracket you faced during peak earning years. You pay taxes on your own schedule,
          at rates you control.
        </p>
      </section>

      {/* ── Section 1: How It Works ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How the ladder works, step by step
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The mechanics are straightforward, though the five-year waiting period is the key
          constraint that shapes the whole strategy. Here&apos;s the flow:
        </p>

        <div className="space-y-3">
          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-sm font-bold text-white">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Year 0 — Convert a tranche
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Move $X from your traditional IRA to your Roth IRA. This triggers a taxable event:
                you owe ordinary income tax on that $X in the year of conversion. No 10% penalty —
                just income tax. Choose an amount that keeps your total income within your target
                bracket.
              </p>
            </div>
          </div>

          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-sm font-bold text-[var(--ember)]">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Years 1–4 — Wait
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The five-year holding rule applies to each conversion independently. You must
                leave that specific tranche in the Roth IRA for five full years before withdrawing
                it penalty-free. Meanwhile, the money is growing tax-free inside the Roth — and
                you&apos;re converting another tranche each year.
              </p>
            </div>
          </div>

          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-sm font-bold text-[var(--ember)]">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Year 5 — Withdraw the first tranche
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pull the converted principal (not earnings) from your Roth IRA. It comes out
                completely tax-free and penalty-free — even if you&apos;re 47 years old. The IRS
                treats conversions as a separate category from regular Roth contributions, with
                its own five-year clock.
              </p>
            </div>
          </div>

          <div className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-sm font-bold text-[var(--ember)]">
              4
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Repeat every year — the ladder builds
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Each year you convert a new tranche and each year a five-year-old tranche matures
                and becomes accessible. Once the ladder is fully running, you have a continuous
                stream of tax-free income — one rung becomes available every twelve months.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400 mb-1">
            Important: only converted principal, not earnings
          </p>
          <p className="text-sm text-muted-foreground">
            You can withdraw the amount you converted, penalty-free, after five years. The
            earnings on those converted funds follow different rules — they are subject to taxes
            and the 10% penalty if withdrawn before age 59½. Plan your withdrawals to pull only
            the converted principal until you turn 59½.
          </p>
        </div>
      </section>

      {/* ── Section 2: Visual Ladder Table ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The ladder in action: an example
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Here&apos;s what $40,000/yr of conversions looks like across eight years. Notice how the
          first five years are pure setup — you&apos;re building rungs that don&apos;t yet exist.
          Starting in year six, a new rung becomes accessible each year and keeps flowing as long
          as you keep converting.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Year</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Available to Withdraw
                </th>
              </tr>
            </thead>
            <tbody>
              {LADDER_ROWS.map((row) => (
                <tr
                  key={row.year}
                  className={[
                    "border-b border-border/40 last:border-0",
                    row.available
                      ? "bg-emerald-500/5 dark:bg-emerald-500/5"
                      : "bg-card/20",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-4 py-3 font-mono text-sm tabular-nums text-foreground">
                    {row.year}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.action}</td>
                  <td className="px-4 py-3">
                    {row.available ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {row.available}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">Seasoning</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          The five-year gap is the critical planning constraint: you need another source of
          income or assets to cover living expenses during years one through five before the
          first rung of the ladder matures.
        </p>
      </section>

      {/* ── Section 3: The Tax Strategy ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The tax strategy: fill the lower brackets
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Roth ladder only works as well as the taxes you pay on conversion. If you convert
          at 32%, it&apos;s a bad deal. If you convert at 12%, it&apos;s excellent. The goal is
          to use early retirement — when your income drops — to accelerate conversions at the
          lowest possible rates.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Bracket</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Single Filer (2025)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Married Filing Jointly (2025)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { rate: "10%", single: "$0 – $11,925", mfj: "$0 – $23,850", highlight: true },
                { rate: "12%", single: "$11,925 – $48,475", mfj: "$23,850 – $96,950", highlight: true },
                { rate: "22%", single: "$48,475 – $103,350", mfj: "$96,950 – $206,700", highlight: false },
                { rate: "24%", single: "$103,350 – $197,300", mfj: "$206,700 – $394,600", highlight: false },
                { rate: "32%", single: "$197,300 – $250,525", mfj: "$394,600 – $501,050", highlight: false },
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The typical early retiree using the Roth ladder can often do $40,000–$60,000/yr of
          conversions while staying within the 12% bracket — paying just 12 cents on every dollar
          converted. Compare that to the 22–32% you likely paid on those same dollars when you
          earned them. You&apos;re essentially buying a tax arbitrage: money that went in at
          high rates comes out at low rates, and the earnings on it compound tax-free permanently.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The ACA subsidy constraint
          </p>
          <p className="text-sm text-muted-foreground">
            Roth conversions count as income for ACA subsidy eligibility. If your Modified Adjusted
            Gross Income exceeds 400% of the Federal Poverty Level — approximately{" "}
            <strong className="text-foreground">$58,320 for a single person in 2025</strong> —
            you lose ACA premium tax credits entirely. For early retirees relying on ACA
            marketplace plans before Medicare, this is a real ceiling that limits how much you
            can convert in any single year. Many early retirees deliberately stay just under the
            400% FPL mark to preserve subsidies, even if it means stretching the conversion over
            more years.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Standard deduction as a free conversion
          </p>
          <p className="text-sm text-muted-foreground">
            Don&apos;t forget the standard deduction: in 2025, it&apos;s $15,000 for single
            filers and $30,000 for married filing jointly. If your other income is zero or near
            zero, you can convert up to the standard deduction amount with zero federal income
            tax. That&apos;s effectively a free conversion — you&apos;ve already paid for the
            deduction through your working years.
          </p>
        </div>
      </section>

      {/* ── Section 4: Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <PersonalizedInsight
          title="Your traditional account snapshot"
          hasData={hasData}
          emptyPrompt="Add your 401(k) and IRA accounts in the Plan drawer to see personalized Roth ladder projections."
        >
          {hasTraditionalAccounts ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Total traditional balance</p>
                  <p className="mt-0.5 font-display text-2xl tracking-[-0.03em] text-foreground">
                    {formatCompactCurrency(totalTraditionalBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    across {traditionalAccounts.length}{" "}
                    {traditionalAccounts.length === 1 ? "account" : "accounts"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">At $40K/yr conversions</p>
                  <p className="mt-0.5 font-display text-2xl tracking-[-0.03em] text-foreground">
                    {yearsToConvert} years
                  </p>
                  <p className="text-xs text-muted-foreground">to convert fully</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                  Your accounts
                </p>
                <div className="space-y-1.5">
                  {traditionalAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
                          {account.type === "traditional_401k" ? "401(k)" : "IRA"}
                        </span>
                        <span className="text-sm text-foreground">{account.name}</span>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-foreground">
                        {formatCompactCurrency(account.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Tax rate comparison
                </p>
                <p className="text-sm text-muted-foreground">
                  Your current effective tax rate is{" "}
                  <strong className="text-foreground">
                    {formatPercent(currentEffectiveRate, 1)}
                  </strong>
                  . In early retirement with no earned income, Roth conversions up to $48,475
                  (single) land in the{" "}
                  <strong className="text-[var(--ember)]">12% bracket</strong> — potentially
                  saving{" "}
                  <strong className="text-foreground">
                    {formatPercent(Math.max(0, currentEffectiveRate - 0.12), 1)}
                  </strong>{" "}
                  per dollar converted compared to your working-years rate.
                </p>
              </div>

              {hasRothAccounts ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-400 mb-1">
                    You already have a Roth IRA
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Conversions from your traditional accounts will flow into your existing Roth
                    IRA. Note that the five-year clock for <em>conversion</em> access runs
                    separately from the five-year clock for the Roth IRA account itself.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-600 dark:text-amber-400 mb-1">
                    Open a Roth IRA now
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You don&apos;t have a Roth IRA configured yet. Opening one now — even with $0
                    — starts the five-year account clock immediately and gives you a destination
                    for future conversions. Add it in the Plan drawer.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                You don&apos;t have traditional 401(k) or IRA accounts configured. The Roth
                conversion ladder is most valuable when you have significant pre-tax savings to
                convert.
              </p>
              <p className="text-sm text-muted-foreground">
                Add your accounts in the Plan drawer. If you only have Roth accounts or taxable
                accounts, you may not need this strategy — though a taxable account bridge is
                still required to cover the five-year seasoning window.
              </p>
            </div>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Section 5: What You Need ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          What you need to make this work
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Roth ladder isn&apos;t complicated, but it requires some planning — particularly
          for the five-year bridge period and the sequencing of account types.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-xs font-bold text-white">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  A traditional 401(k) or traditional IRA to convert from
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The source funds. If you have both a 401(k) from a current or former employer
                  and a traditional IRA, roll the 401(k) into a traditional IRA first to
                  simplify the conversion process. Most IRA custodians make Roth conversions
                  straightforward — it&apos;s typically a single online transaction.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-xs font-bold text-[var(--ember)]">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  A Roth IRA to convert into — open one now
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conversions go into a Roth IRA. Open one immediately if you don&apos;t have one
                  — even if you put nothing in it. The five-year rule for Roth IRA distributions
                  of earnings runs from when the account was first opened. Starting the clock early
                  gives you more flexibility later. There is no income limit on conversions (only
                  on direct Roth contributions).
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-xs font-bold text-[var(--ember)]">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Taxable brokerage account or cash reserves for the first five years
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is the most critical planning requirement. You need income or assets to
                  live on during the five-year seasoning window before the first rung of the
                  ladder matures. Options include: a taxable brokerage account (capital gains
                  taxed at 0% for incomes up to ~$48K single in 2025), Roth IRA contributions
                  you already made (always withdrawable penalty-free), cash reserves, or part-time
                  income. Without a bridge, the ladder doesn&apos;t work.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-xs font-bold text-[var(--ember)]">
                4
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Low taxable income during the conversion years
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The ladder is most efficient when your income is low — ideally in early
                  retirement, before Social Security and before Required Minimum Distributions
                  begin at 73. That window, often called the &ldquo;Roth conversion sweet
                  spot,&rdquo; is when you can move the most money at the lowest tax cost.
                  Earned income, rental income, or large capital gain realizations all count
                  against your available bracket space for conversions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: 72(t) Alternative ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The 72(t) SEPP: an alternative worth knowing
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Roth ladder isn&apos;t the only way to access retirement funds early. Section 72(t)
          of the tax code allows Substantially Equal Periodic Payments (SEPP) — a method to
          withdraw from traditional retirement accounts before 59½ without the 10% penalty, by
          committing to a fixed payment schedule calculated by IRS formula.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ember)] mb-2">
              Roth ladder
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>Highly flexible — adjust conversion amounts each year</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>Only pay tax on what you convert, when you want</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>Withdrawn principal is tax-free after 5 years</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500 flex-shrink-0">△</span>
                <span>Requires five-year bridge period</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              72(t) SEPP
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>No five-year waiting period — income starts immediately</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500 flex-shrink-0">✓</span>
                <span>Works directly from traditional accounts without conversion</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 flex-shrink-0">✗</span>
                <span>Locked in for 5 years or until 59½ — whichever is longer</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-500 flex-shrink-0">✗</span>
                <span>Modification triggers 10% penalty retroactively on all payments</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          For most early retirees with a long runway before 59½, the Roth ladder is the better
          tool precisely because it&apos;s flexible. Life changes — expenses vary, investment
          returns surprise you, income opportunities emerge. A 72(t) commitment lasts years and
          penalizes you severely for any modification. The Roth ladder puts you in control.
        </p>
      </section>

      {/* ── Section 7: Putting It Together ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Putting it all together: the early retirement tax stack
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Roth ladder doesn&apos;t exist in isolation — it&apos;s one piece of a broader
          tax-efficient early retirement strategy. Here&apos;s how the different components
          typically layer together:
        </p>

        <div className="space-y-2">
          {[
            {
              phase: "Ages 45–50 (Bridge years)",
              source: "Taxable brokerage account",
              notes:
                "Long-term capital gains taxed at 0% for lower incomes. Harvest losses to offset gains. No penalty, no lock-in.",
            },
            {
              phase: "Simultaneously",
              source: "Roth conversion ladder",
              notes:
                "Convert traditional IRA funds each year within the 12% bracket. Pay tax now at low rates. Funds season for five years.",
            },
            {
              phase: "Ages 50+ (Ladder matures)",
              source: "Roth conversions — first tranches accessible",
              notes:
                "Pull converted principal penalty-free. Continue converting new tranches. Coordinate with ACA income thresholds.",
            },
            {
              phase: "Age 59½+",
              source: "All retirement accounts penalty-free",
              notes:
                "The 10% penalty disappears. Roth earnings now accessible. Traditional accounts withdrawable (taxable as ordinary income).",
            },
            {
              phase: "Age 70+",
              source: "Social Security begins",
              notes:
                "Claiming at 70 maximizes monthly benefit. Reduces portfolio drawdown rate. Coordinate with Roth conversions — SS + conversions together affect bracket utilization.",
            },
          ].map((row) => (
            <div
              key={row.phase}
              className="rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex-shrink-0 sm:w-40">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
                    {row.phase}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{row.source}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{row.notes}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 8: Common Mistakes ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Common mistakes to avoid
        </h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              Waiting too long to start converting
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every year you don&apos;t convert is a year the traditional IRA grows larger,
              future RMDs increase, and your tax bill in your 70s grows with it. The best time
              to start the ladder is as soon as you have low taxable income — typically the
              first year of retirement.
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              Converting too much and crossing into a higher bracket
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The marginal rates jump sharply from 12% to 22% at $48,475 (single) and $96,950
              (MFJ). If you accidentally push $10,000 over the bracket ceiling, that $10,000
              is taxed at 22% instead of 12% — a costly overshoot. Run the numbers carefully
              each year, accounting for any other income sources.
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              Forgetting the ACA subsidy cliff
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you&apos;re on an ACA marketplace plan, crossing 400% FPL ($58,320 for single
              in 2025) means losing all premium tax credits — which can cost $5,000–$15,000 or
              more per year depending on plan costs in your area. Factor this hard ceiling into
              your conversion math.
            </p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-semibold text-foreground">
              Withdrawing earnings before 59½
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The penalty exemption applies to converted principal only. If the converted funds
              have grown inside the Roth, those earnings are still subject to the 10% penalty
              (and income tax) if withdrawn before 59½. Keep careful records of your conversion
              amounts and don&apos;t withdraw more than the converted principal until you turn 59½.
            </p>
          </div>
        </div>
      </section>

      {/* ── Related Articles ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
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
              How much you need to retire — the research behind safe withdrawal rates and how
              to stress-test your number.
            </p>
          </Link>
          <Link
            href="/education/social-security-timing"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Social Security Timing
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Coordinate your SS claiming age with your conversion window — delaying SS extends
              your low-income conversion years.
            </p>
          </Link>
          <Link
            href="/education/savings-rate"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Savings Rate vs. Time to FI
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The savings rate that gets you to early retirement fast enough to take full
              advantage of Roth conversion years.
            </p>
          </Link>
          <Link
            href="/education/withdrawal-strategies"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Withdrawal Strategies
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How to draw from multiple account types in the most tax-efficient order across
              your entire retirement.
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
            Model your tax strategy &rarr;
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
