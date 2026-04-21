import type { ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  titleAs: Title = "h2",
  className,
  titleClassName,
  descriptionClassName,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleAs?: ElementType;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl space-y-2">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <Title
          className={cn(
            "font-display text-3xl leading-[1.05] tracking-[-0.03em] text-balance",
            titleClassName,
          )}
        >
          {title}
        </Title>
        {description ? (
          <div
            className={cn(
              "text-sm leading-6 text-muted-foreground md:text-base",
              descriptionClassName,
            )}
          >
            {description}
          </div>
        ) : null}
      </div>

      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

/**
 * Standalone eyebrow — small mono-cased label preceded by a 1.5rem
 * ember-gradient rule. Two uses:
 *
 * 1. Inside SectionHeading, for section titles (see above).
 * 2. Standalone between major sections to give the page vertical
 *    rhythm without introducing a full heading block.
 *
 * Kept monochromatic ember so it reads as a chapter marker, not a
 * decorative flourish.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-block h-px w-6 bg-[var(--gradient-ember-line)]"
      />
      {children}
    </p>
  );
}
