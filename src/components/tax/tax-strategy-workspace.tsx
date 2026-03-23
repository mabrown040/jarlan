"use client";

import type { Route } from "next";
import { Copy } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChartShell,
  PageHero,
  SectionHeading,
  StatCard,
} from "@/components/brand";
import { FieldLabel } from "@/components/form/field-label";
import { ProUpgradePrompt } from "@/components/product/pro-upgrade-prompt";
import { RetirementReadinessSummary } from "@/components/retirement/retirement-readiness-summary";
import { useRetirementReadiness } from "@/components/retirement/use-retirement-readiness";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { RothLadderTimeline } from "@/components/tax/roth-ladder-timeline";
import { TaxWaterfallChart } from "@/components/tax/tax-waterfall-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select } from "@/components/ui/select";
import {
  formatCompactCurrency,
  formatCurrency,
  getHouseholdAnnualIncome,
} from "@/lib/calc";
import {
  estimateBenchmarkPremiumForState,
  getCountryPreset,
  getStateTaxPreset,
  listCountryPresets,
} from "@/lib/data";
import { cloneScenario } from "@/lib/domain";
import type { Scenario } from "@/lib/domain/types";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
  deserializeScenarioFromSearchParam,
  serializeScenarioToSearchParam,
} from "@/lib/share";
import { useDrawerStore, useScenarioStore } from "@/lib/store";
import {
  analyzeSocialSecurityClaiming,
  buildFederalTaxBracketBreakdown,
  buildRothConversionPlan,
  compareDrawdownStrategies,
  estimateAcaConversionRoom,
} from "@/lib/tax";

const filingStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married_joint", label: "Married filing jointly" },
  { value: "married_separate", label: "Married filing separately" },
  { value: "head_of_household", label: "Head of household" },
] as const;

const countryPresets = listCountryPresets();
const currencyOptions = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
] as const;

