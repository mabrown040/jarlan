import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RetirementCheckupSummary } from "@/components/retirement/retirement-checkup-summary";
import type { RetirementCheckupSummary as CheckupData } from "@/lib/retirement";

function makeCheckup(overrides: Partial<CheckupData> = {}): CheckupData {
  return {
    currentPortfolio: 1_000_000,
    currentSpending: 40_000,
    currentWithdrawalRate: 0.04,
    activeStrategyGuidance: 40_000,
    capeGuidedWithdrawal: 38_000,
    latestCape: 30.5,
    status: "on_track",
    statusLabel: "Within plan",
    statusMessage: "Current spending is broadly aligned with the strategy.",
    netWorthDelta: null,
    spendingDelta: null,
    comparisonLabel: null,
    ...overrides,
  };
}

describe("RetirementCheckupSummary", () => {
  /**
   * Regression guard for the "900% WR labeled Within plan" bug: when the
   * user is still in accumulation (`status === "accumulation"`, WR null),
   * the component must NOT render the withdrawal-rate stat card — only a
   * "Still building" banner explaining the guidance doesn't apply yet.
   */
  it("hides the withdrawal-rate stats when status is accumulation", () => {
    render(
      createElement(RetirementCheckupSummary, {
        checkup: makeCheckup({
          status: "accumulation",
          currentPortfolio: 5_000,
          currentSpending: 45_000,
          currentWithdrawalRate: null,
          statusLabel: "Still building",
          statusMessage:
            "You're net-saving, not drawing down. Withdrawal-rate guidance doesn't apply yet.",
        }),
      }),
    );

    // Banner copy visible.
    expect(screen.getByText("Still building")).toBeInTheDocument();
    expect(
      screen.getByText(/Withdrawal-rate guidance doesn't apply yet/i),
    ).toBeInTheDocument();

    // Stat cards from the normal branch must not render.
    expect(
      screen.queryByText("Current withdrawal rate"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Active strategy guidance"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("CAPE-guided spending")).not.toBeInTheDocument();
    // And the "Within plan" default label must not leak across.
    expect(screen.queryByText("Within plan")).not.toBeInTheDocument();
  });

  it("renders the withdrawal-rate stats when retired and on-track", () => {
    render(
      createElement(RetirementCheckupSummary, {
        checkup: makeCheckup({
          status: "on_track",
          statusLabel: "Within plan",
        }),
      }),
    );

    expect(screen.getByText("Current withdrawal rate")).toBeInTheDocument();
    expect(screen.getByText("Active strategy guidance")).toBeInTheDocument();
    expect(screen.getByText("CAPE-guided spending")).toBeInTheDocument();
    // Accumulation banner copy must not render.
    expect(screen.queryByText("Still building")).not.toBeInTheDocument();
  });
});
