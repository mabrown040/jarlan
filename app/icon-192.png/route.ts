import { renderPwaIcon } from "@/lib/seo/pwa-icon";

/**
 * 192×192 PWA icon — referenced by `app/manifest.ts`. Route-handler
 * variant (rather than `app/icon.tsx`) because the manifest needs a
 * stable URL and multiple sizes.
 */
export const runtime = "edge";

export function GET() {
  return renderPwaIcon({ size: 192 });
}