export function TaxStrategyWorkspace() {
  const {
    activeScenario,
    status,
    saveStatus,
    initialize,
    replaceScenario,
    saveDraft,
    updateRetirementAge,
    updateRetirementExpenses,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const hasInitialized = useRef(false);
  const [copied, setCopied] = useState(false);
  const [benchmarkPremium, setBenchmarkPremium] = useState(9_000);
  const [benchmarkPremiumTouched, setBenchmarkPremiumTouched] = useState(false);

  useGlobalScenarioFormatting(activeScenario);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    void initialize(
      sharedScenarioParam
        ? deserializeScenarioFromSearchParam(sharedScenarioParam)
        : undefined,
    );
  }, [initialize, sharedScenarioParam]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDraft();

      const encodedScenario = serializeScenarioToSearchParam(activeScenario);

      if (encodedScenario === sharedScenarioParam) {
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set(SCENARIO_QUERY_KEY, encodedScenario);
      router.replace(`${pathname}?${nextParams.toString()}` as Route, {
        scroll: false,
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeScenario,
    pathname,
    router,
    saveDraft,
    searchParams,
    sharedScenarioParam,
    status,
  ]);

  const rothPlan = useMemo(() => buildRothConversionPlan(activeScenario), [activeScenario]);
  const countryPreset = useMemo(
    () => getCountryPreset(activeScenario.profile.country),
    [activeScenario.profile.country],
  );
  const stateTaxPreset = useMemo(
    () => getStateTaxPreset(activeScenario.profile.state.toUpperCase()),
    [activeScenario.profile.state],
  );
  const suggestedBenchmarkPremium = useMemo(
    () =>
      estimateBenchmarkPremiumForState(
        activeScenario.profile.state.toUpperCase(),
        activeScenario.profile.age,
      ),
    [activeScenario.profile.age, activeScenario.profile.state],
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
  const readiness = useRetirementReadiness({
    scenario: activeScenario,
    benchmarkPremium,
  });

  useEffect(() => {
    if (benchmarkPremiumTouched) {
      return;
    }

    setBenchmarkPremium(suggestedBenchmarkPremium);
  }, [benchmarkPremiumTouched, suggestedBenchmarkPremium]);
  const taxWaterfall = useMemo(
    () =>
      buildFederalTaxBracketBreakdown(
        rothPlan.rows[0]?.conversionAmount ?? rothPlan.bracketTop,
        activeScenario.profile.filingStatus,
      ),
    [activeScenario.profile.filingStatus, rothPlan],
  );
  const householdSummary = activeScenario.profile.partner
    ? `${activeScenario.profile.name || "Primary"} plans to retire at ${
        activeScenario.profile.retirementAge ?? activeScenario.profile.age
      }, ${activeScenario.profile.partner.name} plans to retire at ${
        activeScenario.profile.partner.retirementAge ??
        activeScenario.profile.partner.age
      }, and the current combined income assumption is ${formatCompactCurrency(
        getHouseholdAnnualIncome(activeScenario),
      )} per year.`
    : null;

  function updateScenario(mutator: (scenario: Scenario) => void) {
    const nextScenario = cloneScenario(activeScenario);
    mutator(nextScenario);
    replaceScenario(nextScenario);
  }

  function handleCountryChange(value: string) {
    const nextCountryPreset = getCountryPreset(value);

    updateScenario((scenario) => {
      scenario.profile.country = nextCountryPreset.code;
      scenario.currency = nextCountryPreset.currency;
    });
  }

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

  function handlePrintSnapshot() {
    if (typeof window === "undefined") {
      return;
    }

    window.print();
  }

  return (
    <div className="space-y-10 pb-12">
      <PageHero
        eyebrow="Tax and account strategy"
        badges={[
          { label: "Roth ladder" },
          { label: "ACA pressure", variant: "secondary" },
          { label: "Drawdown sequencing", variant: "outline" },
        ]}
        title="Tax-aware early retirement planning"
        description="This first tax module turns the shared scenario into a Roth conversion ladder, Social Security comparison, ACA room check, and drawdown sequence preview."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Planned conversions
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--flame)]">
              {formatCompactCurrency(rothPlan.totalPlannedConversions)}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              ACA room
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ash)]">
              {formatCompactCurrency(acaProjection.roomRemaining)}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Best SS age
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ember-light)]">
              {socialSecurityAnalysis.recommendedClaimAge}
            </p>
          </div>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        <RetirementReadinessSummary
          assessment={readiness.assessment}
          status={readiness.status}
          error={readiness.error}
          copied={copied}
          onCopyShareLink={handleCopyShareLink}
          onPrint={handlePrintSnapshot}
          secondaryCta={{
            href: "/withdrawal",
            label: "Open the withdrawal strategy lab",
          }}
        />
        <ProUpgradePrompt
          title="Use Pro when tax decisions become part of your annual process"
          description="This tax workspace stays explorable, but the paid tier is where recurring reviews, cloud sync, and partner-shareable planning handoffs now live."
        />

        <div className="grid gap-6 xl:grid-cols-[24rem,1fr]">
          <Card className="h-fit">
            <CardHeader>
              <SectionHeading
                eyebrow="Inputs"
                title="Tax planner inputs"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="These controls drive the first tax-aware planning pass built on the shared scenario."
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <SectionHeading
                  eyebrow="Household"
                  title="Profile"
                  titleAs="h4"
                  titleClassName="text-xl"
                  description="Filing status and household size shape tax brackets and ACA thresholds."
                />
                <FieldLabel htmlFor="tax-country" label="Country" />
                <Select
                  id="tax-country"
                  value={countryPreset.code}
                  onChange={(event) => handleCountryChange(event.target.value)}
                >
                  {countryPresets.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <FieldLabel htmlFor="tax-currency" label="Display currency" />
                <Select
                  id="tax-currency"
                  value={activeScenario.currency}
                  onChange={(event) =>
                    updateScenario((scenario) => {
                      scenario.currency = event.target.value as Scenario["currency"];
                    })
                  }
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={activeScenario.profile.filingStatus}
                  onChange={(event) =>
                    updateScenario((scenario) => {
                      scenario.profile.filingStatus = event.target.value as Scenario["profile"]["filingStatus"];
                    })
                  }
                >
                  {filingStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <FieldLabel
                  htmlFor="tax-state"
                  label={countryPreset.stateLabel}
                  tooltip="US state logic is modeled first. Outside the US, this acts as a location label so scenarios, exports, and future country-specific tax presets have the right context."
                />
                <Input
                  id="tax-state"
                  value={activeScenario.profile.state}
                  onChange={(event) =>
                    updateScenario((scenario) => {
                      scenario.profile.state = event.target.value;
                    })
                  }
                />
                <NumberInput
                  min={1}
                  max={8}
                  inputMode="numeric"
                  value={activeScenario.profile.householdSize}
                  onValueChange={(value) =>
                    updateScenario((scenario) => {
                      scenario.profile.householdSize = Math.round(value);
                    })
                  }
                />
                <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Country and tax readiness</p>
                  <p className="mt-2">{countryPreset.readiness}</p>
                  <p className="mt-2">
                    {stateTaxPreset
                      ? `Starter state tax signal for ${stateTaxPreset.label}: ${(
                          stateTaxPreset.effectiveOrdinaryRate * 100
                        ).toFixed(1)}% effective ordinary-income rate.`
                      : "State tax presets are seeded for the first major US states and will expand as the dataset grows."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <SectionHeading
                  eyebrow="Retirement"
                  title="Plan assumptions"
                  titleAs="h4"
                  titleClassName="text-xl"
                  description="Used for the ladder bridge need and drawdown comparisons."
                />
                <NumberInput
                  min={18}
                  max={90}
                  inputMode="numeric"
                  value={activeScenario.profile.retirementAge ?? activeScenario.profile.age}
                  onValueChange={updateRetirementAge}
                />
                <NumberInput
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={activeScenario.retirementExpenses}
                  onValueChange={updateRetirementExpenses}
                />
                <NumberInput
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={benchmarkPremium}
                  onValueChange={(value) => {
                    setBenchmarkPremiumTouched(true);
                    setBenchmarkPremium(value);
                  }}
                />
                <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                  <p>
                    Suggested benchmark premium for {activeScenario.profile.state || "this location"} at age{" "}
                    {activeScenario.profile.age}:{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(suggestedBenchmarkPremium)}
                    </span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-2 px-0"
                    onClick={() => {
                      setBenchmarkPremiumTouched(false);
                      setBenchmarkPremium(suggestedBenchmarkPremium);
                    }}
                  >
                    Use suggested premium
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <SectionHeading
                  eyebrow="Social Security"
                  title="Benefit assumptions"
                  titleAs="h4"
                  titleClassName="text-xl"
                  description="Annualizes the shared SSA-style benefit inputs for break-even comparisons."
                />
                <NumberInput
                  min={0}
                  step={100}
                  inputMode="numeric"
                  value={activeScenario.socialSecurity.monthlyBenefitAt62}
                  onValueChange={(value) =>
                    updateScenario((scenario) => {
                      scenario.socialSecurity.monthlyBenefitAt62 = value;
                    })
                  }
                />
                <NumberInput
                  min={0}
                  step={100}
                  inputMode="numeric"
                  value={activeScenario.socialSecurity.monthlyBenefitAtFra}
                  onValueChange={(value) =>
                    updateScenario((scenario) => {
                      scenario.socialSecurity.monthlyBenefitAtFra = value;
                    })
                  }
                />
                <NumberInput
                  min={0}
                  step={100}
                  inputMode="numeric"
                  value={activeScenario.socialSecurity.monthlyBenefitAt70}
                  onValueChange={(value) =>
                    updateScenario((scenario) => {
                      scenario.socialSecurity.monthlyBenefitAt70 = value;
                    })
                  }
                />
                <Select
                  value={String(activeScenario.socialSecurity.claimingAge)}
                  onChange={(event) =>
                    updateScenario((scenario) => {
                      scenario.socialSecurity.claimingAge = Number(
                        event.target.value,
                      ) as 62 | 67 | 70;
                    })
                  }
                >
                  <option value="62">Claim at 62</option>
                  <option value="67">Claim at 67</option>
                  <option value="70">Claim at 70</option>
                </Select>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {activeScenario.profile.partner
                        ? `Partner: ${activeScenario.profile.partner.name}, age ${activeScenario.profile.partner.age}`
                        : "Solo plan"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeScenario.profile.partner
                        ? "Edit partner details in Your Plan. Tax-specific SS inputs stay below."
                        : "Add a partner in Your Plan to model household tax strategy."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    onClick={() => drawerStore.open("partner")}
                  >
                    {activeScenario.profile.partner ? "Edit partner" : "Add partner"}
                  </button>
                </div>

                {activeScenario.profile.partner ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Partner claim age
                      </p>
                      <Select
                        value={String(
                          activeScenario.profile.partner.socialSecurityBenefit.claimingAge,
                        )}
                        onChange={(event) =>
                          updateScenario((scenario) => {
                            if (!scenario.profile.partner) {
                              return;
                            }

                            scenario.profile.partner.socialSecurityBenefit.claimingAge =
                              Number(event.target.value) as 62 | 67 | 70;
                          })
                        }
                      >
                        <option value="62">Claim at 62</option>
                        <option value="67">Claim at 67</option>
                        <option value="70">Claim at 70</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Partner benefit at 62
                      </p>
                      <NumberInput
                        min={0}
                        step={100}
                        inputMode="numeric"
                        value={
                          activeScenario.profile.partner.socialSecurityBenefit
                            .monthlyBenefitAt62
                        }
                        onValueChange={(value) =>
                          updateScenario((scenario) => {
                            if (!scenario.profile.partner) {
                              return;
                            }

                            scenario.profile.partner.socialSecurityBenefit.monthlyBenefitAt62 =
                              value;
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Partner benefit at FRA
                      </p>
                      <NumberInput
                        min={0}
                        step={100}
                        inputMode="numeric"
                        value={
                          activeScenario.profile.partner.socialSecurityBenefit
                            .monthlyBenefitAtFra
                        }
                        onValueChange={(value) =>
                          updateScenario((scenario) => {
                            if (!scenario.profile.partner) {
                              return;
                            }

                            scenario.profile.partner.socialSecurityBenefit.monthlyBenefitAtFra =
                              value;
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <p className="text-sm font-medium text-foreground">
                        Partner benefit at 70
                      </p>
                      <NumberInput
                        min={0}
                        step={100}
                        inputMode="numeric"
                        value={
                          activeScenario.profile.partner.socialSecurityBenefit
                            .monthlyBenefitAt70
                        }
                        onValueChange={(value) =>
                          updateScenario((scenario) => {
                            if (!scenario.profile.partner) {
                              return;
                            }

                            scenario.profile.partner.socialSecurityBenefit.monthlyBenefitAt70 =
                              value;
                          })
                        }
                      />
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground md:col-span-2">
                      {householdSummary}
                    </div>
                  </div>
                ) : null}
              </div>

              <Button type="button" variant="outline" onClick={handleCopyShareLink}>
                <Copy className="size-4" />
                {copied ? "Copied share link" : "Copy share link"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {saveStatus === "saving"
                  ? "Saving draft locally..."
                  : saveStatus === "saved"
                    ? "Draft saved to IndexedDB."
                    : "Scenario stays synced to the URL and local storage."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <SectionHeading
                  eyebrow="Summary"
                  title="Tax strategy summary"
                  titleAs="h3"
                  titleClassName="text-[1.9rem]"
                  description="This first pass focuses on bracket fill, bridge funding, claiming tradeoffs, and drawdown order."
                />
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  label="ACA threshold"
                  value={formatCompactCurrency(acaProjection.maxMagiBeforeCliff)}
                  description={`Approx 400% FPL for household size ${activeScenario.profile.householdSize}.`}
                />
                <StatCard
                  label="Best drawdown"
                  value={drawdownComparison[0]?.label ?? "N/A"}
                  description={`Lowest ten-year tax estimate: ${formatCompactCurrency(
                    drawdownComparison[0]?.estimatedTenYearTaxes ?? 0,
                  )}.`}
                />
                {activeScenario.profile.partner &&
                socialSecurityAnalysis.recommendedHouseholdStrategy ? (
                  <StatCard
                    label="Household SS pair"
                    value={`${socialSecurityAnalysis.recommendedHouseholdStrategy.primaryClaimAge} / ${socialSecurityAnalysis.recommendedHouseholdStrategy.partnerClaimAge}`}
                    description={`Combined annual benefit: ${formatCompactCurrency(
                      socialSecurityAnalysis.recommendedHouseholdStrategy.combinedAnnualBenefit,
                    )}.`}
                    tone="accent"
                  />
                ) : null}
              </CardContent>
            </Card>

            <ChartShell
              eyebrow="Roth ladder"
              title="Roth conversion ladder plan"
              description="A simple bracket-fill ladder from retirement until age 60, with bridge funding and 5-year availability timing."
            >
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
            </ChartShell>

            <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
              <Card>
                <CardHeader>
                  <SectionHeading
                    eyebrow="ACA"
                    title="ACA conversion pressure"
                    titleAs="h3"
                    titleClassName="text-[1.9rem]"
                    description="A baseline check on how much conversion room exists before the household approaches the subsidy pressure zone."
                  />
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                    400% FPL threshold: {formatCurrency(acaProjection.maxMagiBeforeCliff)}.
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                    First-year projected MAGI from conversions:{" "}
                    {formatCurrency(acaProjection.projectedMagi)}.
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                    Estimated benchmark premium share:{" "}
                    {formatCurrency(acaProjection.expectedPremiumShare)}.
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4">
                    Recommended first-year conversion from the tradeoff scan:{" "}
                    {formatCurrency(acaProjection.recommendedConversion)}.
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <SectionHeading
                    eyebrow="Social Security"
                    title="Claiming comparison"
                    titleAs="h3"
                    titleClassName="text-[1.9rem]"
                    description="Expected lifetime benefits are weighted by the scenario's mortality outlook to avoid a purely nominal break-even answer."
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  {socialSecurityAnalysis.options.map((option) => (
                    <div
                      key={option.claimAge}
                      className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground"
                    >
                      <p className="font-medium text-foreground">Claim at {option.claimAge}</p>
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
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                    Break-even 62 vs 67: {socialSecurityAnalysis.breakEven62Vs67.toFixed(1)}.
                    Break-even 67 vs 70:{" "}
                    {socialSecurityAnalysis.breakEven67Vs70.toFixed(1)}.
                  </div>
                  {socialSecurityAnalysis.recommendedHouseholdStrategy?.partnerClaimAge ? (
                    <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
                      Best household pair: primary at{" "}
                      {socialSecurityAnalysis.recommendedHouseholdStrategy.primaryClaimAge},
                      partner at{" "}
                      {socialSecurityAnalysis.recommendedHouseholdStrategy.partnerClaimAge}.
                      Combined expected lifetime benefit:{" "}
                      {formatCurrency(
                        socialSecurityAnalysis.recommendedHouseholdStrategy
                          .combinedExpectedLifetimeBenefit,
                      )}
                      .
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <ChartShell
              eyebrow="Tax waterfall"
              title="Bracket fill waterfall"
              description="Visualize how the first-year Roth conversion plan fills the federal brackets."
            >
              <TaxWaterfallChart data={taxWaterfall} />
            </ChartShell>

            <ChartShell
              eyebrow="Drawdown sequencing"
              title="First-pass drawdown order comparison"
              description="A simple ten-year tax estimate across a few common withdrawal sequences, using the balances in the shared scenario."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {drawdownComparison.map((strategy) => (
                  <div
                    key={strategy.id}
                    className="rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <p className="font-medium text-foreground">{strategy.label}</p>
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
          </div>
        </div>
      </section>
    </div>
  );
}
