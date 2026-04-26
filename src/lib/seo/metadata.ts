import type { Metadata } from "next";

/**
 * Shared SEO helpers + defaults. One place to edit the base URL,
 * brand strings, and Open Graph fallbacks so every route inherits
 * consistent defaults.
 *
 * Per-route metadata (e.g. `app/(app)/quiz/page.tsx`) uses
 * `buildMetadata({ title, description, path })` to compose with these
 * defaults — it fills in absolute URLs, Twitter card, and OG image
 * automatically.
 */

/** Canonical origin. Override via NEXT_PUBLIC_SITE_URL at deploy. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://jarlan.fire"
).replace(/\/$/, "");

export const SITE_NAME = "Jarlan";
export const SITE_TAGLINE = "A research-backed FIRE calculator that shows its math";

/** Used as the per-route title suffix: "Quiz | Jarlan — FIRECALC". */
const TITLE_SUFFIX = `${SITE_NAME} — FIRECALC`;

const DEFAULT_DESCRIPTION =
  "State-aware tax modeling, four withdrawal strategies, 150 years of Shiller market data. Private, local-first, no account required.";

/**
 * Open Graph image. The actual PNG lives at /og-image.png (static
 * asset). A dynamic OG route could replace this later, but the static
 * fallback is enough for v1 — every social embed gets the same card
 * instead of a blank.
 */
const OG_IMAGE = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
};

export interface PageMetadataInput {
  /** The "page" portion of the title — gets suffixed with Jarlan. */
  title?: string;
  /** Description override — falls back to the site default. */
  description?: string;
  /** Path from site root (e.g. "/quiz"). Omit for the home page. */
  path?: string;
  /** Set to true to tell crawlers NOT to index this route. */
  noIndex?: boolean;
}

export function buildMetadata(input: PageMetadataInput = {}): Metadata {
  const {
    title: pageTitle,
    description = DEFAULT_DESCRIPTION,
    path = "",
    noIndex = false,
  } = input;

  const fullTitle = pageTitle ? `${pageTitle} | ${TITLE_SUFFIX}` : TITLE_SUFFIX;
  const canonical = `${SITE_URL}${path}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [OG_IMAGE],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/** Root-layout default. Individual routes can override via their own
 *  `export const metadata` using `buildMetadata({ title, ... })`. */
export const ROOT_METADATA: Metadata = {
  ...buildMetadata(),
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [{ name: "Jarlan" }],
  keywords: [
    "FIRE calculator",
    "financial independence",
    "early retirement",
    "Coast FIRE",
    "Barista FIRE",
    "retirement planning",
    "withdrawal strategy",
    "Guyton-Klinger",
    "Monte Carlo retirement",
    "historical backtest",
    "tax-aware retirement",
  ],
  // Good-faith signal to crawlers / archivers that this is a
  // personal-planning tool, not a fintech marketplace.
  category: "finance",
};
