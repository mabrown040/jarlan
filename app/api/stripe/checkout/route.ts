/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for the signed-in user and returns
 * the hosted-checkout URL for the client to redirect to.
 *
 * Request body: { cycle: "monthly" | "yearly" }
 * Response:     { url: string } | { error: string }
 *
 * Degrades gracefully: returns 503 when Stripe env vars are missing,
 * 401 when the user is not signed in, 500 on unexpected errors.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clientIpFromHeaders,
  rateLimit,
  rateLimitResponseHeaders,
} from "@/lib/rate-limit";
import { getStripeServer, isStripeConfigured } from "@/lib/stripe/server";
import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  cycle: z.enum(["monthly", "yearly"]),
});

// 10 checkout sessions per IP per minute. A legitimate user won't need
// more than one or two in a sitting; anything higher is probe traffic.
const CHECKOUT_RATE_LIMIT = 10;
const CHECKOUT_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limitResult = rateLimit(
    `stripe:checkout:${ip}`,
    CHECKOUT_RATE_LIMIT,
    CHECKOUT_RATE_WINDOW_MS,
  );
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: rateLimitResponseHeaders(limitResult, CHECKOUT_RATE_LIMIT),
      },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 },
    );
  }

  const stripe = getStripeServer();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 },
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 503 },
    );
  }

  const serviceClient = getSupabaseServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body: cycle must be 'monthly' or 'yearly'" },
      { status: 400 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const priceId =
    parsed.data.cycle === "yearly"
      ? process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Price ID not configured for requested cycle" },
      { status: 503 },
    );
  }

  // Look up or create the Stripe customer for this Supabase user.
  let customerId: string | null = null;
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: "Unable to load profile" },
      { status: 500 },
    );
  }

  customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: { supabaseUserId: user.id },
      });
      customerId = customer.id;

      const { error: upsertError } = await serviceClient
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? profile?.email ?? null,
            stripe_customer_id: customerId,
          },
          { onConflict: "id" },
        );

      if (upsertError) {
        return NextResponse.json(
          { error: "Unable to persist customer" },
          { status: 500 },
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create customer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/account?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      metadata: { supabaseUserId: user.id },
      subscription_data: {
        metadata: { supabaseUserId: user.id },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session missing URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
