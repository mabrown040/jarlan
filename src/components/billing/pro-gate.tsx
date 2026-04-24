"use client";

/**
 * Pro feature gate.
 *
 * Wrap a page's content with <ProGate featureName="..." pitch="...">. When
 * the user has Pro access, children render unchanged. When the user is on
 * free, children are replaced by a centered upgrade card that explains the
 * feature and invites them to sign in / upgrade.
 *
 * Behavior mirrors useProPlan():
 *  - Signed-out visitor         → "Sign in to try" variant
 *  - Signed-in free user        → "Upgrade to Pro" variant (with UpgradeButton)
 *  - Signed-in Pro user         → children pass through
 *  - Pre-billing mode (no Stripe env vars) → all signed-in users pass through
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useProPlan } from "@/hooks/use-pro-plan";
import { useSignInModal } from "@/components/auth/sign-in-modal";
import { UpgradeButton } from "@/components/billing/upgrade-button";

interface ProGateProps {
  /** Short name of the Pro feature being gated, e.g. "Tax Strategy". */
  featureName: string;
  /** One-sentence pitch of the feature's value. */
  pitch: string;
  /** Children render when the user has Pro access. */
  children: ReactNode;
}

export function ProGate({ featureName, pitch, children }: ProGateProps) {
  const { user, isLoading: authLoading, supabaseConfigured } = useAuth();
  const { isPro, isLoading: planLoading } = useProPlan();
  const { openModal } = useSignInModal();

  // If Supabase isn't configured at all, the app is in fully local mode
  // and billing doesn't apply — let everything through.
  if (!supabaseConfigured) {
    return <>{children}</>;
  }

  // Avoid a flash of the gate card during initial auth resolution.
  if (authLoading || planLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-6 animate-pulse rounded-full bg-muted" aria-hidden="true" />
      </div>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  // Signed-out visitor — prompt to sign in. The SignInModal is already
  // mounted globally via the UserMenu in SiteShell, so we just trigger
  // it via useSignInModal's module-scoped store.
  if (!user) {
    return (
      <GateCard
        featureName={featureName}
        pitch={pitch}
        primaryLabel="Sign in to try"
        onPrimaryClick={openModal}
        secondary={
          <p className="text-xs text-muted-foreground">
            Free account &middot; no password &middot; 10 seconds to create
          </p>
        }
      />
    );
  }

  // Signed-in free user — show checkout CTA.
  return (
    <GateCard
      featureName={featureName}
      pitch={pitch}
      primaryNode={
        <UpgradeButton cycle="monthly" className="w-full">
          <Sparkles className="size-4" />
          Upgrade to Pro
        </UpgradeButton>
      }
      secondary={
        <p className="text-xs text-muted-foreground">
          $12/mo &middot; cancel anytime &middot;{" "}
          <Link
            href="/pricing"
            className="text-foreground underline-offset-2 hover:underline"
          >
            compare plans
          </Link>
        </p>
      }
    />
  );
}

/* ── Shared card ──────────────────────────────────────────────── */

interface GateCardProps {
  featureName: string;
  pitch: string;
  primaryLabel?: string;
  onPrimaryClick?: () => void;
  primaryNode?: ReactNode;
  secondary?: ReactNode;
}

function GateCard({
  featureName,
  pitch,
  primaryLabel,
  onPrimaryClick,
  primaryNode,
  secondary,
}: GateCardProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-6 py-16 text-center sm:py-24">
      <div className="flex size-14 items-center justify-center rounded-full bg-[rgba(255,107,53,0.08)]">
        <Lock className="size-6 text-[var(--ember)]" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Pro feature
        </p>
        <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground">
          {featureName}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          {pitch}
        </p>
      </div>

      <div className="w-full space-y-3">
        {primaryNode ? (
          primaryNode
        ) : onPrimaryClick ? (
          <button
            type="button"
            onClick={onPrimaryClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)] transition-all hover:brightness-110"
          >
            {primaryLabel ?? "Upgrade to Pro"}
          </button>
        ) : null}
        {secondary}
      </div>

      <Link
        href="/"
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to the free calculator
      </Link>
    </div>
  );
}
