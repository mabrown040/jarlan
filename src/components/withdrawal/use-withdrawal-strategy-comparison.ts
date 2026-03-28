"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type WithdrawalStrategyComparisonPoint,
  type WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";
import {
  runSimulation,
  simulationCapabilities,
  withdrawalStrategyMetadata,
} from "@/lib/sim";
import type { HistoricalBacktestResult } from "@/lib/sim/contracts";

export const supportedStrategyTypes = [
  "fixed",
  "cape_dynamic",
  "guyton_klinger",
  "vpw",
  "constant_pct",
  "rmd",
  "floor_ceiling",
  "spending_smile",
] as const;

export type SupportedStrategyType = (typeof supportedStrategyTypes)[number];

export const strategiesWithTuning = new Set<SupportedStrategyType>([
  "cape_dynamic",
  "guyton_klinger",
  "floor_ceiling",
  "spending_smile",
]);

export type StrategyComparisonResults = Partial<
  Record<SupportedStrategyType, HistoricalBacktestResult>
>;

export const withdrawalStrategyComparisonSeries: WithdrawalStrategySeries[] = [
  { key: "fixed", label: "Fixed real", color: "var(--color-primary)" },
  { key: "cape_dynamic", label: "CAPE dynamic", color: "var(--color-chart-1)" },
  {
    key: "guyton_klinger",
    label: "Guyton-Klinger",
    color: "var(--ember)",
  },
  { key: "vpw", label: "VPW", color: "var(--color-chart-2)" },
  {
    key: "constant_pct",
    label: "Constant %",
    color: "var(--color-chart-3)",
  },
  { key: "rmd", label: "RMD-based", color: "var(--color-chart-4)" },
  {
    key: "floor_ceiling",
    label: "Floor/Ceiling",
    color: "var(--color-chart-5)",
  },
  {
    key: "spending_smile",
    label: "Spending smile",
    color: "var(--ember-light)",
  },
];

export function buildScenarioForStrategy(
  scenario: Scenario,
  type: SupportedStrategyType,
  overrideBalance?: number,
): Scenario {
  const nextScenario = cloneScenario(scenario);
  nextScenario.withdrawalStrategy.type = type;
  if (overrideBalance !== undefined && nextScenario.accounts.length > 0) {
    nextScenario.accounts[0].currentBalance = overrideBalance;
  }
  return nextScenario;
}

interface UseWithdrawalStrategyComparisonOptions {
  scenario: Scenario;
  startingPortfolio: number;
  enabled: boolean;
  debounceMs?: number;
}

export function useWithdrawalStrategyComparison({
  scenario,
  startingPortfolio,
  enabled,
  debounceMs = 300,
}: UseWithdrawalStrategyComparisonOptions) {
  const requestTokenRef = useRef(0);
  const [backtestStatus, setBacktestStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [backtestError, setBacktestError] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] =
    useState<StrategyComparisonResults>({});

  useEffect(() => {
    if (!enabled) {
      setBacktestStatus("idle");
      setBacktestError(null);
      setComparisonResults({});
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++requestTokenRef.current;
      setBacktestStatus("loading");
      setBacktestError(null);

      void Promise.all(
        supportedStrategyTypes.map(async (type) => {
          const simulationResult = (await runSimulation({
            kind: "historical",
            datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
            scenario: buildScenarioForStrategy(scenario, type, startingPortfolio),
          })) as HistoricalBacktestResult;

          return [type, simulationResult] as const;
        }),
      )
        .then((results) => {
          if (requestToken !== requestTokenRef.current) {
            return;
          }

          setComparisonResults(Object.fromEntries(results));
          setBacktestStatus("ready");
        })
        .catch((error: Error) => {
          if (requestToken !== requestTokenRef.current) {
            return;
          }

          setComparisonResults({});
          setBacktestStatus("error");
          setBacktestError(error.message);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [debounceMs, enabled, scenario, startingPortfolio]);

  const comparisonTemplateBand =
    supportedStrategyTypes
      .map((type) => comparisonResults[type]?.percentileBand)
      .find(
        (
          band,
        ): band is HistoricalBacktestResult["percentileBand"] =>
          Boolean(band?.length),
      ) ?? [];

  const strategyComparisonRows = useMemo<WithdrawalStrategyComparisonPoint[]>(
    () =>
      comparisonTemplateBand.map((point, index) =>
        supportedStrategyTypes.reduce(
          (row, type) => ({
            ...row,
            [type]:
              comparisonResults[type]?.percentileBand[index]?.withdrawal ?? null,
          }),
          { year: point.year } as WithdrawalStrategyComparisonPoint,
        ),
      ),
    [comparisonResults, comparisonTemplateBand],
  );

  const comparisonSummaries = useMemo(
    () =>
      supportedStrategyTypes.map((type) => ({
        type,
        label: withdrawalStrategyMetadata[type].label,
        description: withdrawalStrategyMetadata[type].shortDescription,
        result: comparisonResults[type] ?? undefined,
      })),
    [comparisonResults],
  );

  return {
    backtestStatus,
    backtestError,
    comparisonResults,
    strategyComparisonRows,
    strategyComparisonSeries: withdrawalStrategyComparisonSeries,
    comparisonSummaries,
  };
}
