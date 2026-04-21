import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Next.js emits `/robots.txt` from this function.
 *
 * Everything is crawlable except `/account` (user-specific surface
 * once cloud sync lands) and any URL with a `?scenario=` query string
 * (personal shared plans, not public content).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/*?scenario="],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
