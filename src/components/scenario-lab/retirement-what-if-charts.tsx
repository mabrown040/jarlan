"use client";

import {
  Area,
  AreaChart,
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

import { ChartFrame } from "@/components/charts/chart-frame";
import { formatCompactCurrency, formatPercent } from "@/lib/calc";
import type {
  PercentileBandPoint,
  SimulationSeriesPoint,
} from "@/lib/sim/contracts";

function buildHistoricalComparisonData(
  baseData: PercentileBandPoint[],
  comparisonData: PercentileBandPoint[],
) {
  const maxLength = Math.max(baseData.length, comparisonData.length);

  return Array.from({ length: maxLength }, (_, index) => {
    const basePoint = baseData[index];
    const comparisonPoint = comparisonData[index] ?? basePoint;
    const point = comparisonPoint ?? basePoint;

    return {
      year: point?.year ?? index,
      age: point?.age ?? index,
      baseMedian: basePoint?.p50 ?? null,
      comparisonMedian: comparisonPoint?.p50 ?? null,
      comparisonP10: comparisonPoint?.p10 ?? null,
      comparisonP90: comparisonPoint?.p90 ?? null,
      outerBandBase: comparisonPoint?.p10 ?? 0,
      outerBandSize:
        comparisonPoint && comparisonPoint.p90 > comparisonPoint.p10
          ? comparisonPoint.p90 - comparisonPoint.p10
          : 0,
    };
  });
}

export function HistoricalScenarioComparisonChart({
  baseData,
  comparisonData,
}: {
  baseData: PercentileBandPoint[];
  comparisonData: PercentileBandPoint[];
}) {
  const data = buildHistoricalComparisonData(baseData, comparisonData);

  return (
    <ChartFrame
      ariaLabel="Historical comparison chart showing the base plan and selected scenario median retirement outcomes, plus the selected scenario's outcome band."
      className="h-[25rem] w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 18, left: 6, bottom: 8 }}>
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
            label={{
              value: "Years in retirement",
              position: "insideBottom",
              offset: -4,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={84}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
          />
          <Tooltip
            formatter={(value, name) => {
              if (value === null || value === undefined) {
                return ["—", name];
              }

              return [formatCompactCurrency(Number(value)), name];
            }}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as
                | { age?: number }
                | undefined;
              return point?.age
                ? `Year ${label} · Age ${Math.round(point.age)}`
                : `Year ${label}`;
            }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Area
            type="monotone"
            dataKey="outerBandBase"
            stackId="comparison-band"
            stroke="transparent"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="outerBandSize"
            stackId="comparison-band"
            name="With change range"
            stroke="transparent"
            fill="var(--ember)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="baseMedian"
            name="Your plan"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="comparisonMedian"
            name="With change"
            stroke="var(--ember)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function buildWorstCaseComparisonData(
  baseData: SimulationSeriesPoint[],
  comparisonData: SimulationSeriesPoint[],
) {
  const maxLength = Math.max(baseData.length, comparisonData.length);

  return Array.from({ length: maxLength }, (_, index) => {
    const basePoint = baseData[index];
    const comparisonPoint = comparisonData[index] ?? basePoint;
    const point = comparisonPoint ?? basePoint;

    return {
      year: point?.year ?? index,
      age: point?.age ?? index,
      baseWithdrawal: basePoint?.withdrawal ?? null,
      comparisonWithdrawal: comparisonPoint?.withdrawal ?? null,
    };
  });
}

export function WorstCaseScenarioComparisonChart({
  baseData,
  comparisonData,
  baseInitialWithdrawal,
  comparisonInitialWithdrawal,
}: {
  baseData: SimulationSeriesPoint[];
  comparisonData: SimulationSeriesPoint[];
  baseInitialWithdrawal: number;
  comparisonInitialWithdrawal: number;
}) {
  const data = buildWorstCaseComparisonData(baseData, comparisonData);

  return (
    <ChartFrame
      ariaLabel="Worst-case comparison chart showing the annual withdrawal path for the base plan and the selected scenario in their hardest historical cohorts."
      className="h-[25rem] w-full"
    >
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
            label={{
              value: "Years in retirement",
              position: "insideBottom",
              offset: -4,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={84}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
          />
          <Tooltip
            formatter={(value, name) => {
              if (value === null || value === undefined) {
                return ["—", name];
              }

              return [formatCompactCurrency(Number(value)), name];
            }}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as
                | { age?: number }
                | undefined;
              return point?.age
                ? `Year ${label} · Age ${Math.round(point.age)}`
                : `Year ${label}`;
            }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <ReferenceLine
            y={baseInitialWithdrawal}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="5 5"
            ifOverflow="extendDomain"
          />
          <ReferenceLine
            y={comparisonInitialWithdrawal}
            stroke="var(--ember)"
            strokeDasharray="5 5"
            ifOverflow="extendDomain"
          />
          <Line
            type="monotone"
            dataKey="baseWithdrawal"
            name="Your plan"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="comparisonWithdrawal"
            name="With change"
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

function buildFailureRateComparisonData(
  baseData: Array<{ year: number; cumulativeFailureRate: number }>,
  comparisonData: Array<{ year: number; cumulativeFailureRate: number }>,
) {
  const maxLength = Math.max(baseData.length, comparisonData.length);

  return Array.from({ length: maxLength }, (_, index) => ({
    year: comparisonData[index]?.year ?? baseData[index]?.year ?? index + 1,
    baseFailureRate: baseData[index]?.cumulativeFailureRate ?? null,
    comparisonFailureRate:
      comparisonData[index]?.cumulativeFailureRate ?? null,
  }));
}

export function FailureRateScenarioComparisonChart({
  baseData,
  comparisonData,
}: {
  baseData: Array<{ year: number; cumulativeFailureRate: number }>;
  comparisonData: Array<{ year: number; cumulativeFailureRate: number }>;
}) {
  const data = buildFailureRateComparisonData(baseData, comparisonData);

  return (
    <ChartFrame
      ariaLabel="Failure-rate comparison chart showing cumulative probability of failure for the base plan and selected scenario."
      className="h-[22rem] w-full"
    >
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
            label={{
              value: "Years in retirement",
              position: "insideBottom",
              offset: -4,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            tickFormatter={(value) => formatPercent(Number(value), 0)}
          />
          <Tooltip
            formatter={(value, name) => {
              if (value === null || value === undefined) {
                return ["—", name];
              }

              return [formatPercent(Number(value), 1), name];
            }}
            labelFormatter={(value) => `Year ${value}`}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid var(--surface-border)",
              background: "var(--card)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-surface)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="baseFailureRate"
            name="Your plan"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="comparisonFailureRate"
            name="With change"
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
