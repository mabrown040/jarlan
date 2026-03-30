"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Scenario } from "@/lib/domain/types";
import { buildRetirementReadinessAssessment } from "@/lib/retirement";
import {
  buildMortalityRiskTimeline,
  runSimulation,
  simulationCapabilities,
  type HistoricalBacktestResult,
  type MonteCarloResult,
  type MortalityRiskResult,
} from "@/lib/sim";
import {
  analyzeSocialSecurityClaiming,
  buildRothConversionPlan,
  compareDrawdownStrategies,
  estimateAcaConversionRoom,
} from "@/lib/tax";

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

export function useRetirementReadiness({
  scenario,
  benchmarkPremium = 9_000,
  historicalResult,
  monteCarloResult,
  mortalityRisk,
  autoSimulate = true,
}: {
  scenario: Scenario;
  benchmarkPremium?: number;
  historicalResult?: HistoricalBacktestResult | null;
  monteCarloResult?: MonteCarloResult | null;
  mortalityRisk?: MortalityRiskResult | null;
  autoSimulate?: boolean;
}) {
  const [generatedHistoricalResult, setGeneratedHistoricalResult] =
    useState<HistoricalBacktestResult | null>(historicalResult ?? null);
  const [generatedMonteCarloResult, setGeneratedMonteCarloResult] =
    useState<MonteCarloResult | null>(monteCarloResult ?? null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    historicalResult || monteCarloResult
      ? "ready"
      : autoSimulate
        ? "idle"
        : "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const historicalRequestTokenRef = useRef(0);
  const monteCarloRequestTokenRef = useRef(0);

  useEffect(() => {
    setGeneratedHistoricalResult(historicalResult ?? null);
  }, [historicalResult]);

  useEffect(() => {
    setGeneratedMonteCarloResult(monteCarloResult ?? null);
  }, [monteCarloResult]);

  useEffect(() => {
    if (historicalResult || !autoSimulate) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++historicalRequestTokenRef.current;
      setStatus("loading");
      setError(null);

      void runSimulation({
        kind: "historical",
        datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
        scenario,
      })
        .then((simulationResult) => {
          if (requestToken !== historicalRequestTokenRef.current) {
            return;
          }

          setGeneratedHistoricalResult(simulationResult as HistoricalBacktestResult);
        })
        .catch((simulationError: Error) => {
          if (requestToken !== historicalRequestTokenRef.current) {
            return;
          }

          setGeneratedHistoricalResult(null);
          setStatus("error");
          setError(simulationError.message);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoSimulate, historicalResult, scenario]);

  useEffect(() => {
    if (monteCarloResult || !autoSimulate) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++monteCarloRequestTokenRef.current;
      setStatus("loading");
      setError(null);

      void runSimulation({
        kind: "monte-carlo",
        scenario,
        mode: getMonteCarloMode(scenario.simulationSettings.simulationType),
        trials: scenario.simulationSettings.monteCarloTrials,
      })
        .then((simulationResult) => {
          if (requestToken !== monteCarloRequestTokenRef.current) {
            return;
          }

          setGeneratedMonteCarloResult(simulationResult as MonteCarloResult);
        })
        .catch((simulationError: Error) => {
          if (requestToken !== monteCarloRequestTokenRef.current) {
            return;
          }

          setGeneratedMonteCarloResult(null);
          setStatus("error");
          setError(simulationError.message);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoSimulate, monteCarloResult, scenario]);

  const resolvedHistoricalResult = historicalResult ?? generatedHistoricalResult;
  const resolvedMonteCarloResult = monteCarloResult ?? generatedMonteCarloResult;
  const resolvedMortalityRisk =
    mortalityRisk ??
    (resolvedMonteCarloResult
      ? buildMortalityRiskTimeline({
          scenario,
          monteCarloResult: resolvedMonteCarloResult,
        })
      : null);
  const rothPlan = useMemo(() => buildRothConversionPlan(scenario), [scenario]);
  const acaProjection = useMemo(
    () => estimateAcaConversionRoom(scenario, benchmarkPremium),
    [benchmarkPremium, scenario],
  );
  const socialSecurityAnalysis = useMemo(
    () => analyzeSocialSecurityClaiming(scenario),
    [scenario],
  );
  const drawdownComparison = useMemo(
    () => compareDrawdownStrategies(scenario),
    [scenario],
  );
  const assessment = useMemo(
    () =>
      buildRetirementReadinessAssessment({
        scenario,
        historicalResult: resolvedHistoricalResult,
        monteCarloResult: resolvedMonteCarloResult,
        mortalityRisk: resolvedMortalityRisk,
        rothPlan,
        acaProjection,
        socialSecurityAnalysis,
        drawdownComparison,
      }),
    [
      acaProjection,
      drawdownComparison,
      resolvedHistoricalResult,
      resolvedMonteCarloResult,
      resolvedMortalityRisk,
      rothPlan,
      scenario,
      socialSecurityAnalysis,
    ],
  );

  useEffect(() => {
    if (error) {
      setStatus("error");
      return;
    }

    if (resolvedHistoricalResult && resolvedMonteCarloResult) {
      setStatus("ready");
      return;
    }

    if (!autoSimulate) {
      setStatus("loading");
      return;
    }

    if (!historicalResult || !monteCarloResult) {
      setStatus("loading");
      return;
    }

    setStatus("idle");
  }, [
    error,
    historicalResult,
    monteCarloResult,
    autoSimulate,
    resolvedHistoricalResult,
    resolvedMonteCarloResult,
  ]);

  return {
    status,
    error,
    assessment,
    historicalResult: resolvedHistoricalResult,
    monteCarloResult: resolvedMonteCarloResult,
    mortalityRisk: resolvedMortalityRisk,
    rothPlan,
    acaProjection,
    socialSecurityAnalysis,
    drawdownComparison,
  };
}
