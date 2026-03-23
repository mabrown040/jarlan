"use client";

import { useEffect } from "react";

import { AppErrorState } from "@/components/layout/app-error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorState
      title="We hit an unexpected app error"
      description="Something went wrong while rendering this page or running a calculation. You can retry safely without rebuilding or manually restarting the app."
      onRetry={reset}
    />
  );
}
