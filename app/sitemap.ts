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
    { path: "/compare", priority: 0.5, changeFrequency: "monthly" },
    { path: "/withdrawal", priority: 0.8, changeFrequency: "monthly" },
    { path: "/scenario-lab", priority: 0.6, changeFrequency: "monthly" },
    { path: "/tax-strategy", priority: 0.7, changeFrequency: "monthly" },
    { path: "/education", priority: 0.7, changeFrequency: "weekly" },
    // Start here
    { path: "/education/what-is-fire", priority: 0.7, changeFrequency: "monthly" },
    // Foundation
    { path: "/education/savings-rate", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/the-4-percent-rule", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/fire-number", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/sequence-of-returns", priority: 0.6, changeFrequency: "monthly" },
    // FIRE variations (Coast/Barista are structural; Lean/Fat are reference)
    { path: "/education/fat-fire", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/lean-fire", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/coast-fire", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/barista-fire", priority: 0.6, changeFrequency: "monthly" },
    // Withdrawal & Spending
    { path: "/education/withdrawal-strategies", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/floor-ceiling", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/guyton-klinger", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/cape-ratio", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/monte-carlo", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/spending-smile", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/social-security-timing", priority: 0.6, changeFrequency: "monthly" },
    // Tax & Accounts
    { path: "/education/account-types", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/roth-ladder", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/tax-efficient-withdrawal", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/hsa-triple-advantage", priority: 0.6, changeFrequency: "monthly" },
    { path: "/education/aca-early-retirement", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/self-employed-retirement", priority: 0.5, changeFrequency: "monthly" },
    // Planning Assumptions
    { path: "/education/real-vs-nominal-returns", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/investment-fees", priority: 0.5, changeFrequency: "monthly" },
    { path: "/education/lifestyle-creep", priority: 0.5, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.4, changeFrequency: "monthly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
