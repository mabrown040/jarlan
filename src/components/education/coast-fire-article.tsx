"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PersonalizedInsight } from "./personalized-insight";
import { ChartFrame } from "@/components/charts/chart-frame";
import { Slider } from "@/components/ui/slider";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import {
  calculateQuickFireSummary,
  getCurrentPortfolioBalance,
} from "@/lib/calc";
import { calculateFireTypeSummaries } from "@/lib/calc/fire-types";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

/* ── Helpers ──────────────────────────────────────────────── */

function coastTarget(
  fireNumber: number,
  yearsToGrow: number,
  annualReturn: number,
) {
  if (yearsToGrow <= 0 || annualReturn <= 0) return fireNumber;
  return fireNumber / (1 + annualReturn) ** yearsToGrow;
}

/** Build a growth projection: portfolio with contributions vs coast (no contributions). */
function buildComparisonProjection(params: {
  currentBalance: number;
  annualContribution: number;
  annualReturn: number;
  years: number;
  currentAge: number;
}) {
  const { currentBalance, annualContribution, annualReturn, years, currentAge } = params;
  const points: { age: number; withContributions: number; coastOnly: number }[] = [];

  let balanceWith = currentBalance;
  let balanceCoast = currentBalance;

  points.push({
    age: currentAge,
    withContributions: Math.round(currentBalance),
    coastOnly: Math.round(currentBalance),
  });

  for (let y = 1; y <= years; y++) {
    balanceWith = balanceWith * (1 + annualReturn) + annualContribution;
    balanceCoast = balanceCoast * (1 + annualReturn);
    points.push({
      age: currentAge + y,
      withContributions: Math.round(balanceWith),
      coastOnly: Math.round(balanceCoast),
    });
  }

  return points;
}

