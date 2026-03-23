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
            retirementDuration: 30,
            successRate: 0.88,
          },
        ]}
        withdrawalRates={[0.04]}
        durations={[30]}
      />,
    );

    expect(
      screen.getByRole("table", {
        name: /historical success rate by withdrawal rate and retirement duration/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "30y" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "4%" })).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });
});
