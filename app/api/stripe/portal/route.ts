/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Billing Portal session for the signed-in user and
 * returns the hosted-portal URL for the client to redirect to. The
 * portal lets the user update payment methods, download invoices, and
 * cancel their subscription.
 *
 * Response: { url: string } | { error: string }
 *
 * Degrades gracefully: returns 503 when Stripe/Supabase are not
 * configured, 401 when the user is not signed in, 400 when the user
 * has no Stripe customer record yet.
 */
import { NextResponse } from "next/server";

import {
  clientIpFromHeaders,
  rateLimit,
  rateLimitResponseHeaders,
} from "@/lib/rate-limit";
import { getStripeServer } from "@/lib/stripe/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PORTAL_RATE_LIMIT = 10;
const PORTAL_RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limitResult = rateLimit(
    `stripe:portal:${ip}`,
    PORTAL_RATE_LIMIT,
    PORTAL_RATE_WINDOW_MS,
  );
  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: rateLimitResponseHeaders(limitResult, PORTAL_RATE_LIMIT),
      },
    );
  }

  const stripe = getStripeServer();
  if (!stripe) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL("/", "http://localhost:3000").origin;

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl}/account`,
  });

  return NextResponse.json({ url: session.url });
}
