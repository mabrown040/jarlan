import type { Scenario } from "@/lib/domain/types";

export interface HistoricalBacktestRequest {
  kind: "historical";
  scenario: Scenario;
  datasetVersion: string;
  startDate?: string;
  endDate?: string;
}

export interface MonteCarloRequest {
  kind: "monte-carlo";
  scenario: Scenario;
  mode: "parametric" | "bootstrap" | "block-bootstrap" | "regime-switching";
  trials: number;
}

export type SimulationRequest = HistoricalBacktestRequest | MonteCarloRequest;

export interface SimulationSeriesPoint {
  year: number;
  age: number;
  portfolioValue: number;
  withdrawal: number;
}

export interface SuccessRateConfidenceInterval {
  low: number;
  high: number;
}

export interface PercentileBandPoint {
  year: number;
  age: number;
  withdrawal: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface HistoricalBacktestCase {
  startDate: string;
  startingCape: number | null;
  terminalValue: number;
  success: boolean;
  failureYear: number | null;
}

export interface HistoricalBacktestCohortSummary {
  startDate: string;
  startingCape: number | null;
  terminalValue: number;
  success: boolean;
  failureYear: number | null;
}

export interface TerminalValueStats {
  min: number;
  p10: number;
  median: number;
  p90: number;
  max: number;
  average: number;
}

export interface HistogramBin {
  label: string;
  start: number;
  end: number;
  count: number;
}

export interface WithdrawalSummary {
  firstYearP10: number;
  firstYearMedian: number;
  firstYearP90: number;
  minMedian: number;
  minMedianYear: number;
  averageMedian: number;
  medianStdDev: number;
  maxMedian: number;
  maxMedianYear: number;
}

export interface HistoricalBacktestResult {
  kind: "historical";
  successRate: number;
  periodsTested: number;
  successCount: number;
  failureCount: number;
  confidenceInterval: SuccessRateConfidenceInterval;
  datasetVersion: string;
  startDateRange: {
    start: string;
    end: string;
  };
  initialWithdrawal: number;
  initialWithdrawalRate: number;
  terminalValueTarget: number;
  bestCase: HistoricalBacktestCase;
  worstCase: HistoricalBacktestCase;
  worstCasePath: SimulationSeriesPoint[];
  terminalValueStats: TerminalValueStats;
  terminalValueHistogram: HistogramBin[];
  failureYearHistogram: HistogramBin[];
  withdrawalSummary: WithdrawalSummary;
  cohortSummaries: HistoricalBacktestCohortSummary[];
  notes: string[];
  percentileBand: PercentileBandPoint[];
}

export interface MonteCarloResult {
  kind: "monte-carlo";
  successRate: number;
  trials: number;
  confidenceInterval: SuccessRateConfidenceInterval;
  initialWithdrawal: number;
  initialWithdrawalRate: number;
  terminalValueTarget: number;
  terminalValueStats: TerminalValueStats;
  terminalValueHistogram: HistogramBin[];
  failureYearHistogram: HistogramBin[];
  withdrawalSummary: WithdrawalSummary;
  failureRateByYear: Array<{
    year: number;
    cumulativeFailureRate: number;
  }>;
  notes: string[];
  percentileBand: PercentileBandPoint[];
}

export type SimulationResult = HistoricalBacktestResult | MonteCarloResult;

export interface SimulationWorkerRequest {
  requestId: string;
  request: SimulationRequest;
}

export interface SimulationWorkerResponse {
  requestId: string;
  result?: SimulationResult;
  error?: string;
}
