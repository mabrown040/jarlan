"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem
    >
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
