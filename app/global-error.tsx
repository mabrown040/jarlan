"use client";

import { useEffect } from "react";

import { AppErrorState } from "@/components/layout/app-error-state";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main>
          <AppErrorState
            title="The app shell failed to load cleanly"
            description="Calcifer caught a root-level runtime issue before the normal layout finished loading. Retry first, and if needed, jump back to the landing page."
            onRetry={reset}
          />
        </main>
      </body>
    </html>
  );
}
