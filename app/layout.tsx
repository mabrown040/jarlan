import {
  DM_Serif_Display,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AnalyticsScripts } from "@/components/layout/analytics";
import { SiteShell } from "@/components/layout/site-shell";
import { AppProviders } from "@/components/providers/app-providers";
import { ROOT_METADATA } from "@/lib/seo/metadata";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body-family",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display-family",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-family",
});

// Root metadata — individual routes override their own `export const
// metadata` via `buildMetadata({ title, description, path })`. See
// `src/lib/seo/metadata.ts` for the helper.
export const metadata = ROOT_METADATA;

export default function RootLayout({ children }: { children: ReactNode }) {
  // `data-scroll-behavior="smooth"` is the Next.js 16 opt-in replacement for
  // CSS `scroll-behavior: smooth` on <html>. Without it we get a deprecation
  // warning in the console on every route change.
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${plusJakartaSans.variable} ${dmSerifDisplay.variable} ${jetBrainsMono.variable} font-sans antialiased`}
      >
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
        {/* Env-gated on NEXT_PUBLIC_PLAUSIBLE_DOMAIN — does nothing if
            the env var isn't set (local dev, pre-deploy). */}
        <AnalyticsScripts />
        <SpeedInsights />
      </body>
    </html>
  );
}
