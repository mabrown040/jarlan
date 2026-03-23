import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(255,107,53,0.2)] bg-[rgba(255,107,53,0.1)] text-[var(--ember)]",
        secondary:
          "border-[rgba(247,201,72,0.18)] bg-[rgba(247,201,72,0.1)] text-[var(--flame)]",
        outline:
          "border-border/70 bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
