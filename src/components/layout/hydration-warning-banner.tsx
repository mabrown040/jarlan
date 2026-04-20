"use client";

import { useScenarioStore } from "@/lib/store/use-scenario-store";

/**
 * Non-blocking banner surfaced when hydration hit a recoverable issue:
 * - `share-link-invalid` — ?scenario=… param failed to decode/validate
 * - `storage-unavailable` — IndexedDB rejected (private mode, ETP strict)
 *
 * Both cases fall back silently to a usable state; the banner just tells
 * the user why their expected data isn't there and what was substituted.
 */
export function HydrationWarningBanner() {
  const hydrationWarning = useScenarioStore((s) => s.hydrationWarning);
  const dismiss = useScenarioStore((s) => s.dismissHydrationWarning);

  if (!hydrationWarning) return null;

  const copy =
    hydrationWarning === "share-link-invalid"
      ? {
          title: "Shared link couldn't be decoded",
          body: "That URL looked corrupted. Loaded your saved plan (or the demo) instead. Ask whoever shared it to resend.",
        }
      : {
          title: "Can't access browser storage",
          body: "IndexedDB is blocked (private browsing or a privacy extension). The calculator works, but your changes won't persist after you close this tab.",
        };

  return (
    <div
      role="status"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.body}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          aria-label="Dismiss notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
