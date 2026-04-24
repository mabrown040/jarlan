"use client";

/**
 * Sign-in modal.
 *
 * Renders a Vaul drawer with magic-link + Google OAuth. Exported alongside
 * a `useSignInModal()` hook that shares open-state via a Zustand-like
 * module-scoped subscription (keeps the API surface trivial — no provider).
 *
 * If Supabase isn't configured the modal refuses to open and callers
 * should hide their triggers; see useAuth().
 */
import type { FormEvent } from "react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Drawer } from "vaul";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ── Tiny external store so any component can open the modal ───────── */

let isOpen = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return isOpen;
}

// Server snapshot must be stable so useSyncExternalStore doesn't warn on
// hydration. The modal is always closed at render-on-server time.
function getServerSnapshot() {
  return false;
}

export function useSignInModal() {
  const open = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const openModal = useCallback(() => {
    if (isOpen) return;
    isOpen = true;
    notify();
  }, []);

  const closeModal = useCallback(() => {
    if (!isOpen) return;
    isOpen = false;
    notify();
  }, []);

  return { open, openModal, closeModal };
}

/* ── UI ────────────────────────────────────────────────────────────── */

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-4"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.48c-.24 1.42-1.72 4.17-5.48 4.17a6.07 6.07 0 0 1 0-12.14c1.93 0 3.22.82 3.96 1.52l2.7-2.6A9.84 9.84 0 0 0 12 2.2a9.9 9.9 0 1 0 0 19.8c5.72 0 9.5-4.01 9.5-9.66 0-.65-.07-1.14-.16-1.64Z"
      />
      <path
        fill="#34A853"
        d="M3.88 7.37 7.1 9.74A5.94 5.94 0 0 1 12 6.13c1.93 0 3.22.82 3.96 1.52l2.7-2.6A9.84 9.84 0 0 0 12 2.2a9.9 9.9 0 0 0-8.12 5.17Z"
      />
      <path
        fill="#4A90E2"
        d="M12 22c2.7 0 4.96-.88 6.62-2.41l-3.16-2.46c-.87.6-2 1.02-3.46 1.02-2.66 0-4.92-1.76-5.73-4.2L3.08 16.4A9.9 9.9 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M21.34 10.36H12v3.9h5.48a4.72 4.72 0 0 1-2.02 3.03l.02.01 3.16 2.46c-.22.2 3.36-2.46 3.36-7.76 0-.65-.07-1.14-.16-1.64Z"
      />
    </svg>
  );
}

export function SignInModal() {
  const { open, closeModal } = useSignInModal();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [googleLoading, setGoogleLoading] = useState(false);

  // Reset form when the modal opens — users don't expect yesterday's
  // typo to still be in the field a week later.
  useEffect(() => {
    if (open) {
      setEmail("");
      setStatus({ kind: "idle" });
      setGoogleLoading(false);
    }
  }, [open]);

  const onSubmitMagicLink = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!supabase) return;

      const trimmed = email.trim();
      if (!trimmed) {
        setStatus({ kind: "error", message: "Enter your email to continue." });
        return;
      }

      setStatus({ kind: "sending" });
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setStatus({ kind: "error", message: error.message });
          return;
        }
        setStatus({ kind: "sent" });
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Could not send link.",
        });
      }
    },
    [email, supabase],
  );

  const onGoogle = useCallback(async () => {
    if (!supabase) return;
    setGoogleLoading(true);
    setStatus({ kind: "idle" });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setStatus({ kind: "error", message: error.message });
        setGoogleLoading(false);
      }
      // On success, Supabase redirects the browser — no cleanup needed.
    } catch (err) {
      setStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Could not start Google sign-in.",
      });
      setGoogleLoading(false);
    }
  }, [supabase]);

  // Safety net: if somehow opened without Supabase configured, close.
  if (open && !supabase) {
    closeModal();
    return null;
  }

  const sending = status.kind === "sending";
  const sent = status.kind === "sent";
  const errorMessage = status.kind === "error" ? status.message : null;

  return (
    <Drawer.Root
      direction="right"
      open={open}
      onOpenChange={(next) => {
        if (!next) closeModal();
      }}
      handleOnly
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-[var(--shadow-surface)] outline-none sm:w-[26rem]",
          )}
        >
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <Drawer.Title className="font-display text-xl tracking-[-0.02em] text-foreground">
                Save your plan
              </Drawer.Title>
              <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                Free to sign up. Sync your scenarios across devices &mdash; no password to remember.
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              aria-label="Close sign-in"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {sent ? (
              <div className="space-y-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-[rgba(255,107,53,0.1)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5 text-[var(--ember)]"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="font-display text-xl tracking-[-0.02em] text-foreground">
                    Check your email
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We sent a sign-in link to{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                    Open it <span className="font-medium text-foreground">on this device</span> to finish.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Didn&apos;t get it?</p>
                  <p className="mt-1">Check your spam folder, or wait a minute and try again &mdash; sometimes the first email takes a moment.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatus({ kind: "idle" });
                  }}
                  className="text-sm font-medium text-[var(--ember)] hover:underline"
                >
                  &larr; Use a different email
                </button>
              </div>
            ) : (
              <>
                <form
                  onSubmit={onSubmitMagicLink}
                  className="flex flex-col gap-3"
                >
                  <label
                    htmlFor="auth-email"
                    className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Email
                  </label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={sending}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full"
                  >
                    {sending ? "Sending link…" : "Send magic link"}
                  </Button>
                </form>

                <div className="relative my-6 flex items-center">
                  <div className="flex-1 border-t border-border/60" />
                  <span className="px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    or
                  </span>
                  <div className="flex-1 border-t border-border/60" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onGoogle}
                  disabled={googleLoading}
                  className="w-full"
                >
                  <GoogleIcon />
                  {googleLoading ? "Redirecting…" : "Continue with Google"}
                </Button>

                {errorMessage ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200"
                  >
                    {errorMessage}
                  </p>
                ) : null}

                <p className="mt-6 text-center text-[11px] text-muted-foreground/80">
                  No password. We&apos;ll email you a one-time sign-in link.
                </p>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
