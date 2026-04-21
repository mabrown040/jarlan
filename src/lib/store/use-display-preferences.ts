"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Display mode for dollar-valued UI.
 *
 * - `real`    — today's-dollars. Every figure expressed in purchasing
 *               power at today's date. Default. Matches the
 *               FIRE-community convention and the mathematically
 *               cleaner view (portfolio returns are already real).
 *
 * - `nominal` — future-dollars. Figures from future years are inflated
 *               by (1 + inflation)^yearsFromNow before display. Useful
 *               for users who anchor to "what will my account
 *               statement actually say in 2046?"
 *
 * This is a view preference, NOT a scenario property. Two people
 * opening the same shared URL can view it in different modes. Persisted
 * to localStorage so the choice survives reload.
 */
export type DisplayMode = "real" | "nominal";

interface DisplayPreferencesState {
  mode: DisplayMode;
  setMode: (mode: DisplayMode) => void;
  toggle: () => void;
}

export const useDisplayPreferences = create<DisplayPreferencesState>()(
  persist(
    (set) => ({
      mode: "real",
      setMode: (mode) => set({ mode }),
      toggle: () =>
        set((state) => ({ mode: state.mode === "real" ? "nominal" : "real" })),
    }),
    {
      name: "firecalc-display-preferences",
      storage: createJSONStorage(() => {
        // SSR-safe: when window is undefined (e.g. during Next.js prerender)
        // return a no-op storage. The real localStorage kicks in on mount.
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
    },
  ),
);
