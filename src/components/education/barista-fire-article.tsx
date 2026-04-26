"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
  calculateFireNumber,
  calculateQuickFireSummary,
  getCurrentPortfolioBalance,
  getYearsUntilRetirement,
} from "@/lib/calc";
import { calculateFireTypeSummaries } from "@/lib/calc/fire-types";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { formatCompactCurrency, formatPercent } from "@/lib/calc/format";

/* ── Helpers ──────────────────────────────────────────────── */

/** Compute Barista FIRE number given expenses, part-time income, withdrawal rate, and optional duration. */
function baristaNumber(
  expenses: number,
  partTimeIncome: number,
  wr: number,
  duration: number | null = null,
  realReturn = 0.05,
) {
  if (duration === null) {
    // Indefinite: simple formula
    const gap = Math.max(expenses - partTimeIncome, 0);
    return calculateFireNumber(gap, wr);
  }
  // Bridge: traditional target minus present value of income subsidy over bridge period
  const traditionalTarget = calculateFireNumber(expenses, wr);
  const subsidy = Math.min(partTimeIncome, expenses);
  const r = Math.max(realReturn, 0.001);
  const pvSubsidy = subsidy * ((1 - (1 + r) ** -duration) / r);
  return Math.max(traditionalTarget - pvSubsidy, 0);
}

/** Build sequence-risk comparison: full withdrawal vs barista withdrawal after a crash. */
function buildSequenceRiskData(params: {
  startingPortfolio: number;
  fullWithdrawal: number;
  baristaWithdrawal: number;
  realReturn: number;
  crashPercent: number;
  years: number;
}) {
  const { startingPortfolio, fullWithdrawal, baristaWithdrawal, realReturn, crashPercent, years } =
    params;
  const points: { year: number; fullRetire: number; baristaRetire: number }[] = [];

  let balFull = startingPortfolio;
  let balBarista = startingPortfolio;

  points.push({ year: 0, fullRetire: Math.round(balFull), baristaRetire: Math.round(balBarista) });

  for (let y = 1; y <= years; y++) {
    // Year 1: market crash
    const yearReturn = y === 1 ? -crashPercent : realReturn;

    balFull = balFull * (1 + yearReturn) - fullWithdrawal;
    balBarista = balBarista * (1 + yearReturn) - baristaWithdrawal;

    // Floor at zero
    balFull = Math.max(balFull, 0);
    balBarista = Math.max(balBarista, 0);

    points.push({ year: y, fullRetire: Math.round(balFull), baristaRetire: Math.round(balBarista) });
  }

  return points;
}

/** Build healthcare savings accumulation data. */
function buildHealthcareSavingsData(annualSaving: number, years: number[]) {
  return years.map((y) => ({
    years: y,
    savings: y * annualSaving,
  }));
}

/** Format currency for chart tooltip. */
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/* ── Component ────────────────────────────────────────────── */

