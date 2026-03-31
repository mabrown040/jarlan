"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatPercent } from "@/lib/calc";
import type { MortalityRiskPoint } from "@/lib/sim";

export function RichBrokeDeadChart({
  data,
  ariaLabel = "Stacked area chart showing the probability of being alive and solvent, alive and broke, or dead across retirement years.",
}: {
  data: MortalityRiskPoint[];
  ariaLabel?: string;
}) {
  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <AreaChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
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
            width={72}
            domain={[0, 1]}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => formatPercent(Number(value), 0)}
          />
          <Tooltip
            formatter={(value, name) => [
              formatPercent(Number(value ?? 0), 1),
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
          <Area
            type="monotone"
            dataKey="aliveAndSolventProbability"
            name="Alive and solvent"
            stackId="probability"
            stroke="var(--success)"
            fill="rgba(34,197,94,0.28)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="aliveAndBrokeProbability"
            name="Alive and broke"
            stackId="probability"
            stroke="var(--warning)"
            fill="rgba(251,191,36,0.25)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="deadProbability"
            name="Dead"
            stackId="probability"
            stroke="var(--color-muted-foreground)"
            fill="rgba(148,163,184,0.28)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
