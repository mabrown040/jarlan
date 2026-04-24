"use client";

import { useEffect, useRef } from "react";

/**
 * Inline, styled "name your plan" dialog used by every place that
 * needs to prompt for a plan name (header switcher's "Save a copy" /
 * "Start a blank plan", what-if save-as buttons). Replaces the prior
 * `window.prompt` flow which was blocked or unreliable in some
 * browsers / iframe contexts (we hit one in QA).
 *
 * Controlled component: owner manages `open`, `value`, `onSubmit`,
 * `onCancel`. Auto-focuses + selects the input when opened so the
 * user can either accept the suggestion (Enter) or just type to
 * replace it.
 */
export interface NamePlanDialogProps {
  open: boolean;
  title: string;
  description?: string;
  /** Current value of the name input. Owner controls. */
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  /** Disabled state for the submit button (e.g. while a save is in flight). */
  busy?: boolean;
  /** Custom CTA label — defaults to "Save plan". */
  submitLabel?: string;
  /** Custom placeholder — defaults to "e.g. Aggressive savings". */
  placeholder?: string;
}

export function NamePlanDialog({
  open,
  title,
  description,
  value,
  onChange,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = "Save plan",
  placeholder = "e.g. Aggressive savings",
}: NamePlanDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus + select on open so the suggested name is editable in one
  // motion: hit Enter to accept, type to replace.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // Escape closes without saving.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-plan-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      >
        <h3
          id="name-plan-dialog-title"
          className="font-display text-lg tracking-[-0.02em] text-foreground"
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
        <label className="mt-4 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Plan name
        </label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
          maxLength={80}
        />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)] transition-all hover:shadow-[0_4px_18px_rgba(255,107,53,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
