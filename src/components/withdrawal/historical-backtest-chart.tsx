"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatCompactCurrency } from "@/lib/calc";
import type { PercentileBandPoint } from "@/lib/sim/contracts";

export function HistoricalBacktestChart({
  data,
  ariaLabel = "Portfolio percentile chart showing 10th percentile, median, and 90th percentile outcomes across retirement years.",
}: {
  data: PercentileBandPoint[];
  ariaLabel?: string;
}) {
  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
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
          <Tooltip
            formatter={(value, name) => [
              formatCompactCurrency(Number(value ?? 0)),
              String(name),
            ]}
            labelFormatter={(label) => `Year ${label}`}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="p10"
            name="10th percentile"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            dot={false}
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
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
