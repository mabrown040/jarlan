import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
};

/**
 * Wrap the config with Sentry's build-time plugin so source maps are
 * uploaded on deploy (so stack traces are useful). The wrapper is a
 * no-op at runtime when SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT
 * env vars are missing, which is the case locally — so this stays
 * friction-free during development.
 *
 * `silent: !process.env.CI` keeps `npm run build` logs readable locally
 * while still surfacing Sentry notices in CI.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // Widen client-side source maps so stack traces resolve to the
  // original TypeScript rather than minified bundles.
  widenClientFileUpload: true,
  // Automatically tree-shake Sentry logger calls so they don't ship to
  // the browser bundle.
  disableLogger: true,
  // When SENTRY_AUTH_TOKEN is absent (local dev) skip source-map upload
  // rather than failing the build. With the token set (deploy), upload
  // runs normally.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
