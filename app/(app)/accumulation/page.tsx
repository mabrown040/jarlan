import { Suspense } from "react";

import { QuickFireWorkspace } from "@/components/landing/quick-fire-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Your Plan",
  description:
    "Your FIRE number, year-by-year projection, tax-aware savings rate, and retirement milestones — all in one place.",
  path: "/accumulation",
});

export default function AccumulationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading accumulation workspace...</div>}>
      <QuickFireWorkspace variant="module" />
    </Suspense>
  );
}
