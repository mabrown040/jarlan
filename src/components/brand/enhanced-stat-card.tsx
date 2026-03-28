"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneStyles = {
  default: {
    label: "text-muted-foreground",
    value: "text-foreground",
    bar: "bg-primary",
  },
  accent: {
    label: "text-[var(--ember)]",
    value: "text-[var(--ember)]",
    bar: "bg-gradient-to-r from-[var(--flame)] to-[var(--ember)]",
  },
  success: {
    label: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  },
  warning: {
    label: "text-[var(--warning)]",
    value: "text-[var(--warning)]",
    bar: "bg-gradient-to-r from-[var(--flame)] to-[var(--warning)]",
  },
} as const;

/**
 * Every card renders the same 4-row structure:
 *   1. Label (uppercase)
 *   2. Big number + optional subtitle
 *   3. Insight slot (progress bar OR mini-rows — never both)
 *   4. One-line caption
 *
 * "Learn more" flips to the back face.
 */
export function EnhancedStatCard({
  label,
  value,
  subtitle,
  insight,
  caption,
  learnMore,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  subtitle?: string;
  insight?: ReactNode;
  caption: string;
  learnMore?: { title: string; content: ReactNode };
  tone?: keyof typeof toneStyles;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const styles = toneStyles[tone];

  return (
    <div className={cn("[perspective:1000px]", className)}>
      <div
        className={cn(
          "relative transition-transform duration-500 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        {/* ── Front ── */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] [backface-visibility:hidden]">
          {/* Row 1: Label */}
          <p
            className={cn(
              "text-[0.65rem] font-bold uppercase tracking-[0.14em]",
              styles.label,
            )}
          >
            {label}
          </p>

          {/* Row 2: Value + subtitle */}
          <div className="mt-3 flex items-baseline gap-2">
            <p
              className={cn(
                "font-display text-[2.5rem] leading-[1] tracking-[-0.03em]",
                styles.value,
              )}
            >
              {value}
            </p>
            {subtitle ? (
              <span className="text-sm text-muted-foreground">{subtitle}</span>
            ) : null}
          </div>

          {/* Row 3: Insight (fixed height zone) */}
          <div className="mt-4 min-h-[3.5rem]">{insight}</div>

          {/* Row 4: Caption + learn more */}
          <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-[0.8rem] leading-snug text-muted-foreground">
              {caption}
            </p>
            {learnMore ? (
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="shrink-0 text-[0.8rem] font-medium text-primary transition-colors hover:text-primary/80"
              >
                Learn&nbsp;more
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Back ── */}
        {learnMore ? (
          <div className="absolute inset-0 rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(26,17,24,0.03)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p
              className={cn(
                "text-[0.65rem] font-bold uppercase tracking-[0.14em]",
                styles.label,
              )}
            >
              {learnMore.title}
            </p>
            <div className="mt-4 text-sm leading-relaxed text-foreground">
              {learnMore.content}
            </div>
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="mt-4 text-[0.8rem] font-medium text-primary transition-colors hover:text-primary/80"
            >
              Back to data
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Building blocks for the insight slot ── */

export function InsightProgressBar({
  progress,
  label,
  tone = "default",
}: {
  progress: number;
  label: string;
  tone?: keyof typeof toneStyles;
}) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const styles = toneStyles[tone];
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", styles.bar)}
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
      <p className="text-[0.8rem] font-medium text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function InsightMiniTable({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-1.5">
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "flex items-center justify-between gap-4 py-1.5 text-[0.8rem]",
            i > 0 && "border-t border-border/20",
          )}
        >
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-semibold tabular-nums text-foreground">
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
