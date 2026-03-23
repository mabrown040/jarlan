import { Suspense } from "react";

import { TaxStrategyWorkspace } from "@/components/tax/tax-strategy-workspace";

export default function TaxStrategyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading tax strategy workspace...</div>}>
      <TaxStrategyWorkspace />
    </Suspense>
  );
}
