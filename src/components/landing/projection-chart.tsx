"use client";

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
const CONTRIBUTIONS_COLOR = "var(--chart-contributions)";
const GROWTH_COLOR = "var(--ember)";
const OPTIMISTIC_COLOR = "#22c55e";
const PESSIMISTIC_COLOR = "#ef4444";
const BASE_LINE_COLOR = "#ff6b35";
const COMPARISON_COLOR = "#7c3aed"; // purple — distinct from base ember

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
  /** If true, styled as a subtle event marker instead of a FIRE milestone */
  isEvent?: boolean;
  /** If true, styled as a goal reference line (retirement target) */
  isGoal?: boolean;
  /** Vertical offset for staggering overlapping labels (computed internally) */
  _offsetY?: number;
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
  comparisonLabel,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Array<{ dataKey: string; value: number; payload?: any }>;
  label?: string | number;
  startAge: number;
  showBands?: boolean;
  comparisonLabel?: string;
}) {
  if (!active || !payload?.length || label == null) return null;

  const dataPoint = payload[0]?.payload as (ChartDataPoint & { comparison?: number }) | undefined;
  if (!dataPoint) return null;

  const total = dataPoint.total;
  const contributions = dataPoint.contributions;
  const growth = dataPoint.growth;
  const comparison = dataPoint.comparison;
  const optimistic = dataPoint.optimistic;
  const pessimistic = dataPoint.pessimistic;
  const year = dataPoint.year;
  const age = startAge + year;
  const growthPct = total > 0 ? Math.round((growth / total) * 100) : 0;
  const hasComparison = comparisonLabel && comparison != null;
  const delta = hasComparison ? comparison - total : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--card)] shadow-[0_4px_24px_rgba(26,17,24,0.1)]">
      <div className="h-0.5 w-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)]" />
      <div className="px-4 py-3 text-sm">
        <p className="font-medium">
          Year {year}{" "}
          <span className="text-muted-foreground">(Age {age})</span>
        </p>

        {hasComparison ? (
          /* ── Comparison mode: show both paths side by side ── */
          <div className="mt-2.5 space-y-1.5">
            <p className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: BASE_LINE_COLOR }} />
                Your plan
              </span>
              <span className="font-semibold text-foreground">{formatCompactCurrency(total)}</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded border-b border-dashed" style={{ borderColor: COMPARISON_COLOR }} />
                {comparisonLabel}
              </span>
              <span className="font-semibold" style={{ color: COMPARISON_COLOR }}>{formatCompactCurrency(comparison)}</span>
            </p>
            <div className="border-t border-border/40 pt-1.5">
              <p className="text-xs font-semibold" style={{ color: delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "var(--color-muted-foreground)" }}>
                {delta > 0 ? "+" : ""}{formatCompactCurrency(delta)} {delta > 0 ? "ahead" : delta < 0 ? "behind" : "same"}
              </p>
            </div>
          </div>
        ) : (
          /* ── Default mode: show breakdown ── */
          <>
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
          </>
        )}
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
  const x = viewBox?.x ?? 0;
  const yOffset = milestone._offsetY ?? 0;
  const isEvent = milestone.isEvent ?? false;
  const isGoal = milestone.isGoal ?? false;
  const labelY = 10 + yOffset;

  return (
    <g>
      {isGoal ? (
        /* ── Goal marker: subtle dashed style for retirement target ── */
        <>
          <text
            x={x}
            y={labelY}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="var(--muted-foreground)"
            opacity={0.8}
          >
            {milestone.label}
          </text>
          <circle cx={x} cy={labelY + 8} r={2.5} fill="var(--muted-foreground)" opacity={0.5} />
        </>
      ) : isEvent ? (
        /* ── Event marker: subtle gray label, no dot ── */
        <text
          x={x}
          y={labelY}
          textAnchor="middle"
          fontSize={10}
          fontWeight={500}
          fill="var(--muted-foreground)"
          opacity={0.7}
        >
          {milestone.label}
        </text>
      ) : (
        /* ── FIRE milestone: clean text + small dot ── */
        <>
          <circle cx={x} cy={labelY + 8} r={3} fill="var(--ember)" opacity={0.8} />
          <text
            x={x}
            y={labelY}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--ember)"
            letterSpacing={0.3}
          >
            {milestone.label}
          </text>
        </>
      )}
    </g>
  );
}

