"use client";

import { useMemo } from "react";
import Link from "next/link";

import { PersonalizedInsight } from "./personalized-insight";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { getCurrentPortfolioBalance } from "@/lib/calc";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

const prioritySteps = [
  {
    rank: 1,
    title: "Employer 401(k) match",
    detail:
      "Always capture the full employer match first, no exceptions. A 50% or 100% employer match is an instant guaranteed return that no investment can beat. Leaving this on the table is equivalent to turning down part of your salary.",
  },
  {
    rank: 2,
    title: "HSA to max",
    detail:
      "If you have a high-deductible health plan (HDHP), the HSA is the single best account in the US tax code. The triple tax advantage — pre-tax contribution, tax-free growth, tax-free withdrawal for medical — is unmatched. Contribution limits for 2025: $4,300 single, $8,550 family.",
  },
  {
    rank: 3,
    title: "Roth IRA to max",
    detail:
      "Especially powerful if you expect to be in a higher tax bracket in retirement, if you're young, or if you plan to retire early. Roth withdrawals don't count as income for ACA subsidy calculations and don't trigger Medicare IRMAA surcharges. 2025 limit: $7,000 ($8,000 if 50+). Phases out at higher incomes.",
  },
  {
    rank: 4,
    title: "Traditional 401(k) to max",
    detail:
      "The pre-tax deduction is most valuable when your marginal rate is high — 22% or above. In early retirement, when your income drops, you can do Roth conversions at lower rates. 2025 limit: $23,500 ($31,000 if 50+).",
  },
  {
    rank: 5,
    title: "Mega backdoor Roth",
    detail:
      "If your 401(k) plan allows after-tax contributions (beyond the standard $23,500), you can contribute up to the total limit (~$70,000 combined in 2025) and convert those after-tax dollars to Roth in-plan or via rollover. Not all employers offer this — check your plan documents.",
  },
  {
    rank: 6,
    title: "Taxable brokerage",
    detail:
      "No contribution limit and no withdrawal restrictions. You'll owe capital gains tax on gains, but long-term capital gains rates (0%, 15%, or 20%) are often much lower than ordinary income rates. Essential for FIRE savers who need access to funds before 59½ without penalties.",
  },
];

const rothVsTraditionalRows = [
  {
    situation: "Young / low income now",
    choice: "Roth",
    reason:
      "You're paying taxes at today's lower rate. Tax-free compounding over decades is extremely valuable when you have time.",
  },
  {
    situation: "High income now (22%+ bracket)",
    choice: "Traditional",
    reason:
      "The deduction saves you at 22-37% now. In retirement you'll likely withdraw at 12-22%, capturing the spread.",
  },
  {
    situation: "Early retiree, pre-Medicare",
    choice: "Roth critical",
    reason:
      "Roth withdrawals don't count as MAGI for ACA premium subsidies. Every dollar of traditional withdrawal may cost you hundreds in lost subsidies.",
  },
  {
    situation: "High earner building toward FIRE",
    choice: "Traditional now → Roth ladder in retirement",
    reason:
      "Maximize deduction during high-earning years. In low-income early retirement, convert traditional to Roth annually at low marginal rates.",
  },
];

