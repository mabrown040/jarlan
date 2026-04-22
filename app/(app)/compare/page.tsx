import { Suspense } from "react";

import { CompareWorkspace } from "@/components/compare/compare-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Compare Plans",
  description:
    "Set Plan A against Plan B. FIRE number, years to FI, savings rate, and projection curves — side by side.",
  path: "/compare",
});

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-12">
          Loading compare workspace...
        </div>
      }
    >
      <CompareWorkspace />
    </Suspense>
  );
}
