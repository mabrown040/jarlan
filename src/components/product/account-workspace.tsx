"use client";

/**
 * Account dashboard.
 *
 * Shows the signed-in user's plan, scenario sync state, and billing
 * controls. Relies on real Supabase auth + Stripe billing — no local
 * preview state. If a visitor lands here without being signed in we
 * prompt them to open the shared sign-in modal.
 */
import { Check, Cloud, CreditCard, LogOut, Mail, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSignInModal } from "@/components/auth/sign-in-modal";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProPlan } from "@/hooks/use-pro-plan";
import { useScenarioStore } from "@/lib/store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function relativeTime(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SyncState = {
  count: number;
  lastSyncedAt: string | null;
};

export function AccountWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, signOut } = useAuth();
  const { plan, isPro } = useProPlan();
  const { openModal } = useSignInModal();
  const localScenarioCount = useScenarioStore((s) => s.scenarioList.length);

  const [sync, setSync] = useState<SyncState>({ count: 0, lastSyncedAt: null });
  const [showSuccess, setShowSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const checkoutFlag = searchParams.get("checkout");

  /* ── Load sync state from Supabase ────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    async function refresh() {
      if (!supabase || !user) return;

      const [{ count }, { data: latest }] = await Promise.all([
        supabase
          .from("scenarios")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id),
        supabase
          .from("scenarios")
          .select("updated_at")
          .eq("owner_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      setSync({
        count: count ?? 0,
        lastSyncedAt: latest?.updated_at ?? null,
      });
    }

    void refresh();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* ── Handle ?checkout=success (post-Stripe redirect) ──────────── */
  useEffect(() => {
    if (checkoutFlag !== "success") return;

    setShowSuccess(true);

    // Poll until the webhook flips plan → "pro" (or we time out).
    const deadline = Date.now() + 10_000;
    const interval = setInterval(() => {
      if (plan === "pro" || Date.now() > deadline) {
        clearInterval(interval);
      }
    }, 500);

    // Clear the query param so a refresh doesn't re-trigger the banner.
    router.replace("/account");

    return () => {
      clearInterval(interval);
    };
    // We intentionally depend only on the initial URL flag — not on plan —
    // so the replace() only runs once. The interval watches plan via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutFlag, router]);

  /* ── Manage subscription (Stripe customer portal) ─────────────── */
  const handleManageSubscription = useCallback(async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `Portal failed (${response.status})`;
        throw new Error(message);
      }

      if (
        !data ||
        typeof data !== "object" ||
        !("url" in data) ||
        typeof (data as { url?: unknown }).url !== "string"
      ) {
        throw new Error("Portal response missing URL");
      }

      window.location.href = (data as { url: string }).url;
    } catch (err) {
      setPortalError(
        err instanceof Error ? err.message : "Unable to open billing portal",
      );
      setPortalLoading(false);
    }
  }, []);

  const syncHeadline = useMemo(() => {
    if (sync.count === 0) return "No scenarios synced";
    return sync.count === 1 ? "1 scenario synced" : `${sync.count} scenarios synced`;
  }, [sync.count]);

  const syncSubtitle = useMemo(() => {
    if (sync.count === 0) return "No scenarios synced yet.";
    if (!sync.lastSyncedAt) return "Synced across your devices.";
    return `Last synced ${relativeTime(sync.lastSyncedAt)}.`;
  }, [sync.count, sync.lastSyncedAt]);

  /* ── Loading state ────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">Loading&hellip;</p>
      </div>
    );
  }

  /* ── Signed-out state ─────────────────────────────────────────── */
  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-6 py-24 text-center">
        <h1 className="font-display text-2xl tracking-[-0.02em] text-foreground">
          Sign in to manage your account
        </h1>
        <p className="text-muted-foreground">
          Your plan, billing, and synced scenarios live here once you&apos;re
          signed in.
        </p>
        <div className="pt-2">
          <Button onClick={openModal}>
            <Mail className="size-4" />
            Sign in
          </Button>
        </div>
        {localScenarioCount > 0 ? (
          <p className="pt-4 text-xs text-muted-foreground">
            You have {localScenarioCount} scenario
            {localScenarioCount === 1 ? "" : "s"} saved locally. Signing in will
            let you sync {localScenarioCount === 1 ? "it" : "them"} across
            devices.
          </p>
        ) : null}
      </div>
    );
  }

  /* ── Main dashboard ───────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-12 sm:py-16">
      <section className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ember)]">
          Account
        </p>
        <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground sm:text-4xl">
          Your account
        </h1>
        <p className="text-base text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{user.email}</span>
        </p>
      </section>

      {showSuccess ? (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--ember)]/30 bg-[rgba(255,107,53,0.06)] p-4">
          <Sparkles className="mt-0.5 size-5 text-[var(--ember)]" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Welcome to Pro!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your subscription is active. Cloud sync is unlocked across all
              your devices.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            aria-label="Dismiss"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            &times;
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Plan card ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Plan
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-[-0.02em] text-foreground">
            {isPro ? "Pro" : "Free"}
          </h2>

          {isPro ? (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                You&apos;re on Pro. Thanks for supporting Calcifer.
              </p>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="mt-4 w-full"
              >
                <CreditCard className="size-4" />
                {portalLoading ? "Opening portal\u2026" : "Manage subscription"}
              </Button>
              {portalError ? (
                <p className="mt-2 text-xs text-red-400">{portalError}</p>
              ) : null}
              <ul className="mt-5 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-[var(--ember)]" />
                  Cloud sync across devices
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-[var(--ember)]" />
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-3.5 text-[var(--ember)]" />
                  Future Pro features included
                </li>
              </ul>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted-foreground">
                Use the full calculator forever, for free.
              </p>
              <UpgradeButton cycle="monthly" className="mt-4 w-full">
                <Sparkles className="size-4" />
                Upgrade to Pro
              </UpgradeButton>
              <p className="mt-3 text-xs text-muted-foreground">
                Cloud sync across devices, priority support, future Pro
                features.
              </p>
            </>
          )}
        </div>

        {/* ── Sync card ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Cloud sync
          </p>
          <h2 className="mt-2 flex items-center gap-2 font-display text-2xl tracking-[-0.02em] text-foreground">
            <Cloud className="size-5 text-[var(--ember)]" />
            {syncHeadline}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{syncSubtitle}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Your plans are encrypted at rest and protected by row-level
            security &mdash; no one else can read them.
          </p>
          <Button variant="outline" onClick={signOut} className="mt-4 w-full">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
