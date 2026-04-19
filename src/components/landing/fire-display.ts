import type { ProjectionPoint, Scenario } from "@/lib/domain/types";
import {
  getCurrentPortfolioBalance,
  getYearsUntilRetirement,
} from "@/lib/calc/scenario";
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

/**
 * Decide whether Home + Save should render the income-side stat tiles
 * (Take-home / Savings / Tax estimate) in accumulation mode or swap them
 * for a single "Retirement status" tile. Retirees living off the portfolio
 * see all three tiles as "$0" in accumulation mode — dead data.
 *
 * "retirement" only when both are true:
 *   - Phase classifier says withdrawal (portfolio funded, no ongoing savings)
 *   - Annual income is zero (user truly isn't working)
 * Either alone leaves accumulation framing — a high-earner past the FIRE
 * number is still generating take-home/tax/savings numbers worth showing.
 */
export type IncomeCardVariant = "accumulation" | "retirement";

export function deriveIncomeCardVariant(
  scenario: Scenario,
  phase: RetirementPhase,
): IncomeCardVariant {
  if (phase === "withdrawal" && scenario.annualIncome === 0) {
    return "retirement";
  }
  return "accumulation";
}

/**
 * Real-dollar retirement spending projected to retirement age at the
 * scenario's `expenseGrowthRate`. The FIRE number displayed on the Save card
 * is calculated against this projected value — which can differ materially
 * from the user-entered `retirementExpenses` when horizons are long or
 * creep is on. Returns `null` when:
 *   - Creep is zero (no projection gap to explain)
 *   - No future years to compound over
 *   - The divergence is under 2% of retirementExpenses (not worth a sub-line)
 * so the UI only renders the explanation when the math is actually surprising.
 */
export interface ProjectedSpendingExplanation {
  todaySpending: number;
  projectedSpending: number;
  expenseGrowthRate: number;
  yearsUntilRetirement: number;
}

export function derivedProjectedSpendingExplanation(
  scenario: Scenario,
): ProjectedSpendingExplanation | null {
  const expenseGrowthRate = scenario.assumptions.expenseGrowthRate ?? 0;
  const yearsUntilRetirement = getYearsUntilRetirement(scenario) ?? 0;
  if (expenseGrowthRate <= 0 || yearsUntilRetirement <= 0) return null;
  const todaySpending = scenario.retirementExpenses;
  const projectedSpending =
    todaySpending * (1 + expenseGrowthRate) ** yearsUntilRetirement;
  const divergence = Math.abs(projectedSpending - todaySpending) / todaySpending;
  if (divergence < 0.02) return null;
  return {
    todaySpending,
    projectedSpending,
    expenseGrowthRate,
    yearsUntilRetirement,
  };
}