export function BaristaFireArticle() {
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
  const yearsToRetirement = getYearsUntilRetirement(activeScenario) ?? 0;
  const effectiveReturn =
    activeScenario.assumptions.expectedRealReturn -
    (activeScenario.simulationSettings?.feeDrag ?? 0.001);
  const wr = activeScenario.assumptions.withdrawalRate;
  const partTimeIncome = activeScenario.assumptions.partTimeIncome;

  const expGrowth = 1 + (activeScenario.assumptions.expenseGrowthRate ?? 0);
  const retirementSpending =
    activeScenario.retirementExpenses * expGrowth ** yearsToRetirement;

  /* ---- Derived targets ---- */
  const traditionalTarget =
    fireTypes.find((ft) => ft.id === "fire")?.target ?? summary.fireNumber;
  const userBaristaTarget =
    fireTypes.find((ft) => ft.id === "barista")?.target ?? 0;

  /* ---- Part-time income & duration slider state ---- */
  const [incomeOverride, setIncomeOverride] = useState<number | null>(null);
  const [durationOverride, setDurationOverride] = useState<number | null | "untouched">("untouched");
  const sliderIncome = incomeOverride ?? (hasData ? partTimeIncome : 25_000);
  const sliderDuration = durationOverride === "untouched"
    ? (hasData ? activeScenario.assumptions.partTimeIncomeDuration : null)
    : durationOverride;
  const sliderBaristaTarget = baristaNumber(
    hasData ? retirementSpending : 60_000,
    sliderIncome,
    wr || 0.04,
    sliderDuration,
    effectiveReturn || 0.05,
  );
  const portfolioReduction = traditionalTarget - sliderBaristaTarget;
  const reductionPercent =
    traditionalTarget > 0 ? portfolioReduction / traditionalTarget : 0;

  // Years saved: rough estimate based on current savings rate
  const annualSavings = hasData
    ? Math.max(taxInfo.takeHome - activeScenario.annualExpenses, 0)
    : 30_000;
  const yearsToTraditional =
    annualSavings > 0
      ? Math.max(
          (traditionalTarget - currentBalance) / annualSavings,
          0,
        )
      : 0;
  const yearsToBarista =
    annualSavings > 0
      ? Math.max(
          (sliderBaristaTarget - currentBalance) / annualSavings,
          0,
        )
      : 0;
  const yearsSaved = Math.max(yearsToTraditional - yearsToBarista, 0);

  /* ---- Healthcare savings data ---- */
  const annualHealthcareSaving = 12_500; // midpoint of $7K-$18K range
  const healthcareData = useMemo(
    () => buildHealthcareSavingsData(annualHealthcareSaving, [5, 10, 15, 20]),
    [],
  );

  /* ---- Sequence risk data ---- */
  const sequenceData = useMemo(() => {
    const portfolio = hasData ? Math.max(traditionalTarget * 0.8, 500_000) : 1_000_000;
    const fullWd = hasData ? retirementSpending : 60_000;
    const baristaWd = hasData
      ? Math.max(retirementSpending - sliderIncome, 0)
      : 35_000;
    return buildSequenceRiskData({
      startingPortfolio: portfolio,
      fullWithdrawal: fullWd,
      baristaWithdrawal: baristaWd,
      realReturn: effectiveReturn || 0.07,
      crashPercent: 0.3,
      years: 15,
    });
  }, [hasData, traditionalTarget, retirementSpending, sliderIncome, effectiveReturn]);

  const handleIncomeChange = useCallback((val: number[]) => {
    setIncomeOverride(val[0]);
  }, []);
  const handleDurationChange = useCallback((val: number[]) => {
    // Slider max (31) represents "indefinite"
    setDurationOverride(val[0] >= 31 ? null : val[0]);
  }, []);

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          What is Barista FIRE?
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          The part-time path to early retirement
        </p>

        {hasData && partTimeIncome > 0 ? (
          <div className="mt-5 rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.03)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[rgba(255,107,53,0.12)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
                Personalized for you
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              With {formatCompactCurrency(partTimeIncome)}/yr of part-time income,
              your required portfolio drops from{" "}
              <strong className="text-[var(--ember)]">
                {formatCompactCurrency(traditionalTarget)}
              </strong>{" "}
              to{" "}
              <strong className="text-[var(--ember)]">
                {formatCompactCurrency(userBaristaTarget)}
              </strong>
              .
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
          Traditional FIRE means saving enough so your portfolio covers every
          dollar you spend &mdash; forever. Barista FIRE takes a different
          approach: leave your full-time career, work part-time, and let your
          portfolio cover the gap between your spending and your part-time
          earnings.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The name comes from Starbucks, which famously offers health insurance
          to employees working as few as 20 hours per week. But the concept
          applies to any arrangement where part-time income supplements your
          portfolio withdrawals.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The key insight: part-time income doesn&apos;t just add money &mdash;
          it dramatically reduces the portfolio you need AND protects against
          early-year market crashes. Even a modest side income can shave years
          off your FIRE timeline.
        </p>

        {/* Formula display */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            The formula
          </p>
          <p className="mt-3 font-mono text-sm text-foreground">
            Barista Number = (Annual Expenses &minus; Part-Time Income) /
            Withdrawal Rate
          </p>
          {hasData && partTimeIncome > 0 ? (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              {formatCompactCurrency(userBaristaTarget)} = (
              {formatCompactCurrency(retirementSpending)} &minus;{" "}
              {formatCompactCurrency(partTimeIncome)}) /{" "}
              {formatPercent(wr, 0)}
            </p>
          ) : null}
        </div>
      </section>

      {/* ── Section 2: Your Barista FIRE Number (interactive) ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          {hasData
            ? "Your Barista FIRE number"
            : "The Barista FIRE number"}
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Barista number answers: how much do you need invested so that,
          combined with part-time earnings, your portfolio sustains your
          lifestyle indefinitely?
        </p>

        {/* Personalized barista target */}
        <PersonalizedInsight
          title="Your Barista target"
          hasData={hasData && partTimeIncome > 0}
          emptyPrompt="Set your expected part-time income in Your Plan to see your personalized Barista number"
        >
          <div className="space-y-1">
            <p className="font-display text-[2rem] leading-none tracking-[-0.03em] text-foreground">
              {formatCompactCurrency(userBaristaTarget)}
            </p>
            <p className="text-sm text-muted-foreground">
              Your portfolio needs to cover{" "}
              {formatCompactCurrency(
                Math.max(retirementSpending - partTimeIncome, 0),
              )}
              /yr (expenses minus part-time income) at a{" "}
              {formatPercent(wr, 0)} withdrawal rate. That&apos;s{" "}
              {formatCompactCurrency(traditionalTarget - userBaristaTarget)}{" "}
              less than the traditional FIRE number.
            </p>
            {currentBalance > 0 ? (
              <p className="mt-2 text-sm font-medium text-foreground">
                You currently have {formatCompactCurrency(currentBalance)} saved
                {currentBalance >= userBaristaTarget
                  ? " \u2014 you've already passed your Barista target!"
                  : ` \u2014 ${formatCompactCurrency(userBaristaTarget - currentBalance)} to go.`}
              </p>
            ) : null}
          </div>
        </PersonalizedInsight>

        {/* Interactive slider */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Explore: How much could you earn part-time?
          </h3>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground" htmlFor="barista-income">
                  Part-time income
                </label>
                <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                  {formatCompactCurrency(sliderIncome)}/yr
                </span>
              </div>
              <Slider
                id="barista-income"
                min={0}
                max={60_000}
                step={1_000}
                value={[sliderIncome]}
                onValueChange={handleIncomeChange}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$0</span>
                <span>$60K</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground" htmlFor="barista-duration">
                  Years of part-time work
                </label>
                <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                  {sliderDuration === null ? "∞" : `${sliderDuration} yrs`}
                </span>
              </div>
              <Slider
                id="barista-duration"
                min={1}
                max={31}
                step={1}
                value={[sliderDuration === null ? 31 : sliderDuration]}
                onValueChange={handleDurationChange}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 yr</span>
                <span>∞</span>
              </div>
            </div>
          </div>

          {/* Results at slider value */}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Required portfolio
              </p>
              <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-foreground">
                {formatCompactCurrency(sliderBaristaTarget)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Portfolio reduction
              </p>
              <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-[var(--ember)]">
                {formatPercent(reductionPercent, 0)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatCompactCurrency(portfolioReduction)} less
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Time saved
              </p>
              <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-foreground">
                ~{Math.round(yearsSaved)} yrs
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                vs. traditional FIRE
              </p>
            </div>
          </div>

          {/* Comparison bar */}
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Traditional vs. Barista target
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-muted-foreground">
                  Traditional
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/30"
                    style={{ width: "100%" }}
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center text-[0.65rem] font-medium text-foreground">
                    {formatCompactCurrency(traditionalTarget)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-[var(--ember)] font-medium">
                  Barista
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]"
                    style={{
                      width: `${traditionalTarget > 0 ? Math.max((sliderBaristaTarget / traditionalTarget) * 100, 3) : 0}%`,
                    }}
                  />
                  <span
                    className="absolute inset-y-0 flex items-center text-[0.65rem] font-medium text-foreground"
                    style={{
                      left: `${Math.min(Math.max((sliderBaristaTarget / traditionalTarget) * 100, 3), 85)}%`,
                      paddingLeft: "0.5rem",
                    }}
                  >
                    {formatCompactCurrency(sliderBaristaTarget)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: The Healthcare Advantage ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          The healthcare advantage
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Healthcare is the hidden superpower of Barista FIRE. In the US, health
          insurance for a family on the ACA marketplace can cost $15,000 to
          $25,000 per year without subsidies. But many employers offer coverage
          to part-time workers at 20 hours per week, potentially saving
          $7,000&ndash;$18,000 annually compared to unsubsidized marketplace
          plans.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Employer-sponsored (20 hrs/wk)
            </p>
            <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
              ~$3K&ndash;$7K/yr
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Employee share of premiums at most large employers
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              ACA marketplace (no subsidies)
            </p>
            <p className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
              ~$15K&ndash;$25K/yr
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Family plan, unsubsidized. Subsidies depend on MAGI management.
            </p>
          </div>
        </div>

        {/* Healthcare savings accumulation chart */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Healthcare savings add up
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative savings from employer coverage vs. marketplace (~$12.5K/yr
            difference)
          </p>
          <ChartFrame
            ariaLabel="Chart showing cumulative healthcare savings over time"
            className="mt-4 h-48"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart
                data={healthcareData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="years"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Years",
                    position: "insideBottomRight",
                    offset: -4,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
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
                  formatter={(value) => [fmtCurrency(Number(value)), "Cumulative savings"]}
                  labelFormatter={(label) => `${label} years`}
                />
                <Bar
                  dataKey="savings"
                  fill="var(--ember)"
                  radius={[6, 6, 0, 0]}
                  name="savings"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>

        {/* Companies with part-time benefits */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Companies known for part-time benefits
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Starbucks", "Costco", "UPS", "REI", "Trader Joe's", "Lowe's", "Chipotle"].map(
              (company) => (
                <span
                  key={company}
                  className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-foreground"
                >
                  {company}
                </span>
              ),
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Many of these offer health, dental, and vision coverage at 20
            hours/week. Benefits and eligibility can change &mdash; always verify
            current policies.
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card/40 p-4">
          <p className="text-sm font-medium text-foreground">
            ACA subsidy consideration
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            If you&apos;re not getting employer insurance, your Modified Adjusted
            Gross Income (MAGI) determines ACA subsidy eligibility. Managing
            withdrawals strategically &mdash; like using Roth conversions or
            capital gains harvesting &mdash; can keep MAGI low enough to qualify
            for significant premium subsidies.
          </p>
        </div>
      </section>

      {/* ── Section 4: Sequence Risk Protection ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Sequence risk protection
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The first 5&ndash;10 years of retirement are the most dangerous for
          your portfolio. A bad market early on can permanently reduce your
          wealth because you&apos;re withdrawing from a shrinking base. This is
          called sequence-of-returns risk.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Part-time income acts as a shield: smaller withdrawals mean less
          exposure to bad early returns. Even if the market drops 30% in year
          one, you withdraw less and give your portfolio more room to recover.
        </p>

        {/* Sequence risk comparison chart */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            30% crash in year 1: recovery comparison
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Same starting portfolio, different withdrawal amounts. Part-time
            income keeps more invested during the recovery.
          </p>
          <ChartFrame
            ariaLabel="Chart comparing portfolio recovery after a market crash with full vs barista withdrawals"
            className="mt-4 h-64"
          >
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <LineChart
                data={sequenceData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Year",
                    position: "insideBottomRight",
                    offset: -4,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
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
                    name === "fullRetire"
                      ? "Full withdrawal"
                      : "Barista (part-time income)",
                  ]}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="fullRetire"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  name="fullRetire"
                />
                <Line
                  type="monotone"
                  dataKey="baristaRetire"
                  stroke="var(--ember)"
                  strokeWidth={2}
                  dot={false}
                  name="baristaRetire"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed border-muted-foreground" />
              Full withdrawal (no part-time income)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded bg-[var(--ember)]" />
              Barista (part-time supplements withdrawals)
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Comparison ── */}
      <section className="mx-auto max-w-4xl space-y-5 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Barista vs. Coast vs. Traditional
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          Each FIRE variant trades off differently between savings intensity,
          timeline, and lifestyle flexibility. Here&apos;s how they compare
          {hasData ? " with your actual numbers" : ""}.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Traditional */}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
            <h3 className="text-sm font-semibold text-foreground">
              Traditional FIRE
            </h3>
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

          {/* Barista */}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03),0_0_0_2px_rgba(255,107,53,0.15)]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Barista FIRE
              </h3>
              <span className="rounded-full bg-[rgba(255,107,53,0.12)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--ember)]">
                This article
              </span>
            </div>
            <p className="font-display text-2xl tracking-[-0.03em] text-[var(--ember)]">
              {partTimeIncome > 0 || !hasData
                ? formatCompactCurrency(sliderBaristaTarget)
                : formatCompactCurrency(traditionalTarget)}
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Portfolio covers most spending while part-time income handles the
              rest.
            </p>
            <div className="mt-auto rounded-lg bg-[rgba(255,107,53,0.04)] p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Strategy:</strong>{" "}
                {partTimeIncome > 0 || !hasData
                  ? `Save to ${formatCompactCurrency(sliderBaristaTarget)}, then earn ${formatCompactCurrency(sliderIncome)}/yr part-time.`
                  : "Set a post-FIRE income in Your Plan to see a reduced target."}
              </p>
            </div>
          </div>

          {/* Coast */}
          <Link href="/education/coast-fire" className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] transition-all hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(26,17,24,0.06)]">
            <h3 className="text-sm font-semibold text-foreground">
              Coast FIRE
            </h3>
            <p className="font-display text-2xl tracking-[-0.03em] text-foreground">
              {hasData && summary.coastAge !== null
                ? `Age ${Math.round(summary.coastAge)}`
                : "Varies"}
            </p>
            <p className="text-sm leading-snug text-muted-foreground">
              Save enough that compounding alone reaches your FIRE number by
              retirement. Keep working full-time but stop saving.
            </p>
            <div className="mt-auto rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Strategy:</strong> Save
                until compounding finishes the job, then just cover expenses
                from income. No more saving.
              </p>
            </div>
            <p className="text-xs font-medium text-primary">Learn about Coast FIRE →</p>
          </Link>
        </div>
      </section>

      {/* ── Section 6: Is Barista FIRE Right for You? ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-xl tracking-[-0.03em] text-foreground">
          Is Barista FIRE right for you?
        </h2>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You enjoy some work structure
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Barista FIRE is ideal if you like the rhythm of part-time work
              &mdash; staying social, having purpose, but on your own terms. It
              trades a few hours a week for years of extra freedom.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You want health benefits without the full-time grind
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Employer-sponsored health insurance at 20 hours a week can save
              thousands per year compared to marketplace plans. This is
              especially valuable before Medicare eligibility at 65.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              You want freedom sooner, not later
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Because you need a smaller portfolio, Barista FIRE can be reached
              years before traditional FIRE. The tradeoff: you continue earning
              some income in retirement.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Want complete work independence? Traditional FIRE may fit better
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you never want to trade hours for dollars again, Barista FIRE
              still requires part-time work. Full financial independence means
              not needing any earned income at all.
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Take the quiz and Jarlan will tell you which FIRE path fits your
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

      {/* ── Section 7: Next Steps ── */}
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
              See your Barista milestone
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
              Stress-test with part-time income
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
              Compare all FIRE paths
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
