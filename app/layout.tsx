import type { Metadata } from "next";
import {
  DM_Serif_Display,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { AppProviders } from "@/components/providers/app-providers";

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

export const metadata: Metadata = {
  title: "FIRECALC",
  description:
    "A local-first FIRE calculator for quick answers today and deeper simulation later.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${dmSerifDisplay.variable} ${jetBrainsMono.variable} font-sans antialiased`}
      >
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}