export function AccountTypesArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const buckets = useMemo(() => {
    const accounts = activeScenario.accounts ?? [];
    const rothAccounts = accounts.filter(
      (a) => a.type === "roth_ira" || a.type === "roth_401k",
    );
    const hsaAccounts = accounts.filter((a) => a.type === "hsa");
    const taxableAccounts = accounts.filter((a) => a.type === "taxable");
    const tradIraAccounts = accounts.filter(
      (a) => a.type === "traditional_ira" || a.type === "traditional_401k",
    );

    const totalBalance = getCurrentPortfolioBalance(accounts);
    const rothBalance = rothAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const tradBalance = tradIraAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const hsaBalance = hsaAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const taxableBalance = taxableAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

    const rothPct = totalBalance > 0 ? rothBalance / totalBalance : 0;
    const tradPct = totalBalance > 0 ? tradBalance / totalBalance : 0;
    const taxablePct = totalBalance > 0 ? taxableBalance / totalBalance : 0;

    return {
      totalBalance,
      rothBalance,
      tradBalance,
      hsaBalance,
      taxableBalance,
      rothPct,
      tradPct,
      taxablePct,
      hasHsa: hsaAccounts.length > 0,
      hasOnlyTrad: tradBalance > 0 && rothBalance === 0,
    };
  }, [activeScenario]);

  return (
    <div className="space-y-10 pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          401(k), Roth IRA, and HSA: Which account should you use?
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Tax treatment, contribution limits, and the right order to fill them
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Three types of accounts hold most Americans&apos; retirement savings — the traditional
          401(k), the Roth IRA, and the Health Savings Account. Each taxes your money
          differently: one taxes you now, one taxes you later, and one (the HSA) might not
          tax you at all. Knowing which to fill first — and how much — is one of the
          highest-leverage financial decisions you can make.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Get the order right and you shave years off your timeline. Get it wrong and you
          pay tens of thousands more in taxes over your lifetime — not because you invested
          in the wrong things, but because you put them in the wrong containers.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your account mix" hasData={hasData}>
          <div className="space-y-3 text-sm leading-relaxed">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Pre-tax (401k/IRA)</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatCompactCurrency(buckets.tradBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(buckets.tradPct, 0)} of total
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Roth</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatCompactCurrency(buckets.rothBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(buckets.rothPct, 0)} of total
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">HSA</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatCompactCurrency(buckets.hsaBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {buckets.hasHsa ? "Triple-advantaged" : "Not configured"}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">Taxable</p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {formatCompactCurrency(buckets.taxableBalance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(buckets.taxablePct, 0)} of total
                </p>
              </div>
            </div>

            {buckets.hasHsa ? (
              <p className="text-foreground">
                You have an HSA configured. Make sure you&apos;re tracking medical receipts —
                you can pay out of pocket now and reimburse yourself from the HSA years or
                decades later, tax-free, while the balance compounds.
              </p>
            ) : (
              <p className="text-foreground">
                You don&apos;t have an HSA configured. If you&apos;re enrolled in a
                high-deductible health plan (HDHP), adding one is often the
                highest-priority account to fill after your employer match. It&apos;s the only
                account with a triple tax advantage.
              </p>
            )}

            {buckets.hasOnlyTrad && (
              <p className="text-muted-foreground">
                Your portfolio is 100% pre-tax. In early retirement, when your income
                drops, you&apos;ll have an opportunity to do Roth conversions at low marginal
                rates — effectively filling the 0% and 10% brackets with money that would
                otherwise be taxed at 22%+ during your high-earning years.
              </p>
            )}
          </div>
        </PersonalizedInsight>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The three accounts side by side
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The key difference is when you pay tax: traditional accounts defer taxes to
          withdrawal, Roth accounts pay taxes upfront and let growth compound tax-free, and
          HSAs avoid taxes at every step when used for medical expenses.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Traditional 401(k)</th>
                <th className="px-4 py-3 font-medium">Roth IRA</th>
                <th className="px-4 py-3 font-medium">HSA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">
                  2025 contribution limit
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  $23,500 ($31,000 if 50+)
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  $7,000 ($8,000 if 50+)
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  $4,300 single / $8,550 family
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">
                  Tax on contribution
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Pre-tax — reduces taxable income now
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  After-tax — no deduction
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Pre-tax — reduces taxable income now
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">Tax on growth</td>
                <td className="px-4 py-3 text-muted-foreground">Tax-deferred</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                  Tax-free
                </td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                  Tax-free
                </td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">
                  Tax on withdrawal
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Ordinary income tax
                </td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                  Tax-free (after 59½ + 5yr rule)
                </td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">
                  Tax-free for medical
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">RMDs at 73</td>
                <td className="px-4 py-3 text-rose-600 dark:text-rose-400">Yes</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">No</td>
                <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">No</td>
              </tr>
              <tr className="bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">
                  Early withdrawal penalty
                </td>
                <td className="px-4 py-3 text-muted-foreground">10% before 59½</td>
                <td className="px-4 py-3 text-muted-foreground">
                  10% on earnings only (principal is free)
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  20% for non-medical before 65
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">Income limit</td>
                <td className="px-4 py-3 text-muted-foreground">
                  None (employer plan)
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Phases out ~$150K–$165K single, ~$236K–$246K MFJ
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Must have qualifying HDHP
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The HSA&apos;s triple advantage
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Every other tax-advantaged account has two advantages — either a deduction plus
          tax-deferred growth, or after-tax contributions plus tax-free growth. The HSA is
          the only account that can deliver all three: pre-tax contributions, tax-free
          growth, and tax-free withdrawals.
        </p>
        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              1. Contributions are pre-tax
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              HSA contributions reduce your taxable income dollar-for-dollar, just like a
              traditional 401(k). If you contribute $4,300 and you&apos;re in the 22% bracket,
              that&apos;s $946 in immediate tax savings — before your money has earned a single
              dollar of return.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">2. Growth is tax-free</p>
            <p className="mt-2 text-sm text-muted-foreground">
              HSA balances can be invested in index funds and grow without any capital gains
              tax, dividends tax, or year-end distributions. Over 20 years, a maxed HSA can
              grow to $200,000+ in a total market index fund — all of it tax-free.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              3. Withdrawals are tax-free for medical
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Any qualified medical expense — doctor visits, prescriptions, dental, vision,
              Medicare premiums after 65 — can be reimbursed from an HSA tax-free. After 65,
              non-medical withdrawals are simply taxed as ordinary income, like a traditional
              IRA, with no additional penalty.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-4">
            <p className="text-sm font-semibold text-foreground">
              The FIRE strategy: receipt arbitrage
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              There is no time limit on HSA reimbursements. Pay medical bills out of pocket
              today, save every receipt, and reimburse yourself from the HSA 10 or 20 years
              later — after the HSA balance has compounded tax-free. A $200 doctor visit
              today, left to grow at 7% real for 20 years, becomes $774. You receive
              $774 tax-free in retirement for a medical expense you already paid.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The right order to fill accounts
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The order matters because each account type has different tax treatment, and
          filling them in the wrong sequence leaves money on the table. This is the
          consensus priority order from decades of personal finance research:
        </p>
        <div className="space-y-3">
          {prioritySteps.map((step) => (
            <div
              key={step.rank}
              className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-sm font-bold text-white">
                {step.rank}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          These priorities assume you&apos;re working toward FIRE and have flexibility in your
          income. If you&apos;re above the Roth IRA income limit, use the backdoor Roth
          strategy — contribute to a non-deductible traditional IRA, then immediately
          convert to Roth.
        </p>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Roth vs Traditional: when to use which
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The decision between Roth and traditional contributions is fundamentally a tax
          rate arbitrage question: are your taxes higher now or in retirement? Get this
          right and you can save tens of thousands in taxes over a working lifetime.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Your situation</th>
                <th className="px-4 py-3 font-medium">Best choice</th>
                <th className="px-4 py-3 font-medium">Reasoning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rothVsTraditionalRows.map((row) => (
                <tr key={row.situation}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.situation}
                  </td>
                  <td className="px-4 py-3 text-[var(--ember)] font-medium">
                    {row.choice}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-sm font-semibold text-foreground">
            The Roth conversion ladder for early retirees
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Many FIRE savers use traditional 401(k) during high-earning years (capturing
            the 22-37% deduction), then retire early and spend low-income years doing Roth
            conversions in the 0-12% brackets. After five years, those converted dollars
            can be withdrawn tax-free. This is the most tax-efficient path for most
            high-income FIRE savers — but it requires careful planning to ensure you have
            enough accessible funds during the five-year conversion window.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
          Related topics
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/education/roth-ladder"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The Roth conversion ladder
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How to access traditional 401(k) funds before 59½ without penalties.
            </p>
          </Link>
          <Link
            href="/education/aca-early-retirement"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              ACA subsidies in early retirement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Why Roth income doesn&apos;t count toward ACA MAGI and how to plan around it.
            </p>
          </Link>
          <Link
            href="/education/the-4-percent-rule"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              The 4% rule
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              What it is, where it came from, and when to use a lower rate.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tax-strategy"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Model your tax strategy →
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
