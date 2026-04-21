import { renderPwaIcon } from "@/lib/seo/pwa-icon";

/**
 * 512×512 maskable PWA icon. Android adaptive icons crop to platform
 * shapes (circle, rounded-square, etc.); the flame is sized at 60%
 * so the outer 20% safe-zone padding survives any crop.
 */
export const runtime = "edge";

export function GET() {
  return renderPwaIcon({ size: 512, maskable: true });
}
