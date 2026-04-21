import { ImageResponse } from "next/og";

/**
 * Apple touch icon — shown when a user adds the site to their iOS
 * home screen. Must be 180×180 PNG; iOS applies its own rounded-
 * rect mask so we don't pre-round the background.
 *
 * Design matches `app/icon.tsx` but with extra breathing room so
 * the flame survives iOS's visual compression at 60×60.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          width="124"
          height="124"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flame-ios" x1="0" y1="24" x2="0" y2="0">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="55%" stopColor="#ff8f5e" />
              <stop offset="100%" stopColor="#f7c948" />
            </linearGradient>
          </defs>
          <path
            d="M12 2c0 3-2 5-2 8a2 2 0 1 0 4 0c0-1 .5-1.5 1-2 .5 2-.5 3 .5 5a3 3 0 1 1-6 0c0-1-1-2-2-2 1 4 3 6 3 9a3 3 0 1 1-6 0c0-5 5-8 5-13z"
            fill="url(#flame-ios)"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
