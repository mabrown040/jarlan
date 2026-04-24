"use client";

import { useCallback, useState, type ReactNode } from "react";

import type { Scenario } from "@/lib/domain/types";
import { suggestUniqueScenarioName } from "@/lib/scenario/naming";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

import { NamePlanDialog } from "./name-plan-dialog";

interface SaveAsNewPlanButtonProps {
  /** The scenario to save (e.g. the comparison/combined scenario from a what-if workspace). */
  scenario: Scenario;
  /** Suggested name pre-filled in the dialog. Will be auto-incremented if it collides with an existing plan name. */
  defaultName?: string;
  /** Hide the button entirely (e.g. when no decisions are selected). */
  hidden?: boolean;
  /** Called with the new scenario id after a successful save. Useful for clearing selection state. */
  onSaved?: (newId: string) => void;
  className?: string;
  children?: ReactNode;
}

/**
 * "Save as new plan" button used inside the what-if workspaces.
 *
 * Takes a derived scenario (e.g. the user's plan with several what-if
 * decisions applied) and persists it as a new entry in the saved-plans
 * list. The new plan becomes active. Original plan stays untouched.
 *
 * Naming UX:
 * - Default name auto-increments to avoid collisions ("My plan
 *   (variant)" → "My plan (variant) (2)" if the first is already
 *   taken). Users can still type a duplicate if they want to.
 * - Uses the shared `<NamePlanDialog />` so the dialog chrome matches
 *   every other place we ask for a plan name.
 */
export function SaveAsNewPlanButton({
  scenario,
  defaultName,
  hidden = false,
  onSaved,
  className,
  children,
}: SaveAsNewPlanButtonProps) {
  const saveAsNew = useScenarioStore((s) => s.saveAsNewScenario);
  const scenarioList = useScenarioStore((s) => s.scenarioList);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const baseName = defaultName ?? `${scenario.name ?? "My plan"} (variant)`;

  const openDialog = useCallback(() => {
    setDraftName(
      suggestUniqueScenarioName(
        baseName,
        scenarioList.map((s) => s.name),
      ),
    );
    setDialogOpen(true);
  }, [baseName, scenarioList]);

  const submit = useCallback(async () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await saveAsNew(scenario, trimmed);
      setDialogOpen(false);
      onSaved?.(scenario.id);
    } finally {
      setBusy(false);
    }
  }, [draftName, saveAsNew, scenario, onSaved]);

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={busy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <SaveIcon />
        {children ?? (busy ? "Saving…" : "Save as new plan")}
      </button>

      <NamePlanDialog
        open={dialogOpen}
        title="Save this as a new plan"
        description="Your current plan stays put. The new plan becomes active so you can keep iterating on this variant."
        value={draftName}
        onChange={setDraftName}
        onSubmit={submit}
        onCancel={() => setDialogOpen(false)}
        busy={busy}
      />
    </>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3 text-[var(--ember)]", className)}
      aria-hidden="true"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
