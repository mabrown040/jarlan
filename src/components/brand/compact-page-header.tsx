import type { ReactNode } from "react";

export interface CompactPageHeaderMetric {
  label: string;
  value: string;
  accent?: boolean;
}

interface CompactPageHeaderProps {
  title: string;
  description?: string;
  metrics?: CompactPageHeaderMetric[];
  progress?: { value: number };
  actions?: ReactNode;
}

/**
 * Compact page header used across all app pages.
 * Shows title + inline metrics on one line, optional progress bar, optional actions.
 * Replaces the heavy PageHero gradient banner.
 */
export function CompactPageHeader({
  title,
  description,
  metrics,
  progress,
  actions,
}: CompactPageHeaderProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex flex-1 flex-wrap items-baseline gap-x-6 gap-y-2">
          <h1 className="font-display text-3xl tracking-[-0.03em] text-foreground">
            {title}
          </h1>
          {metrics && metrics.length > 0 ? (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {metrics.map((metric, index) => (
                <span key={metric.label}>
                  {index > 0 ? (
                    <span className="mr-4 text-border">·</span>
                  ) : null}
                  {metric.label}{" "}
                  <span
                    className={`font-semibold ${
                      metric.accent
                        ? "text-[var(--ember)]"
                        : "text-foreground"
                    }`}
                  >
                    {metric.value}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {progress ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--ember)] to-[var(--flame)] transition-all duration-500"
            style={{
              width: `${Math.min(Math.max(progress.value * 100, 0), 100)}%`,
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
