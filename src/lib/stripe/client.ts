/**
 * Client-safe Stripe helpers.
 *
 * Only reads `NEXT_PUBLIC_*` env vars — safe to import from browser
 * components. Use this for gating upgrade UI when Stripe isn't
 * configured (so the button can hide or show a "coming soon" state
 * rather than 404-ing into a broken checkout).
 */

export function isStripeConfiguredClient() {
  return Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
  );
}

export function getStripeMonthlyPriceId() {
  return process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? null;
}

export function getStripeYearlyPriceId() {
  return process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? null;
}
