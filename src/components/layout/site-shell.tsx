"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import { UserMenu } from "@/components/auth/user-menu";
import { useSupabaseSyncBootstrap } from "@/hooks/use-supabase-sync-bootstrap";
import {
  PlanDrawer,
  PlanDrawerTrigger,
  PlanNameTrigger,
} from "@/components/plan-drawer";
import { QADevModal } from "@/components/dev/qa-personas";
import { HydrationWarningBanner } from "@/components/layout/hydration-warning-banner";

type NavGroup = {
  id: string;
  label: string;
  href: string;
  isPro?: boolean;
  items: readonly { href: string; label: string; tier: string }[];
};

const navGroups: NavGroup[] = [
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
    items: [
      { href: "/accumulation", label: "Your plan", tier: "free" },
      { href: "/save-what-if", label: "What if?", tier: "free" },
      // Compare mode — visible once the user has multiple saved
      // scenarios. Lives under Save because Plan A vs Plan B is
      // primarily an accumulation-side comparison.
      { href: "/compare", label: "Compare", tier: "free" },
    ],
  },
  {
    id: "spend",
    label: "Spend",
    href: "/withdrawal",
    items: [
      // Renamed from "Your Plan" to disambiguate from the Save module's
      // "Your plan" sub-tab — the page purpose is the stress-test question.
      { href: "/withdrawal", label: "Can I retire?", tier: "free" },
      { href: "/scenario-lab", label: "What if?", tier: "free" },
      { href: "/tax-strategy", label: "Income plan", tier: "free" },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    href: "/education",
    items: [
      { href: "/education", label: "Overview", tier: "free" },
      { href: "/education#foundation", label: "Foundation", tier: "free" },
      { href: "/education#fire-variations", label: "Variations", tier: "free" },
      { href: "/education#withdrawal", label: "Withdrawal", tier: "free" },
      { href: "/education#tax", label: "Tax & Accounts", tier: "free" },
      { href: "/education#assumptions", label: "Assumptions", tier: "free" },
    ],
  },
  {
    id: "pro",
    label: "Pro",
    href: "/pricing",
    isPro: true,
    items: [
      { href: "/pricing", label: "Pricing", tier: "free" },
      { href: "/account", label: "Account", tier: "free" },
    ],
  },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="size-8" />;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 focus-visible:text-foreground active:bg-muted"
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

/* Hamburger / X icon for mobile nav */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </>
      ) : (
        <>
          <path d="M4 12h16" />
          <path d="M4 6h16" />
          <path d="M4 18h16" />
        </>
      )}
    </svg>
  );
}

