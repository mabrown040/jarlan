import type { Scenario } from "@/lib/domain/types";
import type {
  HistoricalBacktestResult,
  MonteCarloResult,
  MortalityRiskResult,
} from "@/lib/sim";
import type {
  DrawdownStrategyResult,
  analyzeSocialSecurityClaiming,
  buildRothConversionPlan,
  estimateAcaConversionRoom,
} from "@/lib/tax";
import { clamp, roundTo } from "@/lib/utils";

export interface RetirementReadinessAssessment {
  score: number;
  verdict: "ready" | "close" | "needs_work";
  title: string;
  summary: string;
  historicalSuccessRate: number | null;
  monteCarloSuccessRate: number | null;
  firstDecadeFailureRisk: number | null;
  peakAliveAndBrokeProbability: number | null;
  acaRoomRemaining: number;
  acaRoomRatio: number;
  bridgeFundingNeed: number;
  bridgeReserveLeft: number;
  bestDrawdown: DrawdownStrategyResult | null;
  recommendedClaimAge: 62 | 67 | 70;
  worstCaseStartDate: string | null;
  worstCaseFailureYear: number | null;
  worstCaseMedianSpendingFloor: number | null;
  strengths: string[];
  watchouts: string[];
  nextActions: string[];
}

interface BuildRetirementReadinessAssessmentArgs {
  scenario: Scenario;
  historicalResult: HistoricalBacktestResult | null;
  monteCarloResult: MonteCarloResult | null;
  mortalityRisk: MortalityRiskResult | null;
  rothPlan: ReturnType<typeof buildRothConversionPlan>;
  acaProjection: ReturnType<typeof estimateAcaConversionRoom>;
  socialSecurityAnalysis: ReturnType<typeof analyzeSocialSecurityClaiming>;
  drawdownComparison: DrawdownStrategyResult[];
}

function summarizeVerdict(score: number) {
  if (score >= 82) {
    return {
      verdict: "ready" as const,
      title: "Retirement looks viable",
    };
  }

  if (score >= 65) {
    return {
      verdict: "close" as const,
      title: "Close, but keep clear guardrails",
    };
  }

  return {
    verdict: "needs_work" as const,
    title: "More margin would make this plan sturdier",
  };
}

