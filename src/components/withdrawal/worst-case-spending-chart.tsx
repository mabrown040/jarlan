"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatCompactCurrency } from "@/lib/calc";
import type { SimulationSeriesPoint } from "@/lib/sim/contracts";

export function WorstCaseSpendingChart({
  data,
  initialWithdrawal,
  ariaLabel = "Line chart showing the annual spending path in the worst historical retirement cohort.",
  className,
}: {
  data: SimulationSeriesPoint[];
  initialWithdrawal: number;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <ChartFrame ariaLabel={ariaLabel} className={className ?? "h-72 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.35}
          />
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
            formatter={(value) => [formatCompactCurrency(Number(value ?? 0)), "Withdrawal"]}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as SimulationSeriesPoint | undefined;

              return point ? `Year ${label} · Age ${point.age}` : `Year ${label}`;
            }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <ReferenceLine
            y={initialWithdrawal}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
          />
          <Line
            type="monotone"
            dataKey="withdrawal"
            name="Withdrawal"
            stroke="var(--ember)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
