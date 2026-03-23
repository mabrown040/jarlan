"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatCompactCurrency } from "@/lib/calc/format";
import type { ProjectionPoint } from "@/lib/domain/types";

interface BarDataPoint {
  year: number;
  contributions: number;
  growth: number;
  target: number;
}

/**
 * Split each projection year into cumulative contributions vs growth.
 * contributions = startBalance + sum of (balance change - estimated growth)
 * growth = balance - contributions
 */
function buildBarData(
  data: ProjectionPoint[],
  annualContribution: number,
): BarDataPoint[] {
  if (data.length === 0) return [];

  const startBalance = data[0].balance;
  let cumulativeContributions = startBalance;

  return data.map((point, i) => {
    if (i > 0) {
      cumulativeContributions += annualContribution;
    }

    const growth = Math.max(point.balance - cumulativeContributions, 0);

    return {
      year: point.year,
      contributions: Math.round(Math.min(cumulativeContributions, point.balance)),
      growth: Math.round(growth),
      target: point.target,
    };
  });
}

export function ProjectionChart({
  data,
  annualContribution = 0,
  milestones = [],
  ariaLabel = "Portfolio projection showing contributions and investment growth over time.",
}: {
  data: ProjectionPoint[];
  annualContribution?: number;
  milestones?: Array<{ year: number; label: string }>;
  ariaLabel?: string;
}) {
  const barData = buildBarData(data, annualContribution);
  const target = data[0]?.target ?? 0;

  return (
    <ChartFrame ariaLabel={ariaLabel} className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.25} vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            label={{
              value: "Years from now",
              position: "insideBottom",
              offset: -4,
              style: { fontSize: 12, fill: "var(--color-muted-foreground)" },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            width={64}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />
          <RechartsTooltip
            formatter={(value, name) => [
              formatCompactCurrency(Number(value ?? 0)),
              name === "contributions" ? "Contributions" : "Growth",
            ]}
            labelFormatter={(label) => `Year ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-soft)",
              fontSize: 13,
            }}
          />
          {milestones.map((m) => (
            <ReferenceLine
              key={m.label}
              x={m.year}
              stroke="var(--ember)"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{
                value: m.label,
                position: "top",
                style: { fontSize: 10, fill: "var(--ember)", fontWeight: 600 },
              }}
            />
          ))}
          <Bar
            dataKey="contributions"
            stackId="portfolio"
            fill="var(--color-chart-3)"
            radius={[0, 0, 0, 0]}
            isAnimationActive={false}
            name="contributions"
          />
          <Bar
            dataKey="growth"
            stackId="portfolio"
            fill="var(--color-chart-1)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            name="growth"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
