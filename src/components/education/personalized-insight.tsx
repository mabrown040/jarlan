"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Reusable wrapper for personalized educational content.
 *
 * When the user has data (hasData=true), shows personalized content
 * with a warm highlight border. When no data is available, shows a
 * generic fallback with a CTA to take the quiz.
 */
export function PersonalizedInsight({
  title,
  hasData,
  emptyPrompt = "Take the FIRE quiz to see your personal numbers",
  children,
  className,
}: {
  title?: string;
  hasData: boolean;
  emptyPrompt?: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!hasData) {
    return (
      <div className={cn(
        "rounded-xl border border-dashed border-border/60 bg-muted/30 p-4",
        className,
      )}>
        {title && (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
            {title}
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{emptyPrompt}</p>
        <Link
          href="/quiz"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--ember)] hover:underline"
        >
          Take the quiz →
        </Link>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border border-[var(--ember)]/20 bg-[rgba(255,107,53,0.03)] p-4",
      className,
    )}>
      {title && (
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ember)]">
          {title}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}
