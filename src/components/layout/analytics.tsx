import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics — page views + visitor tracking on Vercel
 * deployments. Cookieless; no env vars required; automatically enabled
 * once the site is deployed.
 *
 * Speed Insights (Core Web Vitals RUM) is wired separately in
 * `app/layout.tsx` via `@vercel/speed-insights/next`.
 *
 * Privacy note: scenario data still stays in the user's browser. The
 * only thing Vercel receives is anonymized page-view beacons.
 */
export function AnalyticsScripts() {
  return <Analytics />;
}
