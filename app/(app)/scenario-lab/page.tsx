import { Suspense } from "react";

import WhatIfWorkspace from "@/components/scenario-lab/what-if-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Spend What If?",
  description:
    "Test retirement-side changes — spending cuts, bridge income, guardrails, ending-wealth targets — and see how much safer the plan gets.",
  path: "/scenario-lab",
});

export default function ScenarioLabPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading what-if analysis...</div>}>
      <WhatIfWorkspace />
    </Suspense>
  );
}
