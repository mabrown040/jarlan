import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export function ErrorAlert({
  title = "Something went wrong",
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" />
        <div className="space-y-1">
          <p className="font-medium text-red-100">{title}</p>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
