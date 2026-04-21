import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Next.js emits `/sitemap.xml` from this function at build time.
 *
 * All routes here are static / publicly accessible. Scenario URLs
 * (`/withdrawal?scenario=<compressed>`) are intentionally excluded —
 * they're personal plan shares, not crawlable content.
 *
 * Priority scale is relative within the site (0.0–1.0, Google ignores
 * absolute values). Home is the conversion surface so it's top.
 * Education articles are indexed but lower-priority than the
 * calculator surfaces.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1.0, changeFrequency: "weekly" },
    { path: "/quiz", priority: 0.9, changeFrequency: "monthly" },
    { path: "/accumulation", priority: 0.8, changeFrequency: "monthly" },
    { path: "/save-what-if", priority: 0.7, changeFrequency: "monthly" },
    { path: "/withdrawal", priority: 0.8, changeFrequency: "monthly" },
    { path: "/scenario-lab", priority: 0.6, changeFrequency: "monthly" },
    { path: "/tax-strategy", priority: 0.7, changeFrequency: "monthly" },
    { path: "/education", priority: 0.7, changeFrequency: "weekly" },
    { path: "/education/savings-rate", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/withdrawal-strategies", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/coast-fire", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/barista-fire", priority: 0.6, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.4, changeFrequency: "monthly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
