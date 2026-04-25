"use client";

import Link from "next/link";

import { useIsAdmin } from "@/hooks/use-is-admin";

/**
 * Small header chip linking to the admin growth tool.
 *
 * Renders only when the signed-in user has
 * `app_metadata.role === "admin"`. Returns `null` otherwise
 * (and during the initial async check, to avoid a flash for
 * non-admins). The route itself is gated server-side via
 * `requireAdmin()` — this component just makes the link
 * discoverable for admins.
 *
 * Amber styling intentionally distinct from the main nav so
 * the operator can tell at a glance they're seeing an
 * internal-only surface.
 */
export function AdminLink() {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin/scenario-from-text"
      title="Admin: scenario from text"
      className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30"
    >
      Admin
    </Link>
  );
}
