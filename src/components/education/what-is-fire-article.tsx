"use client";

import Link from "next/link";

import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import {
  calculateFireNumber,
  formatCompactCurrency,
  formatPercent,
} from "@/lib/calc";

/**
 * The "Start here" primer. Linked from the top of the Learn index,
 * from the home page, and from the quiz completion screen.
 *
 * Scope choices:
 * - Explain the acronym, the one idea, and the three numbers that
 *   matter (FIRE number, savings rate, years to FI). Anything deeper
 *   belongs in its own article; this is a *primer*.
 * - State the calculator's stance on Lean/Fat explicitly — they're
 *   socioeconomic labels, not math, and the calculator won't
 *   prescribe them.
 * - End with a clear "what to read next" path so users have a
 *   learning sequence instead of a dumping ground.
 */
export function WhatIsFireArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const annualExpenses = activeScenario.annualExpenses;
  const withdrawalRate = activeScenario.assumptions.withdrawalRate;
  const personalFireNumber =
    hasData && annualExpenses > 0 && withdrawalRate > 0
      ? calculateFireNumber(annualExpenses, withdrawalRate)
      : null;

  return (
    <div className="space-y-10 pb-12">
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Start here
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          What is FIRE?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          <strong className="text-foreground">FIRE</strong> stands for{" "}
          <strong className="text-foreground">
            Financial Independence, Retire Early
          </strong>
          . It&rsquo;s both an idea and a community — a way to think about
          money that treats your portfolio as a source of income so work
          becomes optional, not required.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The one idea
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          When your investments generate enough income to cover your annual
          expenses, you&rsquo;ve reached financial independence. Whether you
          keep working, slow down, or fully retire is up to you — the math
          has bought you the choice.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          &ldquo;Enough&rdquo; is the load-bearing word. A widely-cited
          rule of thumb — the <Link href="/education/the-4-percent-rule" className="underline hover:text-foreground">4% rule</Link> — says
          that a diversified portfolio can sustainably produce income equal
          to about 4% of its value each year. That means a portfolio{" "}
          <strong className="text-foreground">25 times your annual expenses</strong>{" "}
          is roughly the size you need. Research and real-world conditions
          move that number around (valuations, inflation, sequence of
          returns), but the logic is the same: your portfolio&rsquo;s
          durable income has to cover how you live.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Three numbers that matter
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
              1 · Your FIRE number
            </p>
            <p className="mt-2 text-base leading-snug text-foreground">
              The portfolio size that makes your current expenses sustainable
              — roughly 25× your annual spending at a 4% withdrawal rate.
            </p>
            <Link
              href="/education/fire-number"
              className="mt-3 block text-xs font-medium text-[var(--ember)] hover:underline"
            >
              How it&rsquo;s calculated &rarr;
            </Link>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
              2 · Your savings rate
            </p>
            <p className="mt-2 text-base leading-snug text-foreground">
              What fraction of your take-home pay gets invested each year.
              Savings rate — not income — is what drives how fast FI
              arrives.
            </p>
            <Link
              href="/education/savings-rate"
              className="mt-3 block text-xs font-medium text-[var(--ember)] hover:underline"
            >
              Why it matters most &rarr;
            </Link>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
              3 · Years to FI
            </p>
            <p className="mt-2 text-base leading-snug text-foreground">
              The output. Given your current portfolio, savings rate, and a
              reasonable return assumption, how long until the math works?
              Shorter is a lever, not a race.
            </p>
            <Link
              href="/withdrawal"
              className="mt-3 block text-xs font-medium text-[var(--ember)] hover:underline"
            >
              Stress-test the result &rarr;
            </Link>
          </div>
        </div>
        {personalFireNumber !== null ? (
          <p className="mt-4 rounded-xl bg-[rgba(255,107,53,0.07)] px-4 py-3 text-sm font-medium text-[var(--ember)]">
            Right now your plan says: expenses{" "}
            {formatCompactCurrency(annualExpenses)}/yr at a{" "}
            {formatPercent(withdrawalRate, 1)} withdrawal rate = FIRE
            number of{" "}
            <strong>{formatCompactCurrency(personalFireNumber)}</strong>.
          </p>
        ) : null}
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          About &ldquo;Lean&rdquo; and &ldquo;Fat&rdquo; FIRE
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The FIRE community uses &ldquo;Lean FIRE&rdquo; and &ldquo;Fat
          FIRE&rdquo; as shorthand for retiring on a smaller or more
          generous spending level. They&rsquo;re popular terms, but they
          hide something important:{" "}
          <strong className="text-foreground">
            what counts as &ldquo;lean&rdquo; or &ldquo;fat&rdquo; depends
            entirely on who you are and where you live
          </strong>
          . $40K/yr is spartan in San Francisco and comfortable in rural
          Mississippi. $150K/yr is affluent by US medians and modest by the
          lifestyle of a dual-income professional in Manhattan.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This calculator refuses to pigeon-hole you into those buckets. You
          set your retirement expenses directly; the math meets you at
          whatever number feels right for your life. If the community
          vocabulary helps you talk about it, the{" "}
          <Link href="/education/lean-fire" className="underline hover:text-foreground">
            Lean FIRE
          </Link>{" "}
          and{" "}
          <Link href="/education/fat-fire" className="underline hover:text-foreground">
            Fat FIRE
          </Link>{" "}
          articles are here as reference — but nothing in the app will tell
          you your plan is &ldquo;Lean&rdquo; or &ldquo;Fat.&rdquo;
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Two structural variations that <em>are</em> math
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Unlike Lean/Fat (spending-level labels), Coast and Barista FIRE
          are <em>structural</em> choices about how you get to FI. They
          change the sequence and composition of your plan, not just the
          dollar target. The calculator models both.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/education/coast-fire"
            className="group rounded-2xl border border-border/50 bg-card/60 p-4 transition-all hover:border-border/80"
          >
            <p className="text-2xl">⛵</p>
            <p className="mt-2 font-display text-lg tracking-[-0.02em] text-foreground group-hover:text-[var(--ember)]">
              Coast FIRE
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stop contributing early and let compounding finish the job by
              your target retirement age.
            </p>
          </Link>
          <Link
            href="/education/barista-fire"
            className="group rounded-2xl border border-border/50 bg-card/60 p-4 transition-all hover:border-border/80"
          >
            <p className="text-2xl">☕</p>
            <p className="mt-2 font-display text-lg tracking-[-0.02em] text-foreground group-hover:text-[var(--ember)]">
              Barista FIRE
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Retire with a smaller portfolio supplemented by part-time
              income — trading a smaller number for continued work.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Where to go next
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          A sensible reading order if you&rsquo;re new to all this:
        </p>
        <ol className="mt-4 space-y-2 text-base text-muted-foreground">
          <li>
            <Link href="/education/the-4-percent-rule" className="font-medium text-foreground underline hover:text-[var(--ember)]">
              The 4% rule
            </Link>{" "}
            — where &ldquo;25× expenses&rdquo; comes from, and when the
            research says it holds.
          </li>
          <li>
            <Link href="/education/savings-rate" className="font-medium text-foreground underline hover:text-[var(--ember)]">
              Your savings rate
            </Link>{" "}
            — the single biggest lever on how fast you reach FI.
          </li>
          <li>
            <Link href="/education/fire-number" className="font-medium text-foreground underline hover:text-[var(--ember)]">
              Your FIRE number
            </Link>{" "}
            — the math behind your target, including why it grows with
            lifestyle creep.
          </li>
          <li>
            <Link href="/education/sequence-of-returns" className="font-medium text-foreground underline hover:text-[var(--ember)]">
              Sequence-of-returns risk
            </Link>{" "}
            — why the order of market returns matters more than the average.
          </li>
          <li>
            <Link href="/education/withdrawal-strategies" className="font-medium text-foreground underline hover:text-[var(--ember)]">
              Withdrawal strategies
            </Link>{" "}
            — what &ldquo;spending it down&rdquo; looks like once
            you&rsquo;re there.
          </li>
        </ol>
        <div className="mt-6 rounded-xl border border-[var(--ember)]/25 bg-[rgba(255,107,53,0.05)] px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            Ready to see your own numbers?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Take the quiz and we&rsquo;ll personalize every article on the
            site to your actual plan.{" "}
            <Link href="/quiz" className="font-medium text-[var(--ember)] hover:underline">
              Start the quiz &rarr;
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
