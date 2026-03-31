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

export interface WithdrawalStrategyComparisonPoint {
  year: number;
  [key: string]: number | null | number;
}

export interface WithdrawalStrategySeries {
  key: string;
  label: string;
  color: string;
}

export function WithdrawalStrategyComparisonChart({
  data,
  series,
  ariaLabel = "Line chart comparing median annual withdrawals across the supported retirement spending strategies.",
}: {
  data: WithdrawalStrategyComparisonPoint[];
  series: WithdrawalStrategySeries[];
  ariaLabel?: string;
}) {
  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
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
          {series.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              name={entry.label}
              stroke={entry.color}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
