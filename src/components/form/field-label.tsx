import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FieldLabel({
  htmlFor,
  label,
  tooltip,
  learnHref,
  icon: Icon = CircleHelp,
}: {
  htmlFor: string;
  label: string;
  tooltip?: string;
  learnHref?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-border/70 bg-muted/35 p-1 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-accent/60 hover:text-foreground"
              aria-label={`More information about ${label}`}
            >
              <Icon className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className={learnHref ? "pb-2" : undefined}>
            <p>{tooltip}</p>
            {learnHref ? (
              <Link
                href={learnHref as Route}
                className="mt-1.5 block text-[var(--ember)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Read the full article →
              </Link>
            ) : null}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
