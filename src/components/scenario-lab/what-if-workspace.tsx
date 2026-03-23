"use client";

import type { Route } from "next";
import { Copy } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChartShell,
  CompactPageHeader,
  SectionHeading,
  StatCard,
} from "@/components/brand";
import { ProUpgradePrompt } from "@/components/product/pro-upgrade-prompt";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { ScenarioVariantComparisonChart } from "@/components/scenario-lab/scenario-variant-comparison-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatYears,
} from "@/lib/calc";
import type { ScenarioVariantConfig } from "@/lib/scenario-lab/analysis";
import {
  applyVariantToScenario,
  buildOneMoreYearAnalysis,
  buildSensitivityAnalysis,
} from "@/lib/scenario-lab/analysis";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
  deserializeScenarioFromSearchParam,
  serializeScenarioToSearchParam,
} from "@/lib/share";
import { useScenarioStore } from "@/lib/store";

const initialVariants: ScenarioVariantConfig[] = [
  {
    id: "variant-a",
    name: "Save more",
    annualSavingsDelta: 6_000,
    retirementExpenseDelta: 0,
    retirementAgeDelta: 0,
    realReturnDelta: 0,
  },
  {
    id: "variant-b",
    name: "Spend less",
    annualSavingsDelta: 0,
    retirementExpenseDelta: -6_000,
    retirementAgeDelta: 0,
    realReturnDelta: 0,
  },
  {
    id: "variant-c",
    name: "One more year",
    annualSavingsDelta: 0,
    retirementExpenseDelta: 0,
    retirementAgeDelta: 1,
    realReturnDelta: 0,
  },
];

