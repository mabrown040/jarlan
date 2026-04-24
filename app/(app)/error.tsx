"use client";

import { useEffect } from "react";

import { AppErrorState } from "@/components/layout/app-error-state";

/**
 * Route-group error boundary for everything under `app/(app)/`.
 *
 * Catches render-time and calc errors in the workspace routes (quiz,
 * withdrawal, scenario-lab, tax-strategy, education articles, etc.)
 * before they bubble to the root boundary. With this in place, one
 * broken route replaces its own content with a retry UI instead of
 * taking down the whole shell.
 *
 * Root `app/error.tsx` still catches layout-level errors; this sits
 * one level inside.
 */
export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/(app) boundary]", error);
  }, [error]);

  return (
    <AppErrorState
      title="Something went wrong on this page"
      description="The rest of the app is still working. You can retry this page, or use the nav to go elsewhere."
      onRetry={reset}
    />
  );
}
