"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-xl border border-border/60", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          {!open && summary ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {summary}
            </p>
          ) : null}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="border-t border-border/40 px-5 py-4">{children}</div>
      ) : null}
    </div>
  );
}
