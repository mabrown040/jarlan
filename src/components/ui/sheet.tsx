"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Drawer.Root direction="right" open={open} onOpenChange={onOpenChange} handleOnly>
      {children}
    </Drawer.Root>
  );
}

export const SheetTrigger = Drawer.Trigger;

export const SheetClose = Drawer.Close;

export const SheetContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Drawer.Content> & { className?: string }
>(({ className, children, ...props }, ref) => (
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <Drawer.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-[var(--shadow-surface)] outline-none sm:w-[28rem]",
        className,
      )}
      {...props}
    >
      {children}
    </Drawer.Content>
  </Drawer.Portal>
));
SheetContent.displayName = "SheetContent";

export function SheetHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border/70 px-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SheetTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Title className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </Drawer.Title>
  );
}

// Vaul (like Radix Dialog) logs an a11y warning on every mount when the
// content is missing a `<Dialog.Description>` / `aria-describedby`. Expose
// a wrapper so consumers can satisfy the contract with an sr-only line
// without leaking visual chrome.
export function SheetDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Description className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </Drawer.Description>
  );
}
