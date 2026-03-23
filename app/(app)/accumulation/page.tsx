import { Suspense } from "react";

import { QuickFireWorkspace } from "@/components/landing/quick-fire-workspace";

export default function AccumulationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading accumulation workspace...</div>}>
      <QuickFireWorkspace variant="module" />
    </Suspense>
  );
}