export function buildRetirementReadinessAssessment({
  scenario,
  historicalResult,
  monteCarloResult,
  mortalityRisk,
  rothPlan,
  acaProjection,
  socialSecurityAnalysis,
  drawdownComparison,
}: BuildRetirementReadinessAssessmentArgs): RetirementReadinessAssessment {
  const historicalSuccessRate = historicalResult?.successRate ?? null;
  const monteCarloSuccessRate = monteCarloResult?.successRate ?? null;
  const firstDecadeFailureRisk =
    monteCarloResult?.failureRateByYear[
      Math.min(9, Math.max(monteCarloResult.failureRateByYear.length - 1, 0))
    ]?.cumulativeFailureRate ?? null;
  const peakAliveAndBrokeProbability = mortalityRisk
    ? Math.max(...mortalityRisk.points.map((point) => point.aliveAndBrokeProbability))
    : null;
  const acaRoomRatio =
    acaProjection.maxMagiBeforeCliff > 0
      ? clamp(acaProjection.roomRemaining / acaProjection.maxMagiBeforeCliff, 0, 1)
      : 0;
  const bridgeFundingNeed = rothPlan.rows[0]?.bridgeFundingNeed ?? 0;
  const bridgeReserveLeft = rothPlan.remainingBridge;
  const bestDrawdown =
    [...drawdownComparison].sort(
      (left, right) => left.estimatedTenYearTaxes - right.estimatedTenYearTaxes,
    )[0] ?? null;
  const worstCaseFailureYear = historicalResult?.worstCase.failureYear ?? null;
  const worstCaseStartDate = historicalResult?.worstCase.startDate ?? null;
  const worstCaseMedianSpendingFloor =
    historicalResult?.withdrawalSummary.minMedian ?? null;

  let weightedScore = 0;
  let totalWeight = 0;

  function addWeightedMetric(value: number | null, weight: number) {
    if (value === null || Number.isNaN(value)) {
      return;
    }

    weightedScore += clamp(value, 0, 1) * weight;
    totalWeight += weight;
  }

  addWeightedMetric(historicalSuccessRate, 0.4);
  addWeightedMetric(monteCarloSuccessRate, 0.28);
  addWeightedMetric(
    peakAliveAndBrokeProbability === null ? null : 1 - peakAliveAndBrokeProbability,
    0.17,
  );
  addWeightedMetric(
    firstDecadeFailureRisk === null ? null : 1 - firstDecadeFailureRisk,
    0.1,
  );
  addWeightedMetric(acaRoomRatio, 0.05);

  const score = roundTo(
    totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0,
    0,
  );
  const verdictSummary = summarizeVerdict(score);
  const strengths: string[] = [];
  const watchouts: string[] = [];
  const nextActions: string[] = [];

  if ((historicalSuccessRate ?? 0) >= 0.9) {
    strengths.push(
      `Historical durability is strong at ${roundTo((historicalSuccessRate ?? 0) * 100, 0)}% success across rolling start dates.`,
    );
  } else if ((historicalSuccessRate ?? 0) > 0) {
    watchouts.push(
      `Historical success is only ${roundTo((historicalSuccessRate ?? 0) * 100, 0)}%, so the plan depends on a narrower set of market histories than most pre-retirees will find comfortable.`,
    );
    nextActions.push("Reduce planned retirement spending or delay retirement by one to two years.");
  }

  if ((monteCarloSuccessRate ?? 0) >= 0.85) {
    strengths.push(
      `Forward-looking Monte Carlo success stays around ${roundTo((monteCarloSuccessRate ?? 0) * 100, 0)}%.`,
    );
  } else if ((monteCarloSuccessRate ?? 0) > 0) {
    watchouts.push(
      `Monte Carlo success lands near ${roundTo((monteCarloSuccessRate ?? 0) * 100, 0)}%, so future-return uncertainty still matters even if history looks acceptable.`,
    );
    nextActions.push("Stress-test lower-return assumptions before locking in a retirement date.");
  }

  if ((firstDecadeFailureRisk ?? 0) <= 0.1 && firstDecadeFailureRisk !== null) {
    strengths.push(
      `First-decade failure risk is relatively contained at ${roundTo(firstDecadeFailureRisk * 100, 0)}%.`,
    );
  } else if (firstDecadeFailureRisk !== null) {
    watchouts.push(
      `Sequence risk is front-loaded: failure risk reaches about ${roundTo(firstDecadeFailureRisk * 100, 0)}% within the first 10 years.`,
    );
    nextActions.push("Adopt explicit guardrails for the first decade of retirement spending.");
  }

  if ((peakAliveAndBrokeProbability ?? 0) <= 0.12 && peakAliveAndBrokeProbability !== null) {
    strengths.push(
      `Mortality-adjusted broke risk stays limited, with a peak alive-and-broke probability near ${roundTo(peakAliveAndBrokeProbability * 100, 0)}%.`,
    );
  } else if (peakAliveAndBrokeProbability !== null) {
    watchouts.push(
      `The plan still creates a meaningful alive-and-broke window, peaking near ${roundTo(peakAliveAndBrokeProbability * 100, 0)}%.`,
    );
    nextActions.push("Keep a contingency spending cut or part-time income plan ready.");
  }

  if (acaProjection.roomRemaining > 0) {
    strengths.push(
      `ACA conversion room remains available, with about ${roundTo(acaRoomRatio * 100, 0)}% of the modeled threshold still open.`,
    );
  } else {
    watchouts.push(
      "The current Roth conversion plan fully consumes the modeled ACA room, which can raise effective marginal costs before Medicare.",
    );
    nextActions.push("Trim first-year Roth conversions or benchmark health costs against ACA targets.");
  }

  if (bridgeFundingNeed > 0 && bridgeReserveLeft <= 0) {
    watchouts.push(
      "The taxable and cash bridge is thin relative to the modeled early-retirement spending need.",
    );
    nextActions.push("Build more taxable or cash runway before relying on a Roth ladder.");
  } else if (bridgeFundingNeed > 0) {
    strengths.push(
      `The current bridge plan still leaves about ${roundTo(bridgeReserveLeft, 0)} in taxable or cash reserves after the modeled ladder.`,
    );
  }

  if (socialSecurityAnalysis.recommendedClaimAge !== scenario.socialSecurity.claimingAge) {
    nextActions.push(
      `Revisit Social Security timing: the mortality-weighted model currently favors claiming at ${socialSecurityAnalysis.recommendedClaimAge}.`,
    );
  } else {
    strengths.push(
      `The selected Social Security timing lines up with the current mortality-weighted recommendation at age ${socialSecurityAnalysis.recommendedClaimAge}.`,
    );
  }

  if (!nextActions.length) {
    nextActions.push("Save or print this decision snapshot and review it again after your next annual update.");
  }

  const summary = historicalResult && monteCarloResult
    ? `Historical success is ${roundTo(
        historicalResult.successRate * 100,
        0,
      )}%, Monte Carlo success is ${roundTo(
        monteCarloResult.successRate * 100,
        0,
      )}%, and the tax layer currently points to claiming Social Security at age ${socialSecurityAnalysis.recommendedClaimAge}.`
    : `Tax, ACA, and claiming signals are ready. Historical and Monte Carlo durability will strengthen this answer once the simulations finish.`;

  return {
    score,
    verdict: verdictSummary.verdict,
    title: verdictSummary.title,
    summary,
    historicalSuccessRate,
    monteCarloSuccessRate,
    firstDecadeFailureRisk,
    peakAliveAndBrokeProbability,
    acaRoomRemaining: acaProjection.roomRemaining,
    acaRoomRatio,
    bridgeFundingNeed,
    bridgeReserveLeft,
    bestDrawdown,
    recommendedClaimAge: socialSecurityAnalysis.recommendedClaimAge,
    worstCaseStartDate,
    worstCaseFailureYear,
    worstCaseMedianSpendingFloor,
    strengths,
    watchouts,
    nextActions,
  };
}
