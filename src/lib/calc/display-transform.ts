import type { DisplayMode } from "@/lib/store/use-display-preferences";

/**
 * Multiply a today's-dollar value by (1 + inflation)^years to express it
 * in the purchasing power of a future year. Pure function so it's easy
 * to unit-test against golden values.
 */
export function inflateFutureAmount(
  realAmount: number,
  yearsFromNow: number,
  inflationRate: number,
): number {
  if (yearsFromNow <= 0) return realAmount;
  return realAmount * Math.pow(1 + inflationRate, yearsFromNow);
}

/**
 * Transform a real-dollar amount into the requested display mode.
 *
 * Real mode: pass-through.
 * Nominal mode: inflate by yearsFromNow.
 *
 * Year-0 values are identical in both modes — they're already in
 * today's dollars. Call sites can pass yearsFromNow=0 for
 * "Today" figures without special-casing.
 */
export function transformForDisplay({
  realAmount,
  yearsFromNow,
  mode,
  inflation,
}: {
  realAmount: number;
  yearsFromNow: number;
  mode: DisplayMode;
  inflation: number;
}): number {
  return mode === "nominal"
    ? inflateFutureAmount(realAmount, yearsFromNow, inflation)
    : realAmount;
}

/**
 * For the plan drawer's segmented control and any badge that tells
 * the user which year's dollars they're looking at. Returns e.g. 2046
 * for a user whose horizon is ~20 years out. Uses the passed base year
 * to keep the fn pure — resolve to `new Date().getFullYear()` at the
 * call site.
 */
export function computeNominalYearLabel(
  baseYear: number,
  yearsFromNow: number,
): number {
  return baseYear + Math.max(Math.round(yearsFromNow), 0);
}
