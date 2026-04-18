import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SuccessRateHeatmap } from "@/components/withdrawal/success-rate-heatmap";

describe("SuccessRateHeatmap", () => {
  it("renders a semantic table for screen readers", () => {
    render(
      <SuccessRateHeatmap
        data={[
          {
            withdrawalRate: 0.04,
            capeBucket: "under15",
            successRate: 0.88,
            sampleCount: 42,
          },
        ]}
        withdrawalRates={[0.04]}
        capeBuckets={[
          { id: "under15", label: "<15", description: "cheap" },
        ]}
      />,
    );

    expect(
      screen.getByText(
        /Historical success rate by withdrawal rate and starting CAPE bucket/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /<15/ })).toBeInTheDocument();
    // formatPercent(0.04, 1) trims trailing zeros → "4%", not "4.0%".
    expect(screen.getByRole("rowheader", { name: "4%" })).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    // Sample count appears so users can tell sparse cells from dense ones.
    expect(screen.getByText(/n=42/)).toBeInTheDocument();
  });

  it("renders a placeholder when a cell has no samples", () => {
    render(
      <SuccessRateHeatmap
        data={[]}
        withdrawalRates={[0.04]}
        capeBuckets={[
          { id: "under15", label: "<15", description: "cheap" },
        ]}
      />,
    );

    // Empty cell shows a "--" placeholder instead of a percentage.
    expect(screen.getByText("--")).toBeInTheDocument();
  });
});