export default function WhatIfWorkspace() {
  const { activeScenario, status, saveStatus, initialize, saveDraft } =
    useScenarioStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const hasInitialized = useRef(false);
  const [copied, setCopied] = useState(false);
  const [variants, setVariants] = useState(initialVariants);

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

  const baseSummary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );
  const comparisonSummaries = useMemo(
    () =>
      variants.map((variant) => {
        const scenario = applyVariantToScenario(activeScenario, variant);

        return {
          ...variant,
          summary: calculateQuickFireSummary(scenario),
        };
      }),
    [activeScenario, variants],
  );
  const sensitivity = useMemo(
    () => buildSensitivityAnalysis(activeScenario),
    [activeScenario],
  );
  const oneMoreYear = useMemo(
    () => buildOneMoreYearAnalysis(activeScenario),
    [activeScenario],
  );
  const visualComparisonData = useMemo(
    () => [
      { name: "Base case", yearsToFi: baseSummary.yearsToFi ?? 60 },
      ...comparisonSummaries.map((variant) => ({
        name: variant.name,
        yearsToFi: variant.summary.yearsToFi ?? 60,
      })),
    ],
    [baseSummary.yearsToFi, comparisonSummaries],
  );

  const topSensitivityLever =
    sensitivity.length > 0 ? sensitivity[0].label : "---";

  function updateVariant(
    variantId: string,
    mutator: (variant: ScenarioVariantConfig) => ScenarioVariantConfig,
  ) {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === variantId ? mutator(variant) : variant,
      ),
    );
  }

  async function handleCopyShareLink() {
    if (typeof window === "undefined") {
      return;
    }

    await navigator.clipboard.writeText(
      buildScenarioShareUrl(
        `${window.location.origin}${pathname}`,
        activeScenario,
      ),
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ---- Header ---- */}
      <CompactPageHeader
        title="What if?"
        description="See which levers move your plan the most, and compare alternative paths side by side."
        metrics={[
          {
            label: "FIRE number",
            value: formatCompactCurrency(baseSummary.fireNumber),
            accent: true,
          },
          {
            label: "Years to FI",
            value: formatYears(baseSummary.yearsToFi),
          },
          {
            label: "Top lever",
            value: topSensitivityLever,
          },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyShareLink}
            >
              <Copy className="size-4" />
              {copied ? "Copied share link" : "Copy share link"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {saveStatus === "saving"
                ? "Saving draft locally..."
                : saveStatus === "saved"
                  ? "Draft saved to IndexedDB."
                  : ""}
            </p>
          </div>
        }
      />

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        {/* ---- Pro prompt ---- */}
        <ProUpgradePrompt
          title="Use Pro when scenario comparison becomes a real decision workflow"
          description="Keep experimenting freely, then move into Pro when you want this lab plus saved comparisons and recurring review infrastructure."
        />

        {/* ---- Section 1: Sensitivity Ranking (lead) ---- */}
        <ChartShell
          eyebrow="Sensitivity"
          title="What moves the plan the most"
          description="Ranked by impact on years-to-FI. Focus your energy on the levers that matter."
        >
          <div className="space-y-4">
            {sensitivity.map((item, index) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">
                    {item.improvementYears.toFixed(1)} years faster
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(Math.max(item.improvementYears * 10, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartShell>

        {/* ---- Section 2: One More Year ---- */}
        <ChartShell
          eyebrow="Marginal benefit"
          title="One more year of work"
          description="How much extra runway does delaying retirement by a single year buy you?"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              label="Extra retirement balance"
              value={formatCompactCurrency(oneMoreYear.extraRetirementBalance)}
              description="Projected additional balance at the pushed retirement age."
              tone="accent"
            />
            <StatCard
              label="FI timeline improvement"
              value={formatYears(oneMoreYear.yearsToFiImprovement)}
              description="Change in years-to-FI when the plan works one more year."
              tone="success"
            />
          </div>
        </ChartShell>

        {/* ---- Section 3: Custom Scenarios ---- */}
        <ChartShell
          eyebrow="Variants"
          title="Compare alternative paths"
          description="Edit deltas on each variant to shape comparison scenarios against your base case."
        >
          <div className="grid gap-6 xl:grid-cols-4">
            {/* Base case card */}
            <Card className="xl:col-span-1">
              <CardHeader>
                <SectionHeading
                  eyebrow="Base case"
                  title="Control scenario"
                  titleAs="h4"
                  titleClassName="text-[1.7rem]"
                  description="Every variant is applied on top of this current shared scenario."
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <StatCard
                  label="FIRE number"
                  value={formatCompactCurrency(baseSummary.fireNumber)}
                  description="The current shared scenario acts as the control."
                  tone="accent"
                />
                <StatCard
                  label="Years to FI"
                  value={formatYears(baseSummary.yearsToFi)}
                  description={
                    baseSummary.fireAge === null
                      ? "Needs more runway."
                      : `Estimated FI age: ${baseSummary.fireAge}.`
                  }
                />
              </CardContent>
            </Card>

            {/* Editable variant cards */}
            {comparisonSummaries.map((variant) => (
              <Card key={variant.id}>
                <CardHeader>
                  <SectionHeading
                    eyebrow="Variant"
                    title={variant.name}
                    titleAs="h4"
                    titleClassName="text-[1.7rem]"
                    description="Edit the deltas to shape a comparison scenario."
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    value={variant.name}
                    onChange={(event) =>
                      updateVariant(variant.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Annual savings delta
                      </p>
                      <NumberInput
                        min={-100_000}
                        step={1000}
                        inputMode="numeric"
                        value={variant.annualSavingsDelta}
                        onValueChange={(value) =>
                          updateVariant(variant.id, (current) => ({
                            ...current,
                            annualSavingsDelta: value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Retirement spending delta
                      </p>
                      <NumberInput
                        min={-100_000}
                        step={1000}
                        inputMode="numeric"
                        value={variant.retirementExpenseDelta}
                        onValueChange={(value) =>
                          updateVariant(variant.id, (current) => ({
                            ...current,
                            retirementExpenseDelta: value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Retirement age delta
                      </p>
                      <NumberInput
                        min={-10}
                        max={10}
                        step={1}
                        inputMode="numeric"
                        value={variant.retirementAgeDelta}
                        onValueChange={(value) =>
                          updateVariant(variant.id, (current) => ({
                            ...current,
                            retirementAgeDelta: Math.round(value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Real return delta
                      </p>
                      <NumberInput
                        min={-0.02}
                        max={0.02}
                        step={0.001}
                        inputMode="decimal"
                        value={variant.realReturnDelta}
                        onValueChange={(value) =>
                          updateVariant(variant.id, (current) => ({
                            ...current,
                            realReturnDelta: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard
                      label="FIRE number"
                      value={formatCompactCurrency(variant.summary.fireNumber)}
                      description="Variant-specific spending target."
                    />
                    <StatCard
                      label="Years to FI"
                      value={formatYears(variant.summary.yearsToFi)}
                      description={
                        variant.summary.fireAge === null
                          ? "Still off-track."
                          : `FI age: ${variant.summary.fireAge}.`
                      }
                      tone="success"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison chart below the cards */}
          <ScenarioVariantComparisonChart data={visualComparisonData} />
        </ChartShell>
      </section>
    </div>
  );
}
