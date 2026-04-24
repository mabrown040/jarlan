import Link from "next/link";

import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Sign-in error",
  description: "Something went wrong while signing you in.",
  path: "/auth/error",
  noIndex: true,
});

/**
 * Shown when the auth callback can't establish a session. The
 * `message` query param carries the Supabase error string so the user
 * can tell the difference between "your magic link expired" and "we
 * don't recognize this link".
 */
export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground">
        We couldn&rsquo;t finish signing you in
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {message
          ? `${message}. `
          : "The sign-in link couldn't be verified. "}
        Magic links expire after a short window — request a fresh one and
        try again.
      </p>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row">
        <Link
          href="/"
          className="rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        >
          Back to home
        </Link>
        <Link
          href="/account"
          className="rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)]"
        >
          Try signing in again
        </Link>
      </div>
    </div>
  );
}
