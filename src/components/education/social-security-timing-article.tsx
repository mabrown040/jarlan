"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { ChartFrame } from "@/components/charts/chart-frame";
import { PersonalizedInsight } from "./personalized-insight";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useScenarioStore } from "@/lib/store/use-scenario-store";
import { formatCompactCurrency } from "@/lib/calc/format";

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

const CLAIMING_AGES_TABLE = [
  { age: 62, pct: "70%", vs: "~30% less than FRA" },
  { age: 63, pct: "75%", vs: "" },
  { age: 64, pct: "80%", vs: "" },
  { age: 65, pct: "86.7%", vs: "" },
  { age: 66, pct: "93.3%", vs: "" },
  { age: 67, pct: "100%", vs: "Full Retirement Age (FRA)" },
  { age: 68, pct: "108%", vs: "" },
  { age: 69, pct: "116%", vs: "" },
  { age: 70, pct: "124%", vs: "~77% more than age 62" },
];

function buildCumulativeChartData(
  monthly62: number,
  monthly67: number,
  monthly70: number,
) {
  const data: {
    age: number;
    claim62: number;
    claim67: number;
    claim70: number;
  }[] = [];
  for (let age = 62; age <= 90; age++) {
    const cum62 = monthly62 * 12 * (age - 62);
    const cum67 = monthly67 * 12 * Math.max(0, age - 67);
    const cum70 = monthly70 * 12 * Math.max(0, age - 70);
    data.push({
      age,
      claim62: Math.round(cum62),
      claim67: Math.round(cum67),
      claim70: Math.round(cum70),
    });
  }
  return data;
}

function calcBreakEven(
  monthlyEarly: number,
  earlyAge: number,
  monthlyLate: number,
  lateAge: number,
): number {
  if (monthlyLate <= monthlyEarly) return 999;
  return (monthlyLate * lateAge - monthlyEarly * earlyAge) / (monthlyLate - monthlyEarly);
}

