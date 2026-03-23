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
        {eyebrow ? (
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--ember)]">
            {eyebrow}
          </p>
        ) : null}
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
