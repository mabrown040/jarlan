"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AnalysisTabs } from "@/components/withdrawal/analysis-tabs";
import type { SpendControlFocusArea } from "@/components/withdrawal/spend-quick-controls";
import {
  buildScenarioForStrategy,
  supportedStrategyTypes,
  type SupportedStrategyType,
  useWithdrawalStrategyComparison,
} from "@/components/withdrawal/use-withdrawal-strategy-comparison";
import { RetirementCheckupSummary } from "@/components/retirement/retirement-checkup-summary";
import { listScenarioSnapshots, type ScenarioSnapshotRecord } from "@/lib/db";
import type { Scenario } from "@/lib/domain/types";
import { buildRetirementCheckup } from "@/lib/retirement";
import {
  runSimulation,
  simulationCapabilities,
  withdrawalStrategyMetadata,
  type HistoricalBacktestResult,
  type MonteCarloResult,
  type MortalityRiskResult,
} from "@/lib/sim";

const heatmapWithdrawalRates = [0.03, 0.035, 0.04, 0.045, 0.05];
const heatmapCapeBuckets = [
  {
    id: "under15",
    label: "<15",
    description: "cheap",
    min: Number.NEGATIVE_INFINITY,
    max: 15,
  },
  {
    id: "15to20",
    label: "15-20",
    description: "below avg",
    min: 15,
    max: 20,
  },
  {
    id: "20to25",
    label: "20-25",
    description: "fair",
    min: 20,
    max: 25,
  },
  {
    id: "25to30",
    label: "25-30",
    description: "elevated",
    min: 25,
    max: 30,
  },
  {
    id: "over30",
    label: "30+",
    description: "expensive",
    min: 30,
    max: Number.POSITIVE_INFINITY,
  },
] as const;

type HeatmapCapeBucketId = (typeof heatmapCapeBuckets)[number]["id"];

function getHeatmapCapeBucket(startingCape: number | null): HeatmapCapeBucketId | null {
  if (startingCape === null) {
    return null;
  }

  const bucket = heatmapCapeBuckets.find(
    (candidate) => startingCape >= candidate.min && startingCape < candidate.max,
  );

  return bucket?.id ?? null;
}

