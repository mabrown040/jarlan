"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
const CONTRIBUTIONS_COLOR = "#9B8B73";
const GROWTH_COLOR = "var(--ember)";
const OPTIMISTIC_COLOR = "#22c55e";
const PESSIMISTIC_COLOR = "#ef4444";
const BASE_LINE_COLOR = "#ff6b35";

/* ── Types ── */

interface ChartDataPoint {
  year: number;
  label: string; // "Yr 0 (Age 30)"
  contributions: number;
  growth: number;
  total: number; // contributions + growth (for line mode)
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

function buildChartData(
  data: ProjectionPoint[],
  annualContribution: number,
  startAge: number,
  bandProjections?: { pessimistic: ProjectionPoint[]; optimistic: ProjectionPoint[] },
): { chartData: ChartDataPoint[]; crossover: CrossoverInfo | null } {
  if (data.length === 0) return { chartData: [], crossover: null };

  const startBalance = data[0].balance;
  let cumulativeContributions = startBalance;
  let crossover: CrossoverInfo | null = null;

  const chartData = data.map((point, i) => {
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
      label: `${startAge + point.year}`,
      contributions,
      growth: roundedGrowth,
      total: contributions + roundedGrowth,
      target: point.target,
      pessimistic: bandProjections?.pessimistic[i]?.balance,
      optimistic: bandProjections?.optimistic[i]?.balance,
    };
  });

  return { chartData, crossover };
}

/* ── Custom Tooltip ── */

function ChartTooltip({
  active,
  payload,
  label,
  startAge,
  showBands,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ dataKey: string; value: number; payload?: any }>;
  label?: string | number;
  startAge: number;
  showBands?: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;

  // Pull from the underlying data point — works in both bar and line mode
  const dataPoint = payload[0]?.payload as ChartDataPoint | undefined;
  if (!dataPoint) return null;

  const contributions = dataPoint.contributions;
  const growth = dataPoint.growth;
  const total = dataPoint.total;
  const optimistic = dataPoint.optimistic;
  const pessimistic = dataPoint.pessimistic;
  const year = dataPoint.year;
  const age = startAge + year;
  const growthPct = total > 0 ? Math.round((growth / total) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--card)] shadow-[0_4px_24px_rgba(26,17,24,0.1)]">
      <div className="h-0.5 w-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)]" />
      <div className="px-4 py-3 text-sm">
        <p className="font-medium">
          Year {year}{" "}
          <span className="text-muted-foreground">(Age {age})</span>
        </p>
        <div className="mt-2.5 space-y-1 text-muted-foreground">
          <p>
            {showBands ? "Base case" : "Total portfolio"}:{" "}
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
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: BASE_LINE_COLOR }} />
            Growth: {formatCompactCurrency(growth)}
          </p>
          {showBands && optimistic != null && pessimistic != null ? (
            <>
              <div className="my-2 border-t border-border/40" />
              <p className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: OPTIMISTIC_COLOR, opacity: 0.5 }} />
                If +2% return: {formatCompactCurrency(optimistic)}
              </p>
              <p className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: PESSIMISTIC_COLOR, opacity: 0.5 }} />
                If -2% return: {formatCompactCurrency(pessimistic)}
              </p>
            </>
          ) : null}
        </div>
        <p
          className="mt-2.5 text-xs font-semibold"
          style={{ color: growthPct > 50 ? "var(--ember)" : "var(--color-muted-foreground)" }}
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
}: {
  viewBox?: { x?: number; y?: number };
  milestone: MilestoneMarker;
}) {
  const [showTip, setShowTip] = useState(false);
  const x = viewBox?.x ?? 0;

  return (
    <g>
      <circle cx={x} cy={30} r={3} fill="var(--ember)" opacity={0.7} />
      <text
        x={x}
        y={22}
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
        <foreignObject x={x - 130} y={34} width={260} height={70}>
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--card)] px-3 py-2 text-[11px] leading-snug text-muted-foreground shadow-lg">
            {milestone.description}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
}

/* ── Legend ── */

export function ChartLegend({ showBands }: { showBands?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
      {showBands ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: BASE_LINE_COLOR }} />
            Base case
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(34,197,94,0.3)" }} />
            Optimistic (+2%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(239,68,68,0.25)" }} />
            Pessimistic (-2%)
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CONTRIBUTIONS_COLOR }} />
            Your contributions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: BASE_LINE_COLOR }} />
            Investment growth
          </span>
        </>
      )}
    </div>
  );
}

/* ── Custom X-axis tick showing Age ── */

function DualAxisTick({
  x,
  y,
  payload,
  startAge,
}: {
  x?: number;
  y?: number;
  payload?: { value: number };
  startAge: number;
}) {
  const year = payload?.value ?? 0;
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        dy={12}
        textAnchor="middle"
        fontSize={11}
        fill="var(--color-muted-foreground)"
      >
        {year}
      </text>
      <text
        dy={24}
        textAnchor="middle"
        fontSize={9}
        fill="var(--color-muted-foreground)"
        opacity={0.6}
      >
        {startAge + year}
      </text>
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
  const { chartData, crossover } = buildChartData(
    data,
    annualContribution,
    startAge,
    showBands ? bandProjections : undefined,
  );
  const target = data[0]?.target ?? 0;

  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-72 w-full sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 40, right: 24, left: 8, bottom: 28 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.2}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.3 }}
            tick={<DualAxisTick startAge={startAge} />}
            height={40}
            label={{
              value: "Year / Age",
              position: "insideBottom",
              offset: -8,
              style: { fontSize: 10, fill: "var(--color-muted-foreground)", opacity: 0.5 },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)", strokeOpacity: 0.3 }}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            width={56}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />

          {/* Tooltip */}
          <RechartsTooltip
            content={<ChartTooltip startAge={startAge} showBands={showBands} />}
            cursor={showBands ? { stroke: "var(--color-muted-foreground)", strokeOpacity: 0.2 } : { fill: "var(--color-muted-foreground)", opacity: 0.04 }}
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

          {/* Milestone reference lines */}
          {milestones.map((m) => (
            <ReferenceLine
              key={m.label}
              x={m.year}
              stroke="var(--ember)"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              label={<MilestoneLabel milestone={m} />}
            />
          ))}

          {/* Crossover: subtle dotted line */}
          {crossover ? (
            <ReferenceLine
              x={crossover.year}
              stroke="var(--ember)"
              strokeDasharray="2 4"
              strokeOpacity={0.25}
            />
          ) : null}

          {showBands ? (
            /* ── Line mode: 3 lines with shaded range ── */
            <>
              {/* Shaded band between optimistic and pessimistic */}
              <Area
                dataKey="optimistic"
                type="monotone"
                fill="rgba(34,197,94,0.1)"
                stroke="none"
                isAnimationActive={false}
                dot={false}
                name="optimistic"
              />
              <Area
                dataKey="pessimistic"
                type="monotone"
                fill="var(--card)"
                stroke="none"
                isAnimationActive={false}
                dot={false}
                name="pessimistic"
              />
              {/* Lines */}
              <Line
                dataKey="optimistic"
                type="monotone"
                stroke={OPTIMISTIC_COLOR}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                name="optimistic-line"
              />
              <Line
                dataKey="pessimistic"
                type="monotone"
                stroke={PESSIMISTIC_COLOR}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                name="pessimistic-line"
              />
              <Line
                dataKey="total"
                type="monotone"
                stroke={BASE_LINE_COLOR}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                name="total"
              />
            </>
          ) : (
            /* ── Bar mode: stacked bars ── */
            <>
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
            </>
          )}
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
  return buildChartData(data, annualContribution, 0).crossover;
}
