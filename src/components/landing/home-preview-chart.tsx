"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { createDefaultScenario } from "@/lib/domain";
import {
  calculateQuickFireSummary,
  formatCompactCurrency,
} from "@/lib/calc";

/**
 * Muted projection preview for the new-user home landing.
 *
 * Reasons for existing:
 * - New users had no visual proof of what the calculator produces. The
 *   nearest visualization was a click away on /accumulation.
 * - Competitor FIRE tools (FIRECalc, Projection Lab, cFIREsim) all lead
 *   with a chart. Landing with none signals "spec page" vs. "working app."
 *
 * Design choices:
 * - Derived from `createDefaultScenario()` at render time, no store read.
 *   Pure display — won't change based on hydration state, wizard state,
 *   or a shared-URL scenario. Pinned reference, not a live mirror.
 * - No tooltip, no axis ticks, no legend — this is illustrative, not
 *   exploratory. Interactive version lives on /accumulation.
 * - Ember gradient fill matches brand; reduced opacity communicates
 *   "preview" tone.
 * - Reference line at the FIRE target gives the visual a "goal crossed"
 *   moment that's the whole story the app tells.
 */
export function HomePreviewChart() {
  const { data, fireNumber, fireAge, startAge } = useMemo(() => {
    const scenario = createDefaultScenario();
    const summary = calculateQuickFireSummary(scenario);
    const startAge = scenario.profile.age;
    // Truncate the projection at the FIRE-crossing year + 4 years of
    // headroom so the goal-line intersection lands near the visual center
    // of the chart rather than hugging the right edge.
    const fireIndex = summary.projection.findIndex(
      (p) => p.balance >= summary.fireNumber,
    );
    const horizon =
      fireIndex >= 0
        ? Math.min(fireIndex + 5, summary.projection.length)
        : summary.projection.length;
    const data = summary.projection.slice(0, horizon).map((p) => ({
      age: startAge + p.year,
      balance: Math.round(p.balance),
    }));
    return {
      data,
      fireNumber: summary.fireNumber,
      fireAge: summary.fireAge,
      startAge,
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--surface-border)] bg-[var(--gradient-card-feature)] p-6 shadow-[var(--elevation-3)] sm:p-8">
        {/* Decorative ember orbs — blurred radial gradients anchored to the
            corners give the card atmospheric depth without visible shapes.
            Match the PageHero vocabulary so the two surfaces feel related. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.14)_0%,transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(247,201,72,0.08)_0%,transparent_72%)] blur-2xl"
        />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]">
              <span
                aria-hidden="true"
                className="inline-block h-px w-6 bg-[var(--gradient-ember-line)]"
              />
              Sample projection
            </p>
            <p className="mt-2 font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
              Here&rsquo;s what a plan looks like
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              $185K starting portfolio &middot; $36K/yr invested &middot; 5% real
              return &middot; crosses {formatCompactCurrency(fireNumber)} at age{" "}
              {fireAge !== null ? Math.round(fireAge) : "—"}.
            </p>
          </div>
          <Link
            href={"/accumulation" as Route}
            className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            Explore interactively →
          </Link>
        </div>

        <div className="relative mt-4 h-48 w-full sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
            >
              <defs>
                {/* Multi-stop fill — flame highlight at the top transitions
                    through ember to a near-transparent base. Reads richer
                    than a single-stop fade without being loud. */}
                <linearGradient id="home-preview-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--flame)" stopOpacity={0.28} />
                  <stop offset="40%" stopColor="var(--ember)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--ember)" stopOpacity={0} />
                </linearGradient>
                {/* Stroke gradient so the line itself reads warmer toward
                    the top where the balance crosses FIRE. */}
                <linearGradient id="home-preview-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="var(--ember)" />
                  <stop offset="100%" stopColor="var(--flame)" />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="age"
                type="number"
                domain={[startAge, "dataMax"]}
                ticks={[
                  startAge,
                  Math.round((startAge + (data.at(-1)?.age ?? startAge)) / 2),
                  data.at(-1)?.age ?? startAge,
                ]}
                tickFormatter={(v) => `Age ${v}`}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono-family)",
                  letterSpacing: "0.08em",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompactCurrency(v)}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono-family)",
                  letterSpacing: "0.08em",
                }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <ReferenceLine
                y={fireNumber}
                stroke="var(--ember)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `FIRE ${formatCompactCurrency(fireNumber)}`,
                  position: "insideTopRight",
                  fill: "var(--ember)",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono-family)",
                  letterSpacing: "0.08em",
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="url(#home-preview-stroke)"
                strokeWidth={2.5}
                fill="url(#home-preview-fill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
