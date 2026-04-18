import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RetirementReadinessSummary } from "@/components/retirement/retirement-readiness-summary";
import type { RetirementReadinessAssessment } from "@/lib/retirement";

/**
 * Return a minimal valid {@link RetirementReadinessAssessment}. Individual
 * tests override only the fields under scrutiny so the harness stays
 * focused on rendering behavior rather than math.
 */
function makeAssessment(
  overrides: Partial<RetirementReadinessAssessment> = {},
): RetirementReadinessAssessment {
  return {
    score: 0,
    verdict: "ready",
    title: "Retirement looks viable",
    summary: "History and Monte Carlo both stay well above 90%.",
    historicalSuccessRate: 0.95,
    monteCarloSuccessRate: 0.9,
    firstDecadeFailureRisk: 0.05,
    peakAliveAndBrokeProbability: 0.1,
    acaRoomRemaining: 10_000,
    acaRoomRatio: 0.5,
    bridgeFundingNeed: 0,
    bridgeReserveLeft: 0,
    bestDrawdown: null,
    recommendedClaimAge: 67,
    worstCaseStartDate: "1966-01",
    worstCaseFailureYear: null,
    worstCaseMedianSpendingFloor: 30_000,
    strengths: [],
    watchouts: [],
    nextActions: [],
    ...overrides,
  };
}

describe("RetirementReadinessSummary", () => {
  /**
   * Accumulation-phase regression guard. Before the phase-aware refactor,
   * this component rendered the 0-100 decision gauge and a grid of
   * "Pending" simulation stats for young savers — the same UI that made
   * the app claim "89/100" readiness for a $5K portfolio. The accumulation
   * verdict must render a guidance banner and nothing that would pass for
   * a retirement green-light.
   */
  it("renders the 'Still building' banner when verdict is accumulation", () => {
    const assessment = makeAssessment({
      score: 0,
      verdict: "accumulation",
      title: "You're still accumulating",
      summary:
        "Retirement readiness applies once you're drawing from the portfolio.",
    });
    render(
      createElement(RetirementReadinessSummary, {
        assessment,
        status: "ready",
      }),
    );

    expect(screen.getByText("Still building")).toBeInTheDocument();
    expect(screen.getByText("You're still accumulating")).toBeInTheDocument();
    // The numeric decision gauge (rendered only in non-accumulation branch)
    // must not appear — its label is "Score".
    expect(screen.queryByText("Score")).not.toBeInTheDocument();
    // Simulation stat tiles shouldn't be visible either.
    expect(screen.queryByText("Historical success")).not.toBeInTheDocument();
    expect(screen.queryByText("Monte Carlo success")).not.toBeInTheDocument();
  });

  it("renders the decision score gauge and stat grid when verdict is ready", () => {
    render(
      createElement(RetirementReadinessSummary, {
        assessment: makeAssessment({ verdict: "ready", score: 88 }),
        status: "ready",
      }),
    );

    // Gauge is present (shows the "Score" micro-label beneath the number).
    expect(screen.getByText("Score")).toBeInTheDocument();
    // Simulation stat tiles are present.
    expect(screen.getByText("Historical success")).toBeInTheDocument();
    expect(screen.getByText("Monte Carlo success")).toBeInTheDocument();
    // Banner copy from the accumulation branch must NOT leak into the
    // normal branch.
    expect(screen.queryByText("Still building")).not.toBeInTheDocument();
  });
});
