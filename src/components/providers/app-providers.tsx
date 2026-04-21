"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      // Default to the OS preference on first visit so users on dark-mode
      // machines don't get hit with a white flash before the toggle. Users
      // who have explicitly chosen a theme are unaffected — next-themes
      // reads their persisted localStorage choice regardless of this default.
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
