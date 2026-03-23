"use client";

import Link from "next/link";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHero, SectionHeading } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  activateLocalProPlan,
  hasProAccess,
  loadAccountProfile,
  planSummaries,
  productFeatures,
  startProTrial,
  type LocalAccountProfile,
} from "@/lib/product";
import { formatCurrency } from "@/lib/calc";

export function PricingWorkspace() {
  const [accountProfile, setAccountProfile] = useState<LocalAccountProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadAccountProfile().then(setAccountProfile);
  }, []);

  const freeFeatures = useMemo(
    () => productFeatures.filter((feature) => feature.tier === "free"),
    [],
  );
  const proFeatures = useMemo(
    () => productFeatures.filter((feature) => feature.tier === "pro"),
    [],
  );

  async function handleStartTrial() {
    try {
      const profile = await startProTrial();
      setAccountProfile(profile);
      setMessage("Started a local 14-day Pro trial.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start the Pro trial.",
      );
    }
  }

  async function handleActivatePro(cycle: "monthly" | "yearly") {
    try {
      const profile = await activateLocalProPlan(cycle);
      setAccountProfile(profile);
      setMessage(
        cycle === "yearly"
          ? "Activated the local yearly Pro plan preview."
          : "Activated the local monthly Pro plan preview.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to activate Pro.",
      );
    }
  }

  return (
    <div className="space-y-10 pb-12">
      <PageHero
        eyebrow="Pricing"
        badges={[
          { label: "Generous free tier" },
          { label: "Pro planning", variant: "secondary" },
          { label: "Local-first account preview", variant: "outline" },
        ]}
        title="Free for discovery, Pro for active retirement decisions"
        description="The free tier keeps the top-of-funnel calculators genuinely useful. Pro is positioned as the planning layer for annual reviews, scenario comparisons, cloud sync, and decision-ready handoffs."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Free monthly
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ash)]">
              {formatCurrency(planSummaries.free.priceMonthly)}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Pro monthly
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--flame)]">
              {formatCurrency(planSummaries.pro.priceMonthly)}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Pro yearly
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ember-light)]">
              {formatCurrency(planSummaries.pro.priceYearly)}
            </p>
          </div>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        {message ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Free"
                title={planSummaries.free.headline}
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description={planSummaries.free.description}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {freeFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-xl border border-border/60 bg-card/40 p-4"
                >
                  <p className="font-medium text-foreground">{feature.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-[rgba(255,107,53,0.18)]">
            <CardHeader>
              <SectionHeading
                eyebrow="Pro"
                title={planSummaries.pro.headline}
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description={planSummaries.pro.description}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {proFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-xl border border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.06)] p-4"
                >
                  <p className="font-medium text-foreground">{feature.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}

              <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-5 text-[var(--ember)]" />
                  <p className="font-medium text-foreground">Soft upgrade path</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  The prompt is intentionally framed as a next step after someone has
                  already received real value from the free calculators.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {accountProfile ? (
                    <>
                      {!hasProAccess(accountProfile) ? (
                        <Button type="button" onClick={handleStartTrial}>
                          <Check className="size-4" />
                          Start 14-day Pro trial
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleActivatePro("monthly")}
                      >
                        <CreditCard className="size-4" />
                        Choose monthly
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleActivatePro("yearly")}
                      >
                        <CreditCard className="size-4" />
                        Choose yearly
                      </Button>
                    </>
                  ) : (
                    <Button asChild>
                      <Link href="/account">Create a local account first</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
