import type { ReactNode } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeroBadge {
  label: string;
  variant?: BadgeProps["variant"];
}

export function PageHero({
  eyebrow,
  badges,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  badges?: HeroBadge[];
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto max-w-7xl px-6 pt-8 md:pt-10", className)}>
      <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),linear-gradient(135deg,var(--hearth)_0%,var(--hearth-warm)_48%,rgba(255,107,53,0.16)_100%)] px-6 py-8 text-[var(--ash)] shadow-[var(--shadow-surface)] md:px-10 md:py-12">
        <div className="pointer-events-none absolute inset-x-0 bottom-[-28%] h-72 bg-[radial-gradient(ellipse_at_center,rgba(255,107,53,0.24)_0%,rgba(247,201,72,0.12)_28%,transparent_70%)]" />
        <div className="pointer-events-none absolute right-[-4rem] top-[-5rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.18)_0%,rgba(255,68,68,0.06)_40%,transparent_72%)] blur-3xl" />
        <div className="pointer-events-none absolute left-[-3rem] top-[-4rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(247,201,72,0.1)_0%,transparent_72%)] blur-3xl" />
        <div className="relative z-10 space-y-6">
          {eyebrow ? (
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-[var(--ember)]">
              {eyebrow}
            </p>
          ) : null}

          {badges?.length ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.label} variant={badge.variant}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="max-w-4xl space-y-3">
            <h1 className="font-display text-4xl leading-[1.02] tracking-[-0.04em] text-balance md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <div className="max-w-3xl text-lg font-light leading-7 text-[color:rgba(245,240,235,0.8)]">
              {description}
            </div>
          </div>

          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}

          {children ? (
            <div className="border-t border-[rgba(255,255,255,0.08)] pt-6">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
