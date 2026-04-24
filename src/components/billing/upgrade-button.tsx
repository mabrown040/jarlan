"use client";

/**
 * Upgrade to Pro button.
 *
 * Kicks off a Stripe Checkout Session via `/api/stripe/checkout` and
 * redirects the browser to the returned hosted-checkout URL.
 *
 * If Stripe env vars are not set the button renders a disabled
 * "Billing coming soon" state rather than letting the click 503 and
 * surface a confusing error to the user.
 */
import { useState, type ReactNode } from "react";

import { isStripeConfiguredClient } from "@/lib/stripe/client";

type UpgradeButtonProps = {
  cycle: "monthly" | "yearly";
  className?: string;
  children?: ReactNode;
};

export function UpgradeButton({
  cycle,
  className,
  children,
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isStripeConfiguredClient();

  const baseClasses =
    "group relative inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60";
  const activeClasses =
    "bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)] hover:shadow-[0_4px_18px_rgba(255,107,53,0.5)]";
  const disabledClasses =
    "bg-gradient-to-r from-[rgba(255,107,53,0.15)] to-[rgba(247,201,72,0.15)] text-[var(--ember)]";

  async function handleClick() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          isErrorPayload(data) && data.error
            ? data.error
            : `Checkout failed (${response.status})`;
        throw new Error(message);
      }

      if (!isUrlPayload(data)) {
        throw new Error("Checkout response missing URL");
      }

      window.location.href = data.url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to start checkout";
      setError(message);
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={`${baseClasses} ${disabledClasses} ${className ?? ""}`}
        title="Billing not configured"
      >
        {children ?? "Billing coming soon"}
      </button>
    );
  }

  const label =
    children ??
    (cycle === "yearly" ? "Upgrade to Pro (yearly)" : "Upgrade to Pro (monthly)");

  return (
    <div className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-busy={loading}
        className={`${baseClasses} ${activeClasses} ${className ?? ""}`}
      >
        {loading ? "Starting checkout…" : label}
      </button>
      {error ? (
        <button
          type="button"
          onClick={handleClick}
          className="text-xs text-[color:var(--danger,#dc2626)] underline-offset-2 hover:underline"
        >
          {error} — retry?
        </button>
      ) : null}
    </div>
  );
}

function isErrorPayload(value: unknown): value is { error?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    (typeof (value as { error: unknown }).error === "string" ||
      typeof (value as { error: unknown }).error === "undefined")
  );
}

function isUrlPayload(value: unknown): value is { url: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof (value as { url: unknown }).url === "string"
  );
}
