"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatCompactCurrency } from "@/lib/calc/format";
import type { ProjectionPoint } from "@/lib/domain/types";

/* ── Types ── */

interface BarDataPoint {
  year: number;
  contributions: number;
  growth: number;
  target: number;
  /** Band data (optional, only present when bands are computed) */
  pessimistic?: number;
  optimistic?: number;
}

export interface MilestoneMarker {
  year: number;
  label: string;
  target?: number;
  description?: string;
}

export interface CrossoverInfo {
  year: number;
  contributions: number;
  growth: number;
}

/* ── Data helpers ── */

/**
 * Split each projection year into cumulative contributions vs growth.
 * Also finds the "crossover year" where growth first exceeds contributions.
 */
function buildBarData(
  data: ProjectionPoint[],
  annualContribution: number,
  bandProjections?: { pessimistic: ProjectionPoint[]; optimistic: ProjectionPoint[] },
): { barData: BarDataPoint[]; crossover: CrossoverInfo | null } {
  if (data.length === 0) return { barData: [], crossover: null };

  const startBalance = data[0].balance;
  let cumulativeContributions = startBalance;
  let crossover: CrossoverInfo | null = null;

  const barData = data.map((point, i) => {
    if (i > 0) {
      cumulativeContributions += annualContribution;
    }

    const growth = Math.max(point.balance - cumulativeContributions, 0);
    const contributions = Math.round(Math.min(cumulativeContributions, point.balance));
    const roundedGrowth = Math.round(growth);

    // Track first crossover
    if (!crossover && roundedGrowth > contributions && i > 0) {
      crossover = { year: point.year, contributions, growth: roundedGrowth };
    }

    return {
      year: point.year,
      contributions,
      growth: roundedGrowth,
      target: point.target,
      pessimistic: bandProjections?.pessimistic[i]?.balance,
      optimistic: bandProjections?.optimistic[i]?.balance,
    };
  });

  return { barData, crossover };
}

/* ── Custom Tooltip ── */

function ChartTooltip({
  active,
  payload,
  label,
  startAge,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: number;
  startAge: number;
}) {
  if (!active || !payload?.length || label == null) return null;

  const contributions = payload.find((p) => p.dataKey === "contributions")?.value ?? 0;
  const growth = payload.find((p) => p.dataKey === "growth")?.value ?? 0;
  const total = contributions + growth;
  const growthPct = total > 0 ? Math.round((growth / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--card)] p-3 text-sm shadow-[var(--shadow-soft)]">
      <p className="font-medium">
        Year {label}{" "}
        <span className="text-muted-foreground">(Age {startAge + label})</span>
      </p>
      <div className="mt-2 space-y-1 text-muted-foreground">
        <p>
          Total portfolio:{" "}
          <span className="font-medium text-foreground">
            {formatCompactCurrency(total)}
          </span>
        </p>
        <div className="my-1.5 border-t border-border/40" />
        <p>Your contributions: {formatCompactCurrency(contributions)}</p>
        <p>Investment growth: {formatCompactCurrency(growth)}</p>
      </div>
      <p
        className="mt-2 text-xs font-medium"
        style={{
          color: growthPct > 50 ? "var(--ember)" : "var(--color-muted-foreground)",
        }}
      >
        Growth is {growthPct}% of total{growthPct > 50 ? " \u{1F4C8}" : ""}
      </p>
    </div>
  );
}

/* ── Milestone Label with Hover ── */

function MilestoneLabel({
  viewBox,
  milestone,
}: {
  viewBox?: { x?: number; y?: number };
  milestone: MilestoneMarker;
}) {
  const [showTip, setShowTip] = useState(false);
  const x = viewBox?.x ?? 0;

  return (
    <g>
      <text
        x={x}
        y={8}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fill="var(--ember)"
        style={{ cursor: milestone.description ? "pointer" : "default" }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onClick={() => setShowTip((v) => !v)}
      >
        {milestone.label}
      </text>
      {showTip && milestone.description ? (
        <foreignObject x={x - 120} y={14} width={240} height={80}>
          <div
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--card)] p-2 text-[11px] leading-snug text-muted-foreground shadow-md"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...({} as any)}
          >
            {milestone.description}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
}

/* ── Main Chart ── */

export function ProjectionChart({
  data,
  annualContribution = 0,
  milestones = [],
  startAge = 30,
  showBands = false,
  bandProjections,
  ariaLabel = "Portfolio projection showing contributions and investment growth over time.",
}: {
  data: ProjectionPoint[];
  annualContribution?: number;
  milestones?: MilestoneMarker[];
  startAge?: number;
  showBands?: boolean;
  bandProjections?: { pessimistic: ProjectionPoint[]; optimistic: ProjectionPoint[] };
  ariaLabel?: string;
}) {
  const { barData, crossover } = buildBarData(
    data,
    annualContribution,
    showBands ? bandProjections : undefined,
  );

  return (
    <ChartFrame ariaLabel={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={barData} margin={{ top: 20, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.25}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            label={{
              value: "Years from now",
              position: "insideBottom",
              offset: -4,
              style: { fontSize: 12, fill: "var(--color-muted-foreground)" },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            width={64}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />

          {/* Tooltip */}
          <RechartsTooltip
            content={<ChartTooltip startAge={startAge} />}
            cursor={{ fill: "var(--color-muted-foreground)", opacity: 0.06 }}
          />

          {/* Uncertainty bands (behind bars) */}
          {showBands && bandProjections ? (
            <>
              <Area
                dataKey="optimistic"
                type="monotone"
                fill="rgba(34,197,94,0.08)"
                stroke="rgba(34,197,94,0.2)"
                strokeWidth={1}
                isAnimationActive={false}
                dot={false}
                name="optimistic"
              />
              <Area
                dataKey="pessimistic"
                type="monotone"
                fill="rgba(239,68,68,0.06)"
                stroke="rgba(239,68,68,0.15)"
                strokeWidth={1}
                isAnimationActive={false}
                dot={false}
                name="pessimistic"
              />
            </>
          ) : null}

          {/* Milestone reference lines */}
          {milestones.map((m) => (
            <ReferenceLine
              key={m.label}
              x={m.year}
              stroke="var(--ember)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={<MilestoneLabel milestone={m} />}
            />
          ))}

          {/* Crossover marker */}
          {crossover ? (
            <ReferenceLine
              x={crossover.year}
              stroke="var(--ember)"
              strokeOpacity={0.7}
              strokeWidth={1.5}
              label={{
                value: "\u2726 Crossover",
                position: "top",
                style: { fontSize: 10, fill: "var(--ember)", fontWeight: 700 },
              }}
            />
          ) : null}

          {/* Stacked bars */}
          <Bar
            dataKey="contributions"
            stackId="portfolio"
            fill="var(--color-chart-3)"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name="contributions"
          />
          <Bar
            dataKey="growth"
            stackId="portfolio"
            fill="var(--color-chart-1)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            name="growth"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--color-chart-3)" }}
          />
          Your contributions
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "var(--color-chart-1)" }}
          />
          Investment growth
        </span>
        {showBands ? (
          <>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: "rgba(34,197,94,0.3)" }}
              />
              Optimistic (+2%)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: "rgba(239,68,68,0.3)" }}
              />
              Pessimistic (-2%)
            </span>
          </>
        ) : null}
      </div>
    </ChartFrame>
  );
}

/** Re-export crossover finder for use in workspace callout */
export function findCrossoverYear(
  data: ProjectionPoint[],
  annualContribution: number,
): CrossoverInfo | null {
  return buildBarData(data, annualContribution).crossover;
}
