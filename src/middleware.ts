import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

/**
 * Global Next.js middleware.
 *
 * Currently only refreshes the Supabase session cookie. If Supabase isn't
 * configured (env vars missing), this is a pass-through — the app stays
 * fully local.
 *
 * Matcher excludes static assets and Next.js internals to avoid running
 * on every image / font / icon request.
 */
export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml (static metadata)
     * - any path with a file extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
