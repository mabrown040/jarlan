"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompactCurrency } from "@/lib/calc/format";
import type { ProjectionPoint } from "@/lib/domain/types";

/**
 * Side-by-side projection comparison. Two plans, two lines, shared
 * axes. Kept deliberately separate from the landing ProjectionChart —
 * that one renders contributions/growth stacked with bands; this one
 * is the simplest possible "which plan gets there faster?" view.
 *
 * Points are joined on year (array index, since projections start
 * from each scenario's `profile.age`). If the two plans have different
 * horizons, the shorter one truncates cleanly at its own end.
 */
export interface ComparisonSeries {
  label: string;
  projection: ProjectionPoint[];
  fireNumber: number;
  startAge: number;
  color: string;
}

export function ComparisonChart({
  left,
  right,
}: {
  left: ComparisonSeries;
  right: ComparisonSeries;
}) {
  // Align series by year-offset, using whichever has more points.
  const maxYears = Math.max(
    left.projection.length,
    right.projection.length,
  );
  const data = Array.from({ length: maxYears }, (_, year) => ({
    year,
    // Use the LEFT series' start age as the x-axis label basis. Both
    // series show on the same x — if their ages differ we still plot
    // them index-aligned (year 0 = first year), which is the
    // semantically-right comparison.
    ageLabel: `${left.startAge + year}`,
    leftBalance: left.projection[year]?.balance,
    rightBalance: right.projection[year]?.balance,
  }));

  // Pick the lower FIRE number as the primary goal line so both plans'
  // crossings are visible. The tooltip labels each line distinctly.
  const leftFire = left.fireNumber;
  const rightFire = right.fireNumber;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 1, height: 1 }}
      >
        <LineChart
          data={data}
          margin={{ top: 12, right: 18, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.35}
          />
          <XAxis
            dataKey="ageLabel"
            tickLine={false}
            axisLine={false}
            tick={{
              fontSize: 10,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono-family)",
              letterSpacing: "0.06em",
            }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{
              fontSize: 10,
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono-family)",
              letterSpacing: "0.06em",
            }}
          />
          {/* Two goal lines, one per plan's FIRE number. Dashed,
              half-opacity so they recede. */}
          <ReferenceLine
            y={leftFire}
            stroke={left.color}
            strokeDasharray="4 4"
            strokeOpacity={0.45}
            label={{
              value: `${left.label} goal`,
              position: "insideTopLeft",
              fill: left.color,
              fontSize: 9,
              fontWeight: 600,
              fontFamily: "var(--font-mono-family)",
            }}
          />
          {Math.abs(leftFire - rightFire) / Math.max(leftFire, 1) > 0.02 ? (
            <ReferenceLine
              y={rightFire}
              stroke={right.color}
              strokeDasharray="4 4"
              strokeOpacity={0.45}
              label={{
                value: `${right.label} goal`,
                position: "insideTopRight",
                fill: right.color,
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "var(--font-mono-family)",
              }}
            />
          ) : null}
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? formatCompactCurrency(value) : "—",
              String(name),
            ]}
            labelFormatter={(label) => `Age ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-soft)",
              fontSize: 12,
            }}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="leftBalance"
            name={left.label}
            stroke={left.color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="rightBalance"
            name={right.label}
            stroke={right.color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
