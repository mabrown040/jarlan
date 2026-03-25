import type { FireTypeSummary, ProjectionPoint, QuickFireSummary, Scenario } from "@/lib/domain/types";

export interface MilestoneMarker {
  year: number;
  label: string;
  target: number;
  description: string;
}

/**
 * Compute projection milestones (Coast FIRE, Barista FIRE, FIRE) from a
 * scenario's projection data. Shared between the landing workspace and the
 * save-what-if workspace so the milestone logic lives in one place.
 *
 * The optional `comparisonSummary` produces "(base)" / "(new)" suffixed
 * labels when a comparison scenario is active.
 */
export function computeProjectionMilestones(params: {
  scenario: Scenario;
  summary: QuickFireSummary;
  fireTypes?: FireTypeSummary[];
  comparisonSummary?: QuickFireSummary | null;
}): MilestoneMarker[] {
  const { scenario, summary, fireTypes, comparisonSummary } = params;
  const markers: MilestoneMarker[] = [];

  const age = scenario.profile.age;
  const retAge = scenario.profile.retirementAge ?? age;
  const effectiveReturn =
    scenario.assumptions.expectedRealReturn -
    (scenario.simulationSettings?.feeDrag ?? 0);
  const wr = scenario.assumptions.withdrawalRate;
  const expenses = scenario.retirementExpenses || scenario.annualExpenses;
  const partTime = scenario.assumptions.partTimeIncome;
  const traditionalTarget = fireTypes?.find((ft) => ft.id === "traditional")?.target ?? summary.fireNumber;
  const baristaTarget = fireTypes?.find((ft) => ft.id === "barista")?.target ?? 0;
  const startBalance = summary.projection[0]?.balance ?? 0;

  // Base FIRE achievable by retirement?
  const baseFiYear = summary.projection.findIndex(
    (p, idx) => idx > 0 && p.balance >= traditionalTarget,
  );
  const baseFiByRetirement = baseFiYear >= 0 && age + baseFiYear <= retAge;

  // ── Coast FIRE (base) ──
  // Coast FI only makes sense BEFORE reaching full FIRE.
  // After FIRE, "coasting" is meaningless — you already have the full amount.
  let coastPoint: (typeof summary.projection)[number] | undefined;
  if (baseFiByRetirement && baseFiYear > 0) {
    coastPoint = summary.projection.find((p, i) => {
      if (i === 0 || i >= baseFiYear) return false; // Must be before FIRE
      const yearsRemaining = Math.max(retAge - p.age, 0);
      if (yearsRemaining <= 0) return false;
      const dynamicTarget =
        summary.fireNumber / (1 + effectiveReturn) ** yearsRemaining;
      return p.balance >= dynamicTarget && dynamicTarget > startBalance;
    });
  }
  if (coastPoint) {
    const yearsRem = Math.max(retAge - coastPoint.age, 0);
    const dynTarget =
      summary.fireNumber / (1 + effectiveReturn) ** yearsRem;
    markers.push({
      year: coastPoint.year,
      label: comparisonSummary ? "Coast FI (base)" : "Coast FI",
      target: dynTarget,
      description: `At ${fmtCurrency(dynTarget)} saved, compounding finishes the job by retirement at ${retAge}. Learn about Coast FIRE \u2192 /education/coast-fire`,
    });
  }

  // ── Coast FIRE (comparison) ──
  if (comparisonSummary) {
    const compStartBalance = comparisonSummary.projection[0]?.balance ?? 0;
    const compFiYear = comparisonSummary.projection.findIndex(
      (p, idx) => idx > 0 && p.balance >= comparisonSummary.fireNumber,
    );
    const compFiByRetirement = compFiYear >= 0 && age + compFiYear <= retAge;

    let compCoastPoint: (typeof comparisonSummary.projection)[number] | undefined;
    if (compFiByRetirement && compFiYear > 0) {
      compCoastPoint = comparisonSummary.projection.find((p, i) => {
        if (i === 0 || i >= compFiYear) return false; // Must be before FIRE
        const yearsRemaining = Math.max(retAge - p.age, 0);
        if (yearsRemaining <= 0) return false;
        const dynamicTarget =
          comparisonSummary.fireNumber /
          (1 + effectiveReturn) ** yearsRemaining;
        return p.balance >= dynamicTarget && dynamicTarget > compStartBalance;
      });
    }
    if (
      compCoastPoint &&
      (!coastPoint || compCoastPoint.year !== coastPoint.year)
    ) {
      const yearsRem = Math.max(retAge - compCoastPoint.age, 0);
      const dynTarget =
        comparisonSummary.fireNumber / (1 + effectiveReturn) ** yearsRem;
      markers.push({
        year: compCoastPoint.year,
        label: "Coast FI (new)",
        target: dynTarget,
        description: `With changes, coast target is ${fmtCurrency(dynTarget)}. Compounding finishes by retirement.`,
      });
    }
  }

  // ── Barista FIRE (base) ──
  if (partTime > 0 && baristaTarget > 0 && baristaTarget > startBalance) {
    const baristaPoint = summary.projection.find(
      (p, i) => i > 0 && p.balance >= baristaTarget,
    );
    if (baristaPoint) {
      markers.push({
        year: baristaPoint.year,
        label: comparisonSummary ? "Barista FI (base)" : "Barista FIRE",
        target: baristaTarget,
        description: `Switch to part-time earning ${fmtCurrency(partTime)}/yr — your portfolio of ${fmtCurrency(baristaTarget)} covers the rest. Learn about Barista FIRE \u2192 /education/barista-fire`,
      });
    }
  }

  // ── FIRE (base) ──
  const baseFiPoint =
    startBalance < summary.fireNumber
      ? summary.projection.find((p, i) => i > 0 && p.balance >= p.target)
      : undefined;
  if (baseFiPoint) {
    markers.push({
      year: baseFiPoint.year,
      label: comparisonSummary ? "FI (base)" : "FIRE",
      target: summary.fireNumber,
      description: `Financial independence. ${fmtCurrency(summary.fireNumber)} sustains ${fmtCurrency(expenses)}/yr at a ${(wr * 100).toFixed(0)}% withdrawal rate.`,
    });
  }

  // ── FIRE (comparison) ──
  if (comparisonSummary) {
    const compStartBal = comparisonSummary.projection[0]?.balance ?? 0;
    const compFiPoint =
      compStartBal < comparisonSummary.fireNumber
        ? comparisonSummary.projection.find(
            (p, i) => i > 0 && p.balance >= p.target,
          )
        : undefined;
    if (
      compFiPoint &&
      (!baseFiPoint || compFiPoint.year !== baseFiPoint.year)
    ) {
      markers.push({
        year: compFiPoint.year,
        label: "FI (new)",
        target: comparisonSummary.fireNumber,
        description: `FI at age ${Math.round(compFiPoint.age)} with selected changes.`,
      });
    }
  }

  return markers;
}

/** Compact currency formatting for milestone descriptions. */
function fmtCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return `$${Math.round(value)}`;
}
