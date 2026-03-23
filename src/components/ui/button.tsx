import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-semibold tracking-[0.01em] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:shadow-[var(--shadow-focus)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[linear-gradient(135deg,var(--flame)_0%,var(--ember)_55%,var(--glow)_100%)] text-primary-foreground shadow-[var(--shadow-glow)] hover:-translate-y-0.5 hover:brightness-105",
        secondary:
          "border-border/70 bg-secondary/70 text-secondary-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-secondary",
        outline:
          "border-border/70 bg-card/70 text-foreground shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-accent/70",
        ghost: "border-transparent text-foreground hover:bg-muted/70",
      },
      size: {
        default: "px-5 py-2.5",
        sm: "h-10 rounded-md px-4 text-sm",
        lg: "h-14 rounded-xl px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
