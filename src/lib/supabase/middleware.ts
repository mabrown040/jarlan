/**
 * Supabase session refresh middleware helper.
 *
 * Called from src/middleware.ts on every request. Refreshes the session
 * cookie if needed so that the server and client always see a valid
 * session without forcing the user to re-authenticate.
 *
 * Returns the NextResponse — the caller should return it directly (or
 * chain other middleware on top).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured, pass through untouched. The app stays
  // fully functional in local-only mode.
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session. Must come before any other data fetching that
  // depends on auth.
  await supabase.auth.getUser();

  return supabaseResponse;
}
