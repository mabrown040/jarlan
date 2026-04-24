/**
 * OAuth / magic-link callback.
 *
 * Supabase redirects here with a `?code=...` search param after the user
 * clicks their magic link or completes the Google OAuth flow. We exchange
 * the code for a session cookie, then redirect to the requested
 * destination (defaults to /account).
 *
 * When Supabase isn't configured, or the code exchange fails, we fall
 * back to a plain redirect — the user lands somewhere useful rather than
 * seeing an opaque 500.
 */
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRelativePath(searchParams.get("next"), "/account");

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}

// Only allow same-origin relative paths. Anything that could resolve to
// an external origin (absolute URL, protocol-relative `//host`, or
// backslash-bypass) falls back to the default.
function safeRelativePath(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
