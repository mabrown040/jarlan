import { Suspense } from "react";

import { ProGate } from "@/components/billing/pro-gate";
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
    <ProGate
      featureName="Compare Mode"
      pitch="Put two saved plans head-to-head. FIRE number, years to FI, savings rate, projection curves — every metric side by side so the tradeoffs are unambiguous."
    >
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-6 py-12">
            Loading compare workspace...
          </div>
        }
      >
        <CompareWorkspace />
      </Suspense>
    </ProGate>
  );
}
