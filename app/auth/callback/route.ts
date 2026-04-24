/**
 * OAuth + magic-link callback.
 *
 * Supabase redirects here after any email / OAuth sign-in. The URL
 * carries one of two shapes depending on the flow:
 *
 *   - PKCE (Google OAuth, newer magic link):
 *       /auth/callback?code=<pkce-code>&next=/account
 *     → exchange via `exchangeCodeForSession(code)`
 *
 *   - Legacy email confirm / magic link / recovery / invite:
 *       /auth/callback?token_hash=<hash>&type=<type>&next=/account
 *     → verify via `verifyOtp({ type, token_hash })`
 *
 * Earlier versions of this route only handled `code`, which meant any
 * user on the legacy `token_hash` flow would land here, silently fail
 * to exchange anything, and get redirected without a session. The UI
 * would then render "Sign in" as if nothing happened.
 *
 * On failure we route the user to an `/auth/error?message=...` page
 * so a broken sign-in is observable instead of invisible.
 */
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabase/server";

const VALID_OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeRelativePath(searchParams.get("next"), "/account");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    // Local-only mode — no session to exchange, just land the user.
    return NextResponse.redirect(`${origin}${next}`);
  }

  // PKCE / OAuth path: `?code=...`.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToAuthError(origin, error.message);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Legacy email OTP path: `?token_hash=...&type=...`.
  if (tokenHash && rawType && VALID_OTP_TYPES.has(rawType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: rawType as EmailOtpType,
      token_hash: tokenHash,
    });
    if (error) {
      return redirectToAuthError(origin, error.message);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Neither flow matched — likely a mis-formed link. Surface it
  // rather than silently redirecting the user into a logged-out app.
  return redirectToAuthError(origin, "Missing auth code or token.");
}

function redirectToAuthError(origin: string, message: string) {
  const url = new URL(`${origin}/auth/error`);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
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
