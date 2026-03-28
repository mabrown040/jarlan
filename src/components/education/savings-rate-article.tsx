"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { buildSavingsRateTableRows } from "@/lib/calc/savings-rate-table";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { getCurrentPortfolioBalance, getSavingsRate } from "@/lib/calc";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";
import { US_BENCHMARKS } from "@/lib/data/benchmarks";
import { PersonalizedInsight } from "./personalized-insight";
import { cn } from "@/lib/utils";

export function SavingsRateArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  const taxInfo = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );

  const currentBalance = getCurrentPortfolioBalance(activeScenario.accounts);
  const userSavingsRate = hasData ? taxInfo.afterTaxSavingsRate : 0;

  const tableRows = useMemo(
    () =>
      buildSavingsRateTableRows(
        taxInfo.takeHome,
        activeScenario.assumptions.withdrawalRate,
        activeScenario.assumptions.expectedRealReturn - (activeScenario.simulationSettings?.feeDrag ?? 0.001),
        currentBalance,
      ),
    [activeScenario, taxInfo, currentBalance],
  );

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          How savings rate determines your timeline
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          When it comes to reaching financial independence, your savings rate is the single most
          powerful variable you control. Not your investment returns. Not your income. Your savings
          rate — the percentage of your take-home pay that you invest instead of spend.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The relationship is exponential, not linear. Saving 10% more doesn&apos;t just shave a few
          years off — it fundamentally reshapes your timeline because every dollar saved has a
          double effect: it increases your invested capital AND permanently reduces the amount
          you need to live on.
        </p>
      </section>

      {/* Personalized callout */}
      <section className="mx-auto max-w-3xl px-6">
        <PersonalizedInsight title="Your numbers" hasData={hasData}>
          <p className="text-sm leading-relaxed text-foreground">
            With a take-home of <strong>{formatCompactCurrency(taxInfo.takeHome)}/yr</strong> and
            spending of <strong>{formatCompactCurrency(activeScenario.annualExpenses)}/yr</strong>,
            your after-tax savings rate is{" "}
            <strong className="text-[var(--ember)]">{formatPercent(userSavingsRate, 1)}</strong>.
            {userSavingsRate > 0.5
              ? " That puts you in aggressive FIRE territory — most people reaching FI in under 15 years save at this level."
              : userSavingsRate > 0.3
                ? " That's well above the national average of 4.6% — you're making serious progress."
                : userSavingsRate > 0.15
                  ? " You're above the national average, but there's significant room to accelerate."
                  : " Every percentage point you increase has an outsized impact on your timeline."}
          </p>
        </PersonalizedInsight>
      </section>

      {/* The Table */}
      <section className="mx-auto max-w-4xl px-6">
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
            {hasData ? "Your savings rate vs. time to FI" : "Savings rate vs. time to FI"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasData
              ? `Based on ${formatCompactCurrency(taxInfo.takeHome)} take-home, ${formatPercent(activeScenario.assumptions.withdrawalRate, 0)} withdrawal rate, ${formatPercent(activeScenario.assumptions.expectedRealReturn, 0)} real return, and ${formatCompactCurrency(currentBalance)} already saved.`
              : "Take the quiz to see this table with your personal numbers."}
          </p>

          {tableRows.length > 0 ? (() => {
            // Find the single closest row to the user's savings rate
            const closestIdx = hasData
              ? tableRows.reduce((bestIdx, row, i) =>
                  Math.abs(row.rate - userSavingsRate) < Math.abs(tableRows[bestIdx].rate - userSavingsRate) ? i : bestIdx, 0)
              : -1;

            return (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">After-tax rate</th>
                    <th className="pb-3 pr-4 text-right font-medium">Spending</th>
                    <th className="pb-3 pr-4 text-right font-medium">FIRE #</th>
                    <th className="pb-3 pr-4 text-right font-medium">Years</th>
                    <th className="pb-3 text-right font-medium">FIRE date</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, rowIdx) => {
                    const isUser = rowIdx === closestIdx;
                    const isUsAvg = Math.abs(row.rate - US_BENCHMARKS.savingsRate) < 0.005;
                    const yrs = row.yearsToFi ?? 999;
                    const fireYear = currentYear + Math.ceil(yrs);
                    const fireAge = hasData
                      ? activeScenario.profile.age + Math.ceil(yrs)
                      : null;

                    return (
                      <tr
                        key={row.rate}
                        className={cn(
                          "border-t border-border/40",
                          isUser && "bg-[rgba(255,107,53,0.06)]",
                        )}
                      >
                        <td className="py-2.5 pr-4 tabular-nums font-medium">
                          {formatPercent(row.rate, 0)}
                          {isUser && (
                            <span className="ml-2 text-xs font-bold text-[var(--ember)]">
                              ← YOU
                            </span>
                          )}
                          {isUsAvg && !isUser && (
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                              US avg
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                          {formatCompactCurrency(row.annualExpenses)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                          {formatCompactCurrency(row.fireNumber)}
                        </td>
                        <td className={cn(
                          "py-2.5 pr-4 text-right tabular-nums font-bold",
                          yrs <= 10 ? "text-emerald-600" :
                          yrs <= 20 ? "text-foreground" :
                          "text-muted-foreground",
                        )}>
                          {yrs > 99 ? "50+" : `${yrs.toFixed(1)} yrs`}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {yrs > 99
                            ? "—"
                            : fireAge
                              ? `${fireYear} (age ${fireAge})`
                              : `${fireYear}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
          })() : (
            <div className="mt-4 rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Enter your income to see personalized savings rate data.
              </p>
              <Link
                href="/quiz"
                className="mt-2 inline-flex text-sm font-medium text-[var(--ember)] hover:underline"
              >
                Take the quiz →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Key takeaways
        </h2>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Cutting spending is more powerful than increasing income
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Every dollar you stop spending has a double effect: it increases how much you save
              AND permanently reduces how much your portfolio needs to generate. A $500/month
              spending cut is worth more than a $500/month raise.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              The curve is steepest at the extremes
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Going from a 10% to 20% savings rate saves ~15 years. Going from 60% to 70%
              saves ~3.5 years. The biggest gains come from the first big jump in savings rate.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Your starting balance matters less than you think
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              At a 50% savings rate, having $0 vs $200K saved changes your timeline by only ~3-4
              years. The compounding of your ongoing savings overwhelms the head start over a
              long enough period.
            </p>
          </div>
        </div>
      </section>

      {/* CTA to What-if */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/accumulation?tab=whatif"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Try different savings rates →
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
