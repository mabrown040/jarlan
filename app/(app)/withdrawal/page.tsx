import { Suspense } from "react";

import { HistoricalBacktestWorkspace } from "@/components/withdrawal/historical-backtest-workspace";

export default function WithdrawalPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-12">Loading withdrawal module...</div>}>
      <HistoricalBacktestWorkspace />
    </Suspense>
  );
}
