import { Suspense } from "react";

import CanIRetireWorkspace from "@/components/withdrawal/can-i-retire-workspace";

export default function WithdrawalPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading retirement analysis...</div>}>
      <CanIRetireWorkspace />
    </Suspense>
  );
}