export function SpendWhatIfAdvancedDetail({
  baseScenario,
  scenario,
  startingPortfolio,
  simulationStatus,
  simulationError,
  historicalResult,
  monteCarloResult,
  mortalityRisk,
  onMonteCarloSimulationTypeChange,
}: {
  baseScenario: Scenario;
  scenario: Scenario;
  startingPortfolio: number;
  simulationStatus: "idle" | "loading" | "ready" | "error";
  simulationError: string | null;
  historicalResult: HistoricalBacktestResult | null;
  monteCarloResult: MonteCarloResult | null;
  mortalityRisk: MortalityRiskResult | null;
  onMonteCarloSimulationTypeChange: (
    value: Scenario["simulationSettings"]["simulationType"],
  ) => void;
}) {
  const heatmapRequestTokenRef = useRef(0);
  const [analysisTab, setAnalysisTab] =
    useState<SpendControlFocusArea>("core");
  const [snapshots, setSnapshots] = useState<ScenarioSnapshotRecord[]>([]);
  const [heatmapStatus, setHeatmapStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [heatmapData, setHeatmapData] = useState<
    Array<{
      withdrawalRate: number;
      capeBucket: HeatmapCapeBucketId;
      successRate: number;
      sampleCount: number;
    }>
  >([]);

  const selectedStrategy = supportedStrategyTypes.includes(
    scenario.withdrawalStrategy.type as SupportedStrategyType,
  )
    ? (scenario.withdrawalStrategy.type as SupportedStrategyType)
    : "fixed";
  const selectedStrategyMeta = withdrawalStrategyMetadata[selectedStrategy];
  const comparison = useWithdrawalStrategyComparison({
    scenario,
    startingPortfolio,
    enabled: simulationStatus === "ready",
  });
  const retirementCheckup = useMemo(
    () => buildRetirementCheckup({ scenario: baseScenario, snapshots }),
    [baseScenario, snapshots],
  );

  useEffect(() => {
    void listScenarioSnapshots(baseScenario.id).then(setSnapshots);
  }, [baseScenario.id]);

  useEffect(() => {
    if (simulationStatus !== "ready") {
      setHeatmapStatus("idle");
      setHeatmapError(null);
      setHeatmapData([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      const requestToken = ++heatmapRequestTokenRef.current;
      setHeatmapStatus("loading");
      setHeatmapError(null);
      setHeatmapData([]);

      void Promise.all(
        heatmapWithdrawalRates.map(async (withdrawalRate) => {
          const nextScenario = buildScenarioForStrategy(
            scenario,
            selectedStrategy,
            startingPortfolio,
          );
          nextScenario.withdrawalStrategy.initialRate = withdrawalRate;
          nextScenario.assumptions.withdrawalRate = withdrawalRate;
          nextScenario.retirementExpenses = startingPortfolio * withdrawalRate;

          const simulationResult = (await runSimulation({
            kind: "historical",
            datasetVersion: simulationCapabilities.supportedHistoricalDatasets[0],
            scenario: nextScenario,
          })) as HistoricalBacktestResult;

          return heatmapCapeBuckets.map((bucket) => {
            const matchingCohorts = simulationResult.cohortSummaries.filter(
              (cohort) => getHeatmapCapeBucket(cohort.startingCape) === bucket.id,
            );
            const successCount = matchingCohorts.filter(
              (cohort) => cohort.success,
            ).length;

            return {
              withdrawalRate,
              capeBucket: bucket.id,
              successRate:
                matchingCohorts.length > 0
                  ? successCount / matchingCohorts.length
                  : 0,
              sampleCount: matchingCohorts.length,
            };
          });
        }),
      )
        .then((results) => {
          if (requestToken !== heatmapRequestTokenRef.current) {
            return;
          }

          setHeatmapData(results.flat());
          setHeatmapStatus("ready");
        })
        .catch((error: Error) => {
          if (requestToken !== heatmapRequestTokenRef.current) {
            return;
          }

          setHeatmapData([]);
          setHeatmapStatus("error");
          setHeatmapError(error.message);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [scenario, selectedStrategy, simulationStatus, startingPortfolio]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card/40 px-5 py-4 text-sm text-muted-foreground">
        This section exposes the full retirement analysis stack for the active
        what-if scenario. The checkup below stays tied to your saved plan
        history, not the hypothetical changes above.
      </div>

      <AnalysisTabs
        activeTab={analysisTab}
        onTabChange={setAnalysisTab}
        backtestResult={historicalResult}
        backtestStatus={simulationStatus}
        backtestError={simulationError}
        selectedStrategyMeta={{ label: selectedStrategyMeta.label }}
        selectedStrategy={selectedStrategy}
        startAge={scenario.profile.retirementAge ?? scenario.profile.age}
        monteCarloResult={monteCarloResult}
        monteCarloStatus={simulationStatus}
        monteCarloError={simulationError}
        monteCarloSimulationType={scenario.simulationSettings.simulationType}
        onMonteCarloSimulationTypeChange={(value) =>
          onMonteCarloSimulationTypeChange(
            value as Scenario["simulationSettings"]["simulationType"],
          )
        }
        monteCarloTrials={scenario.simulationSettings.monteCarloTrials}
        mortalityRisk={mortalityRisk}
        healthStatus={scenario.profile.healthStatus}
        strategyComparisonRows={comparison.strategyComparisonRows}
        strategyComparisonSeries={comparison.strategyComparisonSeries}
        comparisonSummaries={comparison.comparisonSummaries}
        selectedStrategyDescription={selectedStrategyMeta.shortDescription}
        strategyTuningControls={
          <p className="text-sm text-muted-foreground">
            Use the shared advanced retirement settings to tune guardrails,
            CAPE parameters, or floor and ceiling rules on the base plan.
          </p>
        }
        heatmapData={heatmapData}
        heatmapStatus={heatmapStatus}
        heatmapError={heatmapError}
        heatmapWithdrawalRates={heatmapWithdrawalRates}
        heatmapCapeBuckets={heatmapCapeBuckets.map(
          ({ id, label, description }) => ({
            id,
            label,
            description,
          }),
        )}
      />

      <RetirementCheckupSummary
        checkup={retirementCheckup}
        description="Your live annual review stays anchored to saved snapshots from the baseline plan, so you can compare reality against the version you are actually running."
      />
    </div>
  );
}
