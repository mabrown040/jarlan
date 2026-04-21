/**
 * Sentry client-side configuration.
 *
 * Runs in the browser. Env-gated on `NEXT_PUBLIC_SENTRY_DSN`: when the
 * var is empty (local dev, or the user hasn't finished Sentry setup
 * yet) this file is a no-op and no network calls are made.
 *
 * Setup steps for the first deploy:
 *   1. Create a project at sentry.io (or self-host)
 *   2. Copy the DSN into `.env.local` and the deploy environment:
 *        NEXT_PUBLIC_SENTRY_DSN=https://...@...ingest.sentry.io/...
 *   3. Redeploy; errors start flowing.
 *
 * Sampling: tracesSampleRate=0.1 (10%) keeps cost manageable while
 * preserving useful perf telemetry. Errors themselves are always
 * captured (100%).
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
    tracesSampleRate: 0.1,
    // Keep the bundle lean — disable session replay for now; worth
    // revisiting if we see a cluster of errors we can't reproduce.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Don't capture anything in dev mode unless the developer explicitly
    // sets SENTRY_DEBUG=1 — otherwise every HMR error floods the quota.
    enabled:
      process.env.NODE_ENV !== "development" ||
      process.env.SENTRY_DEBUG === "1",
  });
}
