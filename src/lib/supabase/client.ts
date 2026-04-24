/**
 * Browser-side Supabase client.
 *
 * Used in client components. Reads cookies set by the server-side client
 * (via @supabase/ssr) so the session is shared across server and client
 * without exposing the service role key.
 *
 * If env vars are missing, returns null — the app must treat Supabase as
 * optional and fall back to local-only mode (see docs/cloud-sync.md).
 */
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

let cachedClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  cachedClient = createBrowserClient<Database>(url, anonKey);
  return cachedClient;
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
