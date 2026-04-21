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
      <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
              Sample projection
            </p>
            <p className="mt-1 font-display text-xl tracking-[-0.03em] text-foreground">
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

        <div className="mt-4 h-48 w-full sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
            >
              <defs>
                <linearGradient id="home-preview-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ember)" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="var(--ember)" stopOpacity={0.02} />
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
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompactCurrency(v)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <ReferenceLine
                y={fireNumber}
                stroke="var(--ember)"
                strokeDasharray="4 4"
                strokeOpacity={0.55}
                label={{
                  value: `FIRE ${formatCompactCurrency(fireNumber)}`,
                  position: "insideTopRight",
                  fill: "var(--ember)",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--ember)"
                strokeWidth={2}
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
