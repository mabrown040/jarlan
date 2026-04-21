import { ImageResponse } from "next/og";

/**
 * Shared renderer for the PWA manifest icons (192, 512, maskable).
 * Kept in a helper so all three route handlers (`app/icon-192/route.ts`,
 * etc.) render the same visual at different sizes.
 *
 * `purpose: "maskable"` requires 10% safe-area padding on each edge so
 * Android can clip to its adaptive shape without cutting the flame.
 */
export function renderPwaIcon({
  size,
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}) {
  // When maskable, shrink the flame so the outer 10% is safe-zone
  // padding Android can crop. Otherwise render at ~70% of canvas so
  // the flame feels framed rather than cropped.
  const flameSize = maskable ? Math.round(size * 0.6) : Math.round(size * 0.7);

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
            "linear-gradient(135deg, #1a1118 0%, #2a1f28 50%, #ff6b35 100%)",
        }}
      >
        <svg
          width={flameSize}
          height={flameSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id={`flame-${size}${maskable ? "-m" : ""}`}
              x1="0"
              y1="24"
              x2="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="55%" stopColor="#ff8f5e" />
              <stop offset="100%" stopColor="#f7c948" />
            </linearGradient>
          </defs>
          <path
            d="M12 2c0 3-2 5-2 8a2 2 0 1 0 4 0c0-1 .5-1.5 1-2 .5 2-.5 3 .5 5a3 3 0 1 1-6 0c0-1-1-2-2-2 1 4 3 6 3 9a3 3 0 1 1-6 0c0-5 5-8 5-13z"
            fill={`url(#flame-${size}${maskable ? "-m" : ""})`}
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
