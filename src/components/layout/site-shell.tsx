"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import { PlanDrawer, PlanDrawerTrigger } from "@/components/plan-drawer";

const navGroups = [
  {
    id: "home",
    label: "Home",
    href: "/",
    items: [{ href: "/", label: "Home", tier: "free" }],
  },
  {
    id: "save",
    label: "Save",
    href: "/accumulation",
    items: [{ href: "/accumulation", label: "Your plan", tier: "free" }],
  },
  {
    id: "spend",
    label: "Spend",
    href: "/withdrawal",
    items: [
      { href: "/withdrawal", label: "Withdrawal lab", tier: "free" },
      { href: "/tax-strategy", label: "Tax strategy", tier: "pro" },
      { href: "/scenario-lab", label: "Scenario lab", tier: "pro" },
    ],
  },
  {
    id: "track",
    label: "Track",
    href: "/dashboard",
    items: [{ href: "/dashboard", label: "Dashboard", tier: "pro" }],
  },
  {
    id: "learn",
    label: "Learn",
    href: "/education",
    items: [{ href: "/education", label: "Education hub", tier: "free" }],
  },
  {
    id: "plans",
    label: "Plans",
    href: "/pricing",
    items: [
      { href: "/pricing", label: "Pricing", tier: "free" },
      { href: "/account", label: "Account", tier: "free" },
    ],
  },
] as const;

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-8" />;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActivePath(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const activeGroup =
    navGroups.find((group) =>
      group.items.some((item) => isActivePath(item.href)),
    ) ?? navGroups[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-display text-xl tracking-[-0.03em] text-foreground transition-colors hover:text-primary"
              >
                Calcifer
              </Link>
              <span className="hidden font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
                FIRECALC
              </span>
            </div>
            <div className="flex items-center gap-2">
              <nav
                aria-label="Primary journeys"
                className="flex flex-wrap items-center gap-1 text-sm"
              >
                {navGroups.map((group) => (
                  <Link
                    key={group.id}
                    href={group.href}
                    className={`rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${
                      activeGroup.id === group.id
                        ? "bg-[rgba(255,107,53,0.1)] font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {group.label}
                  </Link>
                ))}
              </nav>
              <PlanDrawerTrigger />
              <ThemeToggle />
            </div>
          </div>
          {activeGroup.items.length > 1 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
              {activeGroup.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActivePath(item.href) ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-all duration-200 ${
                    isActivePath(item.href)
                      ? "bg-[rgba(255,107,53,0.1)] font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {item.tier === "pro" ? (
                    <span className="rounded-full border border-[rgba(255,107,53,0.22)] bg-[rgba(255,107,53,0.08)] px-1.5 py-0.5 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-[var(--ember)]">
                      Pro
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <PlanDrawer />
      <footer className="border-t border-border/70 bg-card/35">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 text-xs text-muted-foreground">
          <p>For educational purposes only. Not financial advice.</p>
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Data stays in your browser</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
