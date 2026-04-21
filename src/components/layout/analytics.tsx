import Script from "next/script";

/**
 * Plausible Analytics — privacy-first, no cookies, no cross-site
 * tracking. Matches the app's "data stays in your browser" ethos
 * while still giving us page-view + basic funnel data.
 *
 * Env-gated on `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`:
 *   - Empty (local dev / not deployed) → renders nothing
 *   - Set (e.g. "calcifer.fire") → loads plausible.io's script
 *
 * To enable:
 *   1. Create a site at plausible.io (or self-host)
 *   2. Add the domain to `.env.local` and the deploy environment:
 *        NEXT_PUBLIC_PLAUSIBLE_DOMAIN=calcifer.fire
 *   3. Redeploy; page views start flowing.
 *
 * Custom events (quiz completion, sample-plan click, etc.) can be
 * fired later via `window.plausible?.('EventName', { props: {...} })`
 * once we decide what's worth measuring. Leaving that API surface
 * free-form for now — no custom events fired yet.
 */
export function AnalyticsScripts() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleScriptSrc =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC ??
    "https://plausible.io/js/script.js";

  if (!plausibleDomain) return null;

  return (
    <Script
      defer
      src={plausibleScriptSrc}
      data-domain={plausibleDomain}
      strategy="afterInteractive"
    />
  );
}
