"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ChartFrame({
  ariaLabel,
  className,
  children,
}: {
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div
      role="img"
      aria-roledescription="chart"
      aria-label={ariaLabel}
      className={cn("min-w-0 w-full", className)}
    >
      {isMounted ? (
        children
      ) : (
        <div
          aria-hidden="true"
          className="h-full w-full rounded-xl border border-dashed border-border/60 bg-card/20"
        />
      )}
    </div>
  );
}