/* Pro nav link with star + gradient */
function ProNavLink({
  href,
  isActive,
  className,
}: {
  href: string;
  isActive: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href as Route}
      className={`group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] font-semibold text-white shadow-[0_2px_12px_rgba(255,107,53,0.35)]"
          : "bg-gradient-to-r from-[rgba(255,107,53,0.08)] to-[rgba(247,201,72,0.08)] font-medium text-[var(--ember)] hover:from-[rgba(255,107,53,0.15)] hover:to-[rgba(247,201,72,0.15)] hover:shadow-[0_2px_8px_rgba(255,107,53,0.2)]"
      } ${className ?? ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`size-3.5 transition-transform duration-300 group-hover:scale-110 ${
          isActive ? "text-white" : "text-[var(--ember)]"
        }`}
        aria-hidden="true"
      >
        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
      {navGroups.find((g) => g.isPro)?.label ?? "Pro"}
    </Link>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Bootstrap cloud sync for signed-in users. Safe no-op when Supabase
  // isn't configured or user isn't signed in — no crash, no console noise.
  useSupabaseSyncBootstrap();

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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

  // Track which group is expanded in the mobile hamburger menu. Previously
  // only the *active* group's sub-tabs rendered, so tapping "Spend" from Home
  // never revealed its sub-nav. Default to the active group; reset on route.
  const [openMobileGroupId, setOpenMobileGroupId] = useState<string>(
    activeGroup.id,
  );
  useEffect(() => {
    setOpenMobileGroupId(activeGroup.id);
  }, [activeGroup.id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
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

            {/* Desktop nav */}
            <div className="hidden items-center gap-2 sm:flex">
              <nav
                aria-label="Primary journeys"
                className="flex items-center gap-1 text-sm"
              >
                {navGroups.map((group) =>
                  group.isPro ? (
                    <ProNavLink
                      key={group.id}
                      href={group.href}
                      isActive={activeGroup.id === group.id}
                    />
                  ) : (
                    <Link
                      key={group.id}
                      href={group.href as Route}
                      className={`rounded-full px-3 py-1.5 text-sm transition-all duration-200 ${
                        activeGroup.id === group.id
                          ? "bg-[rgba(255,107,53,0.1)] font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      {group.label}
                    </Link>
                  ),
                )}
              </nav>
              <PlanNameTrigger />
              <PlanDrawerTrigger />
              <UserMenu />
              <ThemeToggle />
            </div>

            {/* Mobile right: drawer pill + hamburger.
                PlanNameTrigger is desktop-only on purpose — phones
                are already crowded; users still get the full switcher
                inside the drawer. */}
            <div className="flex items-center gap-2 sm:hidden">
              <PlanDrawerTrigger />
              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 focus-visible:text-foreground active:bg-muted"
                aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileNavOpen}
              >
                <MenuIcon open={mobileNavOpen} />
              </button>
            </div>
          </div>

          {/* Desktop sub-nav */}
          {!mobileNavOpen && activeGroup.items.length > 1 ? (
            <div className="mt-2 hidden flex-wrap items-center gap-1.5 border-t border-border/40 pt-2 sm:flex">
              {activeGroup.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  aria-current={isActivePath(item.href) ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-all duration-200 ${
                    isActivePath(item.href)
                      ? "bg-[rgba(255,107,53,0.1)] font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Mobile nav dropdown */}
          {mobileNavOpen ? (
            <nav
              aria-label="Mobile navigation"
              className="mt-2 border-t border-border/40 pt-3 pb-1 sm:hidden"
            >
              <div className="flex flex-col gap-1">
                {navGroups.map((group) => (
                  <div key={group.id}>
                    {group.items.length > 1 && !group.isPro ? (
                      // Tappable header that toggles the sub-nav without
                      // navigating — lets users browse Spend's sub-tabs from
                      // any page without having to land on /withdrawal first.
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMobileGroupId((current) =>
                            current === group.id ? "" : group.id,
                          )
                        }
                        aria-expanded={openMobileGroupId === group.id}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                          activeGroup.id === group.id
                            ? "bg-[rgba(255,107,53,0.1)] font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        <span>{group.label}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`size-3.5 transition-transform ${
                            openMobileGroupId === group.id ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    ) : group.isPro ? (
                      <ProNavLink
                        href={group.href}
                        isActive={activeGroup.id === group.id}
                        className="w-full justify-center"
                      />
                    ) : (
                      <Link
                        href={group.href as Route}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          activeGroup.id === group.id
                            ? "bg-[rgba(255,107,53,0.1)] font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        {group.label}
                      </Link>
                    )}
                    {openMobileGroupId === group.id && group.items.length > 1 ? (
                      <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/40 pl-3">
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href as Route}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                              isActivePath(item.href)
                                ? "font-medium text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-xs text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </nav>
          ) : null}
        </div>
      </header>
      <HydrationWarningBanner />
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <PlanDrawer />
      <footer className="border-t border-border/70 bg-card/35">
        {/* Data-provenance strip — signals active maintenance and cites
            the sources behind the numbers. Tax brackets cite the active
            year; keep in sync with the tax-strategy module when brackets
            are updated. */}
        <div className="mx-auto max-w-7xl border-b border-border/40 px-4 py-3 text-[11px] text-muted-foreground/80 sm:px-6">
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <span className="font-medium text-muted-foreground">Tax brackets:</span>{" "}
              2026 IRS
            </span>
            <span>
              <span className="font-medium text-muted-foreground">Mortality:</span>{" "}
              SSA 2022 period tables
            </span>
            <span>
              <span className="font-medium text-muted-foreground">Market data:</span>{" "}
              Shiller 1871&ndash;present
            </span>
            <span>
              <span className="font-medium text-muted-foreground">Last reviewed:</span>{" "}
              April 2026
            </span>
          </p>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <p>For educational purposes only. Not financial advice.</p>
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Data stays in your browser</span>
          </div>
        </div>
      </footer>
      <QADevModal />
    </div>
  );
}
