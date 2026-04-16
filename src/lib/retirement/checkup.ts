import { getCurrentPortfolioBalance } from "@/lib/calc";
import { getShillerDataset } from "@/lib/data";
import type { ScenarioSnapshotRecord } from "@/lib/db";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";
import { isAccumulationPhase } from "@/lib/retirement/phase";
import {
  resolveAnnualWithdrawalAmount,
  resolveInitialAnnualWithdrawal,
  resolveInitialWithdrawalRate,
} from "@/lib/sim";

export interface RetirementCheckupSummary {
  currentPortfolio: number;
  currentSpending: number;
  /** `null` while still in the accumulation phase — the ratio is meaningless
   *  when the user hasn't started drawing down (e.g. $45K spend ÷ $5K portfolio
   *  → 900% is a math artefact, not a guidance signal). */
  currentWithdrawalRate: number | null;
  activeStrategyGuidance: number;
  capeGuidedWithdrawal: number;
  latestCape: number | null;
  status: "on_track" | "watch" | "adjust" | "accumulation";
  statusLabel: string;
  statusMessage: string;
  netWorthDelta: number | null;
  spendingDelta: number | null;
  comparisonLabel: string | null;
}

export function buildRetirementCheckup({
  scenario,
  snapshots,
}: {
  scenario: Scenario;
  snapshots: ScenarioSnapshotRecord[];
}): RetirementCheckupSummary {
  const currentPortfolio = getCurrentPortfolioBalance(scenario.accounts);
  const currentSpending = scenario.retirementExpenses;
  const accumulating = isAccumulationPhase(scenario);
  const currentWithdrawalRate = accumulating
    ? null
    : currentPortfolio > 0
      ? currentSpending / currentPortfolio
      : 0;
  const previousAnnualWithdrawal =
    snapshots.at(-1)?.retirementExpenses ?? scenario.retirementExpenses;
  const initialAnnualWithdrawal = resolveInitialAnnualWithdrawal(
    scenario,
    Math.max(currentPortfolio, 1),
  );
  const initialWithdrawalRate = resolveInitialWithdrawalRate(
    scenario,
    Math.max(currentPortfolio, 1),
  );
  const currentRecord = getShillerDataset().records.at(-1) ?? null;
  const activeStrategyGuidance = resolveAnnualWithdrawalAmount({
    scenario,
    currentPortfolio,
    currentRecord,
    previousAnnualWithdrawal,
    previousYearInflation: scenario.assumptions.inflation,
    previousYearRealReturn: null,
    initialAnnualWithdrawal,
    initialWithdrawalRate,
    yearsRemaining: scenario.simulationSettings.retirementDuration,
  });
  const capeScenario = cloneScenario(scenario);
  capeScenario.withdrawalStrategy.type = "cape_dynamic";
  const capeGuidedWithdrawal = resolveAnnualWithdrawalAmount({
    scenario: capeScenario,
    currentPortfolio,
    currentRecord,
    previousAnnualWithdrawal,
    previousYearInflation: scenario.assumptions.inflation,
    previousYearRealReturn: null,
    initialAnnualWithdrawal,
    initialWithdrawalRate,
    yearsRemaining: scenario.simulationSettings.retirementDuration,
  });

  let status: RetirementCheckupSummary["status"] = "on_track";
  let statusLabel = "Within plan";
  let statusMessage =
    "Current spending is broadly aligned with the active withdrawal strategy.";

  if (accumulating) {
    status = "accumulation";
    statusLabel = "Still building";
    statusMessage =
      "You're net-saving, not drawing down. Withdrawal-rate guidance doesn't apply yet — use the Save module to project when you'll be ready to retire.";
  } else if (
    scenario.withdrawalStrategy.type === "guyton_klinger" &&
    currentWithdrawalRate !== null
  ) {
    const params = scenario.withdrawalStrategy.gkParams ?? {
      guardrailWidth: 0.2,
      adjustmentSize: 0.1,
      suspendCapPreservationYears: 15,
    };
    const upperGuardrail = initialWithdrawalRate * (1 + params.guardrailWidth);
    const lowerGuardrail = initialWithdrawalRate * (1 - params.guardrailWidth);

    if (currentWithdrawalRate > upperGuardrail) {
      status = "adjust";
      statusLabel = "Guardrail cut suggested";
      statusMessage =
        "The current withdrawal rate is above the upper guardrail, so the plan likely needs a spending cut or a portfolio reset.";
    } else if (currentWithdrawalRate < lowerGuardrail) {
      status = "watch";
      statusLabel = "Prosperity rule zone";
      statusMessage =
        "The current withdrawal rate has dropped below the lower guardrail, so the plan has room for a raise if desired.";
    }
  } else if (currentSpending > activeStrategyGuidance * 1.1) {
    status = "adjust";
    statusLabel = "Above current guidance";
    statusMessage =
      "Current spending is materially above the strategy's modeled guidance for this portfolio level.";
  } else if (currentSpending > activeStrategyGuidance) {
    status = "watch";
    statusLabel = "Slightly stretched";
    statusMessage =
      "Current spending is above the strategy guidance, but only by a modest amount.";
  }

  const comparisonSnapshot = snapshots.length > 1 ? snapshots.at(-2) : snapshots.at(-1);
  const comparisonLabel = comparisonSnapshot
    ? `since ${new Date(comparisonSnapshot.capturedAt).toLocaleDateString()}`
    : null;

  return {
    currentPortfolio,
    currentSpending,
    currentWithdrawalRate,
    activeStrategyGuidance,
    capeGuidedWithdrawal,
    latestCape: currentRecord?.cape ?? currentRecord?.trCape ?? null,
    status,
    statusLabel,
    statusMessage,
    netWorthDelta: comparisonSnapshot
      ? currentPortfolio - comparisonSnapshot.netWorth
      : null,
    spendingDelta: comparisonSnapshot
      ? currentSpending - comparisonSnapshot.retirementExpenses
      : null,
    comparisonLabel,
  };
}
