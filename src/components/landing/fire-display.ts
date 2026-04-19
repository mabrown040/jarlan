import type { ProjectionPoint, Scenario } from "@/lib/domain/types";
import { getCurrentPortfolioBalance } from "@/lib/calc/scenario";
import type { RetirementPhase } from "@/lib/retirement/phase";

/**
 * Derive the integer year count + age the Save / Home stat cards show for
 * "Years to FI". Extracted from `quick-fire-workspace.tsx` so the edge cases
 * can be unit tested without mounting the entire workspace (which pulls in
 * Next router, Zustand, and IndexedDB).
 *
 * Rules, in order:
 *   1. If `currentBalance >= traditionalTarget` (user is already past FIRE),
 *      return `0` — displaying "0 yrs · age {now}". The findIndex path below
 *      filters `idx > 0` to prevent accumulators seeing "0 years" at
 *      projection start; that filter overshoots to year 1 for past-FIRE
 *      users, which is the bug this guards.
 *   2. Otherwise, find the first projection row (after idx 0) where balance
 *      crosses the traditional FIRE target. Return its index.
 *   3. If the target isn't reached inside the projection window, fall back
 *      to the analytical `summary.yearsToFi` (ceil'd to integer).
 *   4. If neither path yields a number, return `null` ("not projected to
 *      hit FI").
 */
export function deriveProjectionFireYearIndex(args: {
  projection: ProjectionPoint[];
  traditionalTarget: number;
  currentBalance: number;
}): number {
  const { projection, traditionalTarget, currentBalance } = args;
  if (traditionalTarget <= 0) return -1;
  if (currentBalance >= traditionalTarget) return 0;
  return projection.findIndex(
    (p, idx) => idx > 0 && p.balance >= traditionalTarget,
  );
}

export interface DisplayYearsToFiResult {
  displayYearsToFi: number | null;
  displayFireAge: number | null;
  isPastFire: boolean;
}

export function deriveDisplayYearsToFi(args: {
  scenario: Scenario;
  traditionalTarget: number;
  projection: ProjectionPoint[];
  analyticalYearsToFi: number | null;
}): DisplayYearsToFiResult {
  const { scenario, traditionalTarget, projection, analyticalYearsToFi } =
    args;
  const currentBalance = getCurrentPortfolioBalance(scenario.accounts);
  const isPastFire =
    traditionalTarget > 0 && currentBalance >= traditionalTarget;
  const index = deriveProjectionFireYearIndex({
    projection,
    traditionalTarget,
    currentBalance,
  });
  const displayYearsToFi: number | null =
    index >= 0
      ? index
      : analyticalYearsToFi === null
        ? null
        : Math.ceil(analyticalYearsToFi);
  const displayFireAge: number | null =
    displayYearsToFi === null ? null : scenario.profile.age + displayYearsToFi;
  return { displayYearsToFi, displayFireAge, isPastFire };
}

/**
 * Whether the "⚠ Target retirement age X is Y yrs before projected FI"
 * warning should render. The warning is useful for accumulators whose
 * aspirational target is earlier than the math supports; it's noise for
 * anyone already past FIRE or already in withdrawal phase.
 */
export function shouldShowRaiseSavingsWarning(args: {
  scenario: Scenario;
  phase: RetirementPhase;
  isPastFire: boolean;
  displayFireAge: number | null;
}): boolean {
  const { scenario, phase, isPastFire, displayFireAge } = args;
  if (isPastFire) return false;
  if (phase === "withdrawal") return false;
  if (scenario.profile.retirementAge === null) return false;
  if (displayFireAge === null) return false;
  return displayFireAge > scenario.profile.retirementAge;
}
