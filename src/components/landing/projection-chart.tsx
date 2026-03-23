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

/* ── Brand colors ── */
const CONTRIBUTIONS_COLOR = "#9B8B73"; // warm sand — pairs with ember
const GROWTH_COLOR = "var(--ember)"; // #ff6b35

/* ── Types ── */

interface BarDataPoint {
  year: number;
  contributions: number;
  growth: number;
  target: number;
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
    <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--card)] shadow-[0_4px_24px_rgba(26,17,24,0.1)]">
      {/* Accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)]" />
      <div className="px-4 py-3 text-sm">
        <p className="font-medium">
          Year {label}{" "}
          <span className="text-muted-foreground">(Age {startAge + label})</span>
        </p>
        <div className="mt-2.5 space-y-1 text-muted-foreground">
          <p>
            Total portfolio:{" "}
            <span className="font-semibold text-foreground">
              {formatCompactCurrency(total)}
            </span>
          </p>
          <div className="my-2 border-t border-border/40" />
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: CONTRIBUTIONS_COLOR }} />
            Contributions: {formatCompactCurrency(contributions)}
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--ember)" }} />
            Growth: {formatCompactCurrency(growth)}
          </p>
        </div>
        <p
          className="mt-2.5 text-xs font-semibold"
          style={{
            color: growthPct > 50 ? "var(--ember)" : "var(--color-muted-foreground)",
          }}
        >
          Growth is {growthPct}% of total{growthPct > 50 ? " \u{1F4C8}" : ""}
        </p>
      </div>
    </div>
  );
}

/* ── Milestone Label with Hover ── */

function MilestoneLabel({
  viewBox,
  milestone,
  offsetY,
}: {
  viewBox?: { x?: number; y?: number };
  milestone: MilestoneMarker;
  offsetY?: number;
}) {
  const [showTip, setShowTip] = useState(false);
  const x = viewBox?.x ?? 0;
  const y = offsetY ?? 6;

  return (
    <g>
      {/* Small dot at axis */}
      <circle cx={x} cy={12} r={2.5} fill="var(--ember)" opacity={0.6} />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize={9}
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
        <foreignObject x={x - 130} y={y + 6} width={260} height={70}>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--card)] px-3 py-2 text-[11px] leading-snug text-muted-foreground shadow-lg">
            {milestone.description}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
}

/* ── Legend (inline, rendered outside chart by parent) ── */

export function ChartLegend({ showBands }: { showBands?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CONTRIBUTIONS_COLOR }} />
        Your contributions
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--ember)" }} />
        Investment growth
      </span>
      {showBands ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(34,197,94,0.4)" }} />
            Optimistic (+2%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(239,68,68,0.35)" }} />
            Pessimistic (-2%)
          </span>
        </>
      ) : null}
    </div>
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
  const target = data[0]?.target ?? 0;

  // Offset milestone labels that are too close together
  const milestoneOffsets = milestones.map((m, i) => {
    if (i > 0 && Math.abs(milestones[i - 1].year - m.year) <= 2) {
      return -4; // shift up to avoid overlap
    }
    return 6;
  });

  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-64 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={barData} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.2}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            label={{
              value: "Years from now",
              position: "insideBottom",
              offset: -4,
              style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            width={56}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />

          {/* Tooltip */}
          <RechartsTooltip
            content={<ChartTooltip startAge={startAge} />}
            cursor={{ fill: "var(--color-muted-foreground)", opacity: 0.04 }}
          />

          {/* FIRE target horizontal reference */}
          {target > 0 ? (
            <ReferenceLine
              y={target}
              stroke="var(--ember)"
              strokeDasharray="6 4"
              strokeOpacity={0.3}
              label={{
                value: `${formatCompactCurrency(target)} target`,
                position: "right",
                style: { fontSize: 9, fill: "var(--ember)", fontWeight: 500, opacity: 0.6 },
              }}
            />
          ) : null}

          {/* Uncertainty bands (behind bars) */}
          {showBands && bandProjections ? (
            <>
              <Area
                dataKey="optimistic"
                type="monotone"
                fill="rgba(34,197,94,0.15)"
                stroke="rgba(34,197,94,0.35)"
                strokeWidth={1.5}
                isAnimationActive={false}
                dot={false}
                name="optimistic"
              />
              <Area
                dataKey="pessimistic"
                type="monotone"
                fill="rgba(239,68,68,0.12)"
                stroke="rgba(239,68,68,0.3)"
                strokeWidth={1.5}
                isAnimationActive={false}
                dot={false}
                name="pessimistic"
              />
            </>
          ) : null}

          {/* Milestone reference lines */}
          {milestones.map((m, i) => (
            <ReferenceLine
              key={m.label}
              x={m.year}
              stroke="var(--ember)"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              label={<MilestoneLabel milestone={m} offsetY={milestoneOffsets[i]} />}
            />
          ))}

          {/* Crossover: subtle dotted line only (callout card handles the explanation) */}
          {crossover ? (
            <ReferenceLine
              x={crossover.year}
              stroke="var(--ember)"
              strokeDasharray="2 4"
              strokeOpacity={0.25}
            />
          ) : null}

          {/* Stacked bars */}
          <Bar
            dataKey="contributions"
            stackId="portfolio"
            fill={CONTRIBUTIONS_COLOR}
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name="contributions"
          />
          <Bar
            dataKey="growth"
            stackId="portfolio"
            fill={GROWTH_COLOR}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            name="growth"
          />
        </ComposedChart>
      </ResponsiveContainer>
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