/* ── Legend ── */

export function ChartLegend({ showBands, comparisonLabel }: { showBands?: boolean; comparisonLabel?: string }) {
  const useLineStyle = showBands || !!comparisonLabel;
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
      ) : comparisonLabel ? (
        /* Comparison mode: show line legends for base + comparison */
        <>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: BASE_LINE_COLOR }} />
            Your plan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded border-b-2 border-dashed" style={{ borderColor: COMPARISON_COLOR }} />
            {comparisonLabel}
          </span>
        </>
      ) : (
        /* Default bar mode */
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
  comparisonData,
  comparisonLabel,
  ariaLabel = "Portfolio projection showing contributions and investment growth over time.",
}: {
  data: ProjectionPoint[];
  annualContribution?: number;
  milestones?: MilestoneMarker[];
  startAge?: number;
  showBands?: boolean;
  bandProjections?: { pessimistic: ProjectionPoint[]; optimistic: ProjectionPoint[] };
  comparisonData?: ProjectionPoint[];
  comparisonLabel?: string;
  ariaLabel?: string;
}) {
  const { chartData: rawChartData, crossover } = buildChartData(
    data,
    annualContribution,
    startAge,
    showBands ? bandProjections : undefined,
  );
  const target = data[0]?.target ?? 0;

  // Merge comparison data into chart points
  const chartData = rawChartData.map((point, i) => ({
    ...point,
    comparison: comparisonData?.[i]?.balance,
  }));

  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-72 w-full sm:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 44, right: 24, left: 8, bottom: 28 }}>
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
            content={<ChartTooltip startAge={startAge} showBands={showBands} comparisonLabel={comparisonLabel} />}
            cursor={showBands || comparisonData ? { stroke: "var(--color-muted-foreground)", strokeOpacity: 0.2 } : { fill: "var(--color-muted-foreground)", opacity: 0.04 }}
          />

          {/* FIRE target horizontal reference */}
          {target > 0 ? (
            <ReferenceLine
              y={target}
              stroke="var(--ember)"
              strokeDasharray="6 4"
              strokeOpacity={0.3}
              isFront={false}
              label={{
                value: `${formatCompactCurrency(target)} target`,
                position: "right",
                style: { fontSize: 9, fill: "var(--ember)", fontWeight: 500, opacity: 0.6 },
              }}
            />
          ) : null}

          {/* Milestone reference lines — stagger overlapping labels */}
          {(() => {
            const sorted = [...milestones].sort((a, b) => a.year - b.year);
            const OVERLAP_THRESHOLD = 2;
            const STAGGER_PX = 16;
            let prevYear = -999;
            let staggerLevel = 0;
            for (const m of sorted) {
              if (Math.abs(m.year - prevYear) <= OVERLAP_THRESHOLD) {
                staggerLevel += 1;
              } else {
                staggerLevel = 0;
              }
              m._offsetY = staggerLevel * STAGGER_PX;
              prevYear = m.year;
            }
            return sorted.map((m) => (
              <ReferenceLine
                key={m.label}
                x={m.year}
                stroke={m.isGoal ? "var(--muted-foreground)" : m.isEvent ? "var(--muted-foreground)" : "var(--ember)"}
                strokeDasharray={m.isGoal ? "4 4" : m.isEvent ? "2 4" : "3 3"}
                strokeOpacity={m.isGoal ? 0.15 : m.isEvent ? 0.1 : 0.15}
                label={<MilestoneLabel milestone={m} />}
              />
            ));
          })()}

          {showBands || comparisonData ? (
            /* ── Line mode: used for bands OR comparison ── */
            <>
              {/* Uncertainty bands (only when showBands is on) */}
              {showBands ? (
                <>
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
                </>
              ) : null}
              {/* Base case line */}
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
            /* ── Bar mode: stacked bars (default) ── */
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

          {/* Comparison overlay line (when a what-if scenario is selected) */}
          {comparisonData ? (
            <Line
              dataKey="comparison"
              type="monotone"
              stroke={COMPARISON_COLOR}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
              name="comparison"
            />
          ) : null}

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
