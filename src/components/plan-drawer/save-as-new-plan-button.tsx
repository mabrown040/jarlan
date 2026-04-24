"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { Scenario } from "@/lib/domain/types";
import { useScenarioStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SaveAsNewPlanButtonProps {
  /** The scenario to save (e.g. the comparison/combined scenario from a what-if workspace). */
  scenario: Scenario;
  /** Suggested name pre-filled in the dialog. */
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
 * Naming uses an inline modal rather than `window.prompt` —
 * `window.prompt` is blocked or unreliable in some browsers / iframe
 * contexts (we hit one in QA), and a real input field also lets us
 * style the suggested name and validate inline.
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
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestedName =
    defaultName ?? `${scenario.name ?? "My plan"} (variant)`;

  const openDialog = useCallback(() => {
    setDraftName(suggestedName);
    setDialogOpen(true);
  }, [suggestedName]);

  // Focus + select the suggested name when the dialog opens, so the
  // user can hit Enter to accept the default or just type to replace.
  useEffect(() => {
    if (!dialogOpen) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [dialogOpen]);

  // Escape closes the dialog without saving.
  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialogOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialogOpen]);

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

      {dialogOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-as-plan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            // Click outside the card dismisses (without saving).
            if (e.target === e.currentTarget) setDialogOpen(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          >
            <h3
              id="save-as-plan-title"
              className="font-display text-lg tracking-[-0.02em] text-foreground"
            >
              Save this as a new plan
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Your current plan stays put. The new plan becomes active so you
              can keep iterating on this variant.
            </p>
            <label className="mt-4 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Plan name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Aggressive savings"
              className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
              maxLength={80}
            />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !draftName.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)] transition-all hover:shadow-[0_4px_18px_rgba(255,107,53,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <SaveIcon className="size-3.5 text-white" />
                {busy ? "Saving…" : "Save plan"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
