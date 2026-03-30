"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Scenario } from "@/lib/domain/types";
import {
  buildMortalityRiskTimeline,
  runSimulation,
  simulationCapabilities,
  type HistoricalBacktestResult,
  type MonteCarloResult,
} from "@/lib/sim";
import {
  buildScenarioForStartingPortfolio,
  resolveScenarioStartingPortfolio,
  type WhatIfPortfolioMode,
} from "@/lib/scenario-lab/spend-analysis";

interface SimulationCacheEntry {
  historicalResult: HistoricalBacktestResult;
  monteCarloResult: MonteCarloResult;
}

const simulationCache = new Map<string, SimulationCacheEntry>();
const pendingSimulationCache = new Map<string, Promise<SimulationCacheEntry>>();

function getMonteCarloMode(
  simulationType: Scenario["simulationSettings"]["simulationType"],
) {
  switch (simulationType) {
    case "monte_carlo_bootstrap":
      return "bootstrap" as const;
    case "monte_carlo_block":
      return "block-bootstrap" as const;
    case "monte_carlo_regime":
      return "regime-switching" as const;
    case "historical":
    case "monte_carlo_parametric":
    default:
      return "parametric" as const;
  }
}

async function runScenarioSimulations(
  scenario: Scenario,
): Promise<SimulationCacheEntry> {
  const [historicalResult, monteCarloResult] = await Promise.all([
    runSimulation({
      kind: "historical",
      datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
      scenario,
    }) as Promise<HistoricalBacktestResult>,
    runSimulation({
      kind: "monte-carlo",
      scenario,
      mode: getMonteCarloMode(scenario.simulationSettings.simulationType),
      trials: scenario.simulationSettings.monteCarloTrials,
    }) as Promise<MonteCarloResult>,
  ]);

  return {
    historicalResult,
    monteCarloResult,
  };
}

export function useRetirementScenarioSimulation({
  scenario,
  portfolioMode,
  enabled = true,
  debounceMs = 300,
}: {
  scenario: Scenario;
  portfolioMode: WhatIfPortfolioMode;
  enabled?: boolean;
  debounceMs?: number;
}) {
  const requestTokenRef = useRef(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    enabled ? "loading" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SimulationCacheEntry | null>(null);

  const startingPortfolio = useMemo(
    () => resolveScenarioStartingPortfolio(scenario, portfolioMode),
    [portfolioMode, scenario],
  );
  const simulationScenario = useMemo(
    () => buildScenarioForStartingPortfolio(scenario, startingPortfolio),
    [scenario, startingPortfolio],
  );
  const cacheKey = useMemo(
    () =>
      JSON.stringify({
        portfolioMode,
        scenario: simulationScenario,
      }),
    [portfolioMode, simulationScenario],
  );

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      setError(null);
      setResults(null);
      return;
    }

    const cachedResults = simulationCache.get(cacheKey);
    if (cachedResults) {
      setResults(cachedResults);
      setError(null);
      setStatus("ready");
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++requestTokenRef.current;
      setStatus("loading");
      setError(null);

      const pendingRequest =
        pendingSimulationCache.get(cacheKey) ??
        runScenarioSimulations(simulationScenario);

      pendingSimulationCache.set(cacheKey, pendingRequest);

      void pendingRequest
        .then((nextResults) => {
          simulationCache.set(cacheKey, nextResults);
          pendingSimulationCache.delete(cacheKey);

          if (requestToken !== requestTokenRef.current) {
            return;
          }

          setResults(nextResults);
          setStatus("ready");
        })
        .catch((simulationError: Error) => {
          pendingSimulationCache.delete(cacheKey);

          if (requestToken !== requestTokenRef.current) {
            return;
          }

          setResults(null);
          setStatus("error");
          setError(simulationError.message);
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cacheKey, debounceMs, enabled, simulationScenario]);

  const mortalityRisk = useMemo(
    () =>
      results?.monteCarloResult
        ? buildMortalityRiskTimeline({
            scenario: simulationScenario,
            monteCarloResult: results.monteCarloResult,
          })
        : null,
    [results?.monteCarloResult, simulationScenario],
  );

  return {
    status,
    error,
    startingPortfolio,
    simulationScenario,
    historicalResult: results?.historicalResult ?? null,
    monteCarloResult: results?.monteCarloResult ?? null,
    mortalityRisk,
  };
}