/** Format currency for chart tooltip. */
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function CoastFireArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;

  /* ---- Core calculations ---- */
  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );
  const fireTypes = useMemo(
    () => calculateFireTypeSummaries(activeScenario),
    [activeScenario],
  );
  const taxInfo = useMemo(
    () => estimateScenarioTax(activeScenario),
    [activeScenario],
  );

  const currentBalance = getCurrentPortfolioBalance(activeScenario.accounts);
  const currentAge = activeScenario.profile.age;
  const retirementAge = activeScenario.profile.retirementAge ?? currentAge;
  const effectiveReturn =
    activeScenario.assumptions.expectedRealReturn -
    (activeScenario.simulationSettings?.feeDrag ?? 0.001);

  /* ---- Slider state ---- */
  const [retAgeOverride, setRetAgeOverride] = useState<number | null>(null);
  const [returnOverride, setReturnOverride] = useState<number | null>(null);

  const sliderRetAge = retAgeOverride ?? retirementAge;
  const sliderReturn = returnOverride ?? Math.round(effectiveReturn * 100) / 100;

  const sliderYearsToRet = Math.max(sliderRetAge - currentAge, 0);
  const sliderFireNumber = summary.fireNumber;
  const sliderCoastTarget = coastTarget(sliderFireNumber, sliderYearsToRet, sliderReturn);

  /* ---- Comparison chart data ---- */
  const chartData = useMemo(() => {
    const contribution = hasData
      ? taxInfo.takeHome - activeScenario.annualExpenses
      : 20_000;
    const years = Math.max(sliderYearsToRet, 20);
    return buildComparisonProjection({
      currentBalance: hasData ? currentBalance : 50_000,
      annualContribution: Math.max(contribution, 0),
      annualReturn: sliderReturn,
      years,
      currentAge: hasData ? currentAge : 30,
    });
  }, [hasData, currentBalance, currentAge, sliderYearsToRet, sliderReturn, taxInfo.takeHome, activeScenario.annualExpenses]);

  /* ---- Fire type comparison data ---- */
  const traditionalTarget = fireTypes.find((ft) => ft.id === "fire")?.target ?? summary.fireNumber;
  const baristaTarget = fireTypes.find((ft) => ft.id === "barista")?.target ?? 0;
  const partTimeIncome = activeScenario.assumptions.partTimeIncome;

  /* ---- Coast age calculation ---- */
  const coastAge = summary.coastAge;

  /* ---- "What you need to cover" if coasting ---- */
  const coastExpensesCovered = hasData ? activeScenario.annualExpenses : 0;

  const handleRetAgeChange = useCallback((val: number[]) => {
    setRetAgeOverride(val[0]);
  }, []);

  const handleReturnChange = useCallback((val: number[]) => {
    setReturnOverride(val[0] / 100);
  }, []);

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          What is Coast FIRE?
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          And what it means for your plan
        </p>

        {hasData && coastAge !== null && coastAge > 0 ? (
          <div className="mt-5 rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.03)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[rgba(255,107,53,0.12)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
                Personalized for you
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              Based on your numbers, you could reach Coast FI at age{" "}
              <strong className="text-[var(--ember)]">{Math.round(coastAge)}</strong>
              {" "}&mdash; then let compounding do the rest.
            </p>
          </div>
        ) : null}
      </section>

      {/* ── Section 1: The Concept ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          The core idea
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Most FIRE planning focuses on one thing: save enough to cover all your
          expenses forever. Coast FIRE flips the script. Instead of saving until
          you can quit entirely, you save until you have enough that
          compounding alone finishes the job by your target retirement age.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Think of it like pushing a snowball to the top of a hill. Once
          it&apos;s big enough and you give it a nudge, gravity does the work.
          Your job shifts from &ldquo;save aggressively&rdquo; to &ldquo;just
          cover your living expenses.&rdquo; No more mandatory savings. The
          investments you already have grow on their own.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          This is especially powerful for younger savers. Time is the
          multiplier. The earlier you reach your coast target, the less you
          need because there are more years for compounding to work.
        </p>
      </section>

      {/* ── Section 2: Your Coast FIRE Number ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          {hasData ? "Your Coast FIRE number" : "The Coast FIRE number"}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Coast FIRE target answers one question: how much do you need
          invested <em>today</em> so that, even if you never save another
          dollar, your portfolio grows to your full FIRE number by retirement?
        </p>

        {/* Formula display */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The formula
          </p>
          <p className="mt-3 font-mono text-sm text-foreground">
            Coast Target = FIRE Number / (1 + real return)<sup>years to retirement</sup>
          </p>
          {hasData ? (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              {formatCompactCurrency(sliderCoastTarget)} ={" "}
              {formatCompactCurrency(sliderFireNumber)} / (1 +{" "}
              {formatPercent(sliderReturn, 1)})<sup>{sliderYearsToRet}</sup>
            </p>
          ) : null}
        </div>

        {/* Personalized coast target */}
        <PersonalizedInsight title="Your coast target" hasData={hasData}>
          <div className="space-y-1">
            <p className="font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
              {formatCompactCurrency(sliderCoastTarget)}
            </p>
            <p className="text-sm text-muted-foreground">
              If you had {formatCompactCurrency(sliderCoastTarget)} invested
              today and never saved another dollar, compounding at{" "}
              {formatPercent(sliderReturn, 1)} real returns would grow it to your{" "}
              {formatCompactCurrency(sliderFireNumber)} FIRE number by age{" "}
              {sliderRetAge}.
            </p>
            {currentBalance > 0 ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                You currently have {formatCompactCurrency(currentBalance)} saved
                {currentBalance >= sliderCoastTarget
                  ? " \u2014 you've already passed your coast target!"
                  : ` \u2014 ${formatCompactCurrency(sliderCoastTarget - currentBalance)} to go.`}
              </p>
            ) : null}
          </div>
        </PersonalizedInsight>

        {/* Interactive sliders */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Explore: What if...
          </h3>

          {/* Retirement age slider */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-foreground" htmlFor="coast-ret-age">
                Retirement age
              </label>
              <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                {sliderRetAge}
              </span>
            </div>
            <Slider
              id="coast-ret-age"
              min={Math.max(currentAge + 1, 35)}
              max={75}
              step={1}
              value={[sliderRetAge]}
              onValueChange={handleRetAgeChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.max(currentAge + 1, 35)}</span>
              <span>75</span>
            </div>
          </div>

          {/* Return rate slider */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-foreground" htmlFor="coast-return">
                Expected real return
              </label>
              <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                {formatPercent(sliderReturn, 1)}
              </span>
            </div>
            <Slider
              id="coast-return"
              min={2}
              max={10}
              step={0.5}
              value={[Math.round(sliderReturn * 100 * 2) / 2]}
              onValueChange={handleReturnChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2%</span>
              <span>10%</span>
            </div>
          </div>

          {/* Resulting coast target */}
          <div className="mt-5 rounded-lg bg-muted/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Coast target at these settings
            </p>
            <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-foreground">
              {formatCompactCurrency(sliderCoastTarget)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {sliderYearsToRet} years of compounding at{" "}
              {formatPercent(sliderReturn, 1)} real return
            </p>
          </div>
        </div>

        {/* Contributions vs Coast chart */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Growth: Continued saving vs. coasting
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasData
              ? "Based on your current savings rate and portfolio."
              : "Example based on $50K saved, $20K/yr contributions, and 7% real returns."}
          </p>
          <ChartFrame ariaLabel="Chart comparing portfolio growth with continued contributions versus coasting" className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradWith" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ember)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--ember)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCoast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Age", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickFormatter={(v: number) => fmtCurrency(v)}
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
                  formatter={(value, name) => [
                    fmtCurrency(Number(value)),
                    name === "withContributions" ? "Keep saving" : "Coast (no saving)",
                  ]}
                  labelFormatter={(label) => `Age ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="withContributions"
                  stroke="var(--ember)"
                  strokeWidth={2}
                  fill="url(#gradWith)"
                  name="withContributions"
                />
                <Area
                  type="monotone"
                  dataKey="coastOnly"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  fill="url(#gradCoast)"
                  name="coastOnly"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[var(--ember)]" />
              Keep saving
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed border-muted-foreground" />
              Coast (no new savings)
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Coast FIRE Age ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          {hasData ? "Your Coast FIRE age" : "When can you coast?"}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Your Coast FI age is when your portfolio crosses the coast target.
          From that point on, you can stop saving and just cover your day-to-day
          expenses from income. Compounding takes care of the rest.
        </p>

        <PersonalizedInsight title="Your coast age" hasData={hasData}>
          {coastAge !== null && coastAge > 0 ? (
            <div className="space-y-3">
              {/* Timeline visualization */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    Age {currentAge}
                  </span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="font-bold text-[var(--ember)]">
                    Coast FI at {Math.round(coastAge)}
                  </span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="font-medium text-foreground">
                    Retire at {retirementAge}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="relative h-3 overflow-hidden rounded-full bg-muted/80">
                  {/* Phase 1: saving */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]"
                    style={{
                      width: `${Math.min(((coastAge - currentAge) / Math.max(retirementAge - currentAge, 1)) * 100, 100)}%`,
                    }}
                  />
                  {/* Phase 2: coasting */}
                  <div
                    className="absolute inset-y-0 rounded-full bg-[var(--ember)]/20"
                    style={{
                      left: `${Math.min(((coastAge - currentAge) / Math.max(retirementAge - currentAge, 1)) * 100, 100)}%`,
                      width: `${Math.max(((retirementAge - coastAge) / Math.max(retirementAge - currentAge, 1)) * 100, 0)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                  <span>Save aggressively</span>
                  <span>Coast (cover expenses only)</span>
                  <span>Retire</span>
                </div>
              </div>

              <p className="text-sm text-foreground">
                If you coast at age {Math.round(coastAge)}, you would need to
                cover{" "}
                <strong>{formatCompactCurrency(coastExpensesCovered)}/yr</strong>{" "}
                from earned income &mdash; no saving required. That&apos;s{" "}
                {Math.round(retirementAge - coastAge)} years of coasting before
                your portfolio hits {formatCompactCurrency(summary.fireNumber)}.
              </p>
            </div>
          ) : currentBalance >= sliderCoastTarget ? (
            <p className="text-sm font-medium text-foreground">
              You&apos;ve already passed your coast target. If you stopped saving
              today, compounding alone would grow your portfolio to your FIRE
              number by retirement.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Based on current projections, a coast date couldn&apos;t be
              calculated. Try increasing your savings or adjusting your return
              assumptions.
            </p>
          )}
        </PersonalizedInsight>
      </section>

      {/* ── Section 4: Comparison ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Coast vs. Traditional vs. Barista
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Each FIRE variant trades off differently between savings intensity,
          timeline, and lifestyle flexibility. Here&apos;s how they compare
          {hasData ? " with your actual numbers" : ""}.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Traditional */}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
            <h3 className="text-sm font-semibold text-foreground">Traditional FIRE</h3>
            <p className="font-display text-2xl tracking-[-0.03em] text-foreground">
              {formatCompactCurrency(traditionalTarget)}
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Save until your portfolio covers all expenses. Then stop working
              entirely.
            </p>
            <div className="mt-auto rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Strategy:</strong> Save
                aggressively until {formatCompactCurrency(traditionalTarget)},
                then retire completely.
              </p>
            </div>
          </div>

          {/* Coast */}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03),0_0_0_2px_rgba(255,107,53,0.15)]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Coast FIRE</h3>
              <span className="rounded-full bg-[rgba(255,107,53,0.12)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
                This article
              </span>
            </div>
            <p className="font-display text-2xl tracking-[-0.03em] text-[var(--ember)]">
              {formatCompactCurrency(sliderCoastTarget)}
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Save until compounding can finish the job, then just cover expenses
              from income.
            </p>
            <div className="mt-auto rounded-lg bg-[rgba(255,107,53,0.04)] p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Strategy:</strong> Save to{" "}
                {formatCompactCurrency(sliderCoastTarget)}, then earn{" "}
                {hasData ? formatCompactCurrency(coastExpensesCovered) : "enough"}/yr
                to cover expenses. No more saving.
              </p>
            </div>
          </div>

          {/* Barista */}
          <Link href="/education/barista-fire" className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(26,17,24,0.06)]">
            <h3 className="text-sm font-semibold text-foreground">Barista FIRE</h3>
            <p className="font-display text-2xl tracking-[-0.03em] text-foreground">
              {partTimeIncome > 0
                ? formatCompactCurrency(baristaTarget)
                : formatCompactCurrency(traditionalTarget)}
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Portfolio covers most spending while part-time income handles the rest.
            </p>
            <div className="mt-auto rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Strategy:</strong>{" "}
                {partTimeIncome > 0
                  ? `Save to ${formatCompactCurrency(baristaTarget)}, then earn ${formatCompactCurrency(partTimeIncome)}/yr part-time.`
                  : "Set a post-FIRE income in Your Plan to see a reduced target."}
              </p>
            </div>
            <p className="text-xs font-medium text-primary">Learn about Barista FIRE →</p>
          </Link>
        </div>
      </section>

      {/* ── Section 5: Is Coast FIRE Right for You? ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Is Coast FIRE right for you?
        </h2>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You value flexibility over speed
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Coast FIRE works best if you are willing to keep working in some
              capacity but want to drop the pressure of aggressive saving. You
              could switch to a lower-paying job you love, go freelance, or just
              slow down.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You&apos;re young with time on your side
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The earlier you reach your coast target, the more years
              compounding has to work. A 28-year-old who hits coast needs far
              less than a 48-year-old because of the exponential growth curve.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You want total independence? Traditional FIRE may be a better fit
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you never want to trade hours for dollars again, Coast FIRE
              still requires income to cover expenses until retirement age. Full
              financial independence means not needing any earned income at all.
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Take the quiz and Calcifer will tell you which FIRE path fits your
              situation best.
            </p>
            <Link
              href="/quiz"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--ember)] hover:underline"
            >
              Take the FIRE quiz &rarr;
            </Link>
          </div>
        ) : null}
      </section>

      {/* ── Section 6: Next Steps ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Next steps
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/accumulation"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              See your Coast FI milestone
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Watch it appear on your projection chart.
            </p>
          </Link>
          <Link
            href="/withdrawal"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Stress-test your retirement
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run historical backtests on your withdrawal plan.
            </p>
          </Link>
          <Link
            href="/quiz"
            className="group rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-border hover:bg-card"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-[var(--ember)]">
              Explore other FIRE paths
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Take the quiz and compare all five types.
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
