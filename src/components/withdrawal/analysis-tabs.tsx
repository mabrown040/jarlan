"use client";

import { cn } from "@/lib/utils";
import type { HistoricalBacktestResult, MonteCarloResult } from "@/lib/sim/contracts";
import type { MortalityRiskResult } from "@/lib/sim/mortality-risk";
import type {
  WithdrawalStrategyComparisonPoint,
  WithdrawalStrategySeries,
} from "@/components/withdrawal/withdrawal-strategy-comparison-chart";
import { HistoricalTab } from "./tabs/historical-tab";
import { MonteCarloTab } from "./tabs/monte-carlo-tab";
import { MortalityTab } from "./tabs/mortality-tab";
import { CompareTab } from "./tabs/compare-tab";
import { HeatmapTab } from "./tabs/heatmap-tab";
import { DistributionsTab } from "./tabs/distributions-tab";

/* ── Tab definitions ── */

const TABS = [
  { id: "historical", label: "Historical" },
  { id: "monte-carlo", label: "Monte Carlo" },
  { id: "mortality", label: "Mortality" },
  { id: "compare", label: "Compare" },
  { id: "heatmap", label: "Heatmap" },
  { id: "distributions", label: "Distributions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Props ── */

interface AnalysisTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;

  /* Historical */
  backtestResult: HistoricalBacktestResult | null;
  backtestStatus: "idle" | "loading" | "ready" | "error";
  backtestError: string | null;
  selectedStrategyMeta: { label: string };
  selectedStrategy: string;
  startAge: number;

  /* Monte Carlo */
  monteCarloResult: MonteCarloResult | null;
  monteCarloStatus: "idle" | "loading" | "ready" | "error";
  monteCarloError: string | null;
  monteCarloSimulationType: string;
  monteCarloTrials: number;

  /* Mortality */
  mortalityRisk: MortalityRiskResult | null;
  healthStatus: string;

  /* Compare */
  strategyComparisonRows: WithdrawalStrategyComparisonPoint[];
  strategyComparisonSeries: WithdrawalStrategySeries[];
  comparisonSummaries: Array<{
    type: string;
    label: string;
    description: string;
    result: HistoricalBacktestResult | undefined;
  }>;

  /* Heatmap */
  heatmapData: Array<{
    withdrawalRate: number;
    retirementDuration: number;
    successRate: number;
  }>;
  heatmapStatus: "idle" | "loading" | "ready" | "error";
  heatmapError: string | null;
  heatmapWithdrawalRates: number[];
  heatmapDurations: number[];
}

export function AnalysisTabs(props: AnalysisTabsProps) {
  const { activeTab, onTabChange } = props;

  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)]">
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-border/50 bg-[linear-gradient(180deg,var(--surface-highlight),transparent)] px-4 pt-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-b-2 border-[var(--ember)] bg-card text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "historical" && (
            <HistoricalTab
              result={props.backtestResult}
              status={props.backtestStatus}
              error={props.backtestError}
              selectedStrategyMeta={props.selectedStrategyMeta}
              startAge={props.startAge}
            />
          )}
          {activeTab === "monte-carlo" && (
            <MonteCarloTab
              monteCarloResult={props.monteCarloResult}
              historicalResult={props.backtestResult}
              status={props.monteCarloStatus}
              error={props.monteCarloError}
              monteCarloSimulationType={props.monteCarloSimulationType}
              trials={props.monteCarloTrials}
            />
          )}
          {activeTab === "mortality" && (
            <MortalityTab
              mortalityRisk={props.mortalityRisk}
              healthStatus={props.healthStatus}
            />
          )}
          {activeTab === "compare" && (
            <CompareTab
              strategyComparisonRows={props.strategyComparisonRows}
              strategyComparisonSeries={props.strategyComparisonSeries}
              comparisonSummaries={props.comparisonSummaries}
              selectedStrategy={props.selectedStrategy}
            />
          )}
          {activeTab === "heatmap" && (
            <HeatmapTab
              heatmapData={props.heatmapData}
              heatmapStatus={props.heatmapStatus}
              heatmapError={props.heatmapError}
              selectedStrategyLabel={props.selectedStrategyMeta.label}
              withdrawalRates={props.heatmapWithdrawalRates}
              durations={props.heatmapDurations}
            />
          )}
          {activeTab === "distributions" && (
            <DistributionsTab result={props.backtestResult} />
          )}
        </div>
      </div>
    </section>
  );
}
