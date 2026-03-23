import { Suspense } from "react";

import { QuickFireWorkspace } from "@/components/landing/quick-fire-workspace";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading calculator...</div>}>
      <QuickFireWorkspace variant="landing" />
    </Suspense>
  );
}
