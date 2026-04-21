/**
 * Sentry edge-runtime configuration.
 *
 * Runs in Next.js edge functions / middleware. Same env-gating as the
 * client + server configs. Required by `@sentry/nextjs` — without this
 * file, edge-runtime errors won't be captured even if the client+server
 * configs are set.
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
