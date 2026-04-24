/**
 * POST /api/webhooks/stripe
 *
 * Receives signed webhook events from Stripe and syncs subscription
 * state into the `profiles` table. Uses the service-role Supabase
 * client because RLS would otherwise block cross-user updates.
 *
 * Signature verification REQUIRES the raw request body — we read it
 * as text and hand it directly to `stripe.webhooks.constructEvent`.
 * Do not parse JSON first or the HMAC will not match.
 */
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { getStripeServer } from "@/lib/stripe/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfilePlan = "free" | "pro";

export async function POST(request: Request) {
  const stripe = getStripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 },
    );
  }

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const supabaseUserId = session.metadata?.supabaseUserId ?? null;
        const customerId = extractId(session.customer);
        const subscriptionId = extractId(session.subscription);

        if (!supabaseUserId) {
          // No metadata — nothing to reconcile. Acknowledge so Stripe
          // doesn't retry indefinitely.
          break;
        }

        const { error } = await serviceClient
          .from("profiles")
          .update({
            plan: "pro",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", supabaseUserId);

        if (error) {
          return NextResponse.json(
            { error: `Profile update failed: ${error.message}` },
            { status: 500 },
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan: ProfilePlan =
          subscription.status === "active" || subscription.status === "trialing"
            ? "pro"
            : "free";
        const customerId = extractId(subscription.customer);

        // Prefer subscription id match; fall back to customer id.
        const { data: bySub, error: bySubError } = await serviceClient
          .from("profiles")
          .update({
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
          })
          .eq("stripe_subscription_id", subscription.id)
          .select("id");

        if (bySubError) {
          return NextResponse.json(
            { error: `Profile update failed: ${bySubError.message}` },
            { status: 500 },
          );
        }

        if ((!bySub || bySub.length === 0) && customerId) {
          const { error: byCustError } = await serviceClient
            .from("profiles")
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            })
            .eq("stripe_customer_id", customerId);

          if (byCustError) {
            return NextResponse.json(
              { error: `Profile update failed: ${byCustError.message}` },
              { status: 500 },
            );
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await serviceClient
          .from("profiles")
          .update({ plan: "free" })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          return NextResponse.json(
            { error: `Profile update failed: ${error.message}` },
            { status: 500 },
          );
        }
        break;
      }

      default:
        // Unhandled event type — ack so Stripe doesn't retry.
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Stripe returns expanded or bare ids for `customer` / `subscription`
 * fields. Normalize to a string id (or null).
 */
function extractId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}
