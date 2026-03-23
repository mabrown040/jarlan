import { Suspense } from "react";

import IncomePlanWorkspace from "@/components/tax/income-plan-workspace";

export default function TaxStrategyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading income plan...</div>}>
      <IncomePlanWorkspace />
    </Suspense>
  );
}
