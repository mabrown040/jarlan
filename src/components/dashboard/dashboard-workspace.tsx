"use client";

import { Copy, Download, Upload } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  ChartShell,
  PageHero,
  SectionHeading,
  StatCard,
} from "@/components/brand";
import { NetWorthHistoryChart } from "@/components/dashboard/net-worth-history-chart";
import { ProUpgradePrompt } from "@/components/product/pro-upgrade-prompt";
import { RetirementCheckupSummary } from "@/components/retirement/retirement-checkup-summary";
import { useGlobalScenarioFormatting } from "@/components/shared/use-global-scenario-formatting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import {
  calculateFireTypeSummaries,
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
  formatYears,
} from "@/lib/calc";
import { captureScenarioSnapshot, listScenarioSnapshots } from "@/lib/db";
import { parseScenario } from "@/lib/domain/schema";
import type { ScenarioSnapshotRecord } from "@/lib/db";
import { buildRetirementCheckup } from "@/lib/retirement";
import {
  SCENARIO_QUERY_KEY,
  buildScenarioShareUrl,
} from "@/lib/share";
import { useAutoSaveScenario } from "@/lib/hooks/use-auto-save-scenario";
import { useInitializeStore } from "@/lib/hooks/use-initialize-store";
import { useDrawerStore, useScenarioStore } from "@/lib/store";

function getNextMilestone(progress: number, fireNumber: number) {
  const thresholds = [0.25, 0.5, 0.75, 1];
  const nextThreshold = thresholds.find((threshold) => progress < threshold);

  if (!nextThreshold) {
    return {
      label: "Fully funded",
      amount: 0,
    };
  }

  return {
    label: `${Math.round(nextThreshold * 100)}% to FI`,
    amount: fireNumber * nextThreshold,
  };
}

