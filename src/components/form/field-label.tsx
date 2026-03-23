import type { LucideIcon } from "lucide-react";
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
  icon: Icon = CircleHelp,
}: {
  htmlFor: string;
  label: string;
  tooltip?: string;
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
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
