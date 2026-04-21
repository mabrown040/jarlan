import type { MetadataRoute } from "next";

/**
 * PWA manifest — enables "Add to Home Screen" on iOS/Android and
 * gives the installed app its own splash, theme color, and icons.
 *
 * Icons are generated dynamically from `app/icon.tsx` and
 * `app/apple-icon.tsx` so we don't have to check static PNGs into
 * git or run a build step for them.
 *
 * We don't register a service worker — the app is stateful enough
 * that offline mode would be confusing, and IndexedDB already
 * persists user data across browser sessions.
 *
 * Setup-free for users: PWA install prompts appear automatically on
 * repeat visits in Chrome/Android; iOS users share → Add to Home
 * Screen manually.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calcifer — FIRECALC",
    short_name: "Calcifer",
    description:
      "A research-backed FIRE calculator that shows its math.",
    start_url: "/",
    display: "standalone",
    // Warm cream background matches the light-mode --ash token; the
    // ember theme color tints iOS status bar + Android task switcher.
    background_color: "#f5f0eb",
    theme_color: "#ff6b35",
    orientation: "any",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        // `maskable` lets Android crop the icon into its adaptive
        // shape without clipping critical art; our icon keeps 10%
        // safe-area padding on each side for this reason.
        purpose: "maskable",
      },
    ],
  };
}
