import type { ReactNode } from "react";

import { SectionHeading } from "@/components/brand/section-heading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/50 bg-[linear-gradient(180deg,var(--surface-highlight),transparent)]">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
          titleAs="h3"
          titleClassName="text-[1.9rem]"
        />
      </CardHeader>
      <CardContent className={cn("space-y-6 pt-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
