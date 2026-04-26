import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

/**
 * Card elevation tiers — scale the shadow + background gradient so
 * visually-dominant cards read differently from ambient ones.
 *
 * - `flat`:   no shadow. For nested cards inside an already-elevated
 *             surface, or for read-only info blocks.
 * - `soft`:   elevation-1. Ambient containers, quiet stats.
 * - `default`: elevation-2 + surface gradient. The old Card look.
 * - `elevated`: elevation-3. Page-dominant surfaces (plan drawer,
 *             hero-adjacent cards).
 * - `feature`: elevation-3 + feature gradient + hover glow. Used when
 *             the card IS the primary content (Why-Jarlan tiles,
 *             key CTAs on the landing).
 *
 * Keep the default at `default` so existing code doesn't need changes.
 */
type CardTone = "flat" | "soft" | "default" | "elevated" | "feature";

const toneClasses: Record<CardTone, string> = {
  flat:
    "border border-[color:var(--surface-border)] bg-card text-card-foreground",
  soft:
    "border border-[color:var(--surface-border)] bg-[var(--gradient-card-surface)] text-card-foreground shadow-[var(--elevation-1)] backdrop-blur-sm",
  default:
    "border border-[color:var(--surface-border)] bg-[var(--gradient-card-surface)] text-card-foreground shadow-[var(--elevation-2)] backdrop-blur-sm",
  elevated:
    "border border-[color:var(--surface-border)] bg-[var(--gradient-card-surface)] text-card-foreground shadow-[var(--elevation-3)] backdrop-blur-sm",
  feature:
    "border border-[color:var(--surface-border)] bg-[var(--gradient-card-feature)] text-card-foreground shadow-[var(--elevation-3)] backdrop-blur-sm",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** Apply the standard hover-lift motion. */
  interactive?: boolean;
  /**
   * Render as a wrapper around the child element (uses Radix Slot).
   * Lets callers render the card chrome directly on a `<Link>` or
   * `<button>` so the whole card is clickable without nested a/button
   * elements.
   */
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, tone = "default", interactive, asChild = false, ...props },
    ref,
  ) => {
    const Component = asChild ? Slot : "div";
    return (
      <Component
        ref={ref}
        className={cn(
          "rounded-xl",
          toneClasses[tone],
          interactive && "card-hover",
          className,
        )}
        {...props}
      />
    );
  },
);

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
));

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-display text-xl leading-none tracking-[-0.02em]",
      className,
    )}
    {...props}
  />
));

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardDescription.displayName = "CardDescription";
CardContent.displayName = "CardContent";
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
