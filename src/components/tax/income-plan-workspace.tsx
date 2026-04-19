"use client";

import { Copy } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  ChartShell,
  CompactPageHeader,
  StatCard,
} from "@/components/brand";

import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { RothLadderTimeline } from "@/components/tax/roth-ladder-timeline";
import { TaxWaterfallChart } from "@/components/tax/tax-waterfall-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { isAccumulationPhase } from "@/lib/retirement/phase";
import {
  formatCompactCurrency,
  formatCurrency,
} from "@/lib/calc";
import {
  estimateBenchmarkPremiumForState,
} from "@/lib/data";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
} from "@/lib/share";
import { useScenarioStore } from "@/lib/store";
import {
  analyzeSocialSecurityClaiming,
  buildFederalTaxBracketBreakdown,
  buildRothConversionPlan,
  compareDrawdownStrategies,
  estimateAcaConversionRoom,
} from "@/lib/tax";

export default function IncomePlanWorkspace() {
  const {
    activeScenario,
    saveStatus,
  } = useScenarioStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const [copied, setCopied] = useState(false);

  useInitializeStore(sharedScenarioParam);
  useAutoSaveScenario({ syncUrl: true });
  useGlobalScenarioFormatting(activeScenario);

  const accumulating = useMemo(
    () => isAccumulationPhase(activeScenario),
    [activeScenario],
  );

  /* ── Derived benchmark premium from scenario ── */
  const benchmarkPremium = useMemo(
    () =>
      estimateBenchmarkPremiumForState(
        activeScenario.profile.state.toUpperCase(),
        activeScenario.profile.age,
      ),
    [activeScenario.profile.age, activeScenario.profile.state],
  );

  /* ── Computation memos ── */
  const rothPlan = useMemo(
    () => buildRothConversionPlan(activeScenario),
    [activeScenario],
  );

  const acaProjection = useMemo(
    () => estimateAcaConversionRoom(activeScenario, benchmarkPremium),
    [activeScenario, benchmarkPremium],
  );

  const socialSecurityAnalysis = useMemo(
    () => analyzeSocialSecurityClaiming(activeScenario),
    [activeScenario],
  );

  const drawdownComparison = useMemo(
    () =>
      [...compareDrawdownStrategies(activeScenario)].sort(
        (left, right) => left.estimatedTenYearTaxes - right.estimatedTenYearTaxes,
      ),
    [activeScenario],
  );

  const taxWaterfall = useMemo(
    () =>
      buildFederalTaxBracketBreakdown(
        rothPlan.rows[0]?.conversionAmount ?? rothPlan.bracketTop,
        activeScenario.profile.filingStatus,
      ),
    [activeScenario.profile.filingStatus, rothPlan],
  );

  /* ── Share link ── */
  async function handleCopyShareLink() {
    if (typeof window === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(
      buildScenarioShareUrl(`${window.location.origin}${pathname}`, activeScenario),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="space-y-10 pb-12">
      {/* ── Page header ── */}
      <CompactPageHeader
        title="Income plan"
        description="Social Security, drawdown sequencing, Roth conversion, and ACA planning."
        metrics={[
          {
            label: "Best SS age",
            value: String(socialSecurityAnalysis.recommendedClaimAge),
            accent: true,
          },
          {
            label: "Total Roth conversions",
            value: formatCompactCurrency(rothPlan.totalPlannedConversions),
          },
          {
            label: "Best drawdown",
            value: drawdownComparison[0]?.label ?? "N/A",
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleCopyShareLink}>
              <Copy className="size-4" />
              {copied ? "Copied" : "Share"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved"
                  : ""}
            </p>
          </div>
        }
      />

      {accumulating ? (
        // The drawdown / Roth / ACA sections simulate against the user's
        // current portfolio. In accumulation phase the portfolio is tiny
        // relative to spending, so every strategy ends at $0 and the "Best"
        // tag is arbitrary. Warn the user that this page is a preview.
        <section className="mx-auto max-w-7xl px-6">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Preview mode
              </p>
              <p className="mt-2 font-display text-xl leading-tight tracking-[-0.03em] text-foreground">
                You&apos;re still accumulating
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                These drawdown, Roth-conversion, and ACA models assume you&apos;re
                drawing from the portfolio. Treat the numbers below as a
                preview of the decisions you&apos;ll make once you&apos;re closer to
                retirement — the rankings become meaningful when your balance
                approaches the FIRE target.
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        {/* ── Section 1: Social Security Claiming ── */}
        <ChartShell
          eyebrow="Social Security"
          title="Claiming strategy"
          description="Expected lifetime benefits are weighted by the scenario's mortality outlook to avoid a purely nominal break-even answer."
        >
          <div className="space-y-4">
            {socialSecurityAnalysis.options.map((option) => (
              <div
                key={option.claimAge}
                className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground"
              >
                <p className="font-medium text-foreground">
                  Claim at {option.claimAge}
                </p>
                <p className="mt-2">
                  Annual benefit: {formatCurrency(option.annualBenefit)}.
                </p>
                <p className="mt-1">
                  Expected lifetime total:{" "}
                  {formatCurrency(option.expectedLifetimeBenefit)}.
                </p>
              </div>
            ))}

            {socialSecurityAnalysis.partnerOptions?.length ? (
              <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Partner recommendation: claim at{" "}
                  {socialSecurityAnalysis.recommendedPartnerClaimAge}.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {socialSecurityAnalysis.partnerOptions.map((option) => (
                    <div
                      key={`partner-${option.claimAge}`}
                      className="rounded-xl border border-border/60 bg-background/60 p-3"
                    >
                      <p className="font-medium text-foreground">
                        Partner at {option.claimAge}
                      </p>
                      <p className="mt-2">
                        Annual benefit: {formatCurrency(option.annualBenefit)}.
                      </p>
                      <p className="mt-1">
                        Expected lifetime total:{" "}
                        {formatCurrency(option.expectedLifetimeBenefit)}.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Break-even 62 vs 67"
                value={`Age ${socialSecurityAnalysis.breakEven62Vs67.toFixed(1)}`}
                description="Age where claiming at 67 overtakes claiming at 62 in cumulative benefit."
              />
              <StatCard
                label="Break-even 67 vs 70"
                value={`Age ${socialSecurityAnalysis.breakEven67Vs70.toFixed(1)}`}
                description="Age where claiming at 70 overtakes claiming at 67 in cumulative benefit."
              />
            </div>

            {socialSecurityAnalysis.recommendedHouseholdStrategy?.partnerClaimAge ? (
              <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Best household pair
                </p>
                <p className="mt-2">
                  Primary at{" "}
                  {socialSecurityAnalysis.recommendedHouseholdStrategy.primaryClaimAge},
                  partner at{" "}
                  {socialSecurityAnalysis.recommendedHouseholdStrategy.partnerClaimAge}.
                </p>
                <p className="mt-1">
                  Combined expected lifetime benefit:{" "}
                  {formatCurrency(
                    socialSecurityAnalysis.recommendedHouseholdStrategy
                      .combinedExpectedLifetimeBenefit,
                  )}
                  .
                </p>
              </div>
            ) : null}
          </div>
        </ChartShell>

        {/* ── Section 2: Drawdown Sequencing ── */}
        <ChartShell
          eyebrow="Tax optimization"
          title="Drawdown sequencing"
          description="A simple ten-year tax estimate across a few common withdrawal sequences, using the balances in the shared scenario."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {drawdownComparison.map((strategy, index) => (
              <div
                key={strategy.id}
                className={`rounded-xl border p-4 ${
                  index === 0
                    ? "border-[var(--ember)]/40 bg-[var(--ember)]/5"
                    : "border-border/60 bg-card/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{strategy.label}</p>
                  {index === 0 ? (
                    <span className="shrink-0 rounded-full bg-[var(--ember)]/10 px-2 py-0.5 text-xs font-medium text-[var(--ember)]">
                      Best
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Estimated taxes: {formatCurrency(strategy.estimatedTenYearTaxes)}.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ending balance: {formatCurrency(strategy.endingBalance)}.
                </p>
              </div>
            ))}
          </div>
        </ChartShell>

        {/* ── Section 3: Roth Conversion Ladder ── */}
        <ChartShell
          eyebrow="Roth ladder"
          title="Roth conversion ladder plan"
          description="Fills the target tax bracket each year from retirement until RMDs begin at age 73. Early retirees also get a 5-year bridge clock; retirees past 59.5 can already pull from Traditional penalty-free, so the ladder is purely for bracket management."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Target bracket top"
              value={formatCompactCurrency(rothPlan.bracketTop)}
              description="Annual ordinary-income room used for the Roth ladder plan."
              tone="accent"
            />
            <StatCard
              label="Bridge funding"
              value={formatCompactCurrency(rothPlan.rows[0]?.bridgeFundingNeed ?? 0)}
              description="Estimated annual spending the taxable/cash bridge needs to cover before converted dollars season."
            />
            <StatCard
              label="Total conversions"
              value={formatCompactCurrency(rothPlan.totalPlannedConversions)}
              description="Sum of all planned conversion amounts across the ladder."
            />
            <StatCard
              label="ACA threshold"
              value={formatCompactCurrency(acaProjection.maxMagiBeforeCliff)}
              description={`Approx 400% FPL for household size ${activeScenario.profile.householdSize}.`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <RothLadderTimeline rows={rothPlan.rows} />
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Age</th>
                    <th className="pb-3 font-medium">Conversion</th>
                    <th className="pb-3 font-medium">Tax cost</th>
                    <th className="pb-3 font-medium">Bridge need</th>
                    <th className="pb-3 font-medium">Available at</th>
                  </tr>
                </thead>
                <tbody>
                  {rothPlan.rows.map((row) => (
                    <tr key={row.age} className="border-t border-border/60">
                      <td className="py-3">{row.age}</td>
                      <td className="py-3">{formatCurrency(row.conversionAmount)}</td>
                      <td className="py-3">{formatCurrency(row.taxCost)}</td>
                      <td className="py-3">{formatCurrency(row.bridgeFundingNeed)}</td>
                      <td className="py-3">{row.availablePenaltyFreeAge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ChartShell
            eyebrow="Tax waterfall"
            title="Bracket fill waterfall"
            description="Visualize how the first-year Roth conversion plan fills the federal brackets."
            className="border-0 shadow-none"
          >
            <TaxWaterfallChart data={taxWaterfall} />
          </ChartShell>
        </ChartShell>

        {/* ── Section 4: ACA Pressure (collapsed by default) ── */}
        <CollapsibleSection
          title="ACA conversion pressure"
          summary={`${formatCompactCurrency(acaProjection.roomRemaining)} room remaining before subsidy cliff`}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="400% FPL threshold"
                value={formatCompactCurrency(acaProjection.maxMagiBeforeCliff)}
                description={`Household size ${activeScenario.profile.householdSize}.`}
              />
              <StatCard
                label="Projected MAGI"
                value={formatCompactCurrency(acaProjection.projectedMagi)}
                description="First-year projected MAGI from conversions."
              />
              <StatCard
                label="Premium share"
                value={formatCompactCurrency(acaProjection.expectedPremiumShare)}
                description="Estimated benchmark premium share."
              />
              <StatCard
                label="Recommended conversion"
                value={formatCompactCurrency(acaProjection.recommendedConversion)}
                description="From the tradeoff scan."
                tone="accent"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Conversion</th>
                    <th className="px-4 py-3 font-medium">Premium share</th>
                    <th className="px-4 py-3 font-medium">Tax cost</th>
                    <th className="px-4 py-3 font-medium">Net kept</th>
                  </tr>
                </thead>
                <tbody>
                  {acaProjection.tradeoffPoints.map((point) => (
                    <tr
                      key={point.conversionAmount}
                      className="border-t border-border/60"
                    >
                      <td className="px-4 py-3">
                        {formatCurrency(point.conversionAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(point.premiumShare)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(point.taxCost)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(point.netConversionValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
      </section>
    </div>
  );
}
