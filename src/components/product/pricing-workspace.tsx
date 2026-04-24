"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";

import { useSignInModal } from "@/components/auth/sign-in-modal";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { useAuth } from "@/hooks/use-auth";
import { useProPlan } from "@/hooks/use-pro-plan";
import { planSummaries, productFeatures } from "@/lib/product/plans";

type BillingCycle = "monthly" | "yearly";

const EMBER_GRADIENT_CLASSES =
  "bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)] hover:shadow-[0_4px_18px_rgba(255,107,53,0.5)]";

export function PricingWorkspace() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const { user, isLoading: authLoading } = useAuth();
  const { isPro, isLoading: planLoading } = useProPlan();
  const { openModal } = useSignInModal();

  const freeFeatures = useMemo(
    () => productFeatures.filter((feature) => feature.tier === "free"),
    [],
  );
  const proFeatures = useMemo(
    () => productFeatures.filter((feature) => feature.tier === "pro"),
    [],
  );

  const isLoading = authLoading || planLoading;
  const proMonthlyEffective = cycle === "yearly" ? 8 : 12;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <section className="space-y-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Pricing
        </p>
        <h1 className="font-display text-4xl tracking-[-0.03em] text-foreground sm:text-5xl">
          Free forever. Pro when you&apos;re ready.
        </h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground">
          The full calculator is free &mdash; run scenarios, compare strategies,
          read the research. Pro adds cloud sync across devices and advanced
          decision tools when you&apos;re making a real retirement call.
        </p>
      </section>

      {/* Billing cycle toggle */}
      <div className="mt-10 flex justify-center">
        <div
          role="tablist"
          aria-label="Billing cycle"
          className="inline-flex items-center gap-1 rounded-full bg-muted p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              cycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "yearly"}
            onClick={() => setCycle("yearly")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              cycle === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${
                cycle === "yearly"
                  ? "bg-[rgba(255,107,53,0.12)] text-[var(--ember)]"
                  : "bg-background/60 text-muted-foreground"
              }`}
            >
              Save $48
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Free card */}
        <div className="flex flex-col rounded-2xl border border-border/60 bg-card/40 p-8">
          <div className="space-y-1">
            <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
              {planSummaries.free.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {planSummaries.free.headline}
            </p>
          </div>

          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="font-display text-5xl tracking-[-0.03em] text-foreground">
              $0
            </span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {planSummaries.free.description}
          </p>

          <div className="mt-6">
            {user ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                You&apos;re on Free
              </button>
            ) : (
              <button
                type="button"
                onClick={openModal}
                className="w-full rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
              >
                Get started
              </button>
            )}
          </div>

          <ul className="mt-8 space-y-3 border-t border-border/40 pt-6">
            {freeFeatures.map((feature) => (
              <li key={feature.id} className="flex items-start gap-3 text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-foreground">{feature.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro card */}
        <div className="relative flex flex-col rounded-2xl border border-[var(--ember)]/40 bg-card/40 p-8 shadow-[0_0_0_1px_var(--ember)_inset,_0_20px_40px_-20px_rgba(255,107,53,0.3)]">
          <span className="absolute -top-3 left-8 inline-flex items-center rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_2px_10px_rgba(255,107,53,0.4)]">
            Recommended
          </span>

          <div className="space-y-1">
            <h2 className="font-display text-xl tracking-[-0.02em] text-foreground">
              {planSummaries.pro.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {planSummaries.pro.headline}
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-5xl tracking-[-0.03em] text-foreground">
                ${proMonthlyEffective}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {cycle === "yearly"
                ? "$96/yr, billed annually"
                : "Billed monthly"}
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {planSummaries.pro.description}
          </p>

          <div className="mt-6">
            {isLoading ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                Loading&hellip;
              </button>
            ) : !user ? (
              <button
                type="button"
                onClick={openModal}
                className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition-all ${EMBER_GRADIENT_CLASSES}`}
              >
                Sign in to upgrade
              </button>
            ) : isPro ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                You&apos;re on Pro &#10003;
              </button>
            ) : (
              <UpgradeButton
                cycle={cycle}
                className={`w-full ${EMBER_GRADIENT_CLASSES}`}
              >
                Upgrade to Pro
              </UpgradeButton>
            )}
          </div>

          <ul className="mt-8 space-y-3 border-t border-[var(--ember)]/20 pt-6">
            <li className="flex items-start gap-3 text-sm">
              <Check
                className="mt-0.5 size-4 shrink-0 text-[var(--ember)]"
                aria-hidden="true"
              />
              <span className="font-medium text-foreground">
                Everything in Free
              </span>
            </li>
            {proFeatures.map((feature) => (
              <li key={feature.id} className="flex items-start gap-3 text-sm">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-[var(--ember)]"
                  aria-hidden="true"
                />
                <span className="text-foreground">{feature.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ */}
      <section className="mt-16 space-y-8">
        <h2 className="text-center font-display text-2xl tracking-[-0.02em] text-foreground sm:text-3xl">
          Questions
        </h2>
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">
              Can I cancel anytime?
            </h3>
            <p className="text-sm text-muted-foreground">
              Yes. Cancel from your account page and you&apos;ll keep Pro access
              until the end of the billing cycle.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">
              What happens to my data if I downgrade?
            </h3>
            <p className="text-sm text-muted-foreground">
              Your scenarios stay in your browser and in the cloud. Pro sync
              pauses, but nothing is deleted.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Is there a trial?</h3>
            <p className="text-sm text-muted-foreground">
              No free trial &mdash; the Free tier is generous enough to answer
              your FIRE question without upgrading. Pro is for when you&apos;re
              actively planning.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
