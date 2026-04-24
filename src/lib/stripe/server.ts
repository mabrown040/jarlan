/**
 * Server-side Stripe client (singleton, lazy-initialized).
 *
 * Returns `null` if `STRIPE_SECRET_KEY` is missing so that callers can
 * gracefully degrade when Stripe is not configured. Never import this
 * from client code — the secret key must stay server-only.
 */
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripeServer() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
  return cached;
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
  );
}
