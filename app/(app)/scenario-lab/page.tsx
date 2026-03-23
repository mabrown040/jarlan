import { Suspense } from "react";

import { ScenarioLabWorkspace } from "@/components/scenario-lab/scenario-lab-workspace";

export default function ScenarioLabPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading scenario lab...</div>}>
      <ScenarioLabWorkspace />
    </Suspense>
  );
}
