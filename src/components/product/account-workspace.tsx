"use client";

import { Cloud, CloudOff, CreditCard, RefreshCcw, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHero, SectionHeading, StatCard } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  activateLocalProPlan,
  downgradeToFree,
  getCloudSyncCapabilities,
  hasProAccess,
  loadCloudSyncOverview,
  signInLocalAccount,
  startProTrial,
  syncDraftForActiveAccount,
  updateCloudSyncEnabled,
} from "@/lib/product";

type SyncOverview = Awaited<ReturnType<typeof loadCloudSyncOverview>>;

export function AccountWorkspace() {
  const [overview, setOverview] = useState<SyncOverview | null>(null);
  const [displayName, setDisplayName] = useState("Jordan");
  const [email, setEmail] = useState("you@example.com");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");

  async function refreshOverview() {
    setStatus("loading");
    const nextOverview = await loadCloudSyncOverview();
    setOverview(nextOverview);
    setStatus("ready");
  }

  useEffect(() => {
    void refreshOverview();
  }, []);

  const accountProfile = overview?.accountProfile ?? null;
  const capabilities = overview?.capabilities ?? getCloudSyncCapabilities();

  async function handleCreateAccount() {
    setStatus("saving");

    try {
      await signInLocalAccount({ email, displayName });
      setMessage("Local preview account created.");
      await refreshOverview();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create the account.",
      );
      setStatus("ready");
    }
  }

  async function handleStartTrial() {
    setStatus("saving");

    try {
      await startProTrial();
      setMessage("Started a local 14-day Pro trial.");
      await refreshOverview();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start the trial.",
      );
      setStatus("ready");
    }
  }

  async function handleActivatePro(cycle: "monthly" | "yearly") {
    setStatus("saving");

    try {
      await activateLocalProPlan(cycle);
      setMessage(
        cycle === "yearly"
          ? "Activated the local yearly Pro preview."
          : "Activated the local monthly Pro preview.",
      );
      await refreshOverview();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to activate Pro.",
      );
      setStatus("ready");
    }
  }

  async function handleDowngrade() {
    setStatus("saving");

    await downgradeToFree();
    setMessage("Moved the account back to the free tier.");
    await refreshOverview();
  }

  async function handleToggleSync(enabled: boolean) {
    setStatus("saving");

    try {
      await updateCloudSyncEnabled(enabled);
      setMessage(
        enabled
          ? "Cloud sync remains enabled for this account."
          : "Cloud sync is now paused for this account.",
      );
      await refreshOverview();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update sync settings.",
      );
      setStatus("ready");
    }
  }

  async function handleSyncNow() {
    setStatus("saving");

    const syncResult = await syncDraftForActiveAccount();
    setMessage(
      syncResult
        ? syncResult.status === "synced"
          ? "Draft synced to the configured cloud endpoint."
          : syncResult.status === "local_only"
            ? "Draft queued into the local cloud-sync preview. Add an endpoint to make it remote."
            : "Tried to sync the draft. Review the latest sync row below for details."
        : "No Pro account or draft was available to sync.",
    );
    await refreshOverview();
  }

  return (
    <div className="space-y-10 pb-12">
      <PageHero
        eyebrow="Account"
        badges={[
          { label: "Local preview auth" },
          { label: "Billing controls", variant: "secondary" },
          { label: "Cloud sync queue", variant: "outline" },
        ]}
        title="Account, billing, and sync controls"
        description="This account layer keeps the browser-first flow intact while adding a sign-in identity, plan state, and a sync queue that can target a real endpoint later."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Current plan
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ash)]">
              {accountProfile?.billingState ?? "Guest"}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Cloud mode
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--flame)]">
              {capabilities.mode}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Sync records
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ember-light)]">
              {overview?.records.length ?? 0}
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

        {!accountProfile ? (
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Create account"
                title="Start with a local preview account"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="This signs you into a browser-stored account profile so pricing, billing state, and cloud-sync preferences have somewhere to live."
              />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Display name</p>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Email</p>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="button" onClick={handleCreateAccount} disabled={status === "saving"}>
                  <UserRound className="size-4" />
                  Create local account
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {accountProfile ? (
          <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
            <Card>
              <CardHeader>
                <SectionHeading
                  eyebrow="Plan"
                  title="Subscription controls"
                  titleAs="h3"
                  titleClassName="text-[1.9rem]"
                  description="Billing is modeled locally for now so the product can define the UX and state boundaries before a live provider is wired in."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <StatCard
                    label="Signed in as"
                    value={accountProfile.displayName}
                    description={accountProfile.email}
                    tone="accent"
                  />
                  <StatCard
                    label="Effective access"
                    value={hasProAccess(accountProfile) ? "Pro" : "Free"}
                    description={
                      accountProfile.trialEndsAt
                        ? `Trial ends ${new Date(accountProfile.trialEndsAt).toLocaleDateString()}.`
                        : "Free tier access is active."
                    }
                    tone={hasProAccess(accountProfile) ? "success" : "default"}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {!hasProAccess(accountProfile) ? (
                    <Button
                      type="button"
                      onClick={handleStartTrial}
                      disabled={status === "saving"}
                    >
                      <CreditCard className="size-4" />
                      Start Pro trial
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleActivatePro("monthly")}
                    disabled={status === "saving"}
                  >
                    <CreditCard className="size-4" />
                    Monthly Pro preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleActivatePro("yearly")}
                    disabled={status === "saving"}
                  >
                    <CreditCard className="size-4" />
                    Yearly Pro preview
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleDowngrade}
                    disabled={status === "saving"}
                  >
                    Move back to free
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeading
                  eyebrow="Cloud sync"
                  title="Sync queue"
                  titleAs="h3"
                  titleClassName="text-[1.9rem]"
                  description="When a remote endpoint is configured, Pro accounts can reuse this same queue to sync scenarios beyond the browser."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 p-4">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">Enable cloud sync</p>
                    <p className="text-sm text-muted-foreground">
                      Current mode: {capabilities.mode}. Endpoint configured:{" "}
                      {capabilities.endpointConfigured ? "yes" : "no"}.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={accountProfile.cloudSyncEnabled}
                      onChange={(event) => handleToggleSync(event.target.checked)}
                    />
                    {accountProfile.cloudSyncEnabled ? (
                      <Cloud className="size-4" />
                    ) : (
                      <CloudOff className="size-4" />
                    )}
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncNow}
                    disabled={status === "saving"}
                  >
                    <RefreshCcw className="size-4" />
                    Sync current draft now
                  </Button>
                </div>

                <div className="space-y-3">
                  {overview?.records.length ? (
                    overview.records.map((record) => (
                      <div
                        key={record.scenarioId}
                        className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground"
                      >
                        <p className="font-medium text-foreground">
                          {record.scenarioName}
                        </p>
                        <p className="mt-2">Status: {record.status}.</p>
                        <p className="mt-1">
                          Last attempted: {record.lastAttemptedAt ?? "Never"}.
                        </p>
                        {record.lastError ? (
                          <p className="mt-1 text-red-300">{record.lastError}</p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-card/35 p-4 text-sm text-muted-foreground">
                      No sync records yet. Save a scenario or trigger a manual sync to
                      seed the queue.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </div>
  );
}
