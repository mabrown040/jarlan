"use client";

import Link from "next/link";
import type { Route } from "next";

import { useScenarioStore } from "@/lib/store/use-scenario-store";

/**
 * Shown on module workspaces (/accumulation, /save-what-if) when the
 * active scenario is still the built-in sample (user hasn't personalized).
 *
 * Rationale: the store ships with a realistic default persona (34yo,
 * $128K income, $185K portfolio) so the calculator has something to
 * render on first visit. Without this banner, a new user who clicks
 * "Open Your Plan" lands on a planner full of numbers they never
 * entered — which reads as "this site already has my data." The
 * banner makes the state explicit and offers two recovery paths.
 *
 * Rendering rules:
 * - `status === "ready"` gates the read so hydration hasn't finished
 *   flagging `isPersonalized` yet
 * - Hides the moment the user personalizes (taking the quiz or
 *   editing any field in the drawer flips the flag)
 */
export function SampleScenarioBanner() {
  const status = useScenarioStore((s) => s.status);
  const isPersonalized = useScenarioStore(
    (s) => s.activeScenario.isPersonalized,
  );

  if (status !== "ready" || isPersonalized) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 pt-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(255,107,53,0.25)] bg-[rgba(255,107,53,0.05)] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="text-lg" aria-hidden="true">
            🔍
          </span>
          <div>
            <p className="font-medium text-foreground">
              You&rsquo;re exploring a sample plan
            </p>
            <p className="text-xs text-muted-foreground">
              These numbers are a realistic demo, not yours. Take the
              quiz for a guided walkthrough, or edit any field to
              replace them with your own.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={"/quiz" as Route}
            className="inline-flex items-center rounded-full bg-[var(--ember)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--ember)]/90"
          >
            Take the quiz
          </Link>
        </div>
      </div>
    </section>
  );
}
