"use client";

import { useMemo } from "react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PlanDrawerContent } from "@/components/plan-drawer/plan-drawer-content";
import {
  calculateQuickFireSummary,
  formatCompactCurrency,
  formatYears,
} from "@/lib/calc";
import { useDrawerStore, useScenarioStore } from "@/lib/store";

export function PlanDrawer() {
  const { isOpen, close } = useDrawerStore();
  const { activeScenario, status } = useScenarioStore();

  const summary = useMemo(
    () => (status === "ready" ? calculateQuickFireSummary(activeScenario) : null),
    [activeScenario, status],
  );

  if (status !== "ready") return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent>
        <SheetHeader>
          <div>
            <SheetTitle>Your Plan</SheetTitle>
            <SheetDescription className="sr-only">
              Summary of your FIRE plan, savings targets, and time to financial independence.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <button
              type="button"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              <span className="sr-only">Close</span>
            </button>
          </SheetClose>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          <PlanDrawerContent />
        </div>
        {summary ? (
          <div className="border-t border-border/70 px-5 py-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">FIRE number </span>
                <span className="font-semibold text-foreground">
                  {formatCompactCurrency(summary.fireNumber)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Time to FI </span>
                <span className="font-semibold text-foreground">
                  {formatYears(summary.yearsToFi)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
