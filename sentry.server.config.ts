/**
 * Sentry server-side configuration.
 *
 * Runs in Next.js server functions (route handlers, server components).
 * Env-gated on `SENTRY_DSN` (or the public one if you want a shared DSN).
 * See `sentry.client.config.ts` for setup steps.
 *
 * Separate file because the server can have different sampling, PII
 * rules, and integrations than the browser.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    enabled:
      process.env.NODE_ENV !== "development" ||
      process.env.SENTRY_DEBUG === "1",
  });
}
