"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatPercent } from "@/lib/calc";

export function FailureRateChart({
  data,
  ariaLabel = "Line chart showing cumulative probability of portfolio failure by retirement year.",
}: {
  data: Array<{ year: number; cumulativeFailureRate: number }>;
  ariaLabel?: string;
}) {
  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <LineChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.35} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => formatPercent(Number(value), 0)}
          />
          <Tooltip
            formatter={(value) => [
              formatPercent(Number(value ?? 0), 1),
              "Cumulative failure rate",
            ]}
            labelFormatter={(value) => `Year ${value}`}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativeFailureRate"
            stroke="var(--glow-soft)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
