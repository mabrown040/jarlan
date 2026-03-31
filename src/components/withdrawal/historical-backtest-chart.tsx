"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatCompactCurrency } from "@/lib/calc";
import type { PercentileBandPoint } from "@/lib/sim/contracts";

type FanChartPoint = PercentileBandPoint & {
  outerBandBase: number;
  outerBandSize: number;
  innerBandBase: number;
  innerBandSize: number;
};

function FanChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: FanChartPoint }>;
  label?: string | number;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--card)] p-4 text-sm text-foreground shadow-[var(--shadow-surface)]"
    >
      <p className="font-medium text-foreground">Year {label}</p>
      <p className="mt-1 text-xs text-muted-foreground">Age {point.age}</p>
      <div className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">10th percentile</span>
          <span>{formatCompactCurrency(point.p10)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">25th percentile</span>
          <span>{formatCompactCurrency(point.p25)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 font-medium text-foreground">
          <span>Median</span>
          <span>{formatCompactCurrency(point.p50)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">75th percentile</span>
          <span>{formatCompactCurrency(point.p75)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">90th percentile</span>
          <span>{formatCompactCurrency(point.p90)}</span>
        </div>
      </div>
    </div>
  );
}

export function HistoricalBacktestChart({
  data,
  ariaLabel = "Portfolio percentile chart showing 10th percentile, median, and 90th percentile outcomes across retirement years.",
  className,
}: {
  data: PercentileBandPoint[];
  ariaLabel?: string;
  className?: string;
}) {
  const chartData: FanChartPoint[] = data.map((point) => ({
    ...point,
    outerBandBase: point.p10,
    outerBandSize: Math.max(point.p90 - point.p10, 0),
    innerBandBase: point.p25,
    innerBandSize: Math.max(point.p75 - point.p25, 0),
  }));

  return (
    <ChartFrame ariaLabel={ariaLabel} className={className ?? "h-80 w-full"}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <AreaChart data={chartData} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.35} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            label={{ value: "Years in retirement", position: "insideBottom", offset: -4 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={84}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
          />
          <Tooltip content={<FanChartTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Area
            type="monotone"
            dataKey="outerBandBase"
            stackId="outerBand"
            stroke="transparent"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="outerBandSize"
            stackId="outerBand"
            name="10th-90th band"
            stroke="transparent"
            fill="var(--color-primary)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="innerBandBase"
            stackId="innerBand"
            stroke="transparent"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="innerBandSize"
            stackId="innerBand"
            name="25th-75th band"
            stroke="transparent"
            fill="var(--ember)"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="p10"
            name="10th percentile"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            dot={false}
            legendType="none"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="p50"
            name="Median"
            stroke="var(--color-chart-1)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="p90"
            name="90th percentile"
            stroke="var(--color-primary)"
            strokeDasharray="4 4"
            dot={false}
            legendType="none"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