export function DashboardWorkspace() {
  const {
    activeScenario,
    status,
    saveStatus,
    replaceScenario,
  } = useScenarioStore();
  const drawerStore = useDrawerStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sharedScenarioParam = searchParams.get(SCENARIO_QUERY_KEY);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [snapshots, setSnapshots] = useState<ScenarioSnapshotRecord[]>([]);

  useInitializeStore(sharedScenarioParam);
  useAutoSaveScenario({ syncUrl: true });
  useGlobalScenarioFormatting(activeScenario);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    void listScenarioSnapshots(activeScenario.id).then(setSnapshots);
  }, [activeScenario.id, status]);

  const summary = useMemo(
    () => calculateQuickFireSummary(activeScenario),
    [activeScenario],
  );
  const fireTypes = useMemo(
    () => calculateFireTypeSummaries(activeScenario),
    [activeScenario],
  );
  const fireProgress = summary.fireNumber > 0 ? Math.min((snapshots.at(-1)?.netWorth ?? activeScenario.accounts.reduce((total, account) => total + account.currentBalance, 0)) / summary.fireNumber, 1.5) : 0;
  const nextMilestone = getNextMilestone(fireProgress, summary.fireNumber);
  const historyData = useMemo(
    () =>
      snapshots.map((snapshot) => ({
        label: new Date(snapshot.capturedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        netWorth: snapshot.netWorth,
      })),
    [snapshots],
  );
  const retirementCheckup = useMemo(
    () => buildRetirementCheckup({ scenario: activeScenario, snapshots }),
    [activeScenario, snapshots],
  );

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

  async function handleCaptureSnapshot() {
    await captureScenarioSnapshot(activeScenario);
    setSnapshots(await listScenarioSnapshots(activeScenario.id));
  }

  function handleExport() {
    if (typeof window === "undefined") {
      return;
    }

    const blob = new Blob([JSON.stringify(activeScenario, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeScenario.name.replace(/\s+/g, "-").toLowerCase() || "firecalc-scenario"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const contents = await file.text();
    const parsed = parseScenario(JSON.parse(contents));

    if (parsed) {
      replaceScenario(parsed);
    }

    event.target.value = "";
  }

  return (
    <div className="space-y-10 pb-12">
      <PageHero
        eyebrow="Dashboard and tracking"
        badges={[
          { label: "Net worth snapshots" },
          { label: "Milestones", variant: "secondary" },
          { label: "Export / import", variant: "outline" },
        ]}
        title="Track progress against the plan"
        description="The dashboard turns the live scenario into snapshots, milestone progress, and portable JSON exports so the app can support an ongoing FIRE workflow without needing accounts or cloud sync."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Current net worth
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--flame)]">
              {formatCompactCurrency(
                activeScenario.accounts.reduce(
                  (total, account) => total + account.currentBalance,
                  0,
                ),
              )}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Snapshot count
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ash)]">
              {snapshots.length}
            </p>
          </div>
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(245,240,235,0.6)]">
              Next milestone
            </p>
            <p className="mt-2 font-display text-3xl tracking-[-0.03em] text-[var(--ember-light)]">
              {nextMilestone.label}
            </p>
          </div>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl space-y-8 px-6">
        <ProUpgradePrompt
          title="Use Pro when dashboard tracking becomes part of your annual review"
          description="The dashboard is where saved history, yearly snapshots, and future checkups compound into a recurring planning habit."
        />

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handleCaptureSnapshot}>
            Capture snapshot
          </Button>
          <Button type="button" variant="outline" onClick={handleCopyShareLink}>
            <Copy className="size-4" />
            {copied ? "Copied share link" : "Copy share link"}
          </Button>
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Import JSON
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
          <p className="self-center text-sm text-muted-foreground">
            {saveStatus === "saving"
              ? "Saving draft locally..."
              : saveStatus === "saved"
                ? "Draft saved to IndexedDB."
                : "Scenario stays synced to the URL and local storage."}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Annual review</p>
              <p className="text-sm text-muted-foreground">
                Portfolio{" "}
                <span className="font-medium text-foreground">
                  {formatCompactCurrency(retirementCheckup.currentPortfolio)}
                </span>
                {" · "}Spending{" "}
                <span className="font-medium text-foreground">
                  {formatCompactCurrency(activeScenario.retirementExpenses)}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
                onClick={() => drawerStore.open("basics")}
              >
                Update in Your Plan
              </button>
              <Button type="button" onClick={handleCaptureSnapshot}>
                Capture snapshot
              </Button>
            </div>
          </div>
        </div>

        <RetirementCheckupSummary checkup={retirementCheckup} />

        <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Progress"
                title="Dashboard summary"
                titleAs="h3"
                titleClassName="text-[1.9rem]"
                description="A snapshot of your current progress and the next threshold on the road to FI."
              />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <StatCard
                label="% to FI"
                value={formatPercent(fireProgress, 1)}
                description={`Current FIRE number: ${formatCompactCurrency(summary.fireNumber)}.`}
                tone="accent"
              />
              <StatCard
                label="Next milestone amount"
                value={formatCompactCurrency(nextMilestone.amount)}
                description="The next default milestone on the journey to full FI."
              />
              <StatCard
                label="Years to FI"
                value={formatYears(summary.yearsToFi)}
                description={
                  summary.fireAge === null
                    ? "No date yet."
                    : `Estimated FI age: ${summary.fireAge}.`
                }
              />
              <StatCard
                label="Latest snapshot"
                value={
                  snapshots.at(-1)
                    ? new Date(snapshots.at(-1)!.capturedAt).toLocaleDateString()
                    : "None yet"
                }
                description="Capture snapshots over time to build an actual net worth history."
              />
            </CardContent>
          </Card>

          <ChartShell
            eyebrow="Milestones"
            title="FIRE progress by lens"
            description="Use the same underlying scenario to track progress toward each FIRE milestone without setting up multiple calculators."
          >
            <div className="space-y-4">
              {fireTypes.map((fireType) => (
                <div key={fireType.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{fireType.label}</span>
                    <span className="text-muted-foreground">
                      {formatPercent(Math.min(fireType.progress, 1.5), 0)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(fireType.progress * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ChartShell>
        </div>

        <ChartShell
          eyebrow="History"
          title="Net worth snapshot history"
          description="Capture snapshots any time you update balances to build a lightweight projected-vs-actual dashboard over time."
        >
          {historyData.length > 0 ? (
            <NetWorthHistoryChart data={historyData} />
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
              No snapshots yet. Capture the current scenario to start a local net worth
              history.
            </div>
          )}
        </ChartShell>

        <Card>
          <CardHeader>
            <SectionHeading
              eyebrow="Snapshots"
              title="Recent entries"
              titleAs="h3"
              titleClassName="text-[1.9rem]"
              description="Each snapshot stores the current total net worth plus the per-account balance mix."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshots.slice(-5).reverse().map((snapshot) => (
              <div
                key={snapshot.id}
                className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground"
              >
                <p className="font-medium text-foreground">
                  {new Date(snapshot.capturedAt).toLocaleString()}
                </p>
                <p className="mt-2">
                  Net worth: {formatCurrency(snapshot.netWorth)}.
                </p>
                <p className="mt-1">
                  Retirement spending target: {formatCurrency(snapshot.retirementExpenses)}.
                </p>
              </div>
            ))}
            {snapshots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
                No snapshot entries yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