export function SocialSecurityTimingArticle() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);

  useInitializeStore();
  useAutoSaveScenario();

  const hasData = activeScenario.isPersonalized !== false;
  const ss = activeScenario.socialSecurity;
  const hasSsData = ss.monthlyBenefitAtFra > 0;

  const monthly62 = hasSsData ? ss.monthlyBenefitAt62 : 1_890;
  const monthly67 = hasSsData ? ss.monthlyBenefitAtFra : 2_700;
  const monthly70 = hasSsData ? ss.monthlyBenefitAt70 : 3_350;

  const chartData = useMemo(
    () => buildCumulativeChartData(monthly62, monthly67, monthly70),
    [monthly62, monthly67, monthly70],
  );

  const breakEven62v67 = useMemo(
    () => calcBreakEven(monthly62, 62, monthly67, 67),
    [monthly62, monthly67],
  );

  const breakEven67v70 = useMemo(
    () => calcBreakEven(monthly67, 67, monthly70, 70),
    [monthly67, monthly70],
  );

  const claimingAge = ss.claimingAge;

  const beRef62v67 = Math.round(breakEven62v67 * 10) / 10;
  const beRef67v70 = Math.round(breakEven67v70 * 10) / 10;

  return (
    <div className="space-y-10 pb-12">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl px-6 pt-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Learn
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          When to Claim Social Security: Age 62 vs 67 vs 70
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Social Security is the only guaranteed income stream most Americans will have in
          retirement — inflation-adjusted, for life, backed by the full faith and credit of the
          US government. The question of when to claim it is one of the highest-dollar financial
          decisions you&apos;ll make in your lifetime. Get it right and it can mean hundreds of
          thousands of additional dollars over the course of your retirement.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The mechanics are straightforward: claim at 62 and you get money sooner, but roughly 30%
          less per month for the rest of your life. Wait until 70 and each check is approximately
          77% larger than if you&apos;d claimed at 62. The crossover point — where delaying pays off
          more in total — depends on how long you live.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          The right answer depends on your health, your other income sources, whether you&apos;re
          married, and a break-even analysis that most people never run. This article walks through
          all of it — with your personal Social Security estimates if you&apos;ve entered them.
        </p>
      </section>

      {/* ── Section 1: The Three Claiming Ages ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The three claiming ages
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The Social Security Administration lets you claim at any month between 62 and 70, but
          three ages anchor the decision: the earliest possible (62), your Full Retirement Age
          (67 for anyone born in 1960 or later), and the maximum-delay age (70). Each year you
          wait past FRA adds roughly 8% to your permanent monthly benefit via delayed retirement
          credits.
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Claiming Age
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">
                  Benefit vs. FRA (100%)
                </th>
                <th className="px-4 py-3 text-left font-semibold text-foreground hidden sm:table-cell">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {CLAIMING_AGES_TABLE.map((row, i) => (
                <tr
                  key={row.age}
                  className={[
                    "border-b border-border/40 last:border-0",
                    row.age === 62 ? "bg-amber-500/5" : "",
                    row.age === 67 ? "bg-[var(--ember)]/5 font-medium" : "",
                    row.age === 70 ? "bg-indigo-500/5" : "",
                    i % 2 === 0 && row.age !== 62 && row.age !== 67 && row.age !== 70
                      ? "bg-muted/10"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {row.age === 67 ? (
                      <span>
                        67{" "}
                        <span className="text-xs font-semibold text-[var(--ember)]">(FRA)</span>
                      </span>
                    ) : (
                      row.age
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">{row.pct}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {row.vs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
              Age 62 — Earliest
            </p>
            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              Begin collecting immediately. Benefit is permanently reduced to approximately 70%
              of your FRA amount. Useful if you need income now or expect a shorter lifespan.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.04)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ember)]">
              Age 67 — FRA
            </p>
            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              Your baseline. Also called the Primary Insurance Amount (PIA) — the amount you
              earned based on your 35 highest-earning years. No reduction, no bonus.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
              Age 70 — Maximum
            </p>
            <p className="mt-2 text-sm leading-snug text-muted-foreground">
              Eight years of 8% delayed retirement credits stack up to a 124% benefit —
              or about 77% more than claiming at 62. There is no benefit to waiting past 70.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 2: Break-Even Analysis ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          The break-even analysis
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The core question isn&apos;t &ldquo;which benefit is bigger?&rdquo; — it&apos;s &ldquo;how long do I have
          to live for delaying to pay off?&rdquo; That&apos;s the break-even point: the age at which the
          cumulative dollars received by waiting surpasses the cumulative dollars received by
          claiming early.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          Using a concrete example — $2,700/mo at FRA (67), $1,890/mo at 62, and $3,350/mo at 70
          — the numbers work out like this:
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Break-even: Age 62 vs. 67
            </p>
            <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-foreground">
              ~Age 79
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you live past 79, claiming at 67 pays more in total than claiming at 62. The
              years of smaller checks eventually get outrun by the higher monthly amount.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Break-even: Age 67 vs. 70
            </p>
            <p className="mt-1 font-display text-2xl tracking-[-0.03em] text-foreground">
              ~Age 82
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you live past 82, claiming at 70 pays more than claiming at 67. Three years of
              foregone checks are compensated by the 24% benefit increase.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-sm font-medium text-foreground">
            The average US life expectancy at 62 is approximately{" "}
            <strong>83 for men</strong> and <strong>86 for women</strong>. More importantly,
            conditional life expectancy — that is, if you&apos;re healthy at 62 — is even higher.
            A 62-year-old who is in good health today has a better than 50% chance of living
            past 85.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            That means most healthy Americans will live past both break-even points. The math
            typically favors delaying — especially for the higher earner in a married couple.
          </p>
        </div>
      </section>

      {/* ── Chart ── */}
      <section className="mx-auto max-w-4xl space-y-4 px-6">
        <h3 className="font-display text-xl tracking-[-0.02em] text-foreground">
          Cumulative lifetime benefits by claiming age
        </h3>
        <p className="text-sm text-muted-foreground">
          {hasSsData
            ? "Based on your Social Security estimates. Each line shows total dollars received, starting from the claiming age."
            : "Example using $1,890/mo at 62, $2,700/mo at FRA, $3,350/mo at 70. Enter your SSA estimates to personalize this chart."}
        </p>

        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
          <ChartFrame
            ariaLabel="Line chart showing cumulative Social Security lifetime benefits for claiming at ages 62, 67, and 70"
            className="h-[260px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Age",
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
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      claim62: "Claim at 62",
                      claim67: "Claim at 67 (FRA)",
                      claim70: "Claim at 70",
                    };
                    return [fmtCurrency(Number(value)), labels[String(name)] ?? String(name)];
                  }}
                  labelFormatter={(label) => `Age ${label}`}
                />
                <ReferenceLine
                  x={Math.round(breakEven62v67)}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{
                    value: `Break-even ~${Math.round(breakEven62v67)}`,
                    position: "top",
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                />
                <ReferenceLine
                  x={Math.round(breakEven67v70)}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{
                    value: `Break-even ~${Math.round(breakEven67v70)}`,
                    position: "top",
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="claim62"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="claim62"
                />
                <Line
                  type="monotone"
                  dataKey="claim67"
                  stroke="var(--ember)"
                  strokeWidth={2}
                  dot={false}
                  name="claim67"
                />
                <Line
                  type="monotone"
                  dataKey="claim70"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="claim70"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded bg-amber-400" />
              Claim at 62 ({fmtCurrency(monthly62)}/mo)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded bg-[var(--ember)]" />
              Claim at 67 — FRA ({fmtCurrency(monthly67)}/mo)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded bg-indigo-500" />
              Claim at 70 ({fmtCurrency(monthly70)}/mo)
            </div>
          </div>
        </div>
      </section>

      {/* ── Personalized Insight ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <PersonalizedInsight
          title="Your Social Security numbers"
          hasData={hasData && hasSsData}
          emptyPrompt="Enter your Social Security estimates in the Plan drawer to see personalized break-even calculations."
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Monthly at 62</p>
                <p className="mt-0.5 font-display text-xl tracking-[-0.02em] text-foreground">
                  {formatCompactCurrency(ss.monthlyBenefitAt62)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCompactCurrency(ss.monthlyBenefitAt62 * 12)}/yr
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly at FRA (67)</p>
                <p className="mt-0.5 font-display text-xl tracking-[-0.02em] text-foreground">
                  {formatCompactCurrency(ss.monthlyBenefitAtFra)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCompactCurrency(ss.monthlyBenefitAtFra * 12)}/yr
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly at 70</p>
                <p className="mt-0.5 font-display text-xl tracking-[-0.02em] text-foreground">
                  {formatCompactCurrency(ss.monthlyBenefitAt70)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCompactCurrency(ss.monthlyBenefitAt70 * 12)}/yr
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Your break-even ages
              </p>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                <p className="text-sm text-foreground">
                  62 vs. 67:{" "}
                  <strong className="text-[var(--ember)]">
                    Age {isFinite(beRef62v67) ? beRef62v67.toFixed(1) : "N/A"}
                  </strong>
                </p>
                <p className="text-sm text-foreground">
                  67 vs. 70:{" "}
                  <strong className="text-[var(--ember)]">
                    Age {isFinite(beRef67v70) ? beRef67v70.toFixed(1) : "N/A"}
                  </strong>
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                10-year totals starting from age 62
              </p>
              <div className="mt-2 grid gap-1 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">If claimed at 62</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCompactCurrency(ss.monthlyBenefitAt62 * 12 * 10)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">If claimed at 67</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCompactCurrency(ss.monthlyBenefitAtFra * 12 * 3)}
                  </p>
                  <p className="text-xs text-muted-foreground">(3 yrs of payments)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">If claimed at 70</p>
                  <p className="text-sm font-semibold text-foreground">$0</p>
                  <p className="text-xs text-muted-foreground">(payments start yr 9)</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Your current plan claims at age{" "}
              <strong className="text-foreground">{claimingAge}</strong>. Use the break-even
              ages above and the factors below to evaluate whether that&apos;s the right call
              for your situation.
            </p>
          </div>
        </PersonalizedInsight>
      </section>

      {/* ── Section 3: Factors Favoring Early ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          When claiming at 62 makes sense
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          The math usually favors waiting, but &ldquo;usually&rdquo; isn&apos;t always. There are
          legitimate situations where claiming early is the right call — and pretending otherwise
          does people a disservice.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Poor health or a family history of early death
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you have a serious health condition or strong reason to believe you won&apos;t
              live past your late 70s, claiming early locks in more total dollars. The break-even
              math works against you at shorter lifespans.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              You need the income now and have no alternative
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If early retirement or job loss leaves you without income and you have no portfolio
              to draw from, claiming at 62 may be the only viable option. A smaller guaranteed
              benefit beats drawing down savings at an unsustainable rate or going into debt.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              You&apos;re the lower earner in a married couple
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              In a couple, the key priority is maximizing the higher earner&apos;s benefit — because
              whichever spouse dies first, the survivor collects the larger of the two benefits.
              The lower earner can often claim earlier to bring in cash flow while the higher earner
              waits to build up maximum survivor benefit.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Physically demanding work you can&apos;t continue
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Workers in physically demanding jobs — construction, manufacturing, healthcare — often
              can&apos;t realistically continue to 67 or 70. The calculation changes when delaying
              means no income and depleted savings, rather than a few extra years of comfortable work.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Factors Favoring Delay ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          When waiting to 67 or 70 makes sense
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          For most people who are healthy, married, and have alternative income sources to bridge
          the gap, delaying Social Security is one of the best &ldquo;investments&rdquo; available.
          No stock, bond, or annuity offers a guaranteed 8% per year inflation-adjusted return —
          which is effectively what each year of delay buys you.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Good health and family history of longevity
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you have reason to believe you&apos;ll live into your mid-80s or beyond, the
              math strongly favors delaying. Over a 25-year retirement, the difference between
              claiming at 62 vs. 70 can easily exceed $200,000 in total lifetime benefits.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              You have a portfolio or other income to bridge the gap
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The key to delaying is having something to live on in the interim. If you can
              draw from a taxable brokerage account or Roth IRA during the delay years, you fund
              a larger permanent benefit — and potentially reduce sequence-of-returns risk by
              drawing less from your portfolio after SS kicks in at a higher amount.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              You&apos;re the higher earner in a married couple
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The higher earner should almost always delay to 70. When the higher earner dies,
              the surviving spouse switches to the higher benefit and receives it for the rest
              of their life. The survivor benefit is your biggest insurance policy against the
              financial risk of outliving one spouse.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Tax efficiency during early retirement conversion years
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              If you retire early and plan to do Roth conversions in your low-income years,
              delaying Social Security extends the window when your income is low enough for
              favorable conversion rates. Every additional year before SS starts is a year you
              can fill the 12% or 22% bracket with conversions at lower tax cost.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 5: Couples Strategy ── */}
      <section className="mx-auto max-w-3xl space-y-5 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Married couples: the asymmetric strategy
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          For married couples, Social Security timing isn&apos;t just one decision — it&apos;s two,
          and they interact. The standard guidance for most couples with a clear higher earner is:
        </p>

        <div className="rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.03)] p-5">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)] text-xs font-bold text-white">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Higher earner: delay to 70
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  This maximizes the survivor benefit. Whichever spouse dies first, the
                  surviving partner continues collecting the higher amount for life. The
                  higher earner&apos;s benefit at 70 is also the most valuable because it
                  compounds the delayed retirement credits on top of a larger base.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ember)]/40 text-xs font-bold text-[var(--ember)]">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Lower earner: claim earlier (62–67)
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  The lower earner&apos;s benefit is replaced by the higher earner&apos;s survivor
                  benefit when one spouse dies, so maximizing the lower earner&apos;s benefit is
                  less critical. Claiming earlier provides household cash flow during the years
                  while the higher earner is delaying.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          The exact optimal combination depends on the age gap between spouses, each partner&apos;s
          health, and income needs. The key insight is that the higher earner&apos;s benefit matters
          most because it&apos;s the one that survives.
        </p>
      </section>

      {/* ── Section 6: The Bigger Picture ── */}
      <section className="mx-auto max-w-3xl space-y-4 px-6">
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          How Social Security fits your overall FIRE plan
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground">
          For traditional FIRE planning, Social Security is often treated as a bonus — something
          to layer in after your portfolio is already projecting success. But that undervalues it.
          A delayed Social Security benefit at 70 is a meaningful reduction in how much your
          portfolio needs to cover, which directly reduces sequence-of-returns risk.
        </p>
        <p className="text-base leading-relaxed text-muted-foreground">
          The strategy that many FIRE practitioners use: retire at, say, 55 with enough portfolio
          to bridge to 70, drawing down at a higher rate during the bridge period. Then at 70,
          Social Security begins, the portfolio draw rate drops dramatically, and the plan becomes
          far more durable. Two income streams are more resilient than one — especially when one
          of them is inflation-adjusted and guaranteed by the federal government.
        </p>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">
            Common bridge strategies
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 text-[var(--ember)]">→</span>
              <span>
                <strong className="text-foreground">Roth conversion ladder:</strong> In low-income
                early retirement years, convert traditional IRA/401(k) funds to Roth at low tax
                rates. Provides tax-free income and extends the runway to 70.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-[var(--ember)]">→</span>
              <span>
                <strong className="text-foreground">Taxable brokerage drawdown:</strong> Use
                after-tax investment accounts during the delay years. Long-term capital gains are
                taxed at 0% up to ~$48,350 (single) in 2025.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-[var(--ember)]">→</span>
              <span>
                <strong className="text-foreground">Part-time or flexible work:</strong> Even
                modest income — $20–30K/yr — can significantly extend the delay runway without
                requiring aggressive portfolio withdrawals.
              </span>
            </li>
          </ul>
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
              Where your safe withdrawal rate comes from — and how Social Security changes the
              equation.
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
              How to fund the years between early retirement and age 70 with tax-efficient Roth
              conversions.
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
              How your savings rate determines whether you can afford to delay Social Security.
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
              Fixed, dynamic, and guardrail strategies — and how SS timing affects your
              withdrawal rate.
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
