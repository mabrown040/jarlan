import { describe, expect, it } from "vitest";

import {
  computeNominalYearLabel,
  inflateFutureAmount,
  transformForDisplay,
} from "@/lib/calc/display-transform";

describe("display-transform", () => {
  describe("inflateFutureAmount", () => {
    it("returns the same amount for year 0", () => {
      expect(inflateFutureAmount(100_000, 0, 0.03)).toBe(100_000);
    });

    it("compounds at the given inflation rate", () => {
      // $100K × 1.03^10 ≈ $134,391.64
      expect(inflateFutureAmount(100_000, 10, 0.03)).toBeCloseTo(
        134_391.64,
        0,
      );
    });

    it("handles zero inflation as a pass-through", () => {
      expect(inflateFutureAmount(100_000, 20, 0)).toBe(100_000);
    });

    it("clamps negative years to pass-through (defensive)", () => {
      // yearsFromNow < 0 would produce deflation, which isn't a
      // scenario we want to render — inflating a future amount is
      // always forward in time.
      expect(inflateFutureAmount(100_000, -5, 0.03)).toBe(100_000);
    });
  });

  describe("transformForDisplay", () => {
    it("real mode is a pass-through regardless of yearsFromNow", () => {
      expect(
        transformForDisplay({
          realAmount: 1_400_000,
          yearsFromNow: 12,
          mode: "real",
          inflation: 0.03,
        }),
      ).toBe(1_400_000);
    });

    it("nominal mode applies the inflation factor", () => {
      // $1.4M × 1.03^12 ≈ $1,996,065 (3% inflation, 12-year horizon).
      // Hand-computed: 1.03^12 = 1.4257608868..., × 1_400_000 ≈ 1_996_065.24
      expect(
        transformForDisplay({
          realAmount: 1_400_000,
          yearsFromNow: 12,
          mode: "nominal",
          inflation: 0.03,
        }),
      ).toBeCloseTo(1_996_065, -1);
    });

    it("nominal mode with year 0 is identical to real (no time gap)", () => {
      // Current-year ("Today") stats never transform regardless of mode.
      expect(
        transformForDisplay({
          realAmount: 87_600,
          yearsFromNow: 0,
          mode: "nominal",
          inflation: 0.03,
        }),
      ).toBe(87_600);
    });
  });

  describe("computeNominalYearLabel", () => {
    it("adds years to the base year", () => {
      expect(computeNominalYearLabel(2026, 20)).toBe(2046);
    });

    it("rounds fractional years", () => {
      expect(computeNominalYearLabel(2026, 12.4)).toBe(2038);
      expect(computeNominalYearLabel(2026, 12.6)).toBe(2039);
    });

    it("clamps negative years to base", () => {
      expect(computeNominalYearLabel(2026, -3)).toBe(2026);
    });
  });
});
