import { ImageResponse } from "next/og";

/**
 * App icon — served at /icon and used as the browser tab favicon.
 *
 * Rendered on demand with ImageResponse so we don't need static PNGs
 * in /public. To update the visual, edit the JSX below and redeploy;
 * Next.js caches the generated image aggressively.
 *
 * The design: a stylized ember flame on a warm hearth background.
 * Matches the brand tokens (ember #ff6b35, hearth #1a1118). Kept
 * minimal so it reads at favicon sizes (16×16).
 */

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1a1118 0%, #2a1f28 100%)",
          borderRadius: 12,
        }}
      >
        {/* Inline SVG flame. Intentionally simple — recognizable at
            16px. Ember gradient baked into the stops. */}
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flame-g" x1="0" y1="24" x2="0" y2="0">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="55%" stopColor="#ff8f5e" />
              <stop offset="100%" stopColor="#f7c948" />
            </linearGradient>
          </defs>
          <path
            d="M12 2c0 3-2 5-2 8a2 2 0 1 0 4 0c0-1 .5-1.5 1-2 .5 2-.5 3 .5 5a3 3 0 1 1-6 0c0-1-1-2-2-2 1 4 3 6 3 9a3 3 0 1 1-6 0c0-5 5-8 5-13z"
            fill="url(#flame-g)"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
