import { renderPwaIcon } from "@/lib/seo/pwa-icon";

/** 512×512 PWA icon — referenced by `app/manifest.ts`. */
export const runtime = "edge";

export function GET() {
  return renderPwaIcon({ size: 512 });
}
