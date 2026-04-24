"use client";

/**
 * Header user menu.
 *
 * - Supabase not configured  →  renders nothing (header stays clean).
 * - Signed out               →  small "Sign in" pill that opens SignInModal.
 * - Signed in                →  avatar initials + dropdown (email, account
 *                              link, sign out).
 *
 * Kept dependency-light: no @radix-ui/react-dropdown-menu install — a
 * plain div + click-outside handler covers our needs and matches the
 * header's existing one-off button style.
 */
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { SignInModal, useSignInModal } from "@/components/auth/sign-in-modal";
import { useAuth } from "@/hooks/use-auth";
import { useProPlan } from "@/hooks/use-pro-plan";

function initialFromEmail(email: string | null | undefined) {
  if (!email) return "?";
  const trimmed = email.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function UserMenu() {
  const { user, isLoading, supabaseConfigured, signOut } = useAuth();
  const { isPro } = useProPlan();
  const { openModal } = useSignInModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when clicking outside or pressing Escape — keeps
  // keyboard users from being trapped behind an invisible overlay.
  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = useCallback(async () => {
    setMenuOpen(false);
    await signOut();
  }, [signOut]);

  // Local-only mode — auth entry point is entirely hidden so the header
  // layout stays identical to a clean clone of the repo.
  if (!supabaseConfigured) {
    return null;
  }

  // Avoid a flash of "Sign in" on page load before the session resolves.
  if (isLoading) {
    return <div className="size-8" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={openModal}
          className="rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:shadow-sm"
        >
          Sign in
        </button>
        <SignInModal />
      </>
    );
  }

  const initial = initialFromEmail(user.email);

  return (
    <div ref={menuRef} className="relative">
      {/* Keep the modal mounted even when signed in so any caller can
          invoke useSignInModal() without mounting order surprises. The
          modal no-ops (returns a closed Vaul portal) when open === false. */}
      <SignInModal />
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={user.email ? `Account menu for ${user.email}` : "Account menu"}
        className="relative flex size-8 items-center justify-center rounded-full border border-border/60 bg-[linear-gradient(135deg,var(--flame)_0%,var(--ember)_55%,var(--glow)_100%)] text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:brightness-110"
      >
        {initial}
        {isPro ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full border-2 border-background bg-[var(--ember)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-2 text-white"
            >
              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </span>
        ) : null}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-[var(--shadow-surface)] backdrop-blur-xl"
        >
          <div className="border-b border-border/60 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Signed in as
              </p>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-2.5"
                  >
                    <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                  Pro
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-foreground">
              {user.email ?? "your account"}
            </p>
          </div>
          <div className="py-1">
            <Link
              href={"/account" as Route}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Your account
            </Link>
          </div>
          <div className="border-t border-border/60 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/70"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
