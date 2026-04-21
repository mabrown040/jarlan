import { Suspense } from "react";

import IncomePlanWorkspace from "@/components/tax/income-plan-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Income Plan",
  description:
    "Social Security claiming strategy, drawdown sequencing, Roth conversion ladder, and ACA-aware tax planning — all in today's dollars with 2026 brackets.",
  path: "/tax-strategy",
});

export default function TaxStrategyPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading income plan...</div>}>
      <IncomePlanWorkspace />
    </Suspense>
  );
}
