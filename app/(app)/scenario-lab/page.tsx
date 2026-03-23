import { Suspense } from "react";

import WhatIfWorkspace from "@/components/scenario-lab/what-if-workspace";

export default function ScenarioLabPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading what-if analysis...</div>}>
      <WhatIfWorkspace />
    </Suspense>
  );
}
