import { Suspense } from "react";

import CanIRetireWorkspace from "@/components/withdrawal/can-i-retire-workspace";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Can I Retire?",
  description:
    "Stress-test your retirement plan against 150 years of market history and forward-looking Monte Carlo. Four withdrawal strategies, valuation-aware.",
  path: "/withdrawal",
});

export default function WithdrawalPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading retirement analysis...</div>}>
      <CanIRetireWorkspace />
    </Suspense>
  );
}
