"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatYears } from "@/lib/calc";

export interface ScenarioVariantComparisonPoint {
  name: string;
  yearsToFi: number;
}

export function ScenarioVariantComparisonChart({
  data,
  ariaLabel = "Bar chart comparing years to financial independence across the scenario variants.",
}: {
  data: ScenarioVariantComparisonPoint[];
  ariaLabel?: string;
}) {
  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.35} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            formatter={(value) => [formatYears(Number(value)), "Years to FI"]}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <Bar dataKey="yearsToFi" fill="var(--ember)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
